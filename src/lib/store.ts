// July Plan — Zustand store with localStorage persistence (offline-first)
// V2: extended with Journal, Knowledge Base, AI chat history, AI profile.
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuid } from 'uuid';
import type {
  Task, Section, Habit, RoutineBlock, FinanceEntry, FinanceTarget,
  AppSettings, AppState, SubSection, ChecklistItem, Priority, TaskType,
  RepeatRule, JournalEntry, KnowledgeNote, AIChatMessageStore,
  AIMemoryItem, MemoryCategory, MemoryImportance, MemorySource,
  ConversationSummary, AINotification,
  NotificationPreferences, LearningProfile, RecoveryItem,
  NotificationCategory, NotificationTone, NotificationAction,
  AccentColorKey, AccentColorDef,
} from './types';
import {
  DEFAULT_SECTIONS, DEFAULT_HABITS, DEFAULT_ROUTINE,
  DEFAULT_WEEKLY_THEMES, DEFAULT_FINANCE_TARGETS, defaultSeedTasks,
} from './seed';

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  // V6: appearance controls
  accentColor: 'amber',
  gradientIntensity: 'medium',
  waterTarget: 3000,
  proteinTarget: 90,
  maxWastedDays: 2,
  soundEnabled: true,
  notificationsEnabled: true,
  aiProvider: 'zai',
  aiModelChat: 'glm-4.6',
  aiModelPlanning: 'glm-4.6',
  aiModelReports: 'glm-4.6',
  aiTemperature: 0.7,
  aiMaxTokens: 1500,
  aiEnabledModules: ['tasks', 'habits', 'health', 'finance', 'journal'],
  aiBackendUrl: '',
  // V4.1: auto-fire notifications when task time arrives
  autoTaskNotifications: true,
  taskNotificationLeadMinutes: 0,  // 0 = fire exactly at task time
};

// V6: Accent color registry — all values in oklch for smooth theme switching
export const ACCENT_COLORS: Record<AccentColorKey, AccentColorDef> = {
  amber: {
    key: 'amber', label: 'Amber',
    light: { primary: 'oklch(0.68 0.18 50)', primaryForeground: 'oklch(0.99 0.003 80)', ring: 'oklch(0.68 0.18 50)', chart1: 'oklch(0.68 0.18 50)' },
    dark:  { primary: 'oklch(0.75 0.17 55)', primaryForeground: 'oklch(0.20 0.04 55)', ring: 'oklch(0.75 0.17 55)', chart1: 'oklch(0.75 0.17 55)' },
    gradient: { from: 'oklch(0.72 0.19 50)', to: 'oklch(0.62 0.22 25)' },
  },
  teal: {
    key: 'teal', label: 'Teal',
    light: { primary: 'oklch(0.62 0.13 195)', primaryForeground: 'oklch(0.99 0.003 195)', ring: 'oklch(0.62 0.13 195)', chart1: 'oklch(0.62 0.13 195)' },
    dark:  { primary: 'oklch(0.72 0.13 195)', primaryForeground: 'oklch(0.18 0.03 195)', ring: 'oklch(0.72 0.13 195)', chart1: 'oklch(0.72 0.13 195)' },
    gradient: { from: 'oklch(0.70 0.14 195)', to: 'oklch(0.60 0.16 230)' },
  },
  violet: {
    key: 'violet', label: 'Violet',
    light: { primary: 'oklch(0.58 0.20 290)', primaryForeground: 'oklch(0.99 0.003 290)', ring: 'oklch(0.58 0.20 290)', chart1: 'oklch(0.58 0.20 290)' },
    dark:  { primary: 'oklch(0.68 0.19 295)', primaryForeground: 'oklch(0.18 0.03 295)', ring: 'oklch(0.68 0.19 295)', chart1: 'oklch(0.68 0.19 295)' },
    gradient: { from: 'oklch(0.66 0.21 295)', to: 'oklch(0.58 0.22 330)' },
  },
  rose: {
    key: 'rose', label: 'Rose',
    light: { primary: 'oklch(0.62 0.21 15)', primaryForeground: 'oklch(0.99 0.003 15)', ring: 'oklch(0.62 0.21 15)', chart1: 'oklch(0.62 0.21 15)' },
    dark:  { primary: 'oklch(0.72 0.19 15)', primaryForeground: 'oklch(0.18 0.03 15)', ring: 'oklch(0.72 0.19 15)', chart1: 'oklch(0.72 0.19 15)' },
    gradient: { from: 'oklch(0.70 0.21 15)', to: 'oklch(0.62 0.22 350)' },
  },
  emerald: {
    key: 'emerald', label: 'Emerald',
    light: { primary: 'oklch(0.60 0.15 155)', primaryForeground: 'oklch(0.99 0.003 155)', ring: 'oklch(0.60 0.15 155)', chart1: 'oklch(0.60 0.15 155)' },
    dark:  { primary: 'oklch(0.72 0.16 155)', primaryForeground: 'oklch(0.18 0.03 155)', ring: 'oklch(0.72 0.16 155)', chart1: 'oklch(0.72 0.16 155)' },
    gradient: { from: 'oklch(0.70 0.17 155)', to: 'oklch(0.60 0.18 180)' },
  },
  sunset: {
    key: 'sunset', label: 'Sunset',
    light: { primary: 'oklch(0.65 0.20 35)', primaryForeground: 'oklch(0.99 0.003 35)', ring: 'oklch(0.65 0.20 35)', chart1: 'oklch(0.65 0.20 35)' },
    dark:  { primary: 'oklch(0.74 0.18 40)', primaryForeground: 'oklch(0.18 0.03 40)', ring: 'oklch(0.74 0.18 40)', chart1: 'oklch(0.74 0.18 40)' },
    gradient: { from: 'oklch(0.72 0.20 40)', to: 'oklch(0.62 0.22 10)' },
  },
  ocean: {
    key: 'ocean', label: 'Ocean',
    light: { primary: 'oklch(0.55 0.15 240)', primaryForeground: 'oklch(0.99 0.003 240)', ring: 'oklch(0.55 0.15 240)', chart1: 'oklch(0.55 0.15 240)' },
    dark:  { primary: 'oklch(0.70 0.15 240)', primaryForeground: 'oklch(0.18 0.03 240)', ring: 'oklch(0.70 0.15 240)', chart1: 'oklch(0.70 0.15 240)' },
    gradient: { from: 'oklch(0.68 0.16 240)', to: 'oklch(0.60 0.14 200)' },
  },
};

