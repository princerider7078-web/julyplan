// July Plan — Type Definitions

export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type TaskStatus = 'pending' | 'completed' | 'archived';
export type RepeatRule = 'none' | 'daily' | 'weekly' | 'monthly';
export type TaskType =
  | 'one-time'
  | 'daily-recurring'
  | 'weekly-task'
  | 'monthly-goal'
  | 'routine-block'
  | 'checklist-item'
  | 'habit-item'
  | 'financial-goal';

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  sectionId: string;
  subSectionId?: string;
  type: TaskType;
  priority: Priority;
  status: TaskStatus;
  startDate: string;        // ISO date (YYYY-MM-DD)
  endDate?: string;         // ISO date
  time?: string;            // HH:mm
  reminderTime?: string;    // HH:mm
  repeatRule: RepeatRule;
  checklistItems: ChecklistItem[];
  notes?: string;
  isTopPriority?: boolean;
  createdAt: string;
  updatedAt: string;
  // Daily completion tracking: ISO date -> boolean
  completionLog?: Record<string, boolean>;
}

export interface SubSection {
  id: string;
  name: string;
  parentId: string;
}

export interface Section {
  id: string;
  name: string;
  icon: string;            // lucide icon name
  color: string;           // tailwind color hex
  order: number;
  subSections: SubSection[];
}

export interface Habit {
  id: string;
  name: string;
  category: string;
  target: string;          // e.g., "daily", "3x/week"
  isActive: boolean;
  // ISO date -> boolean
  log: Record<string, boolean>;
}

export interface RoutineBlock {
  id: string;
  title: string;
  startTime: string;       // HH:mm
  endTime: string;         // HH:mm
  category: string;        // health, mind, voice, study, food, break, looks, office, sleep
  description?: string;
  checklistItems: string[];
  // ISO date -> boolean (completed that day)
  log: Record<string, boolean>;
}

export interface FinanceEntry {
  id: string;
  title: string;
  amount: number;
  type: 'income' | 'expense' | 'saving' | 'target';
  date: string;            // ISO date
  category: string;
  note?: string;
}

export interface FinanceTarget {
  id: string;
  title: string;
  amount: number;
  type: 'monthly' | 'savings' | 'future';
}

export interface WeeklyTheme {
  week: number;
  title: string;
  focus: string[];
}

export interface JournalEntry {
  id: string;
  entry_date: string;       // ISO date
  title?: string;
  content: string;
  mood_score: number;       // 1-10
  reflection_type?: 'daily' | 'weekly' | 'monthly' | 'free';
  ai_summary?: string;
  created_at: string;
}

export interface KnowledgeNote {
  id: string;
  title: string;
  content: string;
  tags: string[];
  source_type?: string;
  reference_url?: string;
  ai_summary?: string;
  created_at: string;
  updated_at: string;
}

export interface AIChatMessageStore {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  // Optional: link to memory extracted from this message
  extracted_memory_ids?: string[];
  // Optional: conversation session id (for grouping)
  session_id?: string;
}

// ---------- Long-term AI Memory (V3) ----------
export type MemoryCategory =
  | 'personal'      // Personal Information
  | 'goals'         // Goals
  | 'habits'        // Habits
  | 'routine'       // Daily Routine
  | 'preferences'   // Preferences
  | 'health'        // Health
  | 'work'          // Work
  | 'education'     // Education
  | 'relationships' // Relationships
  | 'skills'        // Skills
  | 'projects'      // Projects
  | 'events'        // Important Events
  | 'custom';       // Custom Memories

export type MemorySource = 'chat' | 'manual' | 'imported';
export type MemoryImportance = 'low' | 'medium' | 'high' | 'critical';

export interface AIMemoryItem {
  id: string;
  title: string;
  content: string;
  category: MemoryCategory;
  importance: MemoryImportance;
  confidence: number;          // 0.0 - 1.0
  source: MemorySource;
  // State flags
  pinned: boolean;             // user-pinned (always included in context)
  favorite: boolean;
  archived: boolean;
  locked: boolean;             // locked = cannot be auto-modified by AI
  disabled: boolean;           // disabled = excluded from context but kept
  // Metadata
  tags: string[];
  lastUsedAt?: string;
  useCount: number;
  createdAt: string;
  updatedAt: string;
  // Optional embedding for semantic search (stored as number[])
  embedding?: number[];
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  waterTarget: number;     // ml
  proteinTarget: number;   // grams
  maxWastedDays: number;   // per month
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  // AI profile
  aiProvider: 'zai' | 'openrouter' | 'gemini' | 'groq' | 'openai' | 'ollama';
  aiModelChat: string;
  aiModelPlanning: string;
  aiModelReports: string;
  aiTemperature: number;
  aiMaxTokens: number;
  aiEnabledModules: string[];
  // V3.1: AI backend URL for APK mode (empty = use relative /api/ai for web)
  aiBackendUrl: string;
}

export interface AppState {
  tasks: Task[];
  sections: Section[];
  habits: Habit[];
  routineBlocks: RoutineBlock[];
  finance: FinanceEntry[];
  financeTargets: FinanceTarget[];
  weeklyThemes: WeeklyTheme[];
  settings: AppSettings;
  journal: JournalEntry[];
  knowledgeNotes: KnowledgeNote[];
  aiChatHistory: AIChatMessageStore[];
  // V3: long-term memory + conversation summaries + AI-generated notifications
  memories: AIMemoryItem[];
  conversationSummaries: ConversationSummary[];
  aiNotifications: AINotification[];
  lastOpened: string | null;
  initialized: boolean;
}

export interface ConversationSummary {
  id: string;
  session_id: string;
  summary: string;
  message_count: number;
  created_at: string;
}

export interface AINotification {
  id: string;
  title: string;
  message: string;
  type: 'task' | 'habit' | 'briefing' | 'review' | 'goal' | 'motivation' | 'health' | 'hydration' | 'workout' | 'sleep' | 'study';
  priority: 'low' | 'medium' | 'high' | 'critical';
  scheduled_at: string;       // ISO datetime
  status: 'pending' | 'shown' | 'dismissed' | 'snoozed' | 'completed';
  ai_generated: boolean;
  linked_entity_type?: 'task' | 'habit' | 'memory';
  linked_entity_id?: string;
  created_at: string;
}
