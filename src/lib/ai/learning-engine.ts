// AI Learning Engine — continuously adapts based on user behavior.
// Tracks: snooze patterns, response times, productive hours, procrastination, completion rates.
// Updates LearningProfile in the store.
import { useStore } from '../store';
import type { LearningProfile } from '../types';

function todayISO(): string { return new Date().toISOString().slice(0, 10); }
function getLast7Days(): string[] {
  const arr: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    arr.push(d.toISOString().slice(0, 10));
  }
  return arr;
}

// ── Recompute the entire learning profile from raw data ──
// Called periodically (e.g. on app open or once per day) to refresh insights.
export function recomputeLearningProfile(): Partial<LearningProfile> {
  const store = useStore.getState();
  const today = todayISO();
  const last7 = getLast7Days();

  // ── Snooze patterns (from notification history) ──
  const snoozedNotifs = store.aiNotifications.filter((n) => n.snooze_count && n.snooze_count > 0);
  const snoozeCountTotal = snoozedNotifs.reduce((sum, n) => sum + (n.snooze_count ?? 0), 0);
  // Keep existing avg if we have it, otherwise default
  const avgSnooze = store.learningProfile.avg_snooze_minutes;

  // ── Task completion rate (last 7 days) ──
  const recentTasks = store.tasks.filter((t) => t.status !== 'archived');
  const completedIn7 = recentTasks.filter((t) =>
    t.completionLog && last7.some((d) => t.completionLog?.[d]),
  ).length;
  const totalTracked = recentTasks.length;
  const taskCompletionRate = totalTracked > 0 ? completedIn7 / totalTracked : 0;

  // ── Habit completion rate (last 7 days) ──
  let habitCompletions = 0;
  let habitTotalPossible = 0;
  store.habits.forEach((h) => {
    last7.forEach((d) => {
      habitTotalPossible++;
      if (h.log[d]) habitCompletions++;
    });
  });
  const habitCompletionRate = habitTotalPossible > 0 ? habitCompletions / habitTotalPossible : 0;

  // ── Productive hours (when user completes most tasks) ──
  // We approximate by looking at task creation times (createdAt) —
  // hours where user adds more tasks = more active hours.
  // In a real app, this would track completion timestamps.
  const hourCounts: Record<number, number> = {};
  store.tasks.forEach((t) => {
    const hour = new Date(t.createdAt).getHours();
    hourCounts[hour] = (hourCounts[hour] ?? 0) + 1;
  });
  // Top 6 most active hours
  const productiveHours = Object.entries(hourCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([h]) => parseInt(h, 10))
    .sort((a, b) => a - b);
  // Fallback to defaults if not enough data
  const finalProductiveHours = productiveHours.length >= 3
    ? productiveHours
    : store.learningProfile.productive_hours;

  // ── Notification response rate ──
  const totalNotifs = store.aiNotifications.length;
  const respondedNotifs = store.aiNotifications.filter((n) =>
    n.status === 'completed' || n.status === 'dismissed' || (n.snooze_count ?? 0) > 0,
  ).length;
  const notificationResponseRate = totalNotifs > 0 ? respondedNotifs / totalNotifs : 0;

  // ── Most postponed task ──
  let mostPostponedTaskId: string | null = null;
  let mostPostponedCategory = '';
  let maxPostpone = 0;
  store.tasks.forEach((t) => {
    const postponeCount = (t.completionLog
      ? Object.values(t.completionLog).filter((v) => !v).length
      : 0);
    if (postponeCount > maxPostpone) {
      maxPostpone = postponeCount;
      mostPostponedTaskId = t.id;
      const section = store.sections.find((s) => s.id === t.sectionId);
      mostPostponedCategory = section?.name ?? '';
    }
  });

  // ── Habits at risk (streak >= 3 but missed today) ──
  const habitsAtRisk: string[] = [];
  store.habits.forEach((h) => {
    if (!h.active || h.log[today]) return;
    let streak = 0;
    const d = new Date();
    while (true) {
      const iso = d.toISOString().slice(0, 10);
      if (h.log[iso]) { streak++; d.setDate(d.getDate() - 1); } else break;
    }
    if (streak >= 3) habitsAtRisk.push(h.id);
  });

  // ── No-response hours (when user never responds) ──
  // Look at notification scheduled_at hour + whether user responded
  const hourResponseMap: Record<number, { total: number; responded: number }> = {};
  store.aiNotifications.forEach((n) => {
    const hour = new Date(n.scheduled_at).getHours();
    if (!hourResponseMap[hour]) hourResponseMap[hour] = { total: 0, responded: 0 };
    hourResponseMap[hour].total++;
    if (n.status === 'completed' || n.status === 'dismissed') {
      hourResponseMap[hour].responded++;
    }
  });
  // Find earliest hour where response rate > 30%
  let noResponseBefore = 6; // default
  for (let h = 0; h < 12; h++) {
    const data = hourResponseMap[h];
    if (data && data.total >= 3 && data.responded / data.total > 0.3) {
      noResponseBefore = h;
      break;
    }
  }
  // Find latest hour where response rate > 30%
  let noResponseAfter = 23;
  for (let h = 23; h >= 12; h--) {
    const data = hourResponseMap[h];
    if (data && data.total >= 3 && data.responded / data.total > 0.3) {
      noResponseAfter = h;
      break;
    }
  }

  return {
    avg_snooze_minutes: avgSnooze,
    snooze_count_total: snoozeCountTotal,
    productive_hours: finalProductiveHours,
    most_postponed_category: mostPostponedCategory,
    most_postponed_task_id: mostPostponedTaskId,
    habits_at_risk: habitsAtRisk,
    task_completion_rate: Math.round(taskCompletionRate * 100) / 100,
    habit_completion_rate: Math.round(habitCompletionRate * 100) / 100,
    notification_response_rate: Math.round(notificationResponseRate * 100) / 100,
    no_response_before_hour: noResponseBefore,
    no_response_after_hour: noResponseAfter,
    updated_at: new Date().toISOString(),
  };
}

// ── Track user actions on notifications (for learning) ──
export function trackNotificationAction(
  notificationId: string,
  action: 'completed' | 'snoozed' | 'dismissed' | 'ignored',
  snoozeMinutes?: number,
): void {
  const store = useStore.getState();
  if (!store.notificationPreferences.learning_enabled) return;

  // Record snooze duration learning
  if (action === 'snoozed' && snoozeMinutes) {
    store.recordSnoozeAction(notificationId, snoozeMinutes);

    // After 5+ snoozes, suggest updating default snooze duration
    if (store.learningProfile.snooze_count_total >= 5) {
      const newDefault = store.learningProfile.avg_snooze_minutes;
      const currentDefault = store.notificationPreferences.default_snooze_minutes;
      // Auto-adjust default if avg is significantly different (>5 min delta)
      if (Math.abs(newDefault - currentDefault) > 5) {
        store.updateNotificationPreferences({ default_snooze_minutes: newDefault });
      }
    }
  }
}

// ── Auto-recompute on app open (call once on mount) ──
export function refreshLearningProfile(): void {
  const store = useStore.getState();
  if (!store.notificationPreferences.learning_enabled) return;
  const updates = recomputeLearningProfile();
  store.updateLearningProfile(updates);
}
