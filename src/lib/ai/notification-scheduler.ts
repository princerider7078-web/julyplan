// Auto-Notification Scheduler
// Scans tasks every 30 seconds. When a task's time arrives (or N minutes before,
// per taskNotificationLeadMinutes), fires:
//   1. Browser/Android system Notification (if permission granted)
//   2. In-app notification in the store (visible in Notification Center)
//   3. Plays completion sound (if soundEnabled)
//
// Respects:
//   - settings.autoTaskNotifications (master toggle)
//   - settings.notificationsEnabled
//   - NotificationPreferences.quiet_hours (unless task is critical)
//   - LearningProfile.no_response_before/after (don't fire when user is asleep)
//   - Deduplication: each task fires at most once per day
//
// Uses AI Decision Engine for reasoning on each fired notification.
import { useStore } from '../store';
import { buildNotification, collectSignals, shouldNotifyNow, generateReasoning } from './notification-engine';
import { trackNotificationAction } from './learning-engine';
import type { Task, AINotification } from '../types';

const SCHEDULER_INTERVAL_MS = 30_000;  // 30 seconds
const DEDUP_KEY_PREFIX = 'july-plan-fired-';

let schedulerInterval: ReturnType<typeof setInterval> | null = null;
let isRunning = false;

// In-memory set of "task-id|date" strings that already fired today.
// Resets when the date changes.
let firedToday: Set<string> = new Set();
let lastDate = '';

function todayISO(): string { return new Date().toISOString().slice(0, 10); }

