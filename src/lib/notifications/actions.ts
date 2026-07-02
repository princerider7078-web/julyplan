// Notification action button definitions.
// On Android, these appear as buttons under the notification.
// Users can act without opening the app.

export interface NotificationActionDef {
  id: string;
  label: string;
  // Whether tapping the action should dismiss the notification
  dismissOnTap?: boolean;
  // Whether this action requires the app to open
  foreground?: boolean;
}

// Action sets per notification type
export const ACTION_SETS = {
  task: [
    { id: 'mark_done', label: '✅ Mark Done', dismissOnTap: true, foreground: false },
    { id: 'snooze_15', label: '⏰ Snooze 15m', dismissOnTap: true, foreground: false },
    { id: 'snooze_60', label: '⏰ Snooze 1h', dismissOnTap: true, foreground: false },
    { id: 'reschedule', label: '📅 Reschedule', dismissOnTap: false, foreground: true },
    { id: 'ask_ai', label: '🤖 Ask AI', dismissOnTap: false, foreground: true },
  ] as NotificationActionDef[],
  habit: [
    { id: 'mark_done', label: '✅ Done', dismissOnTap: true, foreground: false },
    { id: 'snooze_30', label: '⏰ Later (30m)', dismissOnTap: true, foreground: false },
    { id: 'skip', label: '⏭ Skip', dismissOnTap: true, foreground: false },
  ] as NotificationActionDef[],
  deadline: [
    { id: 'start_now', label: '▶ Start Now', dismissOnTap: true, foreground: true },
    { id: 'snooze_60', label: '⏰ 1 Hour', dismissOnTap: true, foreground: false },
    { id: 'ask_ai', label: '🤖 Ask AI', dismissOnTap: false, foreground: true },
  ] as NotificationActionDef[],
  briefing: [
    { id: 'view_tasks', label: '📋 View Tasks', dismissOnTap: true, foreground: true },
    { id: 'ask_ai', label: '🤖 Ask AI', dismissOnTap: false, foreground: true },
  ] as NotificationActionDef[],
  default: [
    { id: 'mark_done', label: '✅ Done', dismissOnTap: true, foreground: false },
    { id: 'snooze_15', label: '⏰ Snooze 15m', dismissOnTap: true, foreground: false },
    { id: 'ask_ai', label: '🤖 Ask AI', dismissOnTap: false, foreground: true },
  ] as NotificationActionDef[],
} as const;

export type ActionType = 'mark_done' | 'snooze_15' | 'snooze_30' | 'snooze_60' | 'reschedule' | 'ask_ai' | 'skip' | 'start_now' | 'view_tasks';

export function getActionsForType(type: string): NotificationActionDef[] {
  if (type === 'task' || type === 'priority' || type === 'reschedule' || type === 'focus' || type === 'procrastination') {
    return ACTION_SETS.task;
  }
  if (type === 'habit') return ACTION_SETS.habit;
  if (type === 'deadline') return ACTION_SETS.deadline;
  if (type === 'briefing' || type === 'review') return ACTION_SETS.briefing;
  return ACTION_SETS.default;
}

// Snooze options for the smart snooze picker
export const SNOOZE_OPTIONS = [
  { minutes: 5,   label: '5 min' },
  { minutes: 10,  label: '10 min' },
  { minutes: 15,  label: '15 min' },
  { minutes: 30,  label: '30 min' },
  { minutes: 60,  label: '1 hour' },
  { minutes: 120, label: '2 hours' },
  { minutes: 1440, label: 'Tomorrow' },  // 24h
  { minutes: 0,    label: 'Weekend', isWeekend: true },
];

// Reminder schedule options (how far ahead to remind)
export const REMINDER_SCHEDULES = [
  { offsetMinutes: 0,        label: 'At task time' },
  { offsetMinutes: 10,       label: '10 min before' },
  { offsetMinutes: 60,       label: '1 hour before' },
  { offsetMinutes: 60 * 24,  label: '1 day before' },
];

export const DEADLINE_SCHEDULES = [
  { offsetDays: 7, label: '7 days before' },
  { offsetDays: 3, label: '3 days before' },
  { offsetDays: 1, label: '1 day before' },
  { offsetDays: 0, label: 'Same day' },
  { offsetHours: 1, label: 'Last hour' },
];
