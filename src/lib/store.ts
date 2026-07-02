// July Plan — Zustand store with localStorage persistence (offline-first)
// V2: extended with Journal, Knowledge Base, AI chat history, AI profile.
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuid } from 'uuid';
import type {
  Task, Section, Habit, RoutineBlock, FinanceEntry, FinanceTarget,
  AppSettings, AppState, SubSection, ChecklistItem, Priority, TaskType,
  RepeatRule, JournalEntry, KnowledgeNote, AIChatMessageStore,
} from './types';
import {
  DEFAULT_SECTIONS, DEFAULT_HABITS, DEFAULT_ROUTINE,
  DEFAULT_WEEKLY_THEMES, DEFAULT_FINANCE_TARGETS, defaultSeedTasks,
} from './seed';

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  waterTarget: 3000,
  proteinTarget: 90,
  maxWastedDays: 2,
  soundEnabled: true,
  notificationsEnabled: true,
  // AI profile — defaults to z-ai provider (built-in, no key needed)
  aiProvider: 'zai',
  aiModelChat: 'glm-4.6',
  aiModelPlanning: 'glm-4.6',
  aiModelReports: 'glm-4.6',
  aiTemperature: 0.7,
  aiMaxTokens: 1500,
  aiEnabledModules: ['tasks', 'habits', 'health', 'finance', 'journal'],
};

interface StoreActions {
  // tasks
  addTask: (input: Partial<Task> & { title: string; sectionId: string }) => string;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTaskComplete: (id: string, dateISO?: string) => void;
  toggleChecklistItem: (taskId: string, itemId: string) => void;
  archiveTask: (id: string) => void;
  duplicateTask: (id: string) => void;
  moveTask: (id: string, sectionId: string, subSectionId?: string) => void;
  // sections
  addSection: (name: string, icon: string, color: string) => void;
  renameSection: (id: string, name: string) => void;
  deleteSection: (id: string) => void;
  reorderSection: (id: string, direction: 'up' | 'down') => void;
  addSubSection: (parentId: string, name: string) => void;
  // habits
  toggleHabit: (id: string, dateISO?: string) => void;
  addHabit: (name: string, category: string, target: string) => void;
  deleteHabit: (id: string) => void;
  // routine
  toggleRoutineBlock: (id: string, dateISO?: string) => void;
  // finance
  addFinanceEntry: (input: Omit<FinanceEntry, 'id'>) => void;
  deleteFinanceEntry: (id: string) => void;
  addFinanceTarget: (title: string, amount: number, type: FinanceTarget['type']) => void;
  deleteFinanceTarget: (id: string) => void;
  // journal (V2)
  addJournalEntry: (input: Omit<JournalEntry, 'id' | 'created_at'>) => string;
  updateJournalEntry: (id: string, patch: Partial<JournalEntry>) => void;
  deleteJournalEntry: (id: string) => void;
  // knowledge (V2)
  addKnowledgeNote: (input: Omit<KnowledgeNote, 'id' | 'created_at' | 'updated_at'>) => string;
  updateKnowledgeNote: (id: string, patch: Partial<KnowledgeNote>) => void;
  deleteKnowledgeNote: (id: string) => void;
  // ai chat (V2)
  appendAIChat: (msg: Omit<AIChatMessageStore, 'id' | 'timestamp'>) => void;
  clearAIChat: () => void;
  // settings
  updateSettings: (patch: Partial<AppSettings>) => void;
  // system
  resetAll: () => void;
  exportData: () => string;
  importData: (json: string) => boolean;
  markOpened: () => void;
}

type Store = AppState & StoreActions;

