// Supabase sync layer — FULL bidirectional sync.
// On login: pulls ALL data from Supabase and replaces local store.
// On every change: pushes to Supabase (optimistic UI — local first, then async push).
// On first login with local data: pushes all local data to Supabase.
//
// This ensures: when user logs in again (new device, reinstalled app),
// ALL their data is restored from Supabase.
import { supabase } from './supabase/client';
import { useStore } from './store';
import {
  DEFAULT_SECTIONS, DEFAULT_HABITS, DEFAULT_ROUTINE,
  DEFAULT_WEEKLY_THEMES, DEFAULT_FINANCE_TARGETS,
} from './seed';
import type {
  Task, Section, Habit, RoutineBlock, FinanceEntry,
  JournalEntry, KnowledgeNote, AIMemoryItem,
} from './types';

let syncInitialized = false;
let currentUserId: string | null = null;
let isPulling = false;

// ─── Initialize sync on login ───
export async function initSync(userId: string | null) {
  if (userId === currentUserId && syncInitialized) return;
  currentUserId = userId;

  if (!userId || userId === 'offline-user') {
    syncInitialized = false;
    return;
  }

  if (syncInitialized) return;
  syncInitialized = true;

  console.log('[sync] Initializing for user:', userId);

  try {
    // Step 1: Pull all remote data
    const hasRemoteData = await pullAllFromSupabase(userId);

    // Step 2: If no remote data but local data exists, push everything up
    if (!hasRemoteData) {
      console.log('[sync] No remote data — pushing local data to Supabase');
      await pushAllToSupabase(userId);
    }
  } catch (e) {
    console.warn('[sync] init failed', e);
  }
}

