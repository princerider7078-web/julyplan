import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ---------- Date helpers ----------
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isoFromOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatDateLong(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

export function formatDateShort(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, {
    month: 'short', day: 'numeric',
  });
}

export function formatTime12(hhmm?: string): string {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hr12 = h % 12 === 0 ? 12 : h % 12;
  return `${hr12}:${String(m).padStart(2, '0')} ${period}`;
}

export function formatTimeShort(hhmm?: string): string {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hr12 = h % 12 === 0 ? 12 : h % 12;
  return `${hr12}:${String(m).padStart(2, '0')} ${period}`;
}

// Days since start of July (or current month) for wasted-day tracking
export function getDayOfMonth(): number {
  return new Date().getDate();
}

export function getCurrentWeekOfMonth(): number {
  const day = new Date().getDate();
  return Math.min(4, Math.ceil(day / 7));
}

export function getLast7Days(): string[] {
  const arr: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    arr.push(d.toISOString().slice(0, 10));
  }
  return arr;
}

export function getLast30Days(): string[] {
  const arr: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    arr.push(d.toISOString().slice(0, 10));
  }
  return arr;
}

// ---------- Priority ----------
const PRIORITY_STYLES: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  critical: { label: 'Critical', bg: 'bg-red-500/15',    text: 'text-red-600 dark:text-red-400',    dot: 'bg-red-500' },
  high:     { label: 'High',     bg: 'bg-orange-500/15', text: 'text-orange-600 dark:text-orange-400', dot: 'bg-orange-500' },
  medium:   { label: 'Medium',   bg: 'bg-amber-500/15',  text: 'text-amber-600 dark:text-amber-400',  dot: 'bg-amber-500' },
  low:      { label: 'Low',      bg: 'bg-emerald-500/15',text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
};

export function priorityStyle(p: string) {
  return PRIORITY_STYLES[p] ?? PRIORITY_STYLES.medium;
}

export const PRIORITY_RANK: Record<string, number> = {
  critical: 0, high: 1, medium: 2, low: 3,
};

// ---------- Routine category styles ----------
const ROUTINE_STYLES: Record<string, { label: string; chip: string; border: string; icon: string }> = {
  sleep:   { label: 'Sleep',  chip: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300',   border: 'border-l-indigo-500',   icon: 'Moon' },
  health:  { label: 'Workout',chip: 'bg-red-500/15 text-red-600 dark:text-red-300',            border: 'border-l-red-500',      icon: 'Dumbbell' },
  mind:    { label: 'Mind',   chip: 'bg-violet-500/15 text-violet-600 dark:text-violet-300',  border: 'border-l-violet-500',   icon: 'Brain' },
  looks:   { label: 'Looks',  chip: 'bg-pink-500/15 text-pink-600 dark:text-pink-300',         border: 'border-l-pink-500',     icon: 'Sparkles' },
  food:    { label: 'Food',   chip: 'bg-amber-500/15 text-amber-600 dark:text-amber-300',      border: 'border-l-amber-500',    icon: 'Apple' },
  voice:   { label: 'Voice',  chip: 'bg-orange-500/15 text-orange-600 dark:text-orange-300',   border: 'border-l-orange-500',   icon: 'AudioLines' },
  study:   { label: 'Study',  chip: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',border: 'border-l-emerald-500',  icon: 'Laptop' },
  break:   { label: 'Break',  chip: 'bg-teal-500/15 text-teal-600 dark:text-teal-300',         border: 'border-l-teal-500',     icon: 'Coffee' },
  office:  { label: 'Office', chip: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300',         border: 'border-l-cyan-500',     icon: 'Briefcase' },
};

export function routineStyle(cat: string) {
  return ROUTINE_STYLES[cat] ?? ROUTINE_STYLES.study;
}

// ---------- Progress ring helpers ----------
export function clampPct(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

// Score: percentage of items in a list that are done today
export function completionPct(done: number, total: number): number {
  if (total <= 0) return 0;
  return clampPct((done / total) * 100);
}