const initialAppState: AppState = {
  tasks: defaultSeedTasks(),
  sections: DEFAULT_SECTIONS,
  habits: DEFAULT_HABITS,
  routineBlocks: DEFAULT_ROUTINE,
  finance: [],
  financeTargets: DEFAULT_FINANCE_TARGETS,
  weeklyThemes: DEFAULT_WEEKLY_THEMES,
  settings: DEFAULT_SETTINGS,
  journal: [],
  knowledgeNotes: [],
  aiChatHistory: [],
  lastOpened: null,
  initialized: true,
};

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...initialAppState,

      // ---------- Tasks ----------
      addTask: (input) => {
        const id = `t-${uuid().slice(0, 8)}`;
        const now = new Date().toISOString();
        const task: Task = {
          id,
          title: input.title,
          description: input.description ?? '',
          sectionId: input.sectionId,
          subSectionId: input.subSectionId,
          type: input.type ?? 'one-time',
          priority: input.priority ?? 'medium',
          status: 'pending',
          startDate: input.startDate ?? new Date().toISOString().slice(0, 10),
          endDate: input.endDate,
          time: input.time,
          reminderTime: input.reminderTime,
          repeatRule: input.repeatRule ?? 'none',
          checklistItems: input.checklistItems ?? [],
          notes: input.notes ?? '',
          isTopPriority: input.isTopPriority ?? false,
          createdAt: now,
          updatedAt: now,
          completionLog: {},
        };
        set((s) => ({ tasks: [task, ...s.tasks] }));
        return id;
      },

      updateTask: (id, patch) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t,
          ),
        })),

      deleteTask: (id) =>
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

      toggleTaskComplete: (id, dateISO) => {
        const d = dateISO ?? new Date().toISOString().slice(0, 10);
        set((s) => ({
          tasks: s.tasks.map((t) => {
            if (t.id !== id) return t;
            const log = { ...(t.completionLog ?? {}) };
            log[d] = !log[d];
            // for non-recurring one-time tasks, also update status
            const newStatus = t.repeatRule === 'none' && log[d]
              ? 'completed' as const
              : (t.repeatRule === 'none' && !log[d] ? 'pending' as const : t.status);
            return {
              ...t,
              completionLog: log,
              status: newStatus,
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      toggleChecklistItem: (taskId, itemId) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id !== taskId ? t : {
              ...t,
              checklistItems: t.checklistItems.map((c) =>
                c.id === itemId ? { ...c, done: !c.done } : c,
              ),
              updatedAt: new Date().toISOString(),
            },
          ),
        })),

      archiveTask: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id ? { ...t, status: 'archived', updatedAt: new Date().toISOString() } : t,
          ),
        })),

      duplicateTask: (id) =>
        set((s) => {
          const orig = s.tasks.find((t) => t.id === id);
          if (!orig) return s;
          const newId = `t-${uuid().slice(0, 8)}`;
          const copy: Task = {
            ...orig,
            id: newId,
            title: `${orig.title} (copy)`,
            status: 'pending',
            completionLog: {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          return { tasks: [copy, ...s.tasks] };
        }),

      moveTask: (id, sectionId, subSectionId) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id ? {
              ...t,
              sectionId,
              subSectionId,
              updatedAt: new Date().toISOString(),
            } : t,
          ),
        })),

      // ---------- Sections ----------
      addSection: (name, icon, color) =>
        set((s) => {
          const id = `sec-${uuid().slice(0, 8)}`;
          const order = Math.max(0, ...s.sections.map((x) => x.order)) + 1;
          const section: Section = {
            id, name, icon, color, order, subSections: [],
          };
          return { sections: [...s.sections, section] };
        }),

      renameSection: (id, name) =>
        set((s) => ({
          sections: s.sections.map((sec) =>
            sec.id === id ? { ...sec, name } : sec,
          ),
        })),

      deleteSection: (id) =>
        set((s) => ({
          sections: s.sections.filter((sec) => sec.id !== id),
          tasks: s.tasks.filter((t) => t.sectionId !== id),
        })),

      reorderSection: (id, direction) =>
        set((s) => {
          const sorted = [...s.sections].sort((a, b) => a.order - b.order);
          const idx = sorted.findIndex((sec) => sec.id === id);
          if (idx === -1) return s;
          const swapWith = direction === 'up' ? idx - 1 : idx + 1;
          if (swapWith < 0 || swapWith >= sorted.length) return s;
          const tmp = sorted[idx].order;
          sorted[idx].order = sorted[swapWith].order;
          sorted[swapWith].order = tmp;
          return { sections: sorted };
        }),

      addSubSection: (parentId, name) =>
        set((s) => ({
          sections: s.sections.map((sec) =>
            sec.id !== parentId ? sec : {
              ...sec,
              subSections: [
                ...sec.subSections,
                { id: `sub-${uuid().slice(0, 8)}`, parentId, name },
              ],
            },
          ),
        })),

      // ---------- Habits ----------
      toggleHabit: (id, dateISO) => {
        const d = dateISO ?? new Date().toISOString().slice(0, 10);
        set((s) => ({
          habits: s.habits.map((h) => {
            if (h.id !== id) return h;
            const log = { ...h.log };
            log[d] = !log[d];
            return { ...h, log };
          }),
        }));
      },

      addHabit: (name, category, target) =>
        set((s) => ({
          habits: [
            ...s.habits,
            { id: `h-${uuid().slice(0, 8)}`, name, category, target, isActive: true, log: {} },
          ],
        })),

      deleteHabit: (id) =>
        set((s) => ({ habits: s.habits.filter((h) => h.id !== id) })),

      // ---------- Routine ----------
      toggleRoutineBlock: (id, dateISO) => {
        const d = dateISO ?? new Date().toISOString().slice(0, 10);
        set((s) => ({
          routineBlocks: s.routineBlocks.map((r) => {
            if (r.id !== id) return r;
            const log = { ...r.log };
            log[d] = !log[d];
            return { ...r, log };
          }),
        }));
      },

      // ---------- Finance ----------
      addFinanceEntry: (input) =>
        set((s) => ({
          finance: [
            { ...input, id: `f-${uuid().slice(0, 8)}` },
            ...s.finance,
          ],
        })),

      deleteFinanceEntry: (id) =>
        set((s) => ({ finance: s.finance.filter((f) => f.id !== id) })),

      addFinanceTarget: (title, amount, type) =>
        set((s) => ({
          financeTargets: [
            ...s.financeTargets,
            { id: `ft-${uuid().slice(0, 8)}`, title, amount, type },
          ],
        })),

      deleteFinanceTarget: (id) =>
        set((s) => ({ financeTargets: s.financeTargets.filter((t) => t.id !== id) })),

      // ---------- Journal (V2) ----------
      addJournalEntry: (input) => {
        const id = `j-${uuid().slice(0, 8)}`;
        const entry: JournalEntry = {
          id,
          entry_date: input.entry_date,
          title: input.title,
          content: input.content,
          mood_score: input.mood_score,
          reflection_type: input.reflection_type ?? 'daily',
          ai_summary: input.ai_summary,
          created_at: new Date().toISOString(),
        };
        set((s) => ({ journal: [entry, ...s.journal] }));
        return id;
      },
      updateJournalEntry: (id, patch) =>
        set((s) => ({
          journal: s.journal.map((j) => (j.id === id ? { ...j, ...patch } : j)),
        })),
      deleteJournalEntry: (id) =>
        set((s) => ({ journal: s.journal.filter((j) => j.id !== id) })),

      // ---------- Knowledge Notes (V2) ----------
      addKnowledgeNote: (input) => {
        const id = `k-${uuid().slice(0, 8)}`;
        const now = new Date().toISOString();
        const note: KnowledgeNote = {
          id,
          title: input.title,
          content: input.content,
          tags: input.tags ?? [],
          source_type: input.source_type,
          reference_url: input.reference_url,
          ai_summary: input.ai_summary,
          created_at: now,
          updated_at: now,
        };
        set((s) => ({ knowledgeNotes: [note, ...s.knowledgeNotes] }));
        return id;
      },
      updateKnowledgeNote: (id, patch) =>
        set((s) => ({
          knowledgeNotes: s.knowledgeNotes.map((n) =>
            n.id === id ? { ...n, ...patch, updated_at: new Date().toISOString() } : n,
          ),
        })),
      deleteKnowledgeNote: (id) =>
        set((s) => ({ knowledgeNotes: s.knowledgeNotes.filter((n) => n.id !== id) })),

      // ---------- AI Chat History (V2) ----------
      appendAIChat: (msg) =>
        set((s) => ({
          aiChatHistory: [
            ...s.aiChatHistory,
            { id: `c-${uuid().slice(0, 8)}`, timestamp: new Date().toISOString(), ...msg },
          ].slice(-100), // keep last 100 messages
        })),
      clearAIChat: () => set({ aiChatHistory: [] }),

      // ---------- Settings ----------
      updateSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),

      // ---------- System ----------
      resetAll: () => set({ ...initialAppState }),

      exportData: () => {
        const s = get();
        return JSON.stringify({
          tasks: s.tasks,
          sections: s.sections,
          habits: s.habits,
          routineBlocks: s.routineBlocks,
          finance: s.finance,
          financeTargets: s.financeTargets,
          weeklyThemes: s.weeklyThemes,
          journal: s.journal,
          knowledgeNotes: s.knowledgeNotes,
          aiChatHistory: s.aiChatHistory,
          settings: s.settings,
        }, null, 2);
      },

      importData: (json) => {
        try {
          const data = JSON.parse(json);
          set({
            tasks: data.tasks ?? [],
            sections: data.sections ?? DEFAULT_SECTIONS,
            habits: data.habits ?? DEFAULT_HABITS,
            routineBlocks: data.routineBlocks ?? DEFAULT_ROUTINE,
            finance: data.finance ?? [],
            financeTargets: data.financeTargets ?? DEFAULT_FINANCE_TARGETS,
            weeklyThemes: data.weeklyThemes ?? DEFAULT_WEEKLY_THEMES,
            journal: data.journal ?? [],
            knowledgeNotes: data.knowledgeNotes ?? [],
            aiChatHistory: data.aiChatHistory ?? [],
            settings: { ...DEFAULT_SETTINGS, ...(data.settings ?? {}) },
          });
          return true;
        } catch {
          return false;
        }
      },

      markOpened: () =>
        set({ lastOpened: new Date().toISOString() }),
    }),
    {
      name: 'july-plan-store',
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);

// ---------- Selector helpers ----------
export function useTodayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function isTaskDoneOn(task: Task, dateISO: string) {
  return !!task.completionLog?.[dateISO];
}

export function getStreak(log: Record<string, boolean> | undefined): number {
  if (!log) return 0;
  let streak = 0;
  const d = new Date();
  while (true) {
    const iso = d.toISOString().slice(0, 10);
    if (log[iso]) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}
