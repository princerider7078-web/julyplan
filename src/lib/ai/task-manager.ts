// AI Task Manager — converts natural language into task CRUD operations.
// Uses the AI to parse intent + entities, then executes against the store.
import { aiChat } from './index';
import type { AIContext, AIResponse } from './types';
import { parseNaturalDateTime, stripDateTimePhrases } from '../date-parser';
import { useStore } from '../store';

export type TaskActionType =
  | 'add' | 'delete' | 'move' | 'rename' | 'complete'
  | 'show' | 'reschedule' | 'list' | 'unknown';

export interface TaskAction {
  action: TaskActionType;
  title?: string;
  date?: string;
  time?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  section?: string;
  // For actions targeting existing tasks
  targetQuery?: string;
  // Original user message
  raw: string;
}

export interface TaskActionResult {
  action: TaskAction;
  success: boolean;
  message: string;
  taskId?: string;
}

const SYSTEM_PROMPT = `You are the task-management brain of "July Plan". Your job is to interpret the user's natural language request and return a JSON action object describing what task operation they want.

Possible actions:
- "add"        — create a new task
- "delete"     — remove a task
- "move"       — reschedule / change date or section
- "rename"     — change a task's title
- "complete"   — mark a task as done
- "show" / "list" — show/list tasks
- "reschedule" — same as move but emphasizes date change
- "unknown"    — request is not a task operation

Return JSON ONLY (no markdown):
{
  "action": "add|delete|move|rename|complete|show|reschedule|unknown",
  "title": "task title (for add/rename — without date/time words)",
  "date": "YYYY-MM-DD if a date is mentioned, else null",
  "time": "HH:mm if a time is mentioned, else null",
  "priority": "low|medium|high|critical if mentioned, else null",
  "section": "section name if mentioned (Health, Voice, Study/Work, Routine, Finance, Weekly Plan, Monthly Plan, Personal Growth), else null",
  "targetQuery": "for delete/move/rename/complete: the part of the message describing WHICH task to target (e.g. 'today's workout', 'study task', 'grocery')"
}

If the user's message is NOT a task operation (e.g. they're asking for advice, chatting, etc.), return:
{ "action": "unknown" }

Do NOT include any text outside the JSON.`;

