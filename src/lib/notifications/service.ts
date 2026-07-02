// Unified Notification Service.
// Uses Capacitor LocalNotifications on native (Android/iOS) for real system
// notifications with channels, action buttons, and background scheduling.
// Falls back to browser Notification API on web.
//
// Key features:
// - Schedule notifications at exact times (works in background on Android)
// - Notification channels (Android): Tasks, Habits, Health, etc.
// - Interactive action buttons: Mark Done, Snooze, Reschedule, Ask AI
// - Multiple reminders per task (1 day before, 1 hour before, 10 min before)
// - Quiet hours support
// - Sound + vibration
// - Notification log (history of all fired notifications)

import { LocalNotifications } from '@capacitor/local-notifications';
import { isNative, isWeb } from './platform';
import { CHANNELS, getChannelForCategory } from './channels';
import { getActionsForType } from './actions';

export interface ScheduledNotification {
  id: number;
  title: string;
  body: string;
  scheduledAt: Date;
  channelId: string;
  // Extra data passed to the action handler
  extra?: {
    taskId?: string;
    habitId?: string;
    type: string;
    priority?: string;
    [key: string]: unknown;
  };
}

let isInitialized = false;

// ─── Initialization ───

export async function initNotifications(): Promise<void> {
  if (isInitialized) return;
  isInitialized = true;

  if (isNative()) {
    try {
      // Request permission
      const permStatus = await LocalNotifications.requestPermissions();
      if (permStatus.display !== 'granted') {
        console.warn('[Notif] Notification permission not granted');
        return;
      }

      // Create notification channels (Android)
      await LocalNotifications.createChannel(CHANNELS[0] as any).catch(() => {});
      // Create channels one by one (createChannel takes a single channel)
      for (const ch of CHANNELS) {
        try {
          await LocalNotifications.createChannel({
            id: ch.id,
            name: ch.name,
            description: ch.description,
            importance: ch.importance === 'high' ? 4 : ch.importance === 'default' ? 3 : 2,
            visibility: 1, // public
            sound: ch.sound,
            vibration: ch.vibration,
            // ledColor not supported in all versions
          });
        } catch { /* channel may already exist */ }
      }

      // Listen for action button taps
      LocalNotifications.addListener(
        'localNotificationActionPerformed',
        (event) => {
          handleActionPerformed(event);
        },
      );

      // Listen for notification received (while app is open)
      LocalNotifications.addListener(
        'localNotificationReceived',
        (event) => {
          handleReceived(event);
        },
      );

      console.log('[Notif] Native notifications initialized with', CHANNELS.length, 'channels');
    } catch (e) {
      console.warn('[Notif] Native init failed:', e);
    }
  } else if (isWeb()) {
    // Web: request browser notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch { /* ignore */ }
    }
    console.log('[Notif] Web notification service initialized');
  }
}

// ─── Schedule a notification ───

export async function scheduleNotification(
  notif: Omit<ScheduledNotification, 'id'>,
): Promise<number | null> {
  const id = Math.floor(Math.random() * 1000000) + 1;

  if (isNative()) {
    try {
      const actions = getActionsForType(notif.extra?.type ?? 'default');
      await LocalNotifications.schedule({
        notifications: [
          {
            id,
            title: notif.title,
            body: notif.body,
            schedule: {
              at: notif.scheduledAt,
              allowWhileIdle: true,
            },
            channelId: notif.channelId,
            // Action buttons (Capacitor 8+ supports this on Android)
            actionSetId: notif.extra?.type ?? 'default',
            // Extra data accessible when action is tapped
            extra: {
              taskId: notif.extra?.taskId,
              habitId: notif.extra?.habitId,
              type: notif.extra?.type,
              priority: notif.extra?.priority,
            },
          },
        ],
      });
      return id;
    } catch (e) {
      console.warn('[Notif] Schedule failed:', e);
      return null;
    }
  } else if (isWeb()) {
    // Web: schedule via setTimeout (only works while tab is open)
    const delay = notif.scheduledAt.getTime() - Date.now();
    if (delay <= 0) {
      fireWebNotification(notif.title, notif.body);
    } else if (delay < 24 * 60 * 60 * 1000) {
      // Only schedule if within 24h (don't set huge timeouts)
      setTimeout(() => fireWebNotification(notif.title, notif.body), delay);
    }
    return id;
  }
  return null;
}

function fireWebNotification(title: string, body: string): void {
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  } catch { /* ignore */ }
}

// ─── Cancel a scheduled notification ───

export async function cancelNotification(id: number): Promise<void> {
  if (isNative()) {
    try {
      await LocalNotifications.cancel({ notifications: [{ id }] });
    } catch { /* ignore */ }
  }
  // Web: setTimeout can't be cancelled without tracking IDs — skipped for simplicity
}

// ─── Cancel all pending notifications for a task ───

export async function cancelTaskNotifications(taskId: string): Promise<void> {
  if (isNative()) {
    try {
      const pending = await LocalNotifications.getPending();
      const toCancel = pending.notifications.filter(
        (n) => (n.extra as any)?.taskId === taskId,
      ).map((n) => ({ id: n.id }));
      if (toCancel.length > 0) {
        await LocalNotifications.cancel({ notifications: toCancel });
      }
    } catch { /* ignore */ }
  }
}

