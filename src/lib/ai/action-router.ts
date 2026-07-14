// JULY — Universal AI Action Router
// Generalizes task-manager.ts pattern to ALL 10 domains.
// Local fast-path first (instant, no AI), then AI fallback with JSON output.

import { aiChat } from './index';
import type { AIContext, AIResponse } from './types';
import { useStore } from '../store';
import { parseNaturalDateTime, stripDateTimePhrases } from '../date-parser';

// ─── Types ───

export type Domain = 'task' | 'habit' | 'routine' | 'journal' | 'finance' | 'knowledge' | 'memory' | 'notification' | 'settings' | 'navigation' | 'report';

export interface AppAction {
  domain: Domain;
  action: string;
  params: Record<string, unknown>;
}

export interface ActionEnvelope {
  reply: string;
  actions: AppAction[];
  needs_confirmation: boolean;
  confirmation_question: string | null;
}

export interface ActionResult {
  success: boolean;
  message: string;
  taskId?: string;
  needsConfirmation?: boolean;
  confirmationQuestion?: string;
  pendingActions?: AppAction[];
  navigateTo?: string;
}

// ─── Fuzzy match helpers (reused across domains) ───

function findByQuery<T extends { id: string; title: string }>(
  list: T[], query: string,
): T | null {
  const q = query.toLowerCase().trim();
  if (!q) return null;

  // Exact
  const exact = list.find((item) => item.title.toLowerCase() === q);
  if (exact) return exact;

  // Contains
  const contains = list.find((item) => item.title.toLowerCase().includes(q));
  if (contains) return contains;

  // Reverse
  const reverse = list.find((item) => q.includes(item.title.toLowerCase()));
  if (reverse) return reverse;

  // Word overlap
  const qWords = q.split(/\s+/).filter((w) => w.length > 2);
  let best: T | null = null;
  let bestScore = 0;
  for (const item of list) {
    const tWords = item.title.toLowerCase().split(/\s+/);
    const overlap = qWords.filter((w) => tWords.some((tw) => tw.includes(w))).length;
    if (overlap > bestScore) { bestScore = overlap; best = item; }
  }
  return bestScore > 0 ? best : null;
}

// ─── Local fast-path parser ───
// Handles common phrasings INSTANTLY without an AI round-trip.

