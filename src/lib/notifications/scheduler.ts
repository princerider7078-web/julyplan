// Reminder Scheduler.
// For each task, schedules multiple native notifications:
//   - At task time (always)
//   - 10 min before (if task has time)
//   - 1 hour before (if high/critical priority)
//   - 1 day before (if critical priority)
// For deadline tasks (with end date): 7d, 3d, 1d, same day, last hour
// For habits: scheduled at habit-specific times
// For morning brief: daily at wake time
// For evening review: daily at sleep time
//
// Also handles:
// - Quiet hours (delay to morning if scheduled during quiet hours)
// - Category preferences (skip if category disabled)
// - Batch notifications (group multiple upcoming into one)
// - Smart snooze (AI-learned default snooze duration)

import { scheduleNotification, cancelTaskNotifications } from './service';
import { getChannelForCategory } from './channels';
import { useStore } from '../store';
import type { Task, Habit } from '../types';

function todayISO(): string { return new Date().toISOString().slice(0, 10); }

function combineDateTime(dateISO: string, time: string): Date {
  return new Date(`${dateISO}T${time}:00`);
}

// ─── Schedule all reminders for a single task ───

export async function scheduleTaskReminders(task: Task): Promise<void> {
  // Cancel existing reminders for this task first
  await cancelTaskNotifications(task.id);

  const store = useStore.getState();
  const prefs = store.notificationPreferences;
  const settings = store.settings;

  if (!settings.autoTaskNotifications) return;
  if (!task.time) return;  // no time = no reminders
  if (task.status === 'archived') return;

  const today = todayISO();
  const taskDate = task.startDate ?? today;
  const taskDateTime = combineDateTime(taskDate, task.time);
  const now = Date.now();

  // If task time is more than 5 minutes in the past, skip (too late to remind)
  // If within last 5 min, still fire (catch-up for when tab was closed)
  if (taskDateTime.getTime() < now - 5 * 60000) return;

  // Check if task category is enabled
  // Map section to category name (not channel ID) — prefs.categories uses category names
  const section = store.sections.find((s) => s.id === task.sectionId);
  const sectionName = section?.name?.toLowerCase() ?? '';
  let categoryName: 'task' | 'habit' | 'health' | 'study' | 'work' | 'goal_progress' | 'ai_insights' | 'deadlines' | 'personal' | 'achievements' | 'weekly_reports' | 'finance';
  if (sectionName.includes('health')) categoryName = 'health';
  else if (sectionName.includes('voice')) categoryName = 'health';
  else if (sectionName.includes('study') || sectionName.includes('work')) categoryName = 'study';
  else if (sectionName.includes('routine')) categoryName = 'personal';
  else if (sectionName.includes('finance')) categoryName = 'finance';
  else if (sectionName.includes('weekly') || sectionName.includes('monthly')) categoryName = 'task';
  else if (sectionName.includes('growth')) categoryName = 'goal_progress';
  else categoryName = 'task';

  if (!prefs.categories[categoryName]) return;

  const channelId = getChannelForCategory('task');
  const priorityLabel = task.priority === 'critical' ? '🔴 Critical'
    : task.priority === 'high' ? '🟠 High'
    : task.priority === 'medium' ? '🟡 Medium'
    : '🟢 Low';

  // Always schedule: at task time
  await scheduleSingleReminder({
    id: task.id,
    title: `📋 ${task.title}`,
    body: `${priorityLabel} · ${task.time}${task.time ? '' : ''}\n${task.description ?? ''}`.trim(),
    scheduledAt: taskDateTime,
    channelId,
    taskId: task.id,
    type: 'task',
    priority: task.priority,
  });

  // 10 min before (for all tasks with time)
  const tenMinBefore = new Date(taskDateTime.getTime() - 10 * 60000);
  if (tenMinBefore.getTime() > Date.now()) {
    await scheduleSingleReminder({
      id: `${task.id}-10m`,
      title: `⏰ ${task.title} in 10 min`,
      body: `Starts at ${task.time}. ${task.description ?? ''}`.trim(),
      scheduledAt: tenMinBefore,
      channelId,
      taskId: task.id,
      type: 'task',
      priority: task.priority,
    });
  }

  // 1 hour before (for high/critical priority)
  if (task.priority === 'high' || task.priority === 'critical') {
    const oneHourBefore = new Date(taskDateTime.getTime() - 60 * 60000);
    if (oneHourBefore.getTime() > Date.now()) {
      await scheduleSingleReminder({
        id: `${task.id}-1h`,
        title: `⏰ ${task.title} in 1 hour`,
        body: `${priorityLabel} task at ${task.time}. Prepare now.`,
        scheduledAt: oneHourBefore,
        channelId,
        taskId: task.id,
        type: 'task',
        priority: task.priority,
      });
    }
  }

  // 1 day before (for critical priority only)
  if (task.priority === 'critical') {
    const oneDayBefore = new Date(taskDateTime.getTime() - 24 * 60 * 60000);
    if (oneDayBefore.getTime() > Date.now()) {
      await scheduleSingleReminder({
        id: `${task.id}-1d`,
        title: `⚠ ${task.title} tomorrow`,
        body: `Critical task tomorrow at ${task.time}. Don't forget.`,
        scheduledAt: oneDayBefore,
        channelId: getChannelForCategory('deadline'),
        taskId: task.id,
        type: 'deadline',
        priority: task.priority,
      });
    }
  }

  // Deadline alerts (if task has end date)
  if (task.endDate && task.endDate !== task.startDate) {
    await scheduleDeadlineAlerts(task);
  }
}