// V4: Default notification preferences — smart, learning-enabled
const DEFAULT_NOTIF_PREFS: NotificationPreferences = {
  tone: 'friendly',
  quiet_hours_enabled: true,
  quiet_hours_start: '22:00',
  quiet_hours_end: '07:00',
  critical_bypass_quiet: true,
  categories: {
    task: true, habit: true, health: true, work: true, study: true,
    finance: true, goal_progress: true, ai_insights: true, deadlines: true,
    personal: true, achievements: true, weekly_reports: true,
  },
  batching_enabled: true,
  batching_window_minutes: 15,
  escalation_enabled: true,
  escalation_delay_minutes: 10,
  learning_enabled: true,
  default_snooze_minutes: 15,
};

// V4: Default learning profile — adapts over time
const DEFAULT_LEARNING_PROFILE: LearningProfile = {
  avg_snooze_minutes: 15,
  snooze_count_total: 0,
  avg_response_time_minutes: 5,
  no_response_before_hour: 6,
  no_response_after_hour: 23,
  productive_hours: [9, 10, 11, 20, 21, 22],
  most_postponed_category: '',
  most_postponed_task_id: null,
  habits_at_risk: [],
  task_completion_rate: 0,
  habit_completion_rate: 0,
  notification_response_rate: 0,
  updated_at: new Date().toISOString(),
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
  // memories (V3)
  addMemory: (input: Omit<AIMemoryItem, 'id' | 'createdAt' | 'updatedAt' | 'useCount'>) => string;
  updateMemory: (id: string, patch: Partial<AIMemoryItem>) => void;
  deleteMemory: (id: string) => void;
  mergeMemories: (sourceId: string, targetId: string) => void;
  touchMemory: (id: string) => void;  // update lastUsedAt + useCount
  // conversation summaries (V3)
  addConversationSummary: (input: Omit<ConversationSummary, 'id' | 'created_at'>) => void;
  // ai notifications (V3)
  addAINotification: (input: Omit<AINotification, 'id' | 'created_at'>) => string;
  updateAINotification: (id: string, patch: Partial<AINotification>) => void;
  dismissAINotification: (id: string) => void;
  // V4: smart notification actions
  snoozeAINotification: (id: string, minutes?: number) => void;
  escalateNotification: (id: string) => void;
  completeAINotification: (id: string) => void;
  moveToRecovery: (id: string) => void;
  updateNotificationPreferences: (patch: Partial<NotificationPreferences>) => void;
  updateLearningProfile: (patch: Partial<LearningProfile>) => void;
  addRecoveryItem: (input: Omit<RecoveryItem, 'id' | 'created_at'>) => string;
  deleteRecoveryItem: (id: string) => void;
  recordSnoozeAction: (notificationId: string, snoozeMinutes: number) => void;
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
  memories: [],
  conversationSummaries: [],
  aiNotifications: [],
  notificationPreferences: DEFAULT_NOTIF_PREFS,
  learningProfile: DEFAULT_LEARNING_PROFILE,
  recoveryQueue: [],
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
          ].slice(-200), // keep last 200 messages
        })),
      clearAIChat: () => set({ aiChatHistory: [] }),

      // ---------- Memories (V3) ----------
      addMemory: (input) => {
        const id = `m-${uuid().slice(0, 8)}`;
        const now = new Date().toISOString();
        const memory: AIMemoryItem = {
          id,
          title: input.title,
          content: input.content,
          category: input.category,
          importance: input.importance,
          confidence: input.confidence,
          source: input.source,
          pinned: input.pinned ?? false,
          favorite: input.favorite ?? false,
          archived: input.archived ?? false,
          locked: input.locked ?? false,
          disabled: input.disabled ?? false,
          tags: input.tags ?? [],
          lastUsedAt: now,
          useCount: 0,
          createdAt: now,
          updatedAt: now,
          embedding: input.embedding,
        };
        set((s) => ({ memories: [memory, ...s.memories] }));
        return id;
      },
      updateMemory: (id, patch) =>
        set((s) => ({
          memories: s.memories.map((m) =>
            m.id === id
              ? { ...m, ...patch, updatedAt: new Date().toISOString() }
              : m,
          ),
        })),
      deleteMemory: (id) =>
        set((s) => ({ memories: s.memories.filter((m) => m.id !== id) })),
      mergeMemories: (sourceId, targetId) =>
        set((s) => {
          const source = s.memories.find((m) => m.id === sourceId);
          const target = s.memories.find((m) => m.id === targetId);
          if (!source || !target) return s;
          const merged: AIMemoryItem = {
            ...target,
            content: `${target.content}\n\n[Merged from "${source.title}": ${source.content}]`,
            tags: Array.from(new Set([...target.tags, ...source.tags])),
            updatedAt: new Date().toISOString(),
          };
          return {
            memories: s.memories
              .map((m) => (m.id === targetId ? merged : m))
              .filter((m) => m.id !== sourceId),
          };
        }),
      touchMemory: (id) =>
        set((s) => ({
          memories: s.memories.map((m) =>
            m.id === id
              ? { ...m, lastUsedAt: new Date().toISOString(), useCount: m.useCount + 1 }
              : m,
          ),
        })),

      // ---------- Conversation Summaries (V3) ----------
      addConversationSummary: (input) =>
        set((s) => ({
          conversationSummaries: [
            { id: `cs-${uuid().slice(0, 8)}`, created_at: new Date().toISOString(), ...input },
            ...s.conversationSummaries,
          ].slice(0, 50),
        })),

      // ---------- AI Notifications (V3) ----------
      addAINotification: (input) => {
        const id = `n-${uuid().slice(0, 8)}`;
        const notif: AINotification = {
          id,
          created_at: new Date().toISOString(),
          ...input,
        };
        set((s) => ({ aiNotifications: [notif, ...s.aiNotifications].slice(0, 100) }));
        return id;
      },
      updateAINotification: (id, patch) =>
        set((s) => ({
          aiNotifications: s.aiNotifications.map((n) =>
            n.id === id ? { ...n, ...patch } : n,
          ),
        })),
      dismissAINotification: (id) =>
        set((s) => ({
          aiNotifications: s.aiNotifications.map((n) =>
            n.id === id ? { ...n, status: 'dismissed' as const } : n,
          ),
        })),

      // ---------- V4: Smart Notification Actions ----------
      snoozeAINotification: (id, minutes) =>
        set((s) => ({
          aiNotifications: s.aiNotifications.map((n) => {
            if (n.id !== id) return n;
            const snoozeMin = minutes ?? s.notificationPreferences.default_snooze_minutes;
            const snoozeUntil = new Date(Date.now() + snoozeMin * 60000).toISOString();
            return {
              ...n,
              status: 'snoozed' as const,
              scheduled_at: snoozeUntil,
              snooze_count: (n.snooze_count ?? 0) + 1,
            };
          }),
        })),

      escalateNotification: (id) =>
        set((s) => ({
          aiNotifications: s.aiNotifications.map((n) =>
            n.id === id
              ? {
                  ...n,
                  escalation_level: Math.min(4, (n.escalation_level ?? 0) + 1) as 0 | 1 | 2 | 3 | 4,
                  scheduled_at: new Date(
                    Date.now() + s.notificationPreferences.escalation_delay_minutes * 60000,
                  ).toISOString(),
                  status: 'pending' as const,
                }
              : n,
          ),
        })),

      completeAINotification: (id) =>
        set((s) => ({
          aiNotifications: s.aiNotifications.map((n) =>
            n.id === id ? { ...n, status: 'completed' as const } : n,
          ),
        })),

      moveToRecovery: (id) =>
        set((s) => {
          const notif = s.aiNotifications.find((n) => n.id === id);
          if (!notif) return s;
          const recoveryItem: RecoveryItem = {
            id: `r-${uuid().slice(0, 8)}`,
            task_id: notif.linked_entity_type === 'task' ? notif.linked_entity_id : undefined,
            habit_id: notif.linked_entity_type === 'habit' ? notif.linked_entity_id : undefined,
            title: notif.title,
            reason: notif.reasoning ?? 'Moved to recovery after multiple escalations',
            missed_count: (notif.snooze_count ?? 0) + (notif.escalation_level ?? 0),
            suggested_actions: ['complete', 'reschedule', 'break_subtasks', 'convert_habit', 'skip'],
            ai_suggestion: 'Pick the action that fits — break into subtasks if it feels too big.',
            created_at: new Date().toISOString(),
          };
          return {
            recoveryQueue: [recoveryItem, ...s.recoveryQueue].slice(0, 50),
            aiNotifications: s.aiNotifications.map((n) =>
              n.id === id ? { ...n, status: 'recovery' as const } : n,
            ),
          };
        }),

      updateNotificationPreferences: (patch) =>
        set((s) => ({
          notificationPreferences: { ...s.notificationPreferences, ...patch },
        })),

      updateLearningProfile: (patch) =>
        set((s) => ({
          learningProfile: {
            ...s.learningProfile,
            ...patch,
            updated_at: new Date().toISOString(),
          },
        })),

      addRecoveryItem: (input) => {
        const id = `r-${uuid().slice(0, 8)}`;
        const item: RecoveryItem = {
          id,
          created_at: new Date().toISOString(),
          ...input,
        };
        set((s) => ({ recoveryQueue: [item, ...s.recoveryQueue].slice(0, 50) }));
        return id;
      },

      deleteRecoveryItem: (id) =>
        set((s) => ({ recoveryQueue: s.recoveryQueue.filter((r) => r.id !== id) })),

      // V4: Record snooze action + update learning profile (avg snooze duration)
      recordSnoozeAction: (notificationId, snoozeMinutes) =>
        set((s) => {
          const total = s.learningProfile.snooze_count_total;
          const newAvg = total === 0
            ? snoozeMinutes
            : Math.round(((s.learningProfile.avg_snooze_minutes * total) + snoozeMinutes) / (total + 1));
          return {
            learningProfile: {
              ...s.learningProfile,
              avg_snooze_minutes: newAvg,
              snooze_count_total: total + 1,
              updated_at: new Date().toISOString(),
            },
          };
        }),

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
          memories: s.memories,
          conversationSummaries: s.conversationSummaries,
          aiNotifications: s.aiNotifications,
          notificationPreferences: s.notificationPreferences,
          learningProfile: s.learningProfile,
          recoveryQueue: s.recoveryQueue,
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
            memories: data.memories ?? [],
            conversationSummaries: data.conversationSummaries ?? [],
            aiNotifications: data.aiNotifications ?? [],
            notificationPreferences: { ...DEFAULT_NOTIF_PREFS, ...(data.notificationPreferences ?? {}) },
            learningProfile: { ...DEFAULT_LEARNING_PROFILE, ...(data.learningProfile ?? {}) },
            recoveryQueue: data.recoveryQueue ?? [],
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
      version: 6,
      // Backfill missing fields from defaults — important when migrating
      // between V1 → V2 → V3 → V4 → V4.1 schemas.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AppState>;
        const c = current as AppState;
        return {
          ...c,
          ...p,
          settings: { ...c.settings, ...(p.settings ?? {}) },
          memories: p.memories ?? c.memories,
          conversationSummaries: p.conversationSummaries ?? c.conversationSummaries,
          aiNotifications: p.aiNotifications ?? c.aiNotifications,
          notificationPreferences: {
            ...c.notificationPreferences,
            ...(p.notificationPreferences ?? {}),
            categories: {
              ...c.notificationPreferences.categories,
              ...((p.notificationPreferences ?? {}).categories ?? {}),
            },
          },
          learningProfile: { ...c.learningProfile, ...(p.learningProfile ?? {}) },
          recoveryQueue: p.recoveryQueue ?? c.recoveryQueue,
        };
      },
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