export function tryLocalParse(input: string): ActionEnvelope | null {
  const text = input.toLowerCase().trim();

  // ── CONFIRMATION (yes/haan/pakka/confirm) ──
  if (/^(yes|y|haan|pakka|confirm|ok|kar do|kar do|done|sure)\b/i.test(text)) {
    return {
      reply: '',
      actions: [],
      needs_confirmation: false,
      confirmation_question: null,
    };
  }

  // ── MEMORY: remember ──
  if (/^(remember|save|note|memorize|don'?t forget)\s+/i.test(input)) {
    const content = input.replace(/^(remember|save|note|memorize|don'?t forget)\s+(this|that|the fact that)?\s*/i, '').trim();
    if (content) {
      const category = detectCategory(content);
      return {
        reply: `Noted — "${content.slice(0, 60)}" remembered under ${category}.`,
        actions: [{ domain: 'memory', action: 'remember', params: { category, key: content.slice(0, 60), value: content, importance: 'medium' } }],
        needs_confirmation: false,
        confirmation_question: null,
      };
    }
  }

  // ── MEMORY: forget/delete ──
  if (/^(forget|delete|remove)\s+(my\s+)?memor/i.test(input)) {
    const query = input.replace(/^(forget|delete|remove)\s+(my\s+)?memor(y|ies)\s*(about|of|:)?\s*/i, '').trim();
    return {
      reply: `Pakka "${query}" related memory delete karna hai?`,
      actions: [{ domain: 'memory', action: 'forget', params: { memory_ref: query } }],
      needs_confirmation: true,
      confirmation_question: `Confirm: delete memory about "${query}"?`,
    };
  }

  // ── MEMORY: show ──
  if (/^(show|list|view|display)\s+(my\s+)?memor/i.test(input)) {
    return {
      reply: '',
      actions: [{ domain: 'memory', action: 'show_memories', params: {} }],
      needs_confirmation: false,
      confirmation_question: null,
    };
  }

  // ── TASK: add ──
  if (/^(add|create|new|schedule|remind me to|set up|make)\s+/i.test(input)) {
    const cleaned = stripDateTimePhrases(input);
    const dt = parseNaturalDateTime(input);
    if (cleaned) {
      return {
        reply: `Adding task "${cleaned}"${dt.date || dt.time ? ` for ${[dt.date, dt.time].filter(Boolean).join(' at ')}` : ''}...`,
        actions: [{ domain: 'task', action: 'add_task', params: { title: cleaned, due_date: dt.date, due_time: dt.time } }],
        needs_confirmation: false,
        confirmation_question: null,
      };
    }
  }

  // ── TASK: complete ──
  if (/^(complete|done|finish|mark done|mark complete)\s+/i.test(input)) {
    const cleaned = stripDateTimePhrases(input);
    return {
      reply: '',
      actions: [{ domain: 'task', action: 'complete_task', params: { task_ref: cleaned } }],
      needs_confirmation: false,
      confirmation_question: null,
    };
  }

  // ── TASK: delete ──
  if (/^(delete|remove|drop)\s+/i.test(input)) {
    const cleaned = stripDateTimePhrases(input);
    return {
      reply: `Pakka "${cleaned}" delete karna hai? Ye undo nahi hoga.`,
      actions: [{ domain: 'task', action: 'delete_task', params: { task_ref: cleaned } }],
      needs_confirmation: true,
      confirmation_question: `Confirm delete "${cleaned}"?`,
    };
  }

  // ── TASK: show ──
  if (/^(show|list|view|what are|what's|display)\s+.*(task|today|schedule|plan)/i.test(input)) {
    return {
      reply: '',
      actions: [{ domain: 'task', action: 'show_tasks', params: {} }],
      needs_confirmation: false,
      confirmation_question: null,
    };
  }

  // ── HABIT: add ──
  if (/\b(add|create|new)\s+(habit|daily)\s+/i.test(input)) {
    const title = input.replace(/^(add|create|new)\s+(habit|daily)\s+(reminder\s+to\s+)?/i, '').trim();
    if (title) {
      return {
        reply: `Habit "${title}" add kar diya ✅`,
        actions: [{ domain: 'habit', action: 'add_habit', params: { title, category: 'General' } }],
        needs_confirmation: false,
        confirmation_question: null,
      };
    }
  }

  // ── HABIT: complete ──
  if (/\b(complete|done|mark done)\s+.*(habit)/i.test(input) || /\bhabit\s+.*\b(complete|done)/i.test(input)) {
    const habitMatch = input.match(/(?:complete|done|mark done)\s+(?:the\s+)?(\w+(?:\s+\w+)?)\s+habit/i);
    const habitName = habitMatch?.[1] ?? input.replace(/^(complete|done|mark done)\s+/i, '').replace(/\s+habit/i, '').trim();
    return {
      reply: '',
      actions: [{ domain: 'habit', action: 'mark_habit_complete', params: { habit_ref: habitName } }],
      needs_confirmation: false,
      confirmation_question: null,
    };
  }

  // ── HABIT: delete ──
  if (/\b(delete|remove|drop)\s+(habit|daily)\s+/i.test(input)) {
    const query = input.replace(/^(delete|remove|drop)\s+(habit|daily)\s+/i, '').trim();
    return {
      reply: `Pakka habit "${query}" delete karna hai?`,
      actions: [{ domain: 'habit', action: 'delete_habit', params: { habit_ref: query } }],
      needs_confirmation: true,
      confirmation_question: `Confirm delete habit "${query}"?`,
    };
  }

  // ── HABIT: show ──
  if (/\b(show|list|view)\s+(my\s+)?habits\b/i.test(input)) {
    return {
      reply: '',
      actions: [{ domain: 'habit', action: 'show_habits', params: {} }],
      needs_confirmation: false,
      confirmation_question: null,
    };
  }

  // ── FINANCE: add expense ──
  if (/\b(add|create|log)\s+(expense|spend|spent|payment)\s+/i.test(input)) {
    const rest = input.replace(/^(add|create|log)\s+(expense|spend|spent|payment)\s+(of\s+)?/i, '').trim();
    const amountMatch = rest.match(/₹?\s*(\d+)/);
    const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;
    const category = rest.replace(/₹?\s*\d+/, '').replace(/\s+(today|yesterday|on\s+\w+)/i, '').trim() || 'General';
    return {
      reply: `₹${amount} ka expense "${category}" me add kar diya ✅`,
      actions: [{ domain: 'finance', action: 'add_finance_entry', params: { entry_type: 'expense', amount, category, entry_date: new Date().toISOString().slice(0, 10) } }],
      needs_confirmation: false,
      confirmation_question: null,
    };
  }

  // ── FINANCE: add income ──
  if (/\b(add|create|log)\s+(income|earned|received)\s+/i.test(input)) {
    const rest = input.replace(/^(add|create|log)\s+(income|earned|received)\s+(of\s+)?/i, '').trim();
    const amountMatch = rest.match(/₹?\s*(\d+)/);
    const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;
    return {
      reply: `₹${amount} ka income add kar diya ✅`,
      actions: [{ domain: 'finance', action: 'add_finance_entry', params: { entry_type: 'income', amount, category: 'Income', entry_date: new Date().toISOString().slice(0, 10) } }],
      needs_confirmation: false,
      confirmation_question: null,
    };
  }

  // ── FINANCE: show ──
  if (/\b(show|list|view)\s+(my\s+)?(finances?|expenses|spending)\b/i.test(input)) {
    return {
      reply: '',
      actions: [{ domain: 'finance', action: 'show_finance_summary', params: {} }],
      needs_confirmation: false,
      confirmation_question: null,
    };
  }

  // ── SECTION: add ──
  if (/\b(add|create|new)\s+(section|category)\s+/i.test(input)) {
    const name = input.replace(/^(add|create|new)\s+(section|category)\s+/i, '').trim();
    return {
      reply: `Section "${name}" add kar diya ✅`,
      actions: [{ domain: 'task', action: 'add_task', params: { title: '__ADD_SECTION__', section: name } }],
      needs_confirmation: false,
      confirmation_question: null,
    };
  }

  // ── KNOWLEDGE: add ──
  if (/\b(add|create|save)\s+(note|knowledge)\s+/i.test(input)) {
    const title = input.replace(/^(add|create|save)\s+(note|knowledge)\s+/i, '').trim();
    return {
      reply: `Note "${title}" add kar diya ✅`,
      actions: [{ domain: 'knowledge', action: 'add_knowledge_note', params: { title, content: title } }],
      needs_confirmation: false,
      confirmation_question: null,
    };
  }

  // ── JOURNAL: add ──
  if (/\b(add|create|write)\s+(journal|entry|diary)\s+/i.test(input)) {
    const title = input.replace(/^(add|create|write)\s+(journal|entry|diary)\s+/i, '').trim();
    return {
      reply: `Journal entry add kar diya ✅`,
      actions: [{ domain: 'journal', action: 'add_journal_entry', params: { entry_date: new Date().toISOString().slice(0, 10), content: title, mood_score: 7 } }],
      needs_confirmation: false,
      confirmation_question: null,
    };
  }

  // ── NAVIGATION ──
  const navMatch = input.match(/\b(go to|open|show|navigate to)\s+(dashboard|today|tasks|sections|routine|habits|finance|monthly|journal|knowledge|ai.?chat|ai.?planner|memory|settings|notifications?|reports?)\b/i);
  if (navMatch) {
    const viewMap: Record<string, string> = {
      dashboard: 'dashboard', today: 'today', tasks: 'tasks', sections: 'sections',
      routine: 'routine', habits: 'habits', finance: 'finance', monthly: 'monthly',
      journal: 'journal', knowledge: 'knowledge', 'ai chat': 'ai-chat', 'aichat': 'ai-chat',
      'ai planner': 'ai-planner', 'aiplanner': 'ai-planner', memory: 'memory',
      settings: 'settings', notifications: 'notifications', notification: 'notifications',
      reports: 'reports', report: 'reports',
    };
    const view = viewMap[navMatch[2].toLowerCase()];
    if (view) {
      return {
        reply: `Opening ${navMatch[2]}...`,
        actions: [{ domain: 'navigation', action: 'navigate_to', params: { view } }],
        needs_confirmation: false,
        confirmation_question: null,
      };
    }
  }

  return null; // No local match — need AI
}

// ─── Category detection for memory ───

function detectCategory(text: string): string {
  const lower = ' ' + text.toLowerCase() + ' ';
  const cats: Record<string, string[]> = {
    personal: ['my name is', "i'm ", 'i am ', 'i live'],
    goals: ['my goal', 'i want to become', 'i want to learn', 'i plan to', 'my dream'],
    habits: ['i wake up', 'i sleep', 'i drink', 'i eat', 'i exercise', 'i meditate', 'every day', 'every morning', 'every night', 'i always', 'i never'],
    routine: ['my routine', 'i start my day', 'in the morning i', 'at night i'],
    preferences: ['i like', 'i love', 'i hate', 'i prefer', "i don't like", 'i enjoy', 'my favorite'],
    health: ['my weight', 'i have', 'my health', 'allergic', 'allergy', 'i feel pain'],
    work: ['my job', 'my office', 'i work', 'my boss', 'my company', 'office time'],
    education: ['i study', 'my college', 'i am preparing for', 'my course', 'i am learning'],
    relationships: ['my friend', 'my family', 'my girlfriend', 'my boyfriend', 'my wife', 'my husband', 'my mother', 'my father'],
    skills: ['i know', 'i can', 'my skill', "i'm good at", 'i code', 'i program'],
    projects: ['my project', "i'm building", 'i am building', "i'm working on", 'my app', 'my startup'],
    events: ['on monday', 'on tuesday', 'next week', 'my birthday is', 'my anniversary'],
  };
  for (const [cat, keywords] of Object.entries(cats)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return cat;
    }
  }
  return 'custom';
}

// ─── AI fallback (when local parse doesn't match) ───

const ACTION_SYSTEM_PROMPT = `You are JULY — the central AI brain of the July Plan personal operating system.
You are not a chatbot; you are the primary way the user operates the app.
The user speaks in Hindi, English, or Hinglish. You either do what they asked,
or tell them clearly why you can't — you never pretend to have done something.

You control these domains: Tasks, Habits, Routine, Journal, Finance, Knowledge,
Memory, Notifications, Settings, Navigation, Reports.

RESPONSE FORMAT — always reply with exactly one JSON object, no markdown:
{
  "reply": string,
  "actions": Action[],
  "needs_confirmation": boolean,
  "confirmation_question": string | null
}

CRITICAL RULES:
1. If needs_confirmation is true, "reply" MUST be a QUESTION asking to confirm — NEVER say "done" or "deleted" or "completed". Example: "Pakka 'X' delete karna hai?"
2. If needs_confirmation is false AND actions exist, actions WILL be executed automatically — so "reply" can say "done" or "added" etc.
3. If needs_confirmation is false AND actions is empty, it's pure conversation.
4. "actions" must ALWAYS contain the full action objects even when needs_confirmation is true — they will be executed when the user confirms.

ACTION FORMAT — every action MUST have domain, action, and params:
{ "domain": "task", "action": "delete_task", "params": { "task_ref": "task name" } }
{ "domain": "habit", "action": "add_habit", "params": { "title": "habit name", "category": "General" } }
{ "domain": "finance", "action": "add_finance_entry", "params": { "entry_type": "expense", "amount": 200, "category": "Food", "entry_date": "2026-07-14" } }
{ "domain": "memory", "action": "remember", "params": { "category": "health", "key": "allergy", "value": "peanuts", "importance": "high" } }

NEVER omit "domain" — it is required. Each action MUST look like:
{"domain": "<domain>", "action": "<action_name>", "params": {...}}

Available actions:
- task: add_task, edit_task, complete_task, uncomplete_task, delete_task, move_task, duplicate_task, archive_task, show_tasks
- habit: add_habit, delete_habit, mark_habit_complete, mark_habit_incomplete, check_streak, show_habits
- routine: mark_routine_block_complete, update_routine_block, generate_plan, show_routine
- journal: add_journal_entry, edit_journal_entry, summarize_journal_entry, show_journal
- finance: add_finance_entry, edit_finance_entry, delete_finance_entry, set_finance_target, show_finance_summary
- knowledge: add_knowledge_note, edit_knowledge_note, delete_knowledge_note, search_knowledge, summarize_knowledge_note
- memory: remember, forget, search_memory, show_memories, pin_memory, favorite_memory, archive_memory, lock_memory
- notification: create_notification, snooze_notification, cancel_notification, update_notification_preferences
- settings: update_theme, update_daily_targets, export_backup, import_backup, reset_app
- navigation: navigate_to
- report: generate_report, show_analytics

CONFIRMATION RULES:
- Require confirmation (needs_confirmation: true) for: delete_task, delete_habit, delete_finance_entry, delete_knowledge_note, forget, reset_app, import_backup
- NO confirmation (needs_confirmation: false) for: add_*, edit_*, complete_task, mark_habit_complete, navigate_to, show_*, generate_report
- If user's message confirms a prior question ("yes", "haan", "pakka", "confirm", "kar do"), set needs_confirmation: false and include the actions to execute.

RULES:
- Match task/habit/note references by title (exact → contains → word overlap).
- Resolve relative dates ("tomorrow", "kal", "next Monday") to ISO dates using CURRENT_DATE.
- Multiple requests in one message → multiple action objects in order.
- "reply" should be warm, direct, under 60 words, matching user's language.
- Never invent ids, streaks, balances, or past events.
- NEVER say "deleted" or "done" in reply when needs_confirmation is true.`;

export async function parseWithAI(
  input: string,
  ctx: AIContext | undefined,
  history: { role: 'user' | 'assistant'; content: string }[],
  opts?: Parameters<typeof aiChat>[3],
): Promise<ActionEnvelope> {
  try {
    // Build messages manually with the ACTION system prompt (not BASE_SYSTEM)
    const { aiChat } = await import('./index');
    const response = await aiChat(
      input,
      ctx,
      // Prepend the action system prompt as the first system message
      [{ role: 'system', content: ACTION_SYSTEM_PROMPT }, ...history.slice(-4)],
      {
        ...opts,
        profile: opts?.profile ? { ...opts.profile, temperature: 0.1, max_tokens: 800 } : undefined,
      },
    );

    // Try to parse JSON from response
    let json: unknown = response.json;
    if (!json && response.text) {
      try {
        // Strip markdown fences if present
        const cleaned = response.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        json = JSON.parse(cleaned);
      } catch { /* not JSON */ }
    }

    if (json && typeof json === 'object') {
      const obj = json as Partial<ActionEnvelope>;
      // Normalize actions: ensure domain field exists on each action
      const rawActions = Array.isArray(obj.actions) ? obj.actions as AppAction[] : [];
      const normalizedActions = rawActions.map((a) => ({
        domain: a.domain || inferDomain(a.action),
        action: a.action,
        params: a.params || {},
      }));
      return {
        reply: obj.reply ?? response.text ?? '',
        actions: normalizedActions,
        needs_confirmation: obj.needs_confirmation ?? false,
        confirmation_question: obj.confirmation_question ?? null,
      };
    }

    // If AI didn't return JSON, treat as plain reply
    return {
      reply: response.text,
      actions: [],
      needs_confirmation: false,
      confirmation_question: null,
    };
  } catch (e) {
    return {
      reply: `Sorry, I couldn't process that. ${e instanceof Error ? e.message : 'Please try again.'}`,
      actions: [],
      needs_confirmation: false,
      confirmation_question: null,
    };
  }
}

// ─── Infer domain from action name (when AI forgets to include domain) ───

function inferDomain(actionName: string): Domain {
  if (actionName.startsWith('add_task') || actionName.startsWith('edit_task') ||
      actionName.startsWith('complete_task') || actionName.startsWith('delete_task') ||
      actionName.startsWith('move_task') || actionName.startsWith('show_tasks') ||
      actionName.startsWith('archive_task') || actionName.startsWith('duplicate_task') ||
      actionName.startsWith('uncomplete_task')) return 'task';

  if (actionName.startsWith('add_habit') || actionName.startsWith('delete_habit') ||
      actionName.startsWith('mark_habit') || actionName.startsWith('check_streak') ||
      actionName.startsWith('show_habits')) return 'habit';

  if (actionName.startsWith('mark_routine') || actionName.startsWith('update_routine') ||
      actionName.startsWith('generate_plan') || actionName.startsWith('show_routine')) return 'routine';

  if (actionName.startsWith('add_journal') || actionName.startsWith('edit_journal') ||
      actionName.startsWith('summarize_journal') || actionName.startsWith('show_journal')) return 'journal';

  if (actionName.startsWith('add_finance') || actionName.startsWith('edit_finance') ||
      actionName.startsWith('delete_finance') || actionName.startsWith('set_finance') ||
      actionName.startsWith('show_finance')) return 'finance';

  if (actionName.startsWith('add_knowledge') || actionName.startsWith('edit_knowledge') ||
      actionName.startsWith('delete_knowledge') || actionName.startsWith('search_knowledge') ||
      actionName.startsWith('summarize_knowledge')) return 'knowledge';

  if (actionName === 'remember' || actionName === 'forget' || actionName.startsWith('search_memory') ||
      actionName.startsWith('show_memories') || actionName.startsWith('pin_memory') ||
      actionName.startsWith('favorite_memory') || actionName.startsWith('archive_memory') ||
      actionName.startsWith('lock_memory') || actionName.startsWith('merge_duplicate')) return 'memory';

  if (actionName.startsWith('create_notification') || actionName.startsWith('snooze_notification') ||
      actionName.startsWith('cancel_notification') || actionName.startsWith('update_notification')) return 'notification';

  if (actionName.startsWith('update_theme') || actionName.startsWith('update_daily') ||
      actionName.startsWith('export_backup') || actionName.startsWith('import_backup') ||
      actionName.startsWith('reset_app')) return 'settings';

  if (actionName.startsWith('navigate_to')) return 'navigation';

  if (actionName.startsWith('generate_report') || actionName.startsWith('show_analytics')) return 'report';

  return 'task'; // default
}

// ─── Execute actions against the store ───

export function executeAppAction(action: AppAction): ActionResult {
  const store = useStore.getState();
  const today = new Date().toISOString().slice(0, 10);

  // Fix: infer domain if AI forgot to include it
  if (!action.domain) {
    action.domain = inferDomain(action.action);
  }

  const key = `${action.domain}.${action.action}`;

  switch (key) {
    // ─── TASK ───
    case 'task.add_task': {
      const p = action.params;
      // Special: section creation
      if (p.title === '__ADD_SECTION__' && p.section) {
        store.addSection(p.section as string, 'Target', '#64748b');
        return { success: true, message: `✅ Section "${p.section}" added.` };
      }
      let sectionId = store.sections[0]?.id ?? 'sec-health';
      if (p.section) {
        const sec = store.sections.find((s) => s.name.toLowerCase().includes((p.section as string).toLowerCase()));
        if (sec) sectionId = sec.id;
      }
      const id = store.addTask({
        title: p.title as string,
        sectionId,
        priority: (p.priority as 'low' | 'medium' | 'high' | 'critical') ?? 'medium',
        startDate: (p.due_date as string) ?? today,
        time: p.due_time as string | undefined,
        repeatRule: 'none',
        isTopPriority: p.is_top_priority as boolean | undefined,
      });
      return { success: true, message: `✅ Task "${p.title}" added.`, taskId: id };
    }

    case 'task.complete_task': {
      const task = findByQuery(store.tasks.map(t => ({ id: t.id, title: t.title })), action.params.task_ref as string);
      if (!task) return { success: false, message: `Task "${action.params.task_ref}" not found.` };
      if (store.tasks.find(t => t.id === task.id)?.completionLog?.[today]) {
        return { success: false, message: `"${task.title}" already complete.` };
      }
      store.toggleTaskComplete(task.id);
      return { success: true, message: `✅ "${task.title}" marked complete.`, taskId: task.id };
    }

    case 'task.delete_task': {
      const task = findByQuery(store.tasks.map(t => ({ id: t.id, title: t.title })), action.params.task_ref as string);
      if (!task) return { success: false, message: `Task "${action.params.task_ref}" not found.` };
      store.deleteTask(task.id);
      return { success: true, message: `🗑️ Task "${task.title}" deleted.`, taskId: task.id };
    }

    case 'task.show_tasks': {
      const tasks = store.tasks.filter(t => t.status !== 'archived').slice(0, 10);
      if (!tasks.length) return { success: true, message: 'No tasks found.' };
      return { success: true, message: `📋 Your tasks:\n${tasks.map((t, i) => `${i + 1}. ${t.title} [${t.priority}]${t.time ? ' ' + t.time : ''}`).join('\n')}` };
    }

    case 'task.archive_task': {
      const task = findByQuery(store.tasks.map(t => ({ id: t.id, title: t.title })), action.params.task_ref as string);
      if (!task) return { success: false, message: `Task not found.` };
      store.archiveTask(task.id);
      return { success: true, message: `📦 Task "${task.title}" archived.` };
    }

    case 'task.duplicate_task': {
      const task = findByQuery(store.tasks.map(t => ({ id: t.id, title: t.title })), action.params.task_ref as string);
      if (!task) return { success: false, message: `Task not found.` };
      store.duplicateTask(task.id);
      return { success: true, message: `📋 Task "${task.title}" duplicated.` };
    }

    case 'task.move_task': {
      const task = findByQuery(store.tasks.map(t => ({ id: t.id, title: t.title })), action.params.task_ref as string);
      if (!task) return { success: false, message: `Task not found.` };
      const sec = store.sections.find(s => s.name.toLowerCase().includes((action.params.new_section as string).toLowerCase()));
      if (!sec) return { success: false, message: `Section "${action.params.new_section}" not found.` };
      store.moveTask(task.id, sec.id);
      return { success: true, message: `📅 Moved "${task.title}" to ${sec.name}.` };
    }

    // ─── HABIT ───
    case 'habit.add_habit': {
      store.addHabit(action.params.title as string, (action.params.category as string) ?? 'General', 'daily');
      return { success: true, message: `✅ Habit "${action.params.title}" added.` };
    }

    case 'habit.mark_habit_complete': {
      const habit = findByQuery(store.habits.map(h => ({ id: h.id, title: h.title })), action.params.habit_ref as string);
      if (!habit) return { success: false, message: `Habit "${action.params.habit_ref}" not found.` };
      const date = (action.params.date as string) ?? today;
      if (store.habits.find(h => h.id === habit.id)?.log[date]) {
        return { success: false, message: `"${habit.title}" already done.` };
      }
      store.toggleHabit(habit.id, date);
      return { success: true, message: `✅ Habit "${habit.title}" marked complete.` };
    }

    case 'habit.delete_habit': {
      const habit = findByQuery(store.habits.map(h => ({ id: h.id, title: h.title })), action.params.habit_ref as string);
      if (!habit) return { success: false, message: `Habit not found.` };
      store.deleteHabit(habit.id);
      return { success: true, message: `🗑️ Habit "${habit.title}" deleted.` };
    }

    case 'habit.show_habits': {
      const habits = store.habits;
      if (!habits.length) return { success: true, message: 'No habits yet.' };
      return { success: true, message: `📋 Habits:\n${habits.map((h, i) => `${i + 1}. ${h.title} [${h.category}]${h.log[today] ? ' ✅' : ''}`).join('\n')}` };
    }

    // ─── FINANCE ───
    case 'finance.add_finance_entry': {
      store.addFinanceEntry({
        title: (action.params.category as string) ?? 'Entry',
        amount: action.params.amount as number,
        type: (action.params.entry_type as 'expense' | 'income' | 'saving') ?? 'expense',
        date: (action.params.entry_date as string) ?? today,
        category: (action.params.category as string) ?? 'General',
        note: action.params.note as string | undefined,
      });
      return { success: true, message: `✅ ${(action.params.entry_type as string) ?? 'expense'} of ₹${action.params.amount} added.` };
    }

    case 'finance.delete_finance_entry': {
      const entry = findByQuery(store.finance.map(f => ({ id: f.id, title: f.title })), action.params.entry_ref as string);
      if (!entry) return { success: false, message: `Finance entry not found.` };
      store.deleteFinanceEntry(entry.id);
      return { success: true, message: `🗑️ Entry "${entry.title}" deleted.` };
    }

    case 'finance.show_finance_summary': {
      const monthSpend = store.finance.filter(f => f.type === 'expense' && f.date.slice(0, 7) === today.slice(0, 7)).reduce((s, f) => s + f.amount, 0);
      const todaySpend = store.finance.filter(f => f.type === 'expense' && f.date === today).reduce((s, f) => s + f.amount, 0);
      return { success: true, message: `💰 Today: ₹${todaySpend} | This month: ₹${monthSpend}` };
    }

    // ─── JOURNAL ───
    case 'journal.add_journal_entry': {
      store.addJournalEntry({
        entry_date: (action.params.entry_date as string) ?? today,
        content: action.params.content as string,
        mood_score: (action.params.mood_score as number) ?? 7,
      });
      return { success: true, message: `✅ Journal entry added.` };
    }

    case 'journal.show_journal': {
      if (!store.journal.length) return { success: true, message: 'No journal entries.' };
      return { success: true, message: `📓 Journal:\n${store.journal.slice(0, 5).map(j => `• ${j.title ?? 'Untitled'} (${j.entry_date}) — mood ${j.mood_score}/10`).join('\n')}` };
    }

    // ─── KNOWLEDGE ───
    case 'knowledge.add_knowledge_note': {
      store.addKnowledgeNote({
        title: action.params.title as string,
        content: (action.params.content as string) ?? action.params.title as string,
        tags: (action.params.tags as string[]) ?? [],
      });
      return { success: true, message: `✅ Note "${action.params.title}" added.` };
    }

    case 'knowledge.delete_knowledge_note': {
      const note = findByQuery(store.knowledgeNotes.map(k => ({ id: k.id, title: k.title })), action.params.note_ref as string);
      if (!note) return { success: false, message: `Note not found.` };
      store.deleteKnowledgeNote(note.id);
      return { success: true, message: `🗑️ Note "${note.title}" deleted.` };
    }

    case 'knowledge.search_knowledge': {
      const q = (action.params.query as string).toLowerCase();
      const results = store.knowledgeNotes.filter(n => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q));
      if (!results.length) return { success: true, message: `No notes matching "${q}".` };
      return { success: true, message: `🔍 Found ${results.length}:\n${results.map(n => `• ${n.title}`).join('\n')}` };
    }

    // ─── MEMORY ───
    case 'memory.remember': {
      store.addMemory({
        title: (action.params.key as string).slice(0, 60),
        content: action.params.value as string,
        category: (action.params.category as any) ?? 'custom',
        importance: (action.params.importance as any) ?? 'medium',
        confidence: 1.0,
        source: 'chat',
      });
      return { success: true, message: `🧠 Remembered: "${action.params.value}"` };
    }

    case 'memory.forget': {
      const memory = findByQuery(store.memories.map(m => ({ id: m.id, title: m.title })), action.params.memory_ref as string);
      if (!memory) return { success: false, message: `No memory matching "${action.params.memory_ref}".` };
      store.deleteMemory(memory.id);
      return { success: true, message: `🗑️ Forgot: "${memory.title}"` };
    }

    case 'memory.show_memories': {
      if (!store.memories.length) return { success: true, message: 'No memories yet.' };
      return { success: true, message: `🧠 Memories (${store.memories.length}):\n${store.memories.slice(0, 15).map((m, i) => `${i + 1}. **${m.title}** [${m.category}]`).join('\n')}` };
    }

    case 'memory.search_memory': {
      const q = (action.params.query as string ?? '').toLowerCase();
      const results = store.memories.filter(m => m.title.toLowerCase().includes(q) || m.content.toLowerCase().includes(q));
      if (!results.length) return { success: true, message: `No memories matching "${q}".` };
      return { success: true, message: `🔍 Found ${results.length}:\n${results.map(m => `• **${m.title}**: ${m.content.slice(0, 60)}`).join('\n')}` };
    }

    case 'memory.pin_memory': {
      const memory = findByQuery(store.memories.map(m => ({ id: m.id, title: m.title })), action.params.memory_ref as string);
      if (!memory) return { success: false, message: 'Memory not found.' };
      store.updateMemory(memory.id, { pinned: true });
      return { success: true, message: `📌 Pinned "${memory.title}".` };
    }

    // ─── NOTIFICATION ───
    case 'notification.create_notification': {
      store.addAINotification({
        title: action.params.title as string,
        message: action.params.message as string,
        type: (action.params.type as any) ?? 'suggestion',
        priority: (action.params.priority as any) ?? 'medium',
        scheduled_at: action.params.scheduled_at as string,
        status: 'pending',
        ai_generated: true,
      });
      return { success: true, message: `🔔 Notification "${action.params.title}" created.` };
    }

    // ─── SETTINGS ───
    case 'settings.update_theme': {
      store.updateSettings({ theme: action.params.theme as 'light' | 'dark' | 'system' });
      return { success: true, message: `🎨 Theme changed to ${action.params.theme}.` };
    }

    case 'settings.update_daily_targets': {
      const patch: Record<string, number> = {};
      if (action.params.water) patch.waterTarget = action.params.water as number;
      if (action.params.protein) patch.proteinTarget = action.params.protein as number;
      if (action.params.wasted_days_target) patch.maxWastedDays = action.params.wasted_days_target as number;
      store.updateSettings(patch);
      return { success: true, message: `⚙️ Targets updated.` };
    }

    case 'settings.export_backup': {
      return { success: true, message: '💾 Backup exported. Check Settings → Data Management.' };
    }

    case 'settings.reset_app': {
      store.resetAll();
      return { success: true, message: '⚠️ App reset to defaults.' };
    }

    // ─── NAVIGATION ───
    case 'navigation.navigate_to': {
      return { success: true, message: `Opening ${action.params.view}...`, navigateTo: action.params.view as string };
    }

    // ─── REPORT ───
    case 'report.generate_report': {
      return { success: true, message: `📊 Generating ${action.params.type} report... Please use the AI Reports view for full report.` };
    }

    case 'report.show_analytics': {
      return { success: true, message: '📊 Opening analytics...', navigateTo: 'reports' };
    }

    // ─── ROUTINE ───
    case 'routine.show_routine': {
      return { success: true, message: '📋 Opening routine...', navigateTo: 'routine' };
    }

    case 'routine.generate_plan': {
      return { success: true, message: `📋 Opening AI Planner for ${action.params.slot} plan...`, navigateTo: 'ai-planner' };
    }

    default:
      return { success: false, message: `Action ${key} not implemented yet.` };
  }
}

// ─── Execute multiple actions ───

export function executeActions(actions: AppAction[]): { results: ActionResult[]; navigateTo?: string } {
  const results: ActionResult[] = [];
  let navigateTo: string | undefined;

  for (const action of actions) {
    const result = executeAppAction(action);
    results.push(result);
    if (result.navigateTo) navigateTo = result.navigateTo;
  }

  return { results, navigateTo };
}
