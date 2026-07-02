// Unified Notification Service.
// Uses Capacitor LocalNotifications on native (Android/iOS) for real system
// notifications with channels, action buttons, and background scheduling.
// Falls back to browser Notification API on web with 30s polling (more reliable
// than setTimeout — survives page reloads and catches up missed notifications).
//
// Key features:
// - Schedule notifications at exact times
// - 30s web polling (fires reliably while tab is open, catches up missed ones)
// - Notification channels (Android): Tasks, Habits, Health, etc.
// - Interactive action buttons: Mark Done, Snooze, Reschedule, Ask AI
// - Notification log (history of all FIRED notifications — not scheduled ones)
// - Test notification button for immediate verification

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
  extra?: {
    taskId?: string;
    habitId?: string;
    type: string;
    priority?: string;
    [key: string]: unknown;
  };
}

let isInitialized = false;

// ─── Web polling state (survives reloads via localStorage) ───
const WEB_SCHEDULED_KEY = 'july-plan-web-scheduled';
let webPollInterval: ReturnType<typeof setInterval> | null = null;

interface WebScheduledEntry {
  id: number;
  title: string;
  body: string;
  scheduledAt: string;  // ISO
  channelId: string;
  extra?: ScheduledNotification['extra'];
}

function loadWebScheduled(): WebScheduledEntry[] {
  try {
    const stored = localStorage.getItem(WEB_SCHEDULED_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function saveWebScheduled(list: WebScheduledEntry[]): void {
  try {
    localStorage.setItem(WEB_SCHEDULED_KEY, JSON.stringify(list.slice(0, 100)));
  } catch { /* ignore */ }
}

function addWebScheduled(entry: WebScheduledEntry): void {
  const list = loadWebScheduled();
  // Don't add duplicates
  if (list.some((e) => e.id === entry.id)) return;
  list.push(entry);
  saveWebScheduled(list);
}

function removeWebScheduled(id: number): void {
  const list = loadWebScheduled().filter((e) => e.id !== id);
  saveWebScheduled(list);
}

// ─── Web polling: check every 30s for due notifications ───
function startWebPolling(): void {
  if (webPollInterval) return;
  if (typeof window === 'undefined') return;

  // Run immediately + every 30s
  pollWebNotifications();
  webPollInterval = setInterval(pollWebNotifications, 30_000);

  // Also poll when tab becomes visible (catch up missed notifications)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      pollWebNotifications();
    }
  });

  console.log('[Notif] Web polling started (30s interval + visibility change)');
}

function pollWebNotifications(): void {
  const list = loadWebScheduled();
  if (list.length === 0) return;

  const now = Date.now();
  const due = list.filter((e) => new Date(e.scheduledAt).getTime() <= now);
  const remaining = list.filter((e) => new Date(e.scheduledAt).getTime() > now);

  if (due.length > 0) {
    console.log(`[Notif] Firing ${due.length} due notification(s)`);
    due.forEach((entry) => {
      fireWebNotification(entry.title, entry.body, entry.channelId, entry.extra);
    });
    saveWebScheduled(remaining);
  }
}

// ─── Actually fire a browser notification + log it + show in-app toast ───
function fireWebNotification(
  title: string,
  body: string,
  channelId: string,
  extra?: ScheduledNotification['extra'],
): void {
  // Log it as fired (regardless of permission — user can see in log)
  logNotificationFired({
    title,
    body,
    channelId,
    taskId: extra?.taskId,
    habitId: extra?.habitId,
  });

  // Show in-app toast (ALWAYS — this is the reliable visible notification
  // even if the browser blocks the system popup)
  try {
    import('./toast').then(({ showToast }) => {
      showToast(title, body, channelId, false);
    });
  } catch { /* ignore */ }

  // Try to show browser system notification
  try {
    if (typeof Notification === 'undefined') {
      console.warn('[Notif] Notification API not available — in-app toast shown instead');
      return;
    }
    if (Notification.permission !== 'granted') {
      console.warn('[Notif] Permission not granted — in-app toast shown instead. Click "Enable Notifications" in Notifications view.');
      return;
    }
    new Notification(title, {
      body,
      tag: extra?.taskId ?? `july-plan-${Date.now()}`,
      requireInteraction: false,
    });
  } catch (e) {
    console.warn('[Notif] Failed to show system notification (in-app toast shown instead):', e);
  }
}

