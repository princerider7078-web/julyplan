// Context Builder — assembles real-time data into AIContext for prompts.
// V3: uses semantic-ish memory retrieval to inject only relevant memories.
import { supabase } from '../supabase/client';
import { retrieveRelevantMemories, getActiveMemories } from './memory';
import type { AIContext } from './types';

function todayISO() { return new Date().toISOString().slice(0, 10); }

function getLast7Days() {
  const arr: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    arr.push(d.toISOString().slice(0, 10));
  }
  return arr;
}

// Build context from local store (offline mode + default for online)
// V3: retrieves memories relevant to the user's query, not all of them.
export function buildLocalContext(opts: {
  todayTasks?: AIContext['todayTasks'];
  recentHabits?: AIContext['recentHabits'];
  recentHealth?: AIContext['recentHealth'];
  recentFinance?: AIContext['recentFinance'];
  recentJournal?: AIContext['recentJournal'];
  analytics?: AIContext['analytics'];
  memories?: AIContext['memories'];
  // V3: optional user query for semantic memory retrieval
  userQuery?: string;
}): AIContext {
  // If userQuery is provided, retrieve relevant memories semantically.
  // Otherwise fall back to whatever was passed in.
  let memories = opts.memories;
  if (opts.userQuery && !opts.memories) {
    const retrieved = retrieveRelevantMemories(opts.userQuery, 8);
    memories = retrieved.map((m) => ({
      id: m.id,
      memory_type: m.category,
      memory_key: m.title,
      memory_value: m.content,
      confidence_score: m.confidence,
      source_module: m.source,
      last_used_at: m.lastUsedAt,
    }));
  }

  return {
    currentDate: todayISO(),
    todayTasks: opts.todayTasks,
    recentHabits: opts.recentHabits,
    recentHealth: opts.recentHealth,
    recentFinance: opts.recentFinance,
    recentJournal: opts.recentJournal,
    analytics: opts.analytics,
    memories,
  };
}

export async function buildContext(userId: string, userQuery?: string): Promise<AIContext> {
  const ctx: AIContext = { currentDate: todayISO() };
  if (!userId) return ctx;

  try {
    // User profile
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (profile) {
      ctx.userProfile = {
        name: profile.name,
        wake_time: profile.wake_time,
        sleep_time: profile.sleep_time,
        office_start_time: profile.office_start_time,
        office_end_time: profile.office_end_time,
        goal_weight: profile.goal_weight,
        current_weight: profile.current_weight,
        daily_protein_goal: profile.daily_protein_goal,
        daily_water_goal: profile.daily_water_goal,
      };
    }

    const today = todayISO();

    // Today's tasks
    const { data: tasks } = await supabase
      .from('tasks')
      .select('title,priority,due_time,status,repeat_rule')
      .eq('user_id', userId)
      .neq('status', 'archived')
      .order('created_at', { ascending: false })
      .limit(20);
    if (tasks && tasks.length) {
      const { data: logs } = await supabase
        .from('task_completion_logs')
        .select('task_id,completed')
        .eq('user_id', userId)
        .eq('log_date', today);
      const doneSet = new Set((logs ?? []).filter((l) => l.completed).map((l) => l.task_id));
      ctx.todayTasks = tasks.map((t) => ({
        title: t.title,
        priority: t.priority,
        time: t.due_time ?? undefined,
        done: t.status === 'completed',
      }));
    }

    // Habits + today's logs + streaks
    const { data: habits } = await supabase
      .from('habits')
      .select('id,title')
      .eq('user_id', userId)
      .eq('active', true);
    if (habits && habits.length) {
      const { data: todayLogs } = await supabase
        .from('habit_logs')
        .select('habit_id,completed')
        .eq('user_id', userId)
        .eq('log_date', today);
      const todayDone = new Set((todayLogs ?? []).filter((l) => l.completed).map((l) => l.habit_id));
      const last7 = getLast7Days();
      const { data: recentLogs } = await supabase
        .from('habit_logs')
        .select('habit_id,log_date,completed')
        .eq('user_id', userId)
        .in('log_date', last7);
      ctx.recentHabits = habits.map((h) => {
        let streak = 0;
        const d = new Date();
        while (true) {
          const iso = d.toISOString().slice(0, 10);
          const log = (recentLogs ?? []).find((l) => l.habit_id === h.id && l.log_date === iso);
          if (log?.completed) { streak++; d.setDate(d.getDate() - 1); } else break;
        }
        return { name: h.title, doneToday: todayDone.has(h.id), streak };
      });
    }

    // Recent health
    const last7 = getLast7Days();
    const { data: health } = await supabase
      .from('health_logs')
      .select('sleep_hours,water_liters,protein_grams,workout_minutes')
      .eq('user_id', userId)
      .in('log_date', last7);
    if (health && health.length) {
      const avg = (key: keyof typeof health[0]) =>
        health.reduce((s, h) => s + (Number(h[key]) || 0), 0) / health.length;
      ctx.recentHealth = {
        sleep_hours: Number(avg('sleep_hours').toFixed(1)) || undefined,
        water_liters: Number(avg('water_liters').toFixed(1)) || undefined,
        protein_grams: Math.round(avg('protein_grams')) || undefined,
        workout_minutes: Math.round(avg('workout_minutes')) || undefined,
      };
    }

    // Finance
    const { data: finance } = await supabase
      .from('finance_entries')
      .select('amount,entry_type,entry_date')
      .eq('user_id', userId);
    if (finance && finance.length) {
      const todaySpend = finance
        .filter((f) => f.entry_type === 'expense' && f.entry_date === today)
        .reduce((s, f) => s + Number(f.amount), 0);
      const monthPrefix = today.slice(0, 7);
      const monthSpend = finance
        .filter((f) => f.entry_type === 'expense' && f.entry_date?.startsWith(monthPrefix))
        .reduce((s, f) => s + Number(f.amount), 0);
      ctx.recentFinance = { todaySpend, monthSpend, budget: 5000 };
    }

    // Recent journal
    const { data: journals } = await supabase
      .from('journal_entries')
      .select('mood_score,content')
      .eq('user_id', userId)
      .order('entry_date', { ascending: false })
      .limit(5);
    if (journals && journals.length) {
      ctx.recentJournal = journals.map((j) => ({
        mood: j.mood_score ?? 5,
        content: (j.content ?? '').slice(0, 100),
      }));
    }
  } catch { /* silent — return partial context */ }

  return ctx;
}

export { retrieveRelevantMemories, getActiveMemories };

