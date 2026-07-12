// Universal AI App Actions — extends command system to ALL modules.
// Local fast-path parser per module (no AI round-trip needed for common phrasings).
// Falls back to AI only when fast-path doesn't match.
import { useStore } from '../store';
import type { AIContext, AIResponse } from './types';
import { aiChat } from './index';

export type AppModule = 'task' | 'habit' | 'section' | 'routine' | 'finance' | 'journal' | 'knowledge';
export type AppAction = 'add' | 'edit' | 'delete' | 'complete' | 'show';

export interface AppActionCommand {
  module: AppModule;
  action: AppAction;
  payload: {
    title?: string;
    name?: string;
    amount?: number;
    category?: string;
    type?: string;
    date?: string;
    time?: string;
    query?: string;  // for delete/edit/show — which item
  };
  raw: string;
}

export interface AppActionResult {
  success: boolean;
  message: string;
  needsConfirmation?: boolean;  // for deletes — must ask user first
  confirmationMessage?: string;
  executeAfterConfirm?: () => void;
}

// ─── Local fast-path parser ───
// Tries to match common phrasings without an AI call.
function tryLocalParse(input: string): AppActionCommand | null {
  const text = input.toLowerCase().trim();

  // ─── HABIT ───
  if (/\b(add|create|new)\s+(habit|daily)\s+/i.test(input)) {
    const title = input.replace(/^(add|create|new)\s+(habit|daily)\s+(reminder\s+to\s+)?/i, '').trim();
    return { module: 'habit', action: 'add', payload: { title }, raw: input };
  }
  if (/\b(delete|remove|drop)\s+(habit|daily)\s+/i.test(input)) {
    const query = input.replace(/^(delete|remove|drop)\s+(habit|daily)\s+/i, '').trim();
    return { module: 'habit', action: 'delete', payload: { query }, raw: input };
  }

  // ─── FINANCE ───
  if (/\b(add|create|log)\s+(expense|spend|spent|payment)\s+/i.test(input)) {
    const rest = input.replace(/^(add|create|log)\s+(expense|spend|spent|payment)\s+(of\s+)?/i, '').trim();
    const amountMatch = rest.match(/₹?\s*(\d+)/);
    const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;
    const category = rest.replace(/₹?\s*\d+/, '').replace(/\s+(today|yesterday|on\s+\w+)/i, '').trim() || 'General';
    return { module: 'finance', action: 'add', payload: { amount, type: 'expense', category, title: category }, raw: input };
  }
  if (/\b(add|create|log)\s+(income|earned|received)\s+/i.test(input)) {
    const rest = input.replace(/^(add|create|log)\s+(income|earned|received)\s+(of\s+)?/i, '').trim();
    const amountMatch = rest.match(/₹?\s*(\d+)/);
    const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;
    return { module: 'finance', action: 'add', payload: { amount, type: 'income', title: 'Income' }, raw: input };
  }

  // ─── SECTION ───
  if (/\b(add|create|new)\s+(section|category)\s+/i.test(input)) {
    const name = input.replace(/^(add|create|new)\s+(section|category)\s+/i, '').trim();
    return { module: 'section', action: 'add', payload: { name }, raw: input };
  }
  if (/\b(delete|remove)\s+(section|category)\s+/i.test(input)) {
    const query = input.replace(/^(delete|remove)\s+(section|category)\s+/i, '').trim();
    return { module: 'section', action: 'delete', payload: { query }, raw: input };
  }

  // ─── JOURNAL ───
  if (/\b(add|create|write)\s+(journal|entry|diary)\s+/i.test(input)) {
    const title = input.replace(/^(add|create|write)\s+(journal|entry|diary)\s+/i, '').trim();
    return { module: 'journal', action: 'add', payload: { title }, raw: input };
  }

  // ─── KNOWLEDGE ───
  if (/\b(add|create|save)\s+(note|knowledge)\s+/i.test(input)) {
    const title = input.replace(/^(add|create|save)\s+(note|knowledge)\s+/i, '').trim();
    return { module: 'knowledge', action: 'add', payload: { title }, raw: input };
  }

  // ─── SHOW/LIST ───
  if (/\b(show|list|view)\s+(my\s+)?(habits|finances?|expenses|sections|journal|knowledge|notes)\b/i.test(input)) {
    const what = input.match(/\b(habits|finances?|expenses|sections|journal|knowledge|notes)\b/i)?.[1]?.toLowerCase();
    const moduleMap: Record<string, AppModule> = {
      habits: 'habit', finances: 'finance', expenses: 'finance',
      sections: 'section', journal: 'journal', knowledge: 'knowledge', notes: 'knowledge',
    };
    if (what && moduleMap[what]) {
      return { module: moduleMap[what], action: 'show', payload: {}, raw: input };
    }
  }

  return null;
}

// ─── Main parse function ───
export async function parseAppAction(
  input: string,
  ctx?: AIContext,
  opts?: Parameters<typeof aiChat>[3],
): Promise<AppActionCommand> {
  const local = tryLocalParse(input);
  if (local) return local;

  // Fallback to AI
  try {
    const response: AIResponse = await aiChat(
      `User request: "${input}"\n\nReturn JSON: {"module":"task|habit|section|routine|finance|journal|knowledge","action":"add|edit|delete|complete|show","payload":{}}\nIf not an app action, return: {"module":"task","action":"show","payload":{}}`,
      ctx, [], { ...opts, profile: opts?.profile ? { ...opts.profile, temperature: 0.1 } : undefined },
    );
    if (response.json && typeof response.json === 'object') {
      const j = response.json as Partial<AppActionCommand>;
      return {
        module: (j.module as AppModule) ?? 'task',
        action: (j.action as AppAction) ?? 'show',
        payload: (j.payload as AppActionCommand['payload']) ?? {},
        raw: input,
      };
    }
  } catch { /* fall through */ }

  return { module: 'task', action: 'show', payload: {}, raw: input };
}

