// Prompt templates for different AI request types.
// All prompts are written for the "July Plan" personal OS context.

import type { AIContext, AIChatMessage, AIRequestType } from './types';

const BASE_SYSTEM = `You are the AI brain of "July Plan" — a personal life operating system for one user (a student and programmer following a strict routine). Your job is to be a calm, direct, execution-focused coach.

Behavior:
- Be concise. No fluff. No generic advice. Max 150 words.
- Always consider the user's actual data before answering.
- Suggest concrete next actions, not abstract ideas.
- If the user is off-track, name the gap and propose a recovery.
- Use simple Hinglish-friendly tone when appropriate (mix English + light Hindi).
- Never invent stats. If data is missing, say so.

You can manage ALL modules via natural language:
- Tasks: "add task X tomorrow 7 AM", "delete task Y", "complete task Z", "show today's tasks"
- Habits: "add habit drink water", "delete habit reading", "show my habits"
- Finance: "add expense 200 groceries", "add income 5000", "show expenses"
- Sections: "add section Travel", "delete section Work", "show sections"
- Journal: "write journal entry about today", "show journal"
- Knowledge: "add note about React hooks", "show notes"
- Memory: "remember that I wake up at 5 AM", "forget my coffee preference", "show memories"

Delete actions ALWAYS require confirmation — never delete silently.`;

const MEMORY_HEADER = (memories?: AIContext['memories']) => {
  if (!memories || memories.length === 0) return '';
  const lines = memories
    .slice(0, 6)  // trimmed from 12 for faster context
    .map((m) => `- ${m.memory_type} / ${m.memory_key}: ${m.memory_value} (confidence ${m.confidence_score})`);
  return `\n\nKnown memories about the user:\n${lines.join('\n')}`;
};

const CONTEXT_BLOCK = (ctx?: AIContext) => {
  if (!ctx) return '';
  const lines: string[] = [];
  if (ctx.currentDate) lines.push(`Current date: ${ctx.currentDate}`);
  if (ctx.userProfile) {
    const p = ctx.userProfile;
    if (p.name) lines.push(`User: ${p.name}`);
    if (p.wake_time && p.sleep_time) lines.push(`Sleep cycle: wake ${p.wake_time}, sleep ${p.sleep_time}`);
    if (p.office_start_time) lines.push(`Office: ${p.office_start_time}–${p.office_end_time}`);
    if (p.goal_weight) lines.push(`Goal weight: ${p.goal_weight}kg (current ${p.current_weight ?? '?'})`);
    if (p.daily_protein_goal) lines.push(`Protein goal: ${p.daily_protein_goal}g/day`);
    if (p.daily_water_goal) lines.push(`Water goal: ${p.daily_water_goal}ml/day`);
  }
  if (ctx.todayTasks && ctx.todayTasks.length > 0) {
    lines.push(`Today's tasks:`);
    ctx.todayTasks.slice(0, 5).forEach((t) =>  // trimmed from 10
      lines.push(`  - [${t.done ? 'x' : ' '}] ${t.title} (${t.priority}${t.time ? ', ' + t.time : ''})`),
    );
  }
  if (ctx.recentHabits && ctx.recentHabits.length > 0) {
    lines.push(`Habits today:`);
    ctx.recentHabits.forEach((h) =>
      lines.push(`  - ${h.name}: ${h.doneToday ? 'done' : 'pending'} (streak ${h.streak}d)`),
    );
  }
  if (ctx.recentHealth) {
    const h = ctx.recentHealth;
    const parts: string[] = [];
    if (h.sleep_hours != null) parts.push(`sleep ${h.sleep_hours}h`);
    if (h.water_liters != null) parts.push(`water ${h.water_liters}L`);
    if (h.protein_grams != null) parts.push(`protein ${h.protein_grams}g`);
    if (h.workout_minutes != null) parts.push(`workout ${h.workout_minutes}min`);
    if (parts.length) lines.push(`Recent health: ${parts.join(', ')}`);
  }
  if (ctx.recentFinance) {
    lines.push(`Finance: today ₹${ctx.recentFinance.todaySpend}, this month ₹${ctx.recentFinance.monthSpend} (budget ₹${ctx.recentFinance.budget})`);
  }
  if (ctx.recentJournal && ctx.recentJournal.length > 0) {
    lines.push(`Recent journal mood avg: ${(ctx.recentJournal.reduce((s, j) => s + j.mood, 0) / ctx.recentJournal.length).toFixed(1)}/10`);
  }
  if (ctx.analytics) {
    lines.push(`Today's scores: overall ${ctx.analytics.overallScore}%, habits ${ctx.analytics.habitScore}%, health ${ctx.analytics.healthScore}%`);
  }
  return lines.length ? `\n\nCurrent context:\n${lines.join('\n')}` : '';
};