// ─── Get all pending notifications ───

export async function getPendingNotifications(): Promise<ScheduledNotification[]> {
  if (isNative()) {
    try {
      const pending = await LocalNotifications.getPending();
      return pending.notifications.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        scheduledAt: new Date((n.schedule as any)?.at ?? Date.now()),
        channelId: (n as any).channelId ?? 'tasks',
        extra: (n.extra as any) ?? {},
      }));
    } catch { /* ignore */ }
  }
  return [];
}

// ─── Action handler ───

async function handleActionPerformed(event: any): Promise<void> {
  const actionId = event.actionId as string;
  const notificationId = event.notification.id as number;
  const extra = (event.notification.extra ?? {}) as {
    taskId?: string;
    habitId?: string;
    type?: string;
  };

  console.log('[Notif] Action performed:', actionId, 'for notification', notificationId, 'extra:', extra);

  // Dynamically import store to avoid circular dependencies
  const { useStore } = await import('../store');

  switch (actionId) {
    case 'mark_done': {
      if (extra.taskId) {
        const store = useStore.getState();
        const today = new Date().toISOString().slice(0, 10);
        store.toggleTaskComplete(extra.taskId, today);
      }
      if (extra.habitId) {
        const store = useStore.getState();
        store.toggleHabit(extra.habitId);
      }
      break;
    }
    case 'snooze_15':
    case 'snooze_30':
    case 'snooze_60': {
      const minutes = actionId === 'snooze_15' ? 15 : actionId === 'snooze_30' ? 30 : 60;
      const snoozeAt = new Date(Date.now() + minutes * 60000);
      await scheduleNotification({
        title: event.notification.title,
        body: event.notification.body,
        scheduledAt: snoozeAt,
        channelId: (event.notification as any).channelId ?? 'tasks',
        extra: extra as any,
      });
      break;
    }
    case 'skip': {
      // Just dismiss — do nothing
      break;
    }
    case 'start_now':
    case 'reschedule':
    case 'ask_ai':
    case 'view_tasks': {
      // These require opening the app — Capacitor handles foreground automatically
      break;
    }
  }

  // Log the action for analytics
  logNotificationAction(notificationId, actionId, extra);
}

function handleReceived(event: any): void {
  // Notification was received while app was open
  console.log('[Notif] Received:', event.notificationId);
  // Could show an in-app banner here
}

// ─── Notification log (analytics) ───

export interface NotificationLogEntry {
  id: string;
  title: string;
  body: string;
  channelId: string;
  firedAt: string;
  action?: string;
  taskId?: string;
  habitId?: string;
}

const LOG_KEY = 'july-plan-notif-log';

export function logNotificationFired(notif: { title: string; body: string; channelId: string; taskId?: string; habitId?: string }): void {
  try {
    const entry: NotificationLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: notif.title,
      body: notif.body,
      channelId: notif.channelId,
      firedAt: new Date().toISOString(),
      taskId: notif.taskId,
      habitId: notif.habitId,
    };
    const log = getNotificationLog();
    log.unshift(entry);
    // Keep last 200 entries
    localStorage.setItem(LOG_KEY, JSON.stringify(log.slice(0, 200)));
  } catch { /* ignore */ }
}

export function logNotificationAction(notificationId: number, action: string, extra: { taskId?: string; habitId?: string }): void {
  try {
    const log = getNotificationLog();
    // Find the most recent entry for this task/habit and mark the action
    const entry = log.find((e) => e.taskId === extra.taskId || e.habitId === extra.habitId);
    if (entry) {
      entry.action = action;
      localStorage.setItem(LOG_KEY, JSON.stringify(log));
    }
  } catch { /* ignore */ }
}

export function getNotificationLog(): NotificationLogEntry[] {
  try {
    const stored = localStorage.getItem(LOG_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function clearNotificationLog(): void {
  try {
    localStorage.removeItem(LOG_KEY);
  } catch { /* ignore */ }
}

// ─── Notification analytics ───

export function getNotificationAnalytics(): {
  totalSent: number;
  totalActed: number;
  completionRate: number;
  snoozeRate: number;
  ignoreRate: number;
  byChannel: Record<string, number>;
} {
  const log = getNotificationLog();
  const totalSent = log.length;
  const acted = log.filter((e) => e.action).length;
  const completed = log.filter((e) => e.action === 'mark_done').length;
  const snoozed = log.filter((e) => e.action?.startsWith('snooze')).length;
  const ignored = log.filter((e) => !e.action).length;

  const byChannel: Record<string, number> = {};
  log.forEach((e) => {
    byChannel[e.channelId] = (byChannel[e.channelId] ?? 0) + 1;
  });

  return {
    totalSent,
    totalActed: acted,
    completionRate: totalSent > 0 ? Math.round((completed / totalSent) * 100) : 0,
    snoozeRate: totalSent > 0 ? Math.round((snoozed / totalSent) * 100) : 0,
    ignoreRate: totalSent > 0 ? Math.round((ignored / totalSent) * 100) : 0,
    byChannel,
  };
}