// ─── Initialization ───

export async function initNotifications(): Promise<void> {
  if (isInitialized) return;
  isInitialized = true;

  if (isNative()) {
    try {
      const permStatus = await LocalNotifications.requestPermissions();
      if (permStatus.display !== 'granted') {
        console.warn('[Notif] Native notification permission not granted');
        return;
      }

      // Create notification channels (Android)
      for (const ch of CHANNELS) {
        try {
          await LocalNotifications.createChannel({
            id: ch.id,
            name: ch.name,
            description: ch.description,
            importance: ch.importance === 'high' ? 4 : ch.importance === 'default' ? 3 : 2,
            visibility: 1,
            sound: ch.sound,
            vibration: ch.vibration,
          });
        } catch { /* channel may already exist */ }
      }

      // Listen for action button taps
      LocalNotifications.addListener(
        'localNotificationActionPerformed',
        (event) => handleActionPerformed(event),
      );
      LocalNotifications.addListener(
        'localNotificationReceived',
        (event) => handleReceived(event),
      );

      console.log('[Notif] Native notifications initialized with', CHANNELS.length, 'channels');
    } catch (e) {
      console.warn('[Notif] Native init failed:', e);
    }
  } else if (isWeb()) {
    // Web: request permission if not asked yet
    if ('Notification' in window && Notification.permission === 'default') {
      // Don't auto-request — let user click the button. Auto-request is annoying.
      console.log('[Notif] Web — permission not yet requested. User can enable in Preferences.');
    }
    // Start polling for due notifications
    startWebPolling();
    console.log('[Notif] Web notification service initialized');
  }
}

// ─── Request permission (user-triggered) ───

export async function requestNotificationPermission(): Promise<boolean> {
  if (isNative()) {
    try {
      const result = await LocalNotifications.requestPermissions();
      return result.display === 'granted';
    } catch { return false; }
  }
  if (isWeb() && 'Notification' in window) {
    try {
      const result = await Notification.requestPermission();
      return result === 'granted';
    } catch { return false; }
  }
  return false;
}

export function getPermissionStatus(): 'granted' | 'denied' | 'default' | 'unknown' {
  if (isNative()) {
    // Can't check synchronously — return 'unknown' for now
    return 'unknown';
  }
  if (isWeb() && 'Notification' in window) {
    return Notification.permission;
  }
  return 'unknown';
}

// ─── Schedule a notification ───

export async function scheduleNotification(
  notif: Omit<ScheduledNotification, 'id'>,
): Promise<number | null> {
  const id = Math.floor(Math.random() * 1000000) + 1;
  const fireTime = notif.scheduledAt.getTime();
  const now = Date.now();

  if (isNative()) {
    try {
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
            actionSetId: notif.extra?.type ?? 'default',
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
      console.warn('[Notif] Native schedule failed:', e);
      return null;
    }
  }

  // Web: add to polling list
  if (isWeb()) {
    // If already past, fire immediately
    if (fireTime <= now) {
      console.log('[Notif] Web — firing immediately (past time):', notif.title);
      fireWebNotification(notif.title, notif.body, notif.channelId, notif.extra);
      return id;
    }

    // Otherwise, add to scheduled list (polled every 30s)
    addWebScheduled({
      id,
      title: notif.title,
      body: notif.body,
      scheduledAt: notif.scheduledAt.toISOString(),
      channelId: notif.channelId,
      extra: notif.extra,
    });
    console.log('[Notif] Web — scheduled:', notif.title, 'at', notif.scheduledAt.toLocaleTimeString());
    return id;
  }

  return null;
}

// ─── Send a test notification immediately ───

