// Supabase sync layer — FULL bidirectional sync with timestamp-based merge.
// On login: pulls ALL data from Supabase and merges (last-updated-wins).
// On every change: pushes to Supabase (optimistic UI — local first, then async push).
// On first login with local data: pushes everything to Supabase.
//
// Sync status is tracked in a module-level variable + exposed via getSyncStatus().
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

// ─── Sync status tracking ───
export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';
let syncStatus: SyncStatus = 'idle';
const syncListeners: Set<(status: SyncStatus) => void> = new Set();

export function getSyncStatus(): SyncStatus { return syncStatus; }
function setSyncStatus(status: SyncStatus) {
  syncStatus = status;
  syncListeners.forEach((fn) => fn(status));
}
export function onSyncStatusChange(fn: (status: SyncStatus) => void): () => void {
  syncListeners.add(fn);
  return () => { syncListeners.delete(fn); };
}

let syncInitialized = false;
let currentUserId: string | null = null;

// ─── Initialize sync on login ───
export async function initSync(userId: string | null) {
  if (userId === currentUserId && syncInitialized) return;
  currentUserId = userId;

  if (!userId || userId === 'offline-user') {
    syncInitialized = false;
    setSyncStatus('idle');
    return;
  }

  if (syncInitialized) return;
  syncInitialized = true;

  console.log('[sync] Initializing for user:', userId);
  setSyncStatus('syncing');

  try {
    const hasRemoteData = await pullAllUserData(userId);

    if (!hasRemoteData) {
      console.log('[sync] No remote data — pushing local data to Supabase');
      await pushAllToSupabase(userId);
    }
    setSyncStatus('synced');
  } catch (e) {
    console.warn('[sync] init failed', e);
    setSyncStatus('error');
  }
}

