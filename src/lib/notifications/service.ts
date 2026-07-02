// Unified Notification Service.
// Uses Capacitor LocalNotifications on native (Android/iOS) for real system
// notifications with channels, action buttons, and background scheduling.
// Falls back to browser Notification API on web with Service Worker for
// reliable display (works even when tab is not focused).
//
// Key features:
// - Schedule notifications at exact times
// - 30s web polling (fires reliably while tab is open, catches up missed ones)
// - Service Worker for reliable notification display in Chrome/Edge/Firefox
// - Notification channels (Android): Tasks, Habits, Health, etc.
// - Interactive action buttons: Mark Done, Snooze, Reschedule, Ask AI
// - Notification log (only logs when notification is ACTUALLY shown, not just scheduled)
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
let swRegistered = false;

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
  if (list.some((e) => e.id === entry.id)) return;
  list.push(entry);
  saveWebScheduled(list);
}

function removeWebScheduled(id: number): void {
  const list = loadWebScheduled().filter((e) => e.id !== id);
  saveWebScheduled(list);
}

// ─── Service Worker registration (for reliable notifications) ───

async function ensureServiceWorker(): Promise<boolean> {
  if (swRegistered) return true;
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return false;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    swRegistered = true;
    console.log('[Notif] Service Worker registered for notifications');
    return true;
  } catch (e) {
    console.warn('[Notif] SW registration failed, falling back to Notification API:', e);
    return false;
  }
}

// ─── Web polling: check every 30s for due notifications ───
function startWebPolling(): void {
  if (webPollInterval) return;
  if (typeof window === 'undefined') return;

  pollWebNotifications();
  webPollInterval = setInterval(pollWebNotifications, 30_000);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      pollWebNotifications();
    }
  });

  console.log('[Notif] Web polling started (30s interval + visibility change)');
}

async function pollWebNotifications(): Promise<void> {
  const list = loadWebScheduled();
  if (list.length === 0) return;

  const now = Date.now();
  const due = list.filter((e) => new Date(e.scheduledAt).getTime() <= now);
  const remaining = list.filter((e) => new Date(e.scheduledAt).getTime() > now);

  if (due.length > 0) {
    console.log(`[Notif] Firing ${due.length} due notification(s)`);
    for (const entry of due) {
      await fireWebNotification(entry.title, entry.body, entry.channelId, entry.extra);
    }
    saveWebScheduled(remaining);
  }
}

// ─── Actually fire a browser notification + log it ───
// Only logs when notification is ACTUALLY shown (permission granted + display attempted)
async function fireWebNotification(
  title: string,
  body: string,
  channelId: string,
  extra?: ScheduledNotification['extra'],
): Promise<void> {
  // Check permission FIRST — don't log if we can't show
  if (typeof Notification === 'undefined') {
    console.warn('[Notif] Notification API not available');
    return;
  }

  if (Notification.permission !== 'granted') {
    console.warn('[Notif] Permission not granted — notification NOT shown. Click "Enable Notifications" in Notifications view.');
    // Don't log — user doesn't want to see "fired" entries for notifications that never showed
    return;
  }

  // Try Service Worker first (more reliable, works when tab not focused)
  let shown = false;
  try {
    const swReady = await ensureServiceWorker();
    if (swReady) {
      const reg = await navigator.serviceWorker.ready;
      reg.showNotification(title, {
        body,
        tag: extra?.taskId ?? `july-plan-${Date.now()}`,
        icon: '/logo.svg',
        badge: '/logo.svg',
        requireInteraction: false,
        data: extra,
      });
      shown = true;
    }
  } catch (e) {
    console.warn('[Notif] SW showNotification failed, trying direct Notification:', e);
  }

  // Fallback: direct Notification API
  if (!shown) {
    try {
      const notif = new Notification(title, {
        body,
        tag: extra?.taskId ?? `july-plan-${Date.now()}`,
        icon: '/logo.svg',
      });
      shown = true;
      // Auto-close after 10 seconds
      setTimeout(() => notif.close(), 10_000);
    } catch (e) {
      console.error('[Notif] Direct Notification also failed:', e);
    }
  }

  // Only log if notification was actually shown
  if (shown) {
    logNotificationFired({
      title,
      body,
      channelId,
      taskId: extra?.taskId,
      habitId: extra?.habitId,
    });
    console.log('[Notif] ✅ Notification shown + logged:', title);
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
    // Register service worker early for notification reliability
    await ensureServiceWorker();
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
      console.log('[Notif] Permission request result:', result);
      return result === 'granted';
    } catch (e) {
      console.error('[Notif] Permission request failed:', e);
      return false;
    }
  }
  return false;
}