function loadFiredFromStorage(): void {
  const today = todayISO();
  if (lastDate !== today) {
    // New day — clear in-memory + storage
    firedToday = new Set();
    lastDate = today;
    try {
      // Clean up old keys (keep only today's)
      const keys = Object.keys(localStorage).filter((k) => k.startsWith(DEDUP_KEY_PREFIX));
      keys.forEach((k) => {
        if (!k.endsWith(today)) localStorage.removeItem(k);
      });
    } catch { /* ignore */ }
    return;
  }
  // Load today's fired set from localStorage
  try {
    const storageKey = `${DEDUP_KEY_PREFIX}${today}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      firedToday = new Set(JSON.parse(stored));
    }
  } catch { /* ignore */ }
}

function saveFiredToStorage(): void {
  try {
    const storageKey = `${DEDUP_KEY_PREFIX}${todayISO()}`;
    localStorage.setItem(storageKey, JSON.stringify(Array.from(firedToday)));
  } catch { /* ignore */ }
}

function hasFired(taskId: string): boolean {
  return firedToday.has(taskId);
}

function markFired(taskId: string): void {
  firedToday.add(taskId);
  saveFiredToStorage();
}

// Fire the system notification (browser API)
function fireSystemNotification(title: string, body: string, tag?: string): void {
  try {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    new Notification(title, {
      body,
      tag: tag ?? `july-plan-${Date.now()}`,
      // icon: '/icon.png',  // could add app icon
    });
  } catch { /* ignore */ }
}

// Play a soft notification sound
function playNotificationSound(): void {
  const settings = useStore.getState().settings;
  if (!settings.soundEnabled) return;
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    // Two-tone chime (higher pitch than completion sound)
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch { /* ignore */ }
}

// Build + store an in-app notification for a task
function fireTaskNotification(task: Task): void {
  const store = useStore.getState();
  const signals = collectSignals();
  const prefs = store.notificationPreferences;
  const today = todayISO();

  // Build reasoning using the decision engine
  const reasoning = generateReasoning('task', signals, { taskTitle: task.title });
  const lead = store.settings.taskNotificationLeadMinutes;

  // Build message based on task + tone
  // NOTE: buildNotification() already applies tone + reasoning via applyTone().
  // So we just pass the base message — don't pre-apply tone here.
  const timeStr = task.time ?? '';
  const baseMessage = lead > 0
    ? `${task.title} starts in ${lead} minute${lead === 1 ? '' : 's'}${timeStr ? ` (at ${timeStr})` : ''}.`
    : `${task.title}${timeStr ? ` at ${timeStr}` : ''}.`;

  // Build the notification object via engine (it handles tone + reasoning)
  const notifInput = buildNotification({
    type: 'task',
    title: `📋 ${task.title}`,
    message: baseMessage,
    priority: task.priority === 'critical' ? 'critical'
      : task.priority === 'high' ? 'high'
      : 'medium',
    category: 'task',
    linked_entity_type: 'task',
    linked_entity_id: task.id,
    reasoningContext: { taskTitle: task.title },
  });

  // Check if should notify now (quiet hours etc.)
  const decision = shouldNotifyNow(signals, notifInput, prefs);
  if (!decision.shouldNotify) {
    // Reschedule to fire later (quiet hours end)
    notifInput.scheduled_at = new Date(Date.now() + (decision.delayMinutes ?? 15) * 60000).toISOString();
  }

  // Add to store
  store.addAINotification(notifInput);

  // Fire system notification + sound only if approved to notify now
  if (decision.shouldNotify) {
    // System notification: use the full message (with tone + reasoning) — first 200 chars
    const sysBody = notifInput.message.slice(0, 200);
    fireSystemNotification(`July Plan: ${task.title}`, sysBody, task.id);
    playNotificationSound();
  }
}

// Main scan loop — called every 30s
function scanTasksForNotifications(): void {
  const store = useStore.getState();
  const settings = store.settings;

  // Master toggles
  if (!settings.autoTaskNotifications || !settings.notificationsEnabled) return;

  // Refresh dedup state
  loadFiredFromStorage();

  const now = new Date();
  const today = todayISO();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const lead = settings.taskNotificationLeadMinutes;

  // Find tasks that should fire now:
  // - has a time
  // - not archived
  // - not completed today
  // - task time matches (now or now - lead, within 1-minute window)
  // - hasn't already fired today
  store.tasks.forEach((task) => {
    if (task.status === 'archived') return;
    if (!task.time) return;
    if (task.completionLog?.[today]) return;
    if (hasFired(task.id)) return;

    // Skip tasks for other dates (one-time tasks with specific start date)
    if (task.repeatRule === 'none' && task.startDate !== today) return;

    const [taskH, taskM] = task.time.split(':').map(Number);
    const taskMin = taskH * 60 + taskM;
    // Fire when (taskMin - lead) <= nowMin AND nowMin < taskMin + 5 (5-min fire window)
    // i.e. don't fire for tasks way in the past
    const fireAt = taskMin - lead;
    if (nowMin >= fireAt && nowMin < taskMin + 5) {
      fireTaskNotification(task);
      markFired(task.id);
    }
  });
}

// ── Public API ──

export function startAutoNotificationScheduler(): void {
  if (isRunning) return;
  if (typeof window === 'undefined') return;
  isRunning = true;

  // Request notification permission upfront
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {});
  }

  // Initial dedup load
  loadFiredFromStorage();

  // Run scan immediately (in case a task time just arrived)
  scanTasksForNotifications();

  // Then every 30s
  schedulerInterval = setInterval(scanTasksForNotifications, SCHEDULER_INTERVAL_MS);

  console.log('[JulyPlan] Auto-notification scheduler started (30s interval)');
}

export function stopAutoNotificationScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
  isRunning = false;
}

// Test helper — manually fire a notification for a specific task (bypasses time check)
export function testFireTaskNotification(taskId: string): { success: boolean; message: string } {
  const store = useStore.getState();
  const task = store.tasks.find((t) => t.id === taskId);
  if (!task) return { success: false, message: 'Task not found' };

  fireTaskNotification(task);
  markFired(task.id);

  return {
    success: true,
    message: `Fired notification for "${task.title}". Check Notification Center + system tray.`,
  };
}

// Get count of tasks scheduled to fire in the next hour
export function getUpcomingTaskCount(): number {
  const store = useStore.getState();
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const today = todayISO();

  return store.tasks.filter((t) => {
    if (t.status === 'archived' || !t.time) return false;
    if (t.completionLog?.[today]) return false;
    if (t.repeatRule === 'none' && t.startDate !== today) return false;
    const [h, m] = t.time.split(':').map(Number);
    const taskMin = h * 60 + m;
    return taskMin > nowMin && taskMin <= nowMin + 60;
  }).length;
}