// ─── Pull ALL data from Supabase and replace local store ───
async function pullAllFromSupabase(userId: string): Promise<boolean> {
  if (!supabase || isPulling) return false;
  isPulling = true;

  try {
    console.log('[sync] Pulling all data from Supabase...');

    // Fetch all tables in parallel
    const [
      tasksRes, categoriesRes, habitsRes, habitLogsRes,
      financeRes, journalRes, knowledgeRes, memoriesRes,
      routineRes, routineLogsRes,
    ] = await Promise.all([
      supabase.from('tasks').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('task_categories').select('*').eq('user_id', userId).order('sort_order', { ascending: true }),
      supabase.from('habits').select('*').eq('user_id', userId),
      supabase.from('habit_logs').select('*').eq('user_id', userId),
      supabase.from('finance_entries').select('*').eq('user_id', userId).order('entry_date', { ascending: false }),
      supabase.from('journal_entries').select('*').eq('user_id', userId).order('entry_date', { ascending: false }),
      supabase.from('knowledge_notes').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('ai_memories').select('*').eq('user_id', userId).order('updated_at', { ascending: false }),
      supabase.from('routine_blocks').select('*').eq('user_id', userId),
      supabase.from('routine_completion_logs').select('*').eq('user_id', userId),
    ]);

    const hasAnyData = !!(
      tasksRes.data?.length || habitsRes.data?.length || journalRes.data?.length ||
      memoriesRes.data?.length || financeRes.data?.length || knowledgeRes.data?.length
    );

    if (!hasAnyData) {
      console.log('[sync] No remote data found — keeping local data');
      isPulling = false;
      return false;
    }

    // ─── Map + merge tasks ───
    const remoteTasks: Task[] = (tasksRes.data ?? []).map((t: Record<string, unknown>) => ({
      id: t.id as string,
      title: t.title as string,
      description: (t.description as string) ?? '',
      sectionId: (t.category_id as string) ?? 'sec-health',
      subSectionId: undefined,
      type: 'one-time' as const,
      priority: (t.priority as Task['priority']) ?? 'medium',
      status: (t.status as Task['status']) ?? 'pending',
      startDate: (t.due_date as string) ?? (t.start_date as string) ?? new Date().toISOString().slice(0, 10),
      endDate: t.end_date as string | undefined,
      time: (t.due_time as string) ?? (t.time as string) ?? undefined,
      reminderTime: undefined,
      repeatRule: (t.repeat_rule as Task['repeatRule']) ?? 'none',
      checklistItems: [],
      notes: (t.notes as string) ?? '',
      isTopPriority: (t.is_top_priority as boolean) ?? false,
      createdAt: (t.created_at as string) ?? new Date().toISOString(),
      updatedAt: (t.updated_at as string) ?? new Date().toISOString(),
      completionLog: {},
    }));

    // Fetch task completion logs
    const { data: taskLogs } = await supabase
      .from('task_completion_logs')
      .select('task_id,log_date,completed')
      .eq('user_id', userId);

    if (taskLogs) {
      const logMap = new Map<string, Record<string, boolean>>();
      taskLogs.forEach((l: { task_id: string; log_date: string; completed: boolean }) => {
        if (!logMap.has(l.task_id)) logMap.set(l.task_id, {});
        logMap.get(l.task_id)![l.log_date] = l.completed;
      });
      remoteTasks.forEach((t) => {
        t.completionLog = logMap.get(t.id) ?? {};
      });
    }

    // ─── Map habits + logs ───
    const remoteHabits: Habit[] = (habitsRes.data ?? []).map((h: Record<string, unknown>) => {
      const log: Record<string, boolean> = {};
      (habitLogsRes.data ?? []).forEach((l: { habit_id: string; log_date: string; completed: boolean }) => {
        if (l.habit_id === h.id) log[l.log_date] = l.completed;
      });
      return {
        id: h.id as string,
        title: h.title as string,
        category: (h.category as string) ?? 'General',
        target: 'daily',
        isActive: (h.active as boolean) ?? true,
        log,
      };
    });

    // ─── Map finance ───
    const remoteFinance: FinanceEntry[] = (financeRes.data ?? []).map((f: Record<string, unknown>) => ({
      id: f.id as string,
      title: (f.note as string) ?? (f.category as string) ?? 'Entry',
      amount: Number(f.amount) ?? 0,
      type: (f.entry_type as FinanceEntry['type']) ?? 'expense',
      date: (f.entry_date as string) ?? new Date().toISOString().slice(0, 10),
      category: (f.category as string) ?? 'General',
      note: (f.note as string) ?? undefined,
    }));

    // ─── Map journal ───
    const remoteJournal: JournalEntry[] = (journalRes.data ?? []).map((j: Record<string, unknown>) => ({
      id: j.id as string,
      entry_date: (j.entry_date as string) ?? new Date().toISOString().slice(0, 10),
      title: (j.title as string) ?? undefined,
      content: (j.content as string) ?? '',
      mood_score: (j.mood_score as number) ?? 5,
      reflection_type: (j.reflection_type as JournalEntry['reflection_type']) ?? 'daily',
      ai_summary: (j.ai_summary as string) ?? undefined,
      created_at: (j.created_at as string) ?? new Date().toISOString(),
    }));

    // ─── Map knowledge notes ───
    const remoteKnowledge: KnowledgeNote[] = (knowledgeRes.data ?? []).map((k: Record<string, unknown>) => ({
      id: k.id as string,
      title: k.title as string,
      content: (k.content as string) ?? '',
      tags: (k.tags_json as string[]) ?? (k.tags as string[]) ?? [],
      source_type: (k.source_type as string) ?? undefined,
      reference_url: (k.reference_url as string) ?? undefined,
      ai_summary: (k.ai_summary as string) ?? undefined,
      created_at: (k.created_at as string) ?? new Date().toISOString(),
      updated_at: (k.updated_at as string) ?? new Date().toISOString(),
    }));

    // ─── Map memories ───
    const remoteMemories: AIMemoryItem[] = (memoriesRes.data ?? []).map((m: Record<string, unknown>) => ({
      id: m.id as string,
      title: (m.title as string) ?? (m.memory_key as string) ?? 'Memory',
      content: (m.memory_value as string) ?? '',
      category: (m.memory_type as AIMemoryItem['category']) ?? 'custom',
      importance: (m.importance as AIMemoryItem['importance']) ?? 'medium',
      confidence: (m.confidence_score as number) ?? 0.7,
      source: (m.source as AIMemoryItem['source']) ?? 'chat',
      pinned: (m.pinned as boolean) ?? false,
      favorite: (m.favorite as boolean) ?? false,
      archived: (m.archived as boolean) ?? false,
      locked: (m.locked as boolean) ?? false,
      disabled: (m.disabled as boolean) ?? false,
      tags: [],
      lastUsedAt: (m.last_used_at as string) ?? undefined,
      useCount: 0,
      createdAt: (m.created_at as string) ?? new Date().toISOString(),
      updatedAt: (m.updated_at as string) ?? new Date().toISOString(),
    }));

    // ─── Replace local store with remote data ───
    const store = useStore.getState();

    // Only replace if we have remote data for that table
    useStore.setState({
      tasks: remoteTasks.length > 0 ? remoteTasks : store.tasks,
      habits: remoteHabits.length > 0 ? remoteHabits : store.habits,
      finance: remoteFinance.length > 0 ? remoteFinance : store.finance,
      journal: remoteJournal.length > 0 ? remoteJournal : store.journal,
      knowledgeNotes: remoteKnowledge.length > 0 ? remoteKnowledge : store.knowledgeNotes,
      memories: remoteMemories.length > 0 ? remoteMemories : store.memories,
      // Keep default sections/routine/habits if no remote data for those
      sections: store.sections,  // sections are seeded, keep them
      routineBlocks: store.routineBlocks,  // routine is seeded, keep it
    });

    console.log('[sync] ✅ Pull complete — restored:', {
      tasks: remoteTasks.length,
      habits: remoteHabits.length,
      finance: remoteFinance.length,
      journal: remoteJournal.length,
      knowledge: remoteKnowledge.length,
      memories: remoteMemories.length,
    });

    isPulling = false;
    return true;
  } catch (e) {
    console.warn('[sync] pull error', e);
    isPulling = false;
    return false;
  }
}