// ─── Pull ALL data from Supabase (last-updated-wins merge) ───
export async function pullAllUserData(userId: string): Promise<boolean> {
  if (!supabase) return false;
  setSyncStatus('syncing');

  try {
    console.log('[sync] Pulling all data from Supabase...');

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
      tasksRes.data?.length || categoriesRes.data?.length || habitsRes.data?.length ||
      journalRes.data?.length || memoriesRes.data?.length || financeRes.data?.length ||
      knowledgeRes.data?.length || routineRes.data?.length
    );

    if (!hasAnyData) {
      console.log('[sync] No remote data found — keeping local data');
      setSyncStatus('synced');
      return false;
    }

    const store = useStore.getState();

    // ─── Tasks (last-updated-wins merge) ───
    if (tasksRes.data && tasksRes.data.length > 0) {
      const { data: taskLogs } = await supabase
        .from('task_completion_logs')
        .select('task_id,log_date,completed')
        .eq('user_id', userId);

      const logMap = new Map<string, Record<string, boolean>>();
      (taskLogs ?? []).forEach((l: { task_id: string; log_date: string; completed: boolean }) => {
        if (!logMap.has(l.task_id)) logMap.set(l.task_id, {});
        logMap.get(l.task_id)![l.log_date] = l.completed;
      });

      const remoteTasks: Task[] = (tasksRes.data ?? []).map((t: Record<string, unknown>) => ({
        id: t.id as string,
        title: t.title as string,
        description: (t.description as string) ?? '',
        sectionId: (t.category_id as string) ?? 'sec-health',
        type: 'one-time' as const,
        priority: (t.priority as Task['priority']) ?? 'medium',
        status: (t.status as Task['status']) ?? 'pending',
        startDate: (t.due_date as string) ?? new Date().toISOString().slice(0, 10),
        endDate: t.end_date as string | undefined,
        time: (t.due_time as string) ?? undefined,
        reminderTime: undefined,
        repeatRule: (t.repeat_rule as Task['repeatRule']) ?? 'none',
        checklistItems: [],
        notes: (t.notes as string) ?? '',
        isTopPriority: (t.is_top_priority as boolean) ?? false,
        createdAt: (t.created_at as string) ?? new Date().toISOString(),
        updatedAt: (t.updated_at as string) ?? new Date().toISOString(),
        completionLog: logMap.get(t.id as string) ?? {},
      }));

      // Merge: last-updated-wins
      const mergedTasks = mergeByUpdatedAt(store.tasks, remoteTasks);
      useStore.setState({ tasks: mergedTasks });
    }

    // ─── Sections / task_categories ───
    if (categoriesRes.data && categoriesRes.data.length > 0) {
      const remoteSections: Section[] = (categoriesRes.data ?? []).map((c: Record<string, unknown>) => ({
        id: c.id as string,
        name: c.name as string,
        icon: (c.icon as string) ?? 'Target',
        color: (c.color as string) ?? '#64748b',
        order: (c.sort_order as number) ?? 0,
        subSections: [],
      }));
      // Merge: keep remote if exists, keep local if not in remote
      const remoteIds = new Set(remoteSections.map((s) => s.id));
      const localOnly = store.sections.filter((s) => !remoteIds.has(s.id));
      useStore.setState({ sections: [...remoteSections, ...localOnly] });
    }

    // ─── Habits + logs ───
    if (habitsRes.data) {
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

      if (remoteHabits.length > 0) {
        // Merge: combine remote + local-only habits, merge logs
        const remoteIds = new Set(remoteHabits.map((h) => h.id));
        const localOnly = store.habits.filter((h) => !remoteIds.has(h.id));
        useStore.setState({ habits: [...remoteHabits, ...localOnly] });
      }
    }

    // ─── Finance ───
    if (financeRes.data && financeRes.data.length > 0) {
      const remoteFinance: FinanceEntry[] = (financeRes.data ?? []).map((f: Record<string, unknown>) => ({
        id: f.id as string,
        title: (f.note as string) ?? (f.category as string) ?? 'Entry',
        amount: Number(f.amount) ?? 0,
        type: (f.entry_type as FinanceEntry['type']) ?? 'expense',
        date: (f.entry_date as string) ?? new Date().toISOString().slice(0, 10),
        category: (f.category as string) ?? 'General',
        note: (f.note as string) ?? undefined,
      }));
      // Merge: deduplicate by ID
      const merged = mergeById(store.finance, remoteFinance);
      useStore.setState({ finance: merged });
    }

    // ─── Journal ───
    if (journalRes.data && journalRes.data.length > 0) {
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
      const merged = mergeById(store.journal, remoteJournal);
      useStore.setState({ journal: merged });
    }

    // ─── Knowledge ───
    if (knowledgeRes.data && knowledgeRes.data.length > 0) {
      const remoteKnowledge: KnowledgeNote[] = (knowledgeRes.data ?? []).map((k: Record<string, unknown>) => ({
        id: k.id as string,
        title: k.title as string,
        content: (k.content as string) ?? '',
        tags: (k.tags_json as string[]) ?? [],
        source_type: (k.source_type as string) ?? undefined,
        reference_url: (k.reference_url as string) ?? undefined,
        ai_summary: (k.ai_summary as string) ?? undefined,
        created_at: (k.created_at as string) ?? new Date().toISOString(),
        updated_at: (k.updated_at as string) ?? new Date().toISOString(),
      }));
      const merged = mergeById(store.knowledgeNotes, remoteKnowledge);
      useStore.setState({ knowledgeNotes: merged });
    }

    // ─── Memories ───
    if (memoriesRes.data && memoriesRes.data.length > 0) {
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
      const merged = mergeByUpdatedAt(store.memories, remoteMemories);
      useStore.setState({ memories: merged });
    }

    // ─── Routine blocks ───
    if (routineRes.data && routineRes.data.length > 0) {
      const remoteRoutine: RoutineBlock[] = (routineRes.data ?? []).map((r: Record<string, unknown>) => {
        const log: Record<string, boolean> = {};
        (routineLogsRes.data ?? []).forEach((l: { routine_id: string; log_date: string; completed: boolean }) => {
          if (l.routine_id === r.id) log[l.log_date] = l.completed;
        });
        return {
          id: r.id as string,
          title: r.title as string,
          startTime: (r.start_time as string) ?? '08:00',
          endTime: (r.end_time as string) ?? '09:00',
          category: (r.category as string) ?? 'study',
          description: (r.description as string) ?? '',
          checklistItems: (r.checklist_items_json as string[]) ?? [],
          log,
        };
      });
      if (remoteRoutine.length > 0) {
        useStore.setState({ routineBlocks: remoteRoutine });
      }
    }

    console.log('[sync] ✅ Pull complete — restored:', {
      tasks: tasksRes.data?.length ?? 0,
      sections: categoriesRes.data?.length ?? 0,
      habits: habitsRes.data?.length ?? 0,
      finance: financeRes.data?.length ?? 0,
      journal: journalRes.data?.length ?? 0,
      knowledge: knowledgeRes.data?.length ?? 0,
      memories: memoriesRes.data?.length ?? 0,
      routine: routineRes.data?.length ?? 0,
    });

    setSyncStatus('synced');
    return true;
  } catch (e) {
    console.warn('[sync] pull error', e);
    setSyncStatus('error');
    return false;
  }
}

