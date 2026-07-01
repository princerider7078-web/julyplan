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

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  waterTarget: number;     // ml
  proteinTarget: number;   // grams
  maxWastedDays: number;   // per month
  soundEnabled: boolean;
  notificationsEnabled: boolean;
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
  lastOpened: string | null;
  initialized: boolean;
}