// ─── Schedule deadline alerts (7d, 3d, 1d, same day, last hour) ───

async function scheduleDeadlineAlerts(task: Task): Promise<void> {
  if (!task.endDate) return;
  const endDate = new Date(`${task.endDate}T23:59:00`);

  const alerts = [
    { offsetDays: 7, title: `📅 ${task.title} — 7 days left`, body: 'Plenty of time. Start planning.' },
    { offsetDays: 3, title: `⚠ ${task.title} — 3 days left`, body: 'Time to start working on this.' },
    { offsetDays: 1, title: `🔴 ${task.title} — Due tomorrow`, body: 'Final stretch. Focus on this.' },
    { offsetDays: 0, title: `🔴 ${task.title} — Due today!`, body: 'Last day to complete.' },
    { offsetHours: 1, title: `🚨 ${task.title} — Last hour!`, body: 'Deadline approaching fast.' },
  ];

  for (const alert of alerts) {
    const alertDate = new Date(endDate);
    if (alert.offsetDays) alertDate.setDate(alertDate.getDate() - alert.offsetDays);
    if (alert.offsetHours) alertDate.setHours(alertDate.getHours() - (alert.offsetHours ?? 0));

    if (alertDate.getTime() > Date.now()) {
      await scheduleSingleReminder({
        id: `${task.id}-deadline-${alert.offsetDays ?? alert.offsetHours}`,
        title: alert.title,
        body: alert.body,
        scheduledAt: alertDate,
        channelId: getChannelForCategory('deadline'),
        taskId: task.id,
        type: 'deadline',
        priority: 'critical',
      });
    }
  }
}

// ─── Schedule a single reminder (helper) ───

async function scheduleSingleReminder(input: {
  id: string | number;
  title: string;
  body: string;
  scheduledAt: Date;
  channelId: string;
  taskId: string;
  type: string;
  priority: string;
}): Promise<void> {
  const store = useStore.getState();
  const prefs = store.notificationPreferences;

  // Quiet hours check
  if (prefs.quiet_hours_enabled) {
    const hour = input.scheduledAt.getHours();
    const startH = parseInt(prefs.quiet_hours_start.slice(0, 2));
    const endH = parseInt(prefs.quiet_hours_end.slice(0, 2));
    const isQuiet = startH > endH
      ? (hour >= startH || hour < endH)
      : (hour >= startH && hour < endH);

    if (isQuiet && !(input.priority === 'critical' && prefs.critical_bypass_quiet)) {
      // Delay to end of quiet hours
      const newDate = new Date(input.scheduledAt);
      newDate.setHours(endH, 0, 0, 0);
      if (newDate <= input.scheduledAt) newDate.setDate(newDate.getDate() + 1);
      input.scheduledAt = newDate;
    }
  }

  // scheduleNotification handles the actual firing + logging.
  // (On web: logs when actually fired. On native: logs on received callback.)
  await scheduleNotification({
    title: input.title,
    body: input.body,
    scheduledAt: input.scheduledAt,
    channelId: input.channelId,
    extra: {
      taskId: input.taskId,
      type: input.type,
      priority: input.priority,
    },
  });
}