export function getPermissionStatus(): 'granted' | 'denied' | 'default' | 'unknown' {
  if (isNative()) return 'unknown';
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
            schedule: { at: notif.scheduledAt, allowWhileIdle: true },
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

  if (isWeb()) {
    if (fireTime <= now) {
      console.log('[Notif] Web — firing immediately (past time):', notif.title);
      await fireWebNotification(notif.title, notif.body, notif.channelId, notif.extra);
      return id;
    }

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
    if (permStatus !== 'granted') {
      return {
        success: false,
        message: '❌ Permission not granted. Click "Enable Notifications" first, then try again. If you previously denied, go to Chrome Settings → Site Settings → Notifications → Allow for this site.',
      };
    }
    await fireWebNotification(
      '🧪 Test Notification',
      'If you see this, browser notifications are working! ' + new Date().toLocaleTimeString(),
      'tasks',
      { type: 'test' },
    );
    return { success: true, message: '✅ Test notification sent! Check your screen + Notification History.' };
  }

  return { success: false, message: 'Unknown platform.' };
}

// ─── Cancel ───

export async function cancelNotification(id: number): Promise<void> {
  if (isNative()) {
    try { await LocalNotifications.cancel({ notifications: [{ id }] }); } catch { /* ignore */ }
  }
  if (isWeb()) { removeWebScheduled(id); }
}

export async function cancelTaskNotifications(taskId: string): Promise<void> {
  if (isNative()) {
    try {
      const pending = await LocalNotifications.getPending();
      const toCancel = pending.notifications.filter(
        (n) => (n.extra as Record<string, unknown>)?.taskId === taskId,
      ).map((n) => ({ id: n.id }));
      if (toCancel.length > 0) await LocalNotifications.cancel({ notifications: toCancel });
    } catch { /* ignore */ }
  }
  if (isWeb()) {
    const list = loadWebScheduled();
    saveWebScheduled(list.filter((e) => e.extra?.taskId !== taskId));
  }
}

// ─── Get pending ───

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

// ─── Action handler (native only) ───

async function handleActionPerformed(event: { actionId?: string; notification?: { id?: number; title?: string; body?: string; extra?: Record<string, unknown>; channelId?: string } }): Promise<void> {
  const actionId = event.actionId ?? '';
  const notificationId = event.notification?.id ?? 0;
  const extra = (event.notification?.extra ?? {}) as { taskId?: string; habitId?: string; type?: string };

  const { useStore } = await import('../store');

  switch (actionId) {
    case 'mark_done':
      if (extra.taskId) {
        const today = new Date().toISOString().slice(0, 10);
        useStore.getState().toggleTaskComplete(extra.taskId, today);
      }
      if (extra.habitId) useStore.getState().toggleHabit(extra.habitId);
      break;
    case 'snooze_15':
    case 'snooze_30':
    case 'snooze_60':
      await scheduleNotification({
        title: event.notification?.title ?? 'Reminder',
        body: event.notification?.body ?? '',
        scheduledAt: new Date(Date.now() + (actionId === 'snooze_15' ? 15 : actionId === 'snooze_30' ? 30 : 60) * 60000),
        channelId: event.notification?.channelId ?? 'tasks',
        extra: extra as ScheduledNotification['extra'],
      });
      break;
  }
  logNotificationAction(notificationId, actionId, extra);
}

function handleReceived(event: { notificationId?: number; title?: string; body?: string }): void {
  logNotificationFired({
    title: event.title ?? 'Notification',
    body: event.body ?? '',
    channelId: 'tasks',
  });
}

// ─── Notification log ───

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
  } catch { return []; }
}

export function clearNotificationLog(): void {
  try { localStorage.removeItem(LOG_KEY); } catch { /* ignore */ }
}

export function getNotificationAnalytics() {
  const log = getNotificationLog();
  const totalSent = log.length;
  const acted = log.filter((e) => e.action).length;
  const completed = log.filter((e) => e.action === 'mark_done').length;
  const snoozed = log.filter((e) => e.action?.startsWith('snooze')).length;
  const ignored = log.filter((e) => !e.action).length;
  const byChannel: Record<string, number> = {};
  log.forEach((e) => { byChannel[e.channelId] = (byChannel[e.channelId] ?? 0) + 1; });
  return {
    totalSent,
    totalActed: acted,
    completionRate: totalSent > 0 ? Math.round((completed / totalSent) * 100) : 0,
    snoozeRate: totalSent > 0 ? Math.round((snoozed / totalSent) * 100) : 0,
    ignoreRate: totalSent > 0 ? Math.round((ignored / totalSent) * 100) : 0,
    byChannel,
  };
}
