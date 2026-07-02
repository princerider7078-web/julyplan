// Notification Channel definitions.
// On Android, each channel has its own sound, vibration, and importance.
// Users can control each channel independently in Android Settings.

export interface NotificationChannelDef {
  id: string;
  name: string;
  description: string;
  importance: 'low' | 'default' | 'high';
  sound?: boolean;
  vibration?: boolean;
  // Color for the notification LED/icon (Android)
  ledColor?: string;
}

export const CHANNELS: NotificationChannelDef[] = [
  {
    id: 'tasks',
    name: 'Tasks',
    description: 'Task reminders and deadlines',
    importance: 'high',
    sound: true,
    vibration: true,
    ledColor: '#f97316',
  },
  {
    id: 'habits',
    name: 'Habits',
    description: 'Daily habit reminders and streaks',
    importance: 'default',
    sound: true,
    vibration: true,
    ledColor: '#10b981',
  },
  {
    id: 'health',
    name: 'Health',
    description: 'Water, workout, sleep, nutrition reminders',
    importance: 'default',
    sound: true,
    vibration: false,
    ledColor: '#ef4444',
  },
  {
    id: 'study',
    name: 'Study',
    description: 'Study session and learning reminders',
    importance: 'default',
    sound: true,
    vibration: false,
    ledColor: '#8b5cf6',
  },
  {
    id: 'work',
    name: 'Work',
    description: 'Office and work-related reminders',
    importance: 'high',
    sound: true,
    vibration: true,
    ledColor: '#06b6d4',
  },
  {
    id: 'goals',
    name: 'Goals',
    description: 'Goal progress and milestone reminders',
    importance: 'default',
    sound: true,
    vibration: false,
    ledColor: '#eab308',
  },
  {
    id: 'ai',
    name: 'AI Suggestions',
    description: 'AI-generated insights and recommendations',
    importance: 'low',
    sound: false,
    vibration: false,
    ledColor: '#a855f7',
  },
  {
    id: 'achievements',
    name: 'Achievements',
    description: 'Streaks, milestones, and progress celebrations',
    importance: 'low',
    sound: true,
    vibration: false,
    ledColor: '#f59e0b',
  },
  {
    id: 'briefing',
    name: 'Daily Briefing',
    description: 'Morning brief and evening summary',
    importance: 'high',
    sound: true,
    vibration: true,
    ledColor: '#3b82f6',
  },
  {
    id: 'deadlines',
    name: 'Deadlines',
    description: 'Critical deadline alerts',
    importance: 'high',
    sound: true,
    vibration: true,
    ledColor: '#dc2626',
  },
];

export function getChannelForCategory(category: string): string {
  const map: Record<string, string> = {
    task: 'tasks',
    habit: 'habits',
    health: 'health',
    hydration: 'health',
    workout: 'health',
    sleep: 'health',
    study: 'study',
    work: 'work',
    goal: 'goals',
    deadline: 'deadlines',
    briefing: 'briefing',
    review: 'briefing',
    achievement: 'achievements',
    suggestion: 'ai',
    motivation: 'ai',
    priority: 'deadlines',
    focus: 'ai',
    procrastination: 'ai',
    reschedule: 'tasks',
  };
  return map[category] ?? 'tasks';
}
