// AI Routine Manager — lets the AI edit routine blocks via chat commands.
// Supports: "change morning workout time to 7 AM", "add 30 min reading block at 8 PM",
// "delete night routine block", "show my routine", "move afternoon nap to 3 PM"
import { useStore } from '../store';
import { parseNaturalDateTime, stripDateTimePhrases } from '../date-parser';
import type { RoutineBlock } from '../types';

export type RoutineActionType =
  | 'add' | 'delete' | 'move' | 'rename' | 'show' | 'unknown';

export interface RoutineAction {
  action: RoutineActionType;
  title?: string;
  startTime?: string;
  endTime?: string;
  category?: string;
  targetQuery?: string;
  raw: string;
}

export interface RoutineActionResult {
  action: RoutineAction;
  success: boolean;
  message: string;
}

// Try local parse for routine commands
function tryLocalParse(input: string): RoutineAction | null {
  const text = input.toLowerCase().trim();

  // Routine keyword detection
  const hasRoutineKeyword = /\b(routine|block|schedule|timeline|morning|afternoon|evening|night)\b/i.test(input);

  // Add routine block
  if (/^(add|create|new)\s+.*(routine|block)/i.test(input) || /^(add|create)\s+\d+\s*(min|minute|hour)/i.test(input)) {
    const cleaned = stripDateTimePhrases(input);
    const dt = parseNaturalDateTime(input);
    // Try to extract duration
    const durationMatch = text.match(/(\d+)\s*(min|minute|hour)/);
    let endTime = dt.time;
    if (dt.time && durationMatch) {
      const [h, m] = dt.time.split(':').map(Number);
      const dur = parseInt(durationMatch[1], 10);
      const isHour = durationMatch[2].startsWith('hour');
      const totalMin = h * 60 + m + (isHour ? dur * 60 : dur);
      endTime = `${String(Math.floor(totalMin / 60) % 24).padStart(2, '0')}:${String(totalMin % 60).padStart(2, '0')}`;
    }
    return {
      action: 'add',
      title: cleaned.replace(/^(add|create|new)\s+/i, '').replace(/\d+\s*(min|minute|hour).*/i, '').trim(),
      startTime: dt.time,
      endTime,
      raw: input,
    };
  }

  // Delete routine block
  if (/^(delete|remove)\s+.*(routine|block)/i.test(input)) {
    return { action: 'delete', targetQuery: stripDateTimePhrases(input), raw: input };
  }

  // Move/reschedule routine
  if (/^(move|reschedule|change|shift)\s+.*(routine|block|workout|meditation|study)/i.test(input) && hasRoutineKeyword) {
    const cleaned = stripDateTimePhrases(input);
    const dt = parseNaturalDateTime(input);
    return {
      action: 'move',
      targetQuery: cleaned,
      startTime: dt.time,
      raw: input,
    };
  }

  // Show routine
  if (/^(show|list|view|what.*).*routine/i.test(input) || /^my routine/i.test(input)) {
    return { action: 'show', raw: input };
  }

  return null;
}

function findRoutineByQuery(query: string): string | null {
  const store = useStore.getState();
  const q = query.toLowerCase().trim();
  if (!q) return null;

  // Exact match
  const exact = store.routineBlocks.find((r) => r.title.toLowerCase() === q);
  if (exact) return exact.id;

  // Contains match
  const contains = store.routineBlocks.find((r) => r.title.toLowerCase().includes(q));
  if (contains) return contains.id;

  // Category match
  const byCat = store.routineBlocks.find((r) => r.category.toLowerCase().includes(q));
  if (byCat) return byCat.id;

  // Reverse
  const reverse = store.routineBlocks.find((r) => q.includes(r.title.toLowerCase()));
  if (reverse) return reverse.id;

  return null;
}

export function parseRoutineAction(input: string): RoutineAction | null {
  return tryLocalParse(input);
}

export function executeRoutineAction(action: RoutineAction): RoutineActionResult {
  const store = useStore.getState();

  switch (action.action) {
    case 'add': {
      if (!action.title || !action.startTime) {
        return { action, success: false, message: 'Could not determine routine block title or time.' };
      }
      // Note: store doesn't have addRoutineBlock — would need to add.
      // For now, return a message saying it's a planned feature.
      return {
        action,
        success: false,
        message: `Adding routine blocks via chat is coming soon. Title: "${action.title}", Time: ${action.startTime}-${action.endTime}. For now, edit routine in the Daily Routine view.`,
      };
    }

    case 'delete': {
      const id = action.targetQuery ? findRoutineByQuery(action.targetQuery) : null;
      if (!id) {
        return { action, success: false, message: `Could not find routine block matching "${action.targetQuery ?? ''}".` };
      }
      const block = store.routineBlocks.find((r) => r.id === id);
      // Note: store doesn't have deleteRoutineBlock — would need to add.
      return {
        action,
        success: false,
        message: `Deleting routine blocks via chat is coming soon. Found: "${block?.title}". For now, edit in Daily Routine view.`,
      };
    }

    case 'move':
    case 'rename': {
      const id = action.targetQuery ? findRoutineByQuery(action.targetQuery) : null;
      if (!id) {
        return { action, success: false, message: `Could not find routine block matching "${action.targetQuery ?? ''}".` };
      }
      const block = store.routineBlocks.find((r) => r.id === id);
      if (action.startTime) {
        // Calculate new end time (keep duration the same)
        const [oldStartH, oldStartM] = block!.startTime.split(':').map(Number);
        const [oldEndH, oldEndM] = block!.endTime.split(':').map(Number);
        const oldDur = (oldEndH * 60 + oldEndM) - (oldStartH * 60 + oldStartM);
        const [newH, newM] = action.startTime.split(':').map(Number);
        const newEnd = newH * 60 + newM + oldDur;
        const newEndTime = `${String(Math.floor(newEnd / 60) % 24).padStart(2, '0')}:${String(newEnd % 60).padStart(2, '0')}`;
        // Update via store — but we don't have updateRoutineBlock in store.
        // Use a direct state mutation via the store's set function.
        useStore.setState((s) => ({
          routineBlocks: s.routineBlocks.map((r) =>
            r.id === id ? { ...r, startTime: action.startTime!, endTime: newEndTime } : r,
          ),
        }));
        return {
          action,
          success: true,
          message: `📅 Moved "${block?.title}" to ${action.startTime}-${newEndTime}.`,
        };
      }
      return { action, success: false, message: 'Could not determine new time.' };
    }

    case 'show': {
      const blocks = store.routineBlocks.slice().sort((a, b) => {
        if (a.startTime === '00:00') return 1;
        if (b.startTime === '00:00') return -1;
        return a.startTime.localeCompare(b.startTime);
      });
      if (blocks.length === 0) {
        return { action, success: true, message: 'You have no routine blocks.' };
      }
      const list = blocks.slice(0, 10).map((b) => `• ${b.startTime}-${b.endTime}: ${b.title}`).join('\n');
      return {
        action,
        success: true,
        message: `📋 Your routine:\n${list}`,
      };
    }

    default:
      return { action, success: false, message: '' };
  }
}
