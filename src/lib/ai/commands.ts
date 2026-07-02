// Chat command parser — detects memory-management commands in user messages.
// Examples:
//   "Remember that I wake up at 5 AM"
//   "Forget my coffee preference"
//   "Show my memories"
//   "Edit memory about Flutter"
//   "Delete memory about running"
//   "Summarize my memories"
//   "Search memories for coding"

import type { AIMemoryItem, MemoryCategory } from '../types';
import { useStore } from '../store';

export type CommandType =
  | 'remember'      // create a memory
  | 'forget'        // delete a memory
  | 'show'          // list all memories
  | 'edit'          // edit a memory
  | 'delete'        // alias for forget
  | 'summarize'     // summarize all memories
  | 'search'        // search memories
  | 'help'          // show help
  | 'task_action'   // task management command (handled by task-manager)
  | 'none';         // regular chat

export interface ParsedCommand {
  type: CommandType;
  // For remember: the content to remember
  content?: string;
  // For forget/edit/delete/search: the query/topic
  query?: string;
  // Suggested category (auto-detected)
  category?: MemoryCategory;
  // Original message
  raw: string;
}

const CATEGORY_KEYWORDS: Record<MemoryCategory, string[]> = {
  personal: ['my name is', "i'm ", 'i am ', 'i live', 'my age', 'my birthday'],
  goals: ['my goal', 'i want to become', 'i want to learn', 'i plan to', 'my dream', 'i aim to', 'aspiring'],
  habits: ['i wake up', 'i sleep', 'i drink', 'i eat', 'i exercise', 'i meditate', 'i do', 'every day', 'every morning', 'every night', 'i always', 'i never'],
  routine: ['my routine', 'i start my day', 'in the morning i', 'at night i', 'my schedule'],
  preferences: ['i like', 'i love', 'i hate', 'i prefer', "i don't like", 'i enjoy', 'my favorite'],
  health: ['my weight', 'my height', 'i have', 'my health', 'i feel pain', 'i am allergic'],
  work: ['my job', 'my office', 'i work', 'my boss', 'my company', 'my salary', 'office time'],
  education: ['i study', 'my college', 'my school', 'i am preparing for', 'my course', 'my exam', 'i am learning', 'my subject'],
  relationships: ['my friend', 'my family', 'my girlfriend', 'my boyfriend', 'my wife', 'my husband', 'my mother', 'my father', 'my sister', 'my brother'],
  skills: ['i know', 'i can', 'my skill', "i'm good at", 'i am good at', 'i code', 'i program'],
  projects: ['my project', "i'm building", 'i am building', "i'm working on", 'i am working on', 'my app', 'my startup'],
  events: ['on monday', 'on tuesday', 'next week', 'my birthday is', 'my anniversary', 'i have an event', 'i have a meeting'],
  custom: [],
};

export function detectCategory(text: string): MemoryCategory {
  const lower = ' ' + text.toLowerCase() + ' ';
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (cat === 'custom') continue;
    for (const kw of keywords) {
      if (lower.includes(kw)) return cat as MemoryCategory;
    }
  }
  return 'custom';
}