// ─── Merge helpers ───
function mergeByUpdatedAt<T extends { id: string; updatedAt?: string }>(
  local: T[], remote: T[],
): T[] {
  const map = new Map<string, T>();
  // Add all local
  local.forEach((item) => map.set(item.id, item));
  // Merge remote — last-updated-wins
  remote.forEach((remoteItem) => {
    const localItem = map.get(remoteItem.id);
    if (!localItem) {
      map.set(remoteItem.id, remoteItem);
    } else {
      const localUpdated = localItem.updatedAt ?? '0';
      const remoteUpdated = remoteItem.updatedAt ?? '0';
      if (remoteUpdated >= localUpdated) {
        map.set(remoteItem.id, remoteItem);
      }
    }
  });
  return Array.from(map.values());
}

function mergeById<T extends { id: string }>(local: T[], remote: T[]): T[] {
  const map = new Map<string, T>();
  local.forEach((item) => map.set(item.id, item));
  remote.forEach((item) => map.set(item.id, item)); // remote wins on conflict
  return Array.from(map.values());
}

// ─── Push ALL local data to Supabase (first login) ───
async function pushAllToSupabase(userId: string): Promise<void> {
  if (!supabase) return;
  const store = useStore.getState();
  setSyncStatus('syncing');

  try {
    console.log('[sync] Pushing all local data to Supabase...');

    for (const task of store.tasks) await pushTask(userId, task);
    for (const section of store.sections) await pushSection(userId, section);
    for (const habit of store.habits) {
      await supabase.from('habits').upsert({
        id: habit.id, user_id: userId, title: habit.title,
        category: habit.category, active: habit.isActive, repeat_rule: 'daily',
      }, { onConflict: 'id' });
      for (const [date, completed] of Object.entries(habit.log)) {
        await pushHabitLog(userId, habit.id, date, completed);
      }
    }
    for (const entry of store.finance) await pushFinanceEntry(userId, entry);
    for (const entry of store.journal) await pushJournalEntry(userId, entry);
    for (const note of store.knowledgeNotes) await pushKnowledgeNote(userId, note);
    for (const memory of store.memories) await pushMemory(userId, memory);
    for (const block of store.routineBlocks) await pushRoutineBlock(userId, block);

    console.log('[sync] ✅ Push complete');
    setSyncStatus('synced');
  } catch (e) {
    console.warn('[sync] push all error', e);
    setSyncStatus('error');
  }
}

// ─── Push helpers for EVERY table ───