// First try a fast local parse for common patterns.
// Only fall back to AI if local parsing is ambiguous.
export function tryLocalParse(input: string): TaskAction | null {
  const text = input.toLowerCase().trim();

  // Add/Create patterns
  if (/^(add|create|new|schedule|remind me to|set up|make)\s+/i.test(input)) {
    const cleaned = stripDateTimePhrases(input);
    const dt = parseNaturalDateTime(input);
    if (!cleaned) return null;
    return {
      action: 'add',
      title: cleaned,
      date: dt.date,
      time: dt.time,
      raw: input,
    };
  }

  // Delete patterns
  if (/^(delete|remove|drop)\s+/i.test(input)) {
    const cleaned = stripDateTimePhrases(input);
    return { action: 'delete', targetQuery: cleaned, raw: input };
  }

  // Complete patterns
  if (/^(complete|done|finish|mark done|mark complete)\s+/i.test(input)) {
    const cleaned = stripDateTimePhrases(input);
    return { action: 'complete', targetQuery: cleaned, raw: input };
  }

  // Move/Reschedule patterns
  if (/^(move|reschedule|shift|postpone)\s+/i.test(input)) {
    const cleaned = stripDateTimePhrases(input);
    const dt = parseNaturalDateTime(input);
    return {
      action: 'move',
      targetQuery: cleaned,
      date: dt.date,
      time: dt.time,
      raw: input,
    };
  }

  // Rename patterns
  if (/^(rename|update name|edit name)\s+/i.test(input)) {
    return { action: 'rename', targetQuery: input.replace(/^(rename|update name|edit name)\s+/i, ''), raw: input };
  }

  // Show/list patterns
  if (/^(show|list|view|what are|what's|display)\s+.*(task|today|schedule|plan)/i.test(input)) {
    return { action: 'show', raw: input };
  }

  return null;
}

// Main entry: parse a user message into a TaskAction (local first, AI fallback)
export async function parseTaskAction(
  input: string,
  ctx?: AIContext,
  opts?: Parameters<typeof aiChat>[3],
): Promise<TaskAction> {
  // Try local parse first (fast, free)
  const local = tryLocalParse(input);
  if (local) return local;

  // Fallback to AI for ambiguous requests
  try {
    const response: AIResponse = await aiChat(
      `User request: "${input}"\n\nReturn the JSON action object.`,
      ctx,
      [],
      {
        ...opts,
        profile: opts?.profile ? {
          ...opts.profile,
          temperature: 0.1, // deterministic for parsing
        } : undefined,
      },
    );
    if (response.json && typeof response.json === 'object') {
      const j = response.json as Partial<TaskAction>;
      return {
        action: (j.action as TaskActionType) ?? 'unknown',
        title: j.title,
        date: j.date ?? undefined,
        time: j.time ?? undefined,
        priority: j.priority ?? undefined,
        section: j.section ?? undefined,
        targetQuery: j.targetQuery ?? undefined,
        raw: input,
      };
    }
  } catch { /* fall through to unknown */ }

  return { action: 'unknown', raw: input };
}

// Find a task by fuzzy-matching the target query against titles
function findTaskByQuery(query: string): string | null {
  const store = useStore.getState();
  const q = query.toLowerCase().trim();
  if (!q) return null;

  // Exact match first
  const exact = store.tasks.find((t) => t.title.toLowerCase() === q);
  if (exact) return exact.id;

  // Contains match
  const contains = store.tasks.find((t) => t.title.toLowerCase().includes(q));
  if (contains) return contains.id;

  // Reverse: query contains task title
  const reverse = store.tasks.find((t) => q.includes(t.title.toLowerCase()));
  if (reverse) return reverse.id;

  // Word overlap
  const qWords = q.split(/\s+/).filter((w) => w.length > 2);
  let bestId: string | null = null;
  let bestScore = 0;
  for (const t of store.tasks) {
    const tWords = t.title.toLowerCase().split(/\s+/);
    const overlap = qWords.filter((w) => tWords.some((tw) => tw.includes(w))).length;
    if (overlap > bestScore) {
      bestScore = overlap;
      bestId = t.id;
    }
  }
  return bestScore > 0 ? bestId : null;
}

// Execute a TaskAction against the store. Returns success + message.
export function executeTaskAction(action: TaskAction): TaskActionResult {
  const store = useStore.getState();
  const today = new Date().toISOString().slice(0, 10);

  switch (action.action) {
    case 'add': {
      if (!action.title) {
        return { action, success: false, message: 'Could not determine task title.' };
      }
      // Try to match section by name
      let sectionId = store.sections[0]?.id ?? 'sec-health';
      if (action.section) {
        const sec = store.sections.find((s) =>
          s.name.toLowerCase().includes(action.section!.toLowerCase()),
        );
        if (sec) sectionId = sec.id;
      }
      const id = store.addTask({
        title: action.title,
        sectionId,
        priority: action.priority ?? 'medium',
        startDate: action.date ?? today,
        time: action.time,
        repeatRule: 'none',
      });
      const when = [action.date, action.time].filter(Boolean).join(' at ');
      return {
        action,
        success: true,
        taskId: id,
        message: `✅ Added task "${action.title}"${when ? ` for ${when}` : ''}.`,
      };
    }

    case 'delete': {
      const id = action.targetQuery ? findTaskByQuery(action.targetQuery) : null;
      if (!id) {
        return { action, success: false, message: `Could not find task matching "${action.targetQuery ?? ''}".` };
      }
      const task = store.tasks.find((t) => t.id === id);
      store.deleteTask(id);
      return {
        action,
        success: true,
        taskId: id,
        message: `🗑️ Deleted task "${task?.title ?? id}".`,
      };
    }

    case 'complete': {
      const id = action.targetQuery ? findTaskByQuery(action.targetQuery) : null;
      if (!id) {
        return { action, success: false, message: `Could not find task matching "${action.targetQuery ?? ''}".` };
      }
      const task = store.tasks.find((t) => t.id === id);
      if (task?.completionLog?.[today]) {
        return { action, success: false, message: `"${task?.title}" is already complete.` };
      }
      store.toggleTaskComplete(id);
      return {
        action,
        success: true,
        taskId: id,
        message: `✅ Marked "${task?.title}" as complete.`,
      };
    }

    case 'move':
    case 'reschedule': {
      const id = action.targetQuery ? findTaskByQuery(action.targetQuery) : null;
      if (!id) {
        return { action, success: false, message: `Could not find task matching "${action.targetQuery ?? ''}".` };
      }
      const task = store.tasks.find((t) => t.id === id);
      const patch: { startDate?: string; time?: string } = {};
      if (action.date) patch.startDate = action.date;
      if (action.time) patch.time = action.time;
      store.updateTask(id, patch);
      const when = [action.date, action.time].filter(Boolean).join(' at ');
      return {
        action,
        success: true,
        taskId: id,
        message: `📅 Moved "${task?.title}" to ${when || 'new time'}.`,
      };
    }

    case 'rename': {
      // targetQuery contains "old name to new name" or just "new name"
      // Try to split on " to "
      const parts = (action.targetQuery ?? '').split(/\s+to\s+/i);
      if (parts.length === 2) {
        const id = findTaskByQuery(parts[0]);
        if (id) {
          const task = store.tasks.find((t) => t.id === id);
          store.updateTask(id, { title: parts[1].trim() });
          return {
            action,
            success: true,
            taskId: id,
            message: `✏️ Renamed "${task?.title}" to "${parts[1].trim()}".`,
          };
        }
      }
      return { action, success: false, message: 'Could not parse rename. Use: rename "old name" to "new name"' };
    }

    case 'show':
    case 'list': {
      const todayTasks = store.tasks
        .filter((t) => t.status !== 'archived')
        .filter((t) => {
          if (t.repeatRule !== 'none') return true;
          return t.startDate <= today && !t.completionLog?.[today];
        })
        .slice(0, 10);
      if (todayTasks.length === 0) {
        return { action, success: true, message: 'You have no pending tasks today.' };
      }
      const list = todayTasks
        .map((t, i) => `${i + 1}. ${t.title}${t.time ? ` (${t.time})` : ''} [${t.priority}]`)
        .join('\n');
      return {
        action,
        success: true,
        message: `📋 Today's tasks:\n${list}`,
      };
    }

    case 'unknown':
    default:
      return { action, success: false, message: '' };
  }
}