// ─── Push ALL local data to Supabase (first login with local data) ───
async function pushAllToSupabase(userId: string): Promise<void> {
  if (!supabase) return;
  const store = useStore.getState();

  try {
    console.log('[sync] Pushing all local data to Supabase...');

    // Push tasks
    for (const task of store.tasks) {
      await pushTask(userId, task);
    }

    // Push habits
    for (const habit of store.habits) {
      await supabase.from('habits').upsert({
        id: habit.id,
        user_id: userId,
        title: habit.title,
        category: habit.category,
        active: habit.isActive,
        repeat_rule: 'daily',
      }, { onConflict: 'id' });

      // Push habit logs
      for (const [date, completed] of Object.entries(habit.log)) {
        await pushHabitLog(userId, habit.id, date, completed);
      }
    }

    // Push finance entries
    for (const entry of store.finance) {
      await pushFinanceEntry(userId, entry);
    }

    // Push journal entries
    for (const entry of store.journal) {
      await pushJournalEntry(userId, entry);
    }

    // Push knowledge notes
    for (const note of store.knowledgeNotes) {
      await pushKnowledgeNote(userId, note);
    }

    // Push memories
    for (const memory of store.memories) {
      await pushMemory(userId, memory);
    }

    console.log('[sync] ✅ Push complete — synced all local data');
  } catch (e) {
    console.warn('[sync] push all error', e);
  }
}

// ─── Individual push helpers (called from store actions) ───