export function parseCommand(input: string): ParsedCommand {
  const text = input.trim();
  const lower = text.toLowerCase();

  // Help
  if (/^(help|commands|what can you do)\??$/i.test(lower)) {
    return { type: 'help', raw: input };
  }

  // Show memories
  if (/^(show|list|view|display)\s+(my\s+)?memor(y|ies)/i.test(lower)
      || /^(my\s+)?memor(y|ies)\??$/i.test(lower)) {
    return { type: 'show', raw: input };
  }

  // Summarize memories
  if (/(summar|overview).+memor/i.test(lower) || /memor.+(summar|overview)/i.test(lower)) {
    return { type: 'summarize', raw: input };
  }

  // Search memories
  if (/^search\s+(my\s+)?memor/i.test(lower) || /^find\s+memor/i.test(lower)) {
    const query = text.replace(/^search\s+(my\s+)?memor(y|ies)\s*(for|about|:)?\s*/i, '').trim();
    return { type: 'search', query, raw: input };
  }

  // Remember
  if (/^(remember|save|note|memorize|don'?t forget)\s+(this|that|the fact that)?\s*/i.test(lower)) {
    const content = text.replace(/^(remember|save|note|memorize|don'?t forget)\s+(this|that|the fact that)?\s*/i, '').trim();
    return {
      type: 'remember',
      content,
      category: detectCategory(content),
      raw: input,
    };
  }

  // Forget / Delete memory
  if (/^(forget|delete|remove)\s+(my\s+)?memor/i.test(lower)
      || /^(forget|delete|remove)\s+.+\s+memor/i.test(lower)) {
    const query = text
      .replace(/^(forget|delete|remove)\s+(my\s+)?memor(y|ies)\s*(about|of|:)?\s*/i, '')
      .replace(/^(forget|delete|remove)\s+/i, '')
      .replace(/\s+memor(y|ies?)$/i, '')
      .trim();
    return { type: 'forget', query, raw: input };
  }

  // Edit memory
  if (/^(edit|update|change)\s+(my\s+)?memor/i.test(lower)) {
    const query = text.replace(/^(edit|update|change)\s+(my\s+)?memor(y|ies)\s*(about|of|:)?\s*/i, '').trim();
    return { type: 'edit', query, raw: input };
  }

  // Task action keywords — delegate to task-manager
  if (/^(add|create|new|schedule|delete|remove|complete|done|move|reschedule|rename|show|list)\s+/i.test(lower)) {
    // Make sure it's task-related (not "show memories" which is caught above)
    if (!/memor/i.test(lower)) {
      return { type: 'task_action', raw: input };
    }
  }

  return { type: 'none', raw: input };
}

// Execute a memory command against the store
export function executeMemoryCommand(cmd: ParsedCommand): { message: string; memoryId?: string } {
  const store = useStore.getState();

  switch (cmd.type) {
    case 'remember': {
      if (!cmd.content) return { message: 'Nothing to remember — try: "remember that I wake up at 5 AM"' };
      const id = store.addMemory({
        title: cmd.content.slice(0, 60) + (cmd.content.length > 60 ? '…' : ''),
        content: cmd.content,
        category: cmd.category ?? 'custom',
        importance: 'medium',
        confidence: 1.0, // user explicitly said to remember
        source: 'chat',
        pinned: false,
      });
      return {
        message: `🧠 Saved to memory (${cmd.category ?? 'custom'}): "${cmd.content}"`,
        memoryId: id,
      };
    }

    case 'forget':
    case 'delete': {
      if (!cmd.query) return { message: 'What should I forget? Try: "forget my coffee preference"' };
      // Find matching memories
      const matches = store.memories.filter((m) =>
        m.title.toLowerCase().includes(cmd.query!.toLowerCase())
        || m.content.toLowerCase().includes(cmd.query!.toLowerCase())
        || m.tags.some((t) => t.toLowerCase().includes(cmd.query!.toLowerCase())),
      );
      if (matches.length === 0) {
        return { message: `No memories found matching "${cmd.query}".` };
      }
      if (matches.length === 1) {
        const m = matches[0];
        if (m.locked) return { message: `🔒 Memory "${m.title}" is locked. Unlock it first.` };
        store.deleteMemory(m.id);
        return { message: `🗑️ Forgot: "${m.title}"`, memoryId: m.id };
      }
      // Multiple matches — list them
      const list = matches.map((m) => `• ${m.title} [${m.category}]`).join('\n');
      return { message: `Found ${matches.length} memories. Which one?\n${list}\n\nSay: "delete memory about <exact title>"` };
    }

    case 'show': {
      if (store.memories.length === 0) {
        return { message: 'You have no memories yet. Try: "remember that I am learning Flutter"' };
      }
      const list = store.memories
        .slice(0, 20)
        .map((m, i) => `${i + 1}. **${m.title}** [${m.category}${m.pinned ? ' 📌' : ''}${m.favorite ? ' ⭐' : ''}]\n   ${m.content}`)
        .join('\n\n');
      return { message: `🧠 Your memories (${store.memories.length} total):\n\n${list}` };
    }

    case 'summarize': {
      if (store.memories.length === 0) {
        return { message: 'No memories to summarize yet.' };
      }
      const byCat: Record<string, number> = {};
      store.memories.forEach((m) => {
        byCat[m.category] = (byCat[m.category] ?? 0) + 1;
      });
      const summary = Object.entries(byCat)
        .map(([cat, n]) => `• ${cat}: ${n}`)
        .join('\n');
      return { message: `🧠 Memory summary (${store.memories.length} total):\n\n${summary}` };
    }

    case 'search': {
      if (!cmd.query) return { message: 'What should I search for?' };
      const matches = store.memories.filter((m) =>
        m.title.toLowerCase().includes(cmd.query!.toLowerCase())
        || m.content.toLowerCase().includes(cmd.query!.toLowerCase())
        || m.tags.some((t) => t.toLowerCase().includes(cmd.query!.toLowerCase())),
      );
      if (matches.length === 0) {
        return { message: `No memories matching "${cmd.query}".` };
      }
      const list = matches.map((m) => `• **${m.title}** [${m.category}]: ${m.content}`).join('\n\n');
      return { message: `🔍 Found ${matches.length} memor${matches.length === 1 ? 'y' : 'ies'}:\n\n${list}` };
    }

    case 'edit': {
      if (!cmd.query) return { message: 'Which memory should I edit? Try: "edit memory about Flutter"' };
      const matches = store.memories.filter((m) =>
        m.title.toLowerCase().includes(cmd.query!.toLowerCase())
        || m.content.toLowerCase().includes(cmd.query!.toLowerCase()),
      );
      if (matches.length === 0) {
        return { message: `No memories found matching "${cmd.query}".` };
      }
      if (matches.length === 1) {
        const m = matches[0];
        return {
          message: `Found memory: "${m.title}"\nContent: ${m.content}\n\nTo update, use the Memory Manager screen, or say: "remember that <new fact>" and I'll add a new memory (you can merge duplicates there).`,
          memoryId: m.id,
        };
      }
      const list = matches.map((m) => `• ${m.title}`).join('\n');
      return { message: `Found ${matches.length} memories. Which one?\n${list}` };
    }

    case 'help': {
      return {
        message: `🤖 **AI Commands**

**Memory:**
• "remember that I wake up at 5 AM" — save a memory
• "forget my coffee preference" — delete a memory
• "show my memories" — list all
• "search memories for coding" — search
• "summarize my memories" — get overview

**Tasks (natural language):**
• "add gym tomorrow 7 AM"
• "delete today's workout"
• "complete grocery task"
• "move meeting to Friday"
• "show today's tasks"

**Regular chat:** Anything else — I'll use your memories + tasks + habits to answer personally.`,
      };
    }

    default:
      return { message: '' };
  }
}