export async function pushTask(userId: string, task: Task | {
  id: string; title: string; description?: string;
  priority: string; status: string; startDate?: string; due_date?: string;
  time?: string; due_time?: string; repeatRule?: string; repeat_rule?: string;
  isTopPriority?: boolean; is_top_priority?: boolean; notes?: string;
}) {
  if (!userId || userId === 'offline-user' || !supabase) return;
  try {
    await supabase.from('tasks').upsert({
      id: task.id, user_id: userId, title: task.title,
      description: ('description' in task ? task.description : null) ?? null,
      priority: task.priority, status: task.status,
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
  try { await supabase.from('tasks').delete().eq('id', taskId).eq('user_id', userId); }
  catch (e) { console.warn('[sync] delete task failed', e); }
}

export async function pushSection(userId: string, section: Section) {
  if (!userId || userId === 'offline-user' || !supabase) return;
  try {
    await supabase.from('task_categories').upsert({
      id: section.id, user_id: userId, name: section.name,
      color: section.color, icon: section.icon, sort_order: section.order,
    }, { onConflict: 'id' });
  } catch (e) { console.warn('[sync] push section failed', e); }
}

export async function deleteSectionRemote(userId: string, sectionId: string) {
  if (!userId || userId === 'offline-user' || !supabase) return;
  try { await supabase.from('task_categories').delete().eq('id', sectionId).eq('user_id', userId); }
  catch (e) { console.warn('[sync] delete section failed', e); }
}

export async function pushHabit(userId: string, habit: Habit) {
  if (!userId || userId === 'offline-user' || !supabase) return;
  try {
    await supabase.from('habits').upsert({
      id: habit.id, user_id: userId, title: habit.title,
      category: habit.category, active: habit.isActive, repeat_rule: 'daily',
    }, { onConflict: 'id' });
  } catch (e) { console.warn('[sync] push habit failed', e); }
}

export async function deleteHabitRemote(userId: string, habitId: string) {
  if (!userId || userId === 'offline-user' || !supabase) return;
  try { await supabase.from('habits').delete().eq('id', habitId).eq('user_id', userId); }
  catch (e) { console.warn('[sync] delete habit failed', e); }
}

export async function pushHabitLog(userId: string, habitId: string, date: string, completed: boolean) {
  if (!userId || userId === 'offline-user' || !supabase) return;
  try {
    await supabase.from('habit_logs').upsert({
      habit_id: habitId, user_id: userId, log_date: date, completed, value: 1,
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
      id: entry.id, user_id: userId, entry_type: entry.type, amount: entry.amount,
      category: entry.category ?? null, note: entry.note ?? entry.title ?? null,
      entry_date: entry.date,
    }, { onConflict: 'id' });
  } catch (e) { console.warn('[sync] push finance failed', e); }
}

export async function deleteFinanceRemote(userId: string, entryId: string) {
  if (!userId || userId === 'offline-user' || !supabase) return;
  try { await supabase.from('finance_entries').delete().eq('id', entryId).eq('user_id', userId); }
  catch (e) { console.warn('[sync] delete finance failed', e); }
}

export async function pushJournalEntry(userId: string, entry: JournalEntry | {
  id: string; entry_date: string; title?: string; content: string;
  mood_score: number; reflection_type?: string; ai_summary?: string;
}) {
  if (!userId || userId === 'offline-user' || !supabase) return;
  try {
    await supabase.from('journal_entries').upsert({
      id: entry.id, user_id: userId, entry_date: entry.entry_date,
      title: entry.title ?? null, content: entry.content,
      mood_score: entry.mood_score, reflection_type: entry.reflection_type ?? 'daily',
      ai_summary: entry.ai_summary ?? null,
    }, { onConflict: 'id' });
  } catch (e) { console.warn('[sync] push journal failed', e); }
}

export async function deleteJournalRemote(userId: string, entryId: string) {
  if (!userId || userId === 'offline-user' || !supabase) return;
  try { await supabase.from('journal_entries').delete().eq('id', entryId).eq('user_id', userId); }
  catch (e) { console.warn('[sync] delete journal failed', e); }
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
      id: note.id, user_id: userId, title: note.title, content: note.content,
      tags_json: tags, source_type: note.source_type ?? null,
      reference_url: note.reference_url ?? null, ai_summary: note.ai_summary ?? null,
    }, { onConflict: 'id' });
  } catch (e) { console.warn('[sync] push knowledge failed', e); }
}

export async function deleteKnowledgeRemote(userId: string, noteId: string) {
  if (!userId || userId === 'offline-user' || !supabase) return;
  try { await supabase.from('knowledge_notes').delete().eq('id', noteId).eq('user_id', userId); }
  catch (e) { console.warn('[sync] delete knowledge failed', e); }
}

export async function pushMemory(userId: string, memory: AIMemoryItem) {
  if (!userId || userId === 'offline-user' || !supabase) return;
  try {
    await supabase.from('ai_memories').upsert({
      id: memory.id, user_id: userId, memory_type: memory.category,
      memory_key: memory.title, memory_value: memory.content,
      confidence_score: memory.confidence, source_module: memory.source,
      importance: memory.importance, pinned: memory.pinned,
      favorite: memory.favorite, archived: memory.archived,
      locked: memory.locked, disabled: memory.disabled,
      last_used_at: memory.lastUsedAt,
    }, { onConflict: 'id' });
  } catch (e) { console.warn('[sync] push memory failed', e); }
}

export async function deleteMemoryRemote(userId: string, memoryId: string) {
  if (!userId || userId === 'offline-user' || !supabase) return;
  try { await supabase.from('ai_memories').delete().eq('id', memoryId).eq('user_id', userId); }
  catch (e) { console.warn('[sync] delete memory failed', e); }
}

export async function pushRoutineBlock(userId: string, block: RoutineBlock) {
  if (!userId || userId === 'offline-user' || !supabase) return;
  try {
    await supabase.from('routine_blocks').upsert({
      id: block.id, user_id: userId, title: block.title,
      start_time: block.startTime, end_time: block.endTime,
      category: block.category, description: block.description,
      checklist_items_json: block.checklistItems,
    }, { onConflict: 'id' });
  } catch (e) { console.warn('[sync] push routine failed', e); }
}

export async function deleteRoutineBlockRemote(userId: string, blockId: string) {
  if (!userId || userId === 'offline-user' || !supabase) return;
  try { await supabase.from('routine_blocks').delete().eq('id', blockId).eq('user_id', userId); }
  catch (e) { console.warn('[sync] delete routine failed', e); }
}