// ─── Execute action ───
export function executeAppAction(cmd: AppActionCommand): AppActionResult {
  const store = useStore.getState();
  const today = new Date().toISOString().slice(0, 10);

  switch (cmd.module) {
    // ─── TASK ─── (delegate to existing task-manager)
    case 'task':
      return { success: true, message: 'Use the existing task manager for task operations.' };

    // ─── HABIT ───
    case 'habit':
      if (cmd.action === 'add') {
        if (!cmd.payload.title) return { success: false, message: 'Habit name required.' };
        store.addHabit(cmd.payload.title, cmd.payload.category ?? 'General', 'daily');
        return { success: true, message: `✅ Added habit "${cmd.payload.title}".` };
      }
      if (cmd.action === 'delete') {
        const habit = store.habits.find((h) => h.title.toLowerCase().includes(cmd.payload.query?.toLowerCase() ?? ''));
        if (!habit) return { success: false, message: `No habit matching "${cmd.payload.query}".` };
        return {
          success: true,
          needsConfirmation: true,
          confirmationMessage: `Delete habit "${habit.title}"?`,
          message: `⚠ Confirm: delete habit "${habit.title}"?`,
          executeAfterConfirm: () => store.deleteHabit(habit.id),
        };
      }
      if (cmd.action === 'show') {
        if (store.habits.length === 0) return { success: true, message: 'No habits yet.' };
        return { success: true, message: `📋 Your habits:\n${store.habits.map((h, i) => `${i+1}. ${h.title} [${h.category}]`).join('\n')}` };
      }
      break;

    // ─── FINANCE ───
    case 'finance':
      if (cmd.action === 'add') {
        if (!cmd.payload.amount) return { success: false, message: 'Amount required.' };
        store.addFinanceEntry({
          title: cmd.payload.title ?? cmd.payload.category ?? 'Entry',
          amount: cmd.payload.amount,
          type: (cmd.payload.type as 'expense' | 'income' | 'saving') ?? 'expense',
          date: cmd.payload.date ?? today,
          category: cmd.payload.category ?? 'General',
        });
        return { success: true, message: `✅ Added ${cmd.payload.type ?? 'expense'} of ₹${cmd.payload.amount}.` };
      }
      if (cmd.action === 'show') {
        if (store.finance.length === 0) return { success: true, message: 'No finance entries yet.' };
        const recent = store.finance.slice(0, 10);
        return { success: true, message: `💰 Recent entries:\n${recent.map(f => `${f.type === 'expense' ? '➖' : '➕'} ₹${f.amount} — ${f.title} (${f.date})`).join('\n')}` };
      }
      break;

    // ─── SECTION ───
    case 'section':
      if (cmd.action === 'add') {
        if (!cmd.payload.name) return { success: false, message: 'Section name required.' };
        store.addSection(cmd.payload.name, 'Target', '#64748b');
        return { success: true, message: `✅ Added section "${cmd.payload.name}".` };
      }
      if (cmd.action === 'delete') {
        const section = store.sections.find((s) => s.name.toLowerCase().includes(cmd.payload.query?.toLowerCase() ?? ''));
        if (!section) return { success: false, message: `No section matching "${cmd.payload.query}".` };
        return {
          success: true,
          needsConfirmation: true,
          confirmationMessage: `Delete section "${section.name}" and all its tasks?`,
          message: `⚠ Confirm: delete section "${section.name}"?`,
          executeAfterConfirm: () => store.deleteSection(section.id),
        };
      }
      if (cmd.action === 'show') {
        return { success: true, message: `📁 Your sections:\n${store.sections.map((s, i) => `${i+1}. ${s.name}`).join('\n')}` };
      }
      break;

    // ─── JOURNAL ───
    case 'journal':
      if (cmd.action === 'add') {
        store.addJournalEntry({
          entry_date: today,
          title: cmd.payload.title,
          content: cmd.payload.title ?? '',
          mood_score: 7,
        });
        return { success: true, message: `✅ Added journal entry "${cmd.payload.title}".` };
      }
      if (cmd.action === 'show') {
        if (store.journal.length === 0) return { success: true, message: 'No journal entries.' };
        return { success: true, message: `📓 Journal entries:\n${store.journal.slice(0, 5).map(j => `• ${j.title ?? 'Untitled'} (${j.entry_date}) — mood ${j.mood_score}/10`).join('\n')}` };
      }
      break;

    // ─── KNOWLEDGE ───
    case 'knowledge':
      if (cmd.action === 'add') {
        store.addKnowledgeNote({
          title: cmd.payload.title ?? 'Untitled Note',
          content: cmd.payload.title ?? '',
          tags: [],
        });
        return { success: true, message: `✅ Added knowledge note "${cmd.payload.title}".` };
      }
      if (cmd.action === 'show') {
        if (store.knowledgeNotes.length === 0) return { success: true, message: 'No knowledge notes.' };
        return { success: true, message: `📚 Knowledge notes:\n${store.knowledgeNotes.slice(0, 10).map(k => `• ${k.title}`).join('\n')}` };
      }
      break;

    default:
      return { success: false, message: 'Unknown module.' };
  }

  return { success: false, message: 'Action not supported.' };
}
