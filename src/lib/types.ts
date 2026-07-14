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
  // V6: appearance controls
  accentColor: AccentColorKey;     // primary color theme
  gradientIntensity: 'subtle' | 'medium' | 'vibrant';  // gradient strength
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
  // V4.1: auto-fire notifications when task time arrives
  autoTaskNotifications: boolean;
  taskNotificationLeadMinutes: number;  // fire N minutes before task time
}

// V6: Accent color options for user-selectable theming
export type AccentColorKey =
  | 'amber'    // default — warm amber/orange
  | 'teal'     // teal/cyan
  | 'violet'   // purple
  | 'rose'     // pink/red
  | 'emerald'  // green
  | 'sunset'   // orange-pink gradient
  | 'ocean';   // blue-teal gradient

export interface AccentColorDef {
  key: AccentColorKey;
  label: string;
  // Light mode values
  light: { primary: string; primaryForeground: string; ring: string; chart1: string };
  // Dark mode values
  dark: { primary: string; primaryForeground: string; ring: string; chart1: string };
  // Gradient stops for premium gradients
  gradient: { from: string; to: string };
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
  // V4: smart notification system
  notificationPreferences: NotificationPreferences;
  learningProfile: LearningProfile;
  recoveryQueue: RecoveryItem[];
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
  type: 'task' | 'habit' | 'briefing' | 'review' | 'goal' | 'motivation' | 'health' | 'hydration' | 'workout' | 'sleep' | 'study' | 'priority' | 'focus' | 'procrastination' | 'deadline' | 'suggestion' | 'reschedule' | 'achievement';
  priority: 'low' | 'medium' | 'high' | 'critical';
  scheduled_at: string;       // ISO datetime
  status: 'pending' | 'shown' | 'dismissed' | 'snoozed' | 'completed' | 'recovery';
  ai_generated: boolean;
  linked_entity_type?: 'task' | 'habit' | 'memory';
  linked_entity_id?: string;
  created_at: string;

  // ── V4: AI Reasoning + Escalation + Personalization ──
  reasoning?: string;         // "Why now" — concise AI explanation
  category?: NotificationCategory;
  escalation_level?: 0 | 1 | 2 | 3 | 4;  // 0=normal, 4=recovery queue
  snooze_count?: number;      // how many times user snoozed this
  postpone_count?: number;    // how many times task was postponed (for procrastination alert)
  batch_id?: string;          // group multiple notifications into one batch
  tone?: NotificationTone;    // personalized tone used
  estimated_minutes?: number; // estimated work remaining
  actions?: NotificationAction[];  // interactive actions
}

export type NotificationCategory =
  | 'task' | 'habit' | 'health' | 'work' | 'study'
  | 'finance' | 'goal_progress' | 'ai_insights' | 'deadlines'
  | 'personal' | 'achievements' | 'weekly_reports';

export type NotificationTone = 'professional' | 'friendly' | 'motivational' | 'minimal' | 'strict';

export type NotificationAction =
  | 'complete' | 'snooze' | 'reschedule' | 'ask_ai' | 'skip'
  | 'start' | 'split' | 'delay' | 'break_subtasks' | 'convert_habit';

// ── V4: Notification Preferences ──
export interface NotificationPreferences {
  // Tone
  tone: NotificationTone;
  // Quiet hours (24h format)
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;   // "22:00"
  quiet_hours_end: string;     // "07:00"
  critical_bypass_quiet: boolean;
  // Categories enabled
  categories: Record<NotificationCategory, boolean>;
  // Smart batching
  batching_enabled: boolean;
  batching_window_minutes: number;  // batch notifications within this window
  // Escalation
  escalation_enabled: boolean;
  escalation_delay_minutes: number; // minutes between escalation levels
  // Learning
  learning_enabled: boolean;
  // Default snooze duration (learned over time)
  default_snooze_minutes: number;
}

// ── V4: AI Learning Profile ──
export interface LearningProfile {
  // Snooze patterns
  avg_snooze_minutes: number;
  snooze_count_total: number;
  // Response patterns
  avg_response_time_minutes: number;
  no_response_before_hour: number;  // 7 = 7 AM (delay morning reminders)
  no_response_after_hour: number;   // 23 = 11 PM
  // Productive hours (when user completes most tasks)
  productive_hours: number[];       // [9, 10, 11, 20, 21, 22]
  // Procrastination patterns
  most_postponed_category: string;
  most_postponed_task_id: string | null;
  // Habit streaks at risk
  habits_at_risk: string[];
  // Completion patterns
  task_completion_rate: number;     // 0-1
  habit_completion_rate: number;    // 0-1
  // Notification response rate
  notification_response_rate: number;  // 0-1
  // Last updated
  updated_at: string;
}

// ── V4: Recovery Queue Item ──
export interface RecoveryItem {
  id: string;
  task_id?: string;
  habit_id?: string;
  title: string;
  reason: string;              // why it's in recovery
  missed_count: number;
  suggested_actions: NotificationAction[];
  ai_suggestion: string;       // AI recommendation
  created_at: string;
}