export function buildChatPrompt(
  userMessage: string,
  ctx?: AIContext,
  history: AIChatMessage[] = [],
): AIChatMessage[] {
  return [
    { role: 'system', content: BASE_SYSTEM + CONTEXT_BLOCK(ctx) + MEMORY_HEADER(ctx?.memories) },
    ...history.slice(-6),
    { role: 'user', content: userMessage },
  ];
}

export function buildPlannerPrompt(
  slot: 'morning' | 'afternoon' | 'evening' | 'night' | 'recovery' | 'weekly' | 'monthly',
  ctx?: AIContext,
): AIChatMessage[] {
  const slotPrompts: Record<string, string> = {
    morning: 'Build the user\'s morning plan (6 AM – 12 PM). 4-6 concrete blocks with times. Include workout, meditation, breakfast, voice, study start.',
    afternoon: 'Build the afternoon plan (12 PM – 5 PM). Include lunch, nap, brain training, looks, snack.',
    evening: 'Build the evening plan (5 PM – 11 PM). Include freshen up, office prep, office work with breaks.',
    night: 'Build the night plan (11 PM – 12 AM). Dinner, night routine, tomorrow\'s top 3 tasks, no-phone rule.',
    recovery: 'The user has missed some items. Build a recovery plan for the rest of today. Prioritize the most impactful 3-4 items.',
    weekly: 'Build a weekly execution plan (Mon-Sun). Focus areas per day, 1 weekly theme.',
    monthly: 'Build a monthly execution plan for July. 4 weekly themes, top priorities, money & health goals.',
  };
  return [
    { role: 'system', content: BASE_SYSTEM + CONTEXT_BLOCK(ctx) + MEMORY_HEADER(ctx?.memories) },
    {
      role: 'user',
      content: `${slotPrompts[slot]}\n\nReturn as a clean markdown list with times. Be specific to the user's data above.`,
    },
  ];
}

export function buildReportPrompt(
  type: 'daily' | 'weekly' | 'monthly',
  ctx?: AIContext,
): AIChatMessage[] {
  const typePrompts: Record<string, string> = {
    daily: 'Generate today\'s report. Sections: Done, Pending, Health, Finance, Suggestion for tomorrow.',
    weekly: 'Generate this week\'s report. Sections: Best day, Worst day, Consistency, Missed habits, Health trend, Finance trend, AI suggestion.',
    monthly: 'Generate this month\'s report. Sections: Completion %, Wasted days, Major wins, Weak areas, Plan for next month.',
  };
  return [
    { role: 'system', content: BASE_SYSTEM + CONTEXT_BLOCK(ctx) + MEMORY_HEADER(ctx?.memories) },
    { role: 'user', content: typePrompts[type] + '\n\nUse real data. Be honest, not motivational.' },
  ];
}

export function buildNotificationPrompt(
  type: 'water' | 'workout' | 'sleep' | 'task' | 'habit' | 'finance',
  ctx?: AIContext,
): AIChatMessage[] {
  return [
    { role: 'system', content: BASE_SYSTEM + CONTEXT_BLOCK(ctx) },
    {
      role: 'user',
      content: `Write ONE contextual notification for: ${type}.
Rules:
- Max 15 words
- Use the user's actual data (today's water, missed tasks, etc.)
- Actionable tone, not nagging
- Mix English + light Hindi if natural
- Return only the notification text, no quotes`,
    },
  ];
}

export function buildJournalSummaryPrompt(content: string, mood: number): AIChatMessage[] {
  return [
    { role: 'system', content: BASE_SYSTEM },
    {
      role: 'user',
      content: `Summarize this journal entry in 2-3 sentences. Mood was ${mood}/10.\n\nJournal:\n${content}\n\nReturn only the summary.`,
    },
  ];
}

export function buildKnowledgeSummaryPrompt(content: string): AIChatMessage[] {
  return [
    { role: 'system', content: BASE_SYSTEM },
    {
      role: 'user',
      content: `Summarize this note in 2-3 sentences + extract 3-5 tags as a JSON array.\n\nNote:\n${content}\n\nReturn as JSON: { "summary": "...", "tags": ["...", "..."] }`,
    },
  ];
}

export function buildMemoryExtractionPrompt(conversation: string): AIChatMessage[] {
  return [
    { role: 'system', content: BASE_SYSTEM },
    {
      role: 'user',
      content: `Extract durable facts about the user from this conversation. Only extract stable, useful facts (preferences, routines, goals, constraints) — NOT one-off questions.\n\nConversation:\n${conversation}\n\nReturn as JSON array: [{ "memory_type": "routine|preference|goal|constraint|health|finance|voice|study", "memory_key": "short-key", "memory_value": "...", "confidence_score": 0.0-1.0 }]\nReturn empty array [] if nothing durable.`,
    },
  ];
}

export const SYSTEM_PROMPT = BASE_SYSTEM;
export { CONTEXT_BLOCK, MEMORY_HEADER };

export type { AIRequestType };