export async function sendTestNotification(): Promise<{ success: boolean; message: string }> {
  const permStatus = getPermissionStatus();

  if (isNative()) {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: Math.floor(Math.random() * 1000000) + 1,
            title: '🧪 Test Notification',
            body: 'If you see this, native notifications are working!',
            schedule: { at: new Date(Date.now() + 1000), allowWhileIdle: true },
            channelId: 'tasks',
          },
        ],
      });
      return { success: true, message: 'Test notification sent (native).' };
    } catch (e) {
      return { success: false, message: `Failed: ${e instanceof Error ? e.message : 'unknown'}` };
    }
  }

  if (isWeb()) {
    // Always fire the in-app toast + log (even if permission not granted)
    // so the user can verify the system is working.
    fireWebNotification(
      '🧪 Test Notification',
      permStatus === 'granted'
        ? 'If you see this, browser notifications are working! ' + new Date().toLocaleTimeString()
        : 'In-app toast works! For system popup, enable notification permission in your browser.',
      'tasks',
      { type: 'test' },
    );
    if (permStatus === 'granted') {
      return { success: true, message: '✅ Test sent! Check your screen + system tray + Notification History.' };
    }
    return {
      success: true,
      message: '✅ In-app toast shown! For system popup, click "Enable Notifications" above (then check browser settings if it was denied).',
    };
  }

  return { success: false, message: 'Unknown platform.' };
}

// ─── Cancel a scheduled notification ───

export async function cancelNotification(id: number): Promise<void> {
  if (isNative()) {
    try {
      await LocalNotifications.cancel({ notifications: [{ id }] });
    } catch { /* ignore */ }
  }
  if (isWeb()) {
    removeWebScheduled(id);
  }
}

// ─── Cancel all pending notifications for a task ───

export async function cancelTaskNotifications(taskId: string): Promise<void> {
  if (isNative()) {
    try {
      const pending = await LocalNotifications.getPending();
      const toCancel = pending.notifications.filter(
        (n) => (n.extra as Record<string, unknown>)?.taskId === taskId,
      ).map((n) => ({ id: n.id }));
      if (toCancel.length > 0) {
        await LocalNotifications.cancel({ notifications: toCancel });
      }
    } catch { /* ignore */ }
  }
  if (isWeb()) {
    const list = loadWebScheduled();
    const remaining = list.filter((e) => e.extra?.taskId !== taskId);
    saveWebScheduled(remaining);
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
        scheduledAt: new Date((n.schedule as { at?: Date })?.at ?? Date.now()),
        channelId: (n as { channelId?: string }).channelId ?? 'tasks',
        extra: (n.extra as ScheduledNotification['extra']) ?? {},
      }));
    } catch { /* ignore */ }
  }
  if (isWeb()) {
    return loadWebScheduled().map((e) => ({
      id: e.id,
      title: e.title,
      body: e.body,
      scheduledAt: new Date(e.scheduledAt),
      channelId: e.channelId,
      extra: e.extra,
    }));
  }
  return [];
}

// ─── Action handler (native only — web has no action buttons) ───

async function handleActionPerformed(event: { actionId?: string; notification?: { id?: number; title?: string; body?: string; extra?: Record<string, unknown>; channelId?: string } }): Promise<void> {
  const actionId = event.actionId ?? '';
  const notificationId = event.notification?.id ?? 0;
  const extra = (event.notification?.extra ?? {}) as { taskId?: string; habitId?: string; type?: string };

  console.log('[Notif] Action performed:', actionId, 'for notification', notificationId);

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
        title: event.notification?.title ?? 'Reminder',
        body: event.notification?.body ?? '',
        scheduledAt: snoozeAt,
        channelId: event.notification?.channelId ?? 'tasks',
        extra: extra as ScheduledNotification['extra'],
      });
      break;
    }
    case 'skip':
      break;
    case 'start_now':
    case 'reschedule':
    case 'ask_ai':
    case 'view_tasks':
      break;
  }

  logNotificationAction(notificationId, actionId, extra);
}

function handleReceived(event: { notificationId?: number; title?: string; body?: string }): void {
  // Native notification was shown — log it
  console.log('[Notif] Native notification received:', event.notificationId);
  logNotificationFired({
    title: event.title ?? 'Notification',
    body: event.body ?? '',
    channelId: 'tasks',
  });
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
    localStorage.setItem(LOG_KEY, JSON.stringify(log.slice(0, 200)));
  } catch { /* ignore */ }
}

export function logNotificationAction(notificationId: number, action: string, extra: { taskId?: string; habitId?: string }): void {
  try {
    const log = getNotificationLog();
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
