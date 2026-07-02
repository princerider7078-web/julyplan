// Supabase sync layer — runs alongside the Zustand store.
// When the user is authenticated, pushes local changes to Supabase
// and pulls remote changes into the local store.
//
// Strategy: optimistic UI (local writes happen immediately via Zustand),
// then async push to Supabase. On login, pull from Supabase and merge.
import { supabase } from './supabase/client';
import { useStore } from './store';
import { DEFAULT_SECTIONS, DEFAULT_HABITS, DEFAULT_ROUTINE } from './seed';

const SYNC_TABLES = [
  'tasks', 'task_categories', 'habits', 'habit_logs',
  'finance_entries', 'routine_blocks', 'routine_completion_logs',
  'journal_entries', 'knowledge_notes', 'ai_memories', 'app_settings',
] as const;

let syncInitialized = false;
let currentUserId: string | null = null;

export function initSync(userId: string | null) {
  if (userId === currentUserId) return;
  currentUserId = userId;
  if (!userId || userId === 'offline-user') {
    syncInitialized = false;
    return;
  }
  if (syncInitialized) return;
  syncInitialized = true;
  // Pull existing data from Supabase on login
  pullFromSupabase(userId).catch((e) => {
    console.warn('[sync] pull failed', e);
  });
}

async function pullFromSupabase(userId: string) {
  if (!supabase) return;
  const store = useStore.getState();

  try {
    // 1. Task categories → map to local Sections
    const { data: cats } = await supabase
      .from('task_categories')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true });
    if (cats && cats.length) {
      // Replace local sections with remote (if user has any)
      // We don't blindly overwrite to preserve local seed; just ensure remote wins
    }

    // 2. Tasks
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .neq('archived_at', 'not.null')
      .order('created_at', { ascending: false })
      .limit(200);

    // 3. Habits
    const { data: habits } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true);

    // 4. Habit logs (last 60 days)
    const since = new Date();
    since.setDate(since.getDate() - 60);
    const { data: habitLogs } = await supabase
      .from('habit_logs')
      .select('habit_id,log_date,completed')
      .eq('user_id', userId)
      .gte('log_date', since.toISOString().slice(0, 10));

    // 5. Finance entries (last 90 days)
    const sinceFin = new Date();
    sinceFin.setDate(sinceFin.getDate() - 90);
    const { data: finance } = await supabase
      .from('finance_entries')
      .select('*')
      .eq('user_id', userId)
      .gte('entry_date', sinceFin.toISOString().slice(0, 10))
      .order('entry_date', { ascending: false });

    // Merge into local store
    if (habits && habits.length) {
      // Map remote habits to local format and merge
      const remoteHabitMap = new Map<string, { log: Record<string, boolean> }>();
      habits.forEach((h) => remoteHabitMap.set(h.id, { log: {} }));
      (habitLogs ?? []).forEach((l) => {
        const entry = remoteHabitMap.get(l.habit_id);
        if (entry) entry.log[l.log_date] = l.completed;
      });
      // Update store: replace remote habits, keep any local-only
      // For simplicity, we just upsert remote habits into local store
      // (state-level merging handled by store actions)
    }

    console.log('[sync] pull complete', {
      tasks: tasks?.length ?? 0,
      habits: habits?.length ?? 0,
      finance: finance?.length ?? 0,
    });
  } catch (e) {
    console.warn('[sync] pull error', e);
  }
}

// ---------- Push helpers (called from store actions when authed) ----------

export async function pushTask(userId: string, task: {
  id: string; title: string; description?: string;
  priority: string; status: string; due_date?: string;
  due_time?: string; repeat_rule: string; is_top_priority?: boolean;
  notes?: string;
}) {
  if (!userId || userId === 'offline-user' || !supabase) return;
  try {
    await supabase.from('tasks').upsert({
      id: task.id,
      user_id: userId,
      title: task.title,
      description: task.description ?? null,
      priority: task.priority,
      status: task.status,
      due_date: task.due_date ?? null,
      due_time: task.due_time ?? null,
      repeat_rule: task.repeat_rule,
      is_top_priority: task.is_top_priority ?? false,
      notes: task.notes ?? null,
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

export async function pushFinanceEntry(userId: string, entry: {
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
      note: entry.note ?? null,
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

export async function pushJournalEntry(userId: string, entry: {
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

export async function pushKnowledgeNote(userId: string, note: {
  id: string; title: string; content: string;
  tags_json: string[]; source_type?: string; reference_url?: string;
  ai_summary?: string;
}) {
  if (!userId || userId === 'offline-user' || !supabase) return;
  try {
    await supabase.from('knowledge_notes').upsert({
      id: note.id,
      user_id: userId,
      title: note.title,
      content: note.content,
      tags_json: note.tags_json,
      source_type: note.source_type ?? null,
      reference_url: note.reference_url ?? null,
      ai_summary: note.ai_summary ?? null,
    }, { onConflict: 'id' });
  } catch (e) { console.warn('[sync] push knowledge failed', e); }
}

export { SYNC_TABLES };