export async function pushTask(userId: string, task: Task | {
  id: string; title: string; description?: string;
  priority: string; status: string; startDate?: string; due_date?: string;
  time?: string; due_time?: string; repeatRule?: string; repeat_rule?: string;
  isTopPriority?: boolean; is_top_priority?: boolean;
  notes?: string;
}) {
  if (!userId || userId === 'offline-user' || !supabase) return;
  try {
    await supabase.from('tasks').upsert({
      id: task.id,
      user_id: userId,
      title: task.title,
      description: ('description' in task ? task.description : null) ?? null,
      priority: task.priority,
      status: task.status,
      due_date: ('due_date' in task ? task.due_date : null) ?? ('startDate' in task ? task.startDate : null) ?? null,
      due_time: ('due_time' in task ? task.due_time : null) ?? ('time' in task ? task.time : null) ?? null,
      repeat_rule: ('repeat_rule' in task ? task.repeat_rule : null) ?? ('repeatRule' in task ? task.repeatRule : 'none'),
      is_top_priority: ('is_top_priority' in task ? task.is_top_priority : null) ?? ('isTopPriority' in task ? task.isTopPriority : false),
      notes: ('notes' in task ? task.notes : null) ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
  } catch (e) { console.warn('[sync] push task failed', e); }
}

export async function deleteTaskRemote(userId: string, taskId: string) {
  if (!userId || userId === 'offline-user' || !supabase) return;
  try {
    await supabase.from('tasks').delete().eq('id', taskId).eq('user_id', userId);
  } catch (e) { console.warn('[sync] delete task failed', e); }
}

export async function pushHabitLog(userId: string, habitId: string, date: string, completed: boolean) {
  if (!userId || userId === 'offline-user' || !supabase) return;
  try {
    await supabase.from('habit_logs').upsert({
      habit_id: habitId,
      user_id: userId,
      log_date: date,
      completed,
      value: 1,
    }, { onConflict: 'habit_id,log_date' });
  } catch (e) { console.warn('[sync] push habit log failed', e); }
}

export async function pushFinanceEntry(userId: string, entry: FinanceEntry | {
  id: string; title: string; amount: number; type: string;
  date: string; category?: string; note?: string;
}) {
  if (!userId || userId === 'offline-user' || !supabase) return;
  try {
    await supabase.from('finance_entries').upsert({
      id: entry.id,
      user_id: userId,
      entry_type: entry.type,
      amount: entry.amount,
      category: entry.category ?? null,
      note: entry.note ?? entry.title ?? null,
      entry_date: entry.date,
    }, { onConflict: 'id' });
  } catch (e) { console.warn('[sync] push finance failed', e); }
}

export async function deleteFinanceRemote(userId: string, entryId: string) {
  if (!userId || userId === 'offline-user' || !supabase) return;
  try {
    await supabase.from('finance_entries').delete().eq('id', entryId).eq('user_id', userId);
  } catch (e) { console.warn('[sync] delete finance failed', e); }
}

export async function pushJournalEntry(userId: string, entry: JournalEntry | {
  id: string; entry_date: string; title?: string; content: string;
  mood_score: number; reflection_type?: string; ai_summary?: string;
}) {
  if (!userId || userId === 'offline-user' || !supabase) return;
  try {
    await supabase.from('journal_entries').upsert({
      id: entry.id,
      user_id: userId,
      entry_date: entry.entry_date,
      title: entry.title ?? null,
      content: entry.content,
      mood_score: entry.mood_score,
      reflection_type: entry.reflection_type ?? 'daily',
      ai_summary: entry.ai_summary ?? null,
    }, { onConflict: 'id' });
  } catch (e) { console.warn('[sync] push journal failed', e); }
}

export async function pushKnowledgeNote(userId: string, note: KnowledgeNote | {
  id: string; title: string; content: string;
  tags_json: string[]; tags?: string[]; source_type?: string; reference_url?: string;
  ai_summary?: string;
}) {
  if (!userId || userId === 'offline-user' || !supabase) return;
  try {
    const tags = 'tags_json' in note ? note.tags_json : ('tags' in note ? note.tags : []);
    await supabase.from('knowledge_notes').upsert({
      id: note.id,
      user_id: userId,
      title: note.title,
      content: note.content,
      tags_json: tags,
      source_type: note.source_type ?? null,
      reference_url: note.reference_url ?? null,
      ai_summary: note.ai_summary ?? null,
    }, { onConflict: 'id' });
  } catch (e) { console.warn('[sync] push knowledge failed', e); }
}

export async function pushMemory(userId: string, memory: AIMemoryItem) {
  if (!userId || userId === 'offline-user' || !supabase) return;
  try {
    await supabase.from('ai_memories').upsert({
      id: memory.id,
      user_id: userId,
      memory_type: memory.category,
      memory_key: memory.title,
      memory_value: memory.content,
      confidence_score: memory.confidence,
      source_module: memory.source,
      importance: memory.importance,
      pinned: memory.pinned,
      favorite: memory.favorite,
      archived: memory.archived,
      locked: memory.locked,
      disabled: memory.disabled,
      last_used_at: memory.lastUsedAt,
    }, { onConflict: 'id' });
  } catch (e) { console.warn('[sync] push memory failed', e); }
}

export async function deleteMemoryRemote(userId: string, memoryId: string) {
  if (!userId || userId === 'offline-user' || !supabase) return;
  try {
    await supabase.from('ai_memories').delete().eq('id', memoryId).eq('user_id', userId);
  } catch (e) { console.warn('[sync] delete memory failed', e); }
}