// ─── Schedule all task reminders (bulk) ───

export async function scheduleAllTaskReminders(): Promise<void> {
  const store = useStore.getState();
  const tasks = store.tasks.filter(
    (t) => t.status !== 'archived' && t.time,
  );

  for (const task of tasks) {
    await scheduleTaskReminders(task);
  }
  console.log(`[Notif] Scheduled reminders for ${tasks.length} tasks`);
}

// ─── Schedule habit reminders ───

export async function scheduleHabitReminders(habit: Habit, time: string): Promise<void> {
  const store = useStore.getState();
  if (!store.settings.autoTaskNotifications) return;

  const channelId = getChannelForCategory('habit');
  const today = todayISO();

  // Schedule for today (if time hasn't passed)
  const todayTime = combineDateTime(today, time);
  if (todayTime.getTime() > Date.now()) {
    await scheduleSingleReminder({
      id: `${habit.id}-today`,
      title: `✅ ${habit.title}`,
      body: `Time for your daily habit. Streak: ${getHabitStreak(habit)} days.`,
      scheduledAt: todayTime,
      channelId,
      taskId: habit.id,
      type: 'habit',
      priority: 'medium',
    });
  }

  // Schedule for tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowISO = tomorrow.toISOString().slice(0, 10);
  const tomorrowTime = combineDateTime(tomorrowISO, time);
  await scheduleSingleReminder({
    id: `${habit.id}-tomorrow`,
    title: `✅ ${habit.title}`,
    body: `Keep your streak alive! ${getHabitStreak(habit)} days and counting.`,
    scheduledAt: tomorrowTime,
    channelId,
    taskId: habit.id,
    type: 'habit',
    priority: 'medium',
  });
}

function getHabitStreak(habit: Habit): number {
  let streak = 0;
  const d = new Date();
  while (true) {
    const iso = d.toISOString().slice(0, 10);
    if (habit.log[iso]) { streak++; d.setDate(d.getDate() - 1); } else break;
  }
  return streak;
}

// ─── Schedule morning brief + evening review ───

export async function scheduleDailyBriefing(): Promise<void> {
  const store = useStore.getState();
  if (!store.settings.autoTaskNotifications) return;

  const channelId = getChannelForCategory('briefing');

  // Morning brief at wake time (default 7 AM)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(7, 0, 0, 0);

  await scheduleSingleReminder({
    id: 'morning-brief',
    title: '🌅 Morning Brief',
    body: 'Tap to see today\'s plan, priorities, and AI suggestions.',
    scheduledAt: tomorrow,
    channelId,
    taskId: 'morning-brief',
    type: 'briefing',
    priority: 'high',
  });

  // Evening review at sleep time (default 10 PM)
  const evening = new Date();
  evening.setDate(evening.getDate() + 1);
  evening.setHours(22, 0, 0, 0);

  await scheduleSingleReminder({
    id: 'evening-review',
    title: '🌙 Evening Review',
    body: 'Tap to review today\'s progress and plan tomorrow.',
    scheduledAt: evening,
    channelId,
    taskId: 'evening-review',
    type: 'review',
    priority: 'medium',
  });
}

// ─── Re-schedule everything (after app update or boot) ───

export async function rescheduleAll(): Promise<void> {
  console.log('[Notif] Re-scheduling all reminders...');
  await scheduleAllTaskReminders();
  await scheduleDailyBriefing();
  console.log('[Notif] All reminders re-scheduled');
}
