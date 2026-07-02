// AI Decision Engine — evaluates 15+ signals to decide when/whether/how to notify.
// This is the brain behind "smart notifications" — not just scheduled reminders.
import { useStore } from '../store';
import type {
  AINotification, NotificationPreferences, LearningProfile,
  Task, Habit, NotificationCategory, NotificationTone, NotificationAction,
} from '../types';

function todayISO(): string { return new Date().toISOString().slice(0, 10); }

// ── Signal collection ──
export interface DecisionSignals {
  currentHour: number;
  dayOfWeek: number;            // 0=Sun, 6=Sat
  isQuietHours: boolean;
  isProductiveHour: boolean;
  isWeekend: boolean;
  pendingTaskCount: number;
  highPriorityPending: number;
  overdueTaskCount: number;
  habitsDoneToday: number;
  habitsTotal: number;
  habitsAtRisk: { id: string; name: string; streak: number; missedToday: boolean }[];
  upcomingTasks: { id: string; title: string; time?: string; priority: string; inMinutes: number }[];
  mostPostponedTask?: { id: string; title: string; postponeCount: number };
  recentActivity: 'active' | 'inactive_45min' | 'inactive_long';
  avgResponseTimeMin: number;
  defaultSnoozeMin: number;
  noResponseBeforeHour: number;
  noResponseAfterHour: number;
  notificationResponseRate: number;
}

export function collectSignals(): DecisionSignals {
  const store = useStore.getState();
  const now = new Date();
  const hour = now.getHours();
  const today = todayISO();

  // Quiet hours check
  const prefs = store.notificationPreferences;
  const startTime = prefs.quiet_hours_start;
  const endTime = prefs.quiet_hours_end;
  const nowMin = hour * 60 + now.getMinutes();
  const startMin = parseInt(startTime.slice(0, 2)) * 60 + parseInt(startTime.slice(3, 5));
  const endMin = parseInt(endTime.slice(0, 2)) * 60 + parseInt(endTime.slice(3, 5));
  const isQuiet = prefs.quiet_hours_enabled && (
    startMin > endMin
      ? (nowMin >= startMin || nowMin < endMin)   // overnight (22:00-07:00)
      : (nowMin >= startMin && nowMin < endMin)   // same-day
  );

  // Tasks
  const activeTasks = store.tasks.filter((t) => t.status !== 'archived');
  const pendingTasks = activeTasks.filter((t) =>
    t.repeatRule !== 'none' ? !t.completionLog?.[today] : t.status === 'pending',
  );
  const overdueTasks = activeTasks.filter((t) => {
    if (t.status === 'completed' || t.repeatRule !== 'none') return false;
    if (!t.endDate) return false;
    return t.endDate < today && t.status !== 'completed';
  });

  // Upcoming tasks (next 2 hours)
  const upcoming: DecisionSignals['upcomingTasks'] = [];
  activeTasks.forEach((t) => {
    if (!t.time || t.completionLog?.[today]) return;
    const [h, m] = t.time.split(':').map(Number);
    const taskMin = h * 60 + m;
    const diff = taskMin - nowMin;
    if (diff > 0 && diff <= 120) {
      upcoming.push({
        id: t.id,
        title: t.title,
        time: t.time,
        priority: t.priority,
        inMinutes: diff,
      });
    }
  });
  upcoming.sort((a, b) => a.inMinutes - b.inMinutes);

  // Habits
  const habitsDone = store.habits.filter((h) => h.log[today]).length;
  const habitsAtRisk = store.habits
    .filter((h) => h.active && !h.log[today])
    .map((h) => {
      let streak = 0;
      const d = new Date();
      while (true) {
        const iso = d.toISOString().slice(0, 10);
        if (h.log[iso]) { streak++; d.setDate(d.getDate() - 1); } else break;
      }
      return { id: h.id, name: h.title, streak, missedToday: !h.log[today] };
    })
    .filter((h) => h.streak >= 3);  // streaks >= 3 days are "at risk"

  // Learning profile
  const lp = store.learningProfile;

  return {
    currentHour: hour,
    dayOfWeek: now.getDay(),
    isQuietHours: isQuiet,
    isProductiveHour: lp.productive_hours.includes(hour),
    isWeekend: now.getDay() === 0 || now.getDay() === 6,
    pendingTaskCount: pendingTasks.length,
    highPriorityPending: pendingTasks.filter((t) => t.priority === 'critical' || t.priority === 'high').length,
    overdueTaskCount: overdueTasks.length,
    habitsDoneToday: habitsDone,
    habitsTotal: store.habits.length,
    habitsAtRisk,
    upcomingTasks: upcoming,
    recentActivity: 'active', // placeholder — would need app-open tracking
    avgResponseTimeMin: lp.avg_response_time_minutes,
    defaultSnoozeMin: lp.avg_snooze_minutes,
    noResponseBeforeHour: lp.no_response_before_hour,
    noResponseAfterHour: lp.no_response_after_hour,
    notificationResponseRate: lp.notification_response_rate,
  };
}

// ── Decision: should we notify now? ──
export interface NotifyDecision {
  shouldNotify: boolean;
  delayMinutes?: number;       // if shouldNotify=false, suggested delay
  reason: string;              // why delayed or approved
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export function shouldNotifyNow(
  signals: DecisionSignals,
  notif: Partial<AINotification>,
  prefs: NotificationPreferences,
): NotifyDecision {
  // Critical notifications bypass quiet hours
  if (signals.isQuietHours) {
    if (notif.priority === 'critical' && prefs.critical_bypass_quiet) {
      return { shouldNotify: true, reason: 'Critical — bypasses quiet hours', priority: 'critical' };
    }
    // Delay to end of quiet hours
    const now = new Date();
    const [endH, endM] = prefs.quiet_hours_end.split(':').map(Number);
    const end = new Date(now);
    end.setHours(endH, endM, 0, 0);
    if (end < now) end.setDate(end.getDate() + 1);
    const delayMin = Math.ceil((end.getTime() - now.getTime()) / 60000);
    return {
      shouldNotify: false,
      delayMinutes: delayMin,
      reason: `Quiet hours — delayed to ${prefs.quiet_hours_end}`,
      priority: notif.priority ?? 'medium',
    };
  }

  // Don't notify before user's wake time
  if (signals.currentHour < signals.noResponseBeforeHour) {
    return {
      shouldNotify: false,
      delayMinutes: (signals.noResponseBeforeHour - signals.currentHour) * 60,
      reason: `User doesn't respond before ${signals.noResponseBeforeHour}:00`,
      priority: notif.priority ?? 'medium',
    };
  }

  // Don't notify after user's sleep time (unless critical)
  if (signals.currentHour >= signals.noResponseAfterHour && notif.priority !== 'critical') {
    return {
      shouldNotify: false,
      delayMinutes: 8 * 60, // delay to next morning
      reason: `User doesn't respond after ${signals.noResponseAfterHour}:00`,
      priority: notif.priority ?? 'medium',
    };
  }

  // If task is already completed, don't notify
  // (caller should check this before calling)

  return {
    shouldNotify: true,
    reason: 'Approved',
    priority: notif.priority ?? 'medium',
  };
}

// ── Reasoning generator: "why now" ──
// This is the differentiator — every notification explains itself.
export function generateReasoning(
  type: AINotification['type'],
  signals: DecisionSignals,
  context?: { taskTitle?: string; habitName?: string; streak?: number; postponeCount?: number },
): string {
  switch (type) {
    case 'task':
      if (context?.taskTitle) {
        // Check if current hour is productive for user
        if (signals.isProductiveHour) {
          return `Suggested now because you complete ${context.taskTitle.toLowerCase()} faster between ${signals.currentHour}:00–${signals.currentHour + 1}:00.`;
        }
        return `Starts soon — prepping now keeps your ${signals.pendingTaskCount} tasks on track.`;
      }
      return 'Task reminder — keeping you on schedule.';

    case 'priority':
      return `Urgent — ${signals.highPriorityPending} high-priority tasks pending. Tackling this first prevents deadline slip.`;

    case 'habit':
      if (context?.habitName && context.streak !== undefined) {
        if (context.streak >= 7) {
          return `${context.streak}-day streak — skipping today resets progress. A 5-min session keeps it alive.`;
        }
        return `Habit reminder — ${context.habitName} keeps your ${signals.habitsDoneToday}/${signals.habitsTotal} daily target moving.`;
      }
      return 'Habit reminder — small daily actions compound.';

    case 'focus':
      return `Inactive for 45+ min — your next task is queued. A 25-min focus block rebuilds momentum.`;

    case 'procrastination':
      if (context?.postponeCount && context.postponeCount >= 3) {
        return `Postponed ${context.postponeCount}× — likely feels too big. Breaking it into 3 subtasks usually unblocks it.`;
      }
      return 'Repeatedly postponed — consider splitting or rescheduling to a productive hour.';

    case 'deadline':
      return `At your current pace, this deadline is at risk. 30 minutes today prevents an all-nighter later.`;

    case 'suggestion':
      if (signals.isProductiveHour) {
        return `You're in a productive window (${signals.currentHour}:00). High-value tasks done now free up your evening.`;
      }
      return `Based on your patterns, this adjustment improves tomorrow's flow.`;

    case 'reschedule':
      return `Missed — auto-rescheduled to your next free slot. Confirm or pick a better time.`;

    case 'briefing':
      return `Morning brief — ${signals.pendingTaskCount} tasks, ${signals.habitsDoneToday}/${signals.habitsTotal} habits done. Plan ahead, win the day.`;

    case 'review':
      return `Evening review — close the loop on today's progress + prep tomorrow.`;

    case 'achievement':
      return `Milestone hit — recognizing progress keeps motivation high for the next push.`;

    case 'hydration':
      return `Water streak 0d. Abhi 500ml le lo, target 3L. Small sips, big energy.`;

    case 'workout':
      return `Workout window open — your body recovers better when training happens at the same time daily.`;

    case 'sleep':
      return `Sleep window closing — consistent bedtime improves tomorrow's focus by ~25%.`;

    case 'study':
      return `Study block — your retention peaks in the morning. 25-min pomodoro → 5-min break.`;

    case 'motivation':
      return `Quick boost — your ${signals.notificationResponseRate > 0.5 ? 'consistency' : 'potential'} is real. One task at a time.`;

    case 'health':
      return `Health check — small habits (water, posture, walk) compound into big energy.`;

    case 'goal':
      return `Goal checkpoint — today's actions either advance or delay the bigger picture.`;

    default:
      return 'Context-aware reminder based on your patterns.';
  }
}

// ── Tone adapter ──
// Same notification, different wording per user preference.
export function applyTone(
  baseMessage: string,
  tone: NotificationTone,
  reasoning: string,
): string {
  switch (tone) {
    case 'professional':
      return `${baseMessage}\n\n→ ${reasoning}`;
    case 'friendly':
      return `${baseMessage} 😊\n\n(${reasoning})`;
    case 'motivational':
      return `${baseMessage} — you've got this! 💪\n\n${reasoning}`;
    case 'minimal':
      return baseMessage;
    case 'strict':
      return `${baseMessage}\n\n⚠ ${reasoning}. No more delays.`;
    default:
      return `${baseMessage}\n\n${reasoning}`;
  }
}

// ── Smart batching ──
// Group multiple upcoming notifications into one batch to reduce noise.
export function shouldBatch(
  upcoming: DecisionSignals['upcomingTasks'],
  prefs: NotificationPreferences,
): { batch: boolean; items: DecisionSignals['upcomingTasks']; totalMinutes: number } {
  if (!prefs.batching_enabled || upcoming.length < 2) {
    return { batch: false, items: [], totalMinutes: 0 };
  }
  // Group items within the batching window
  const window = prefs.batching_window_minutes;
  const first = upcoming[0];
  const batchItems = upcoming.filter((t) => t.inMinutes <= first.inMinutes + window);
  if (batchItems.length < 2) {
    return { batch: false, items: [], totalMinutes: 0 };
  }
  const total = batchItems.reduce((sum, t) => sum + 30, 0); // estimate 30 min per task
  return { batch: true, items: batchItems, totalMinutes: total };
}

// ── Action picker ──
// Decide which interactive actions a notification should expose.
export function pickActions(
  type: AINotification['type'],
  signals: DecisionSignals,
): NotificationAction[] {
  const base: NotificationAction[] = ['complete', 'snooze', 'ask_ai', 'skip'];

  switch (type) {
    case 'task':
      return ['start', 'snooze', 'reschedule', 'ask_ai'];
    case 'priority':
      return ['start', 'snooze', 'ask_ai'];
    case 'habit':
      return ['complete', 'snooze', 'skip'];
    case 'procrastination':
      return ['start', 'break_subtasks', 'reschedule', 'skip'];
    case 'deadline':
      return ['start', 'reschedule', 'ask_ai'];
    case 'reschedule':
      return ['complete', 'reschedule', 'skip'];
    case 'focus':
      return ['start', 'snooze', 'skip'];
    case 'briefing':
    case 'review':
      return ['ask_ai'];
    default:
      return base;
  }
}

// ── Escalation logic ──
// When a notification is snoozed/ignored multiple times, escalate.
export function getEscalationMessage(
  level: number,
  baseMessage: string,
  tone: NotificationTone,
): string {
  switch (level) {
    case 0:
      return baseMessage;
    case 1:
      return `Friendly reminder: ${baseMessage}`;
    case 2:
      return tone === 'strict'
        ? `⚠ Second reminder. ${baseMessage} Stop postponing.`
        : `Just a nudge — ${baseMessage}`;
    case 3:
      return `⚠ This keeps getting delayed. Want me to reschedule or split it? (${baseMessage})`;
    case 4:
      return `Moved to Recovery Queue. Open the app to decide: do now, split, or reschedule.`;
    default:
      return baseMessage;
  }
}

// ── Full notification builder ──
// Combines all the above to create a complete notification object.
export function buildNotification(input: {
  type: AINotification['type'];
  title: string;
  message: string;
  priority?: AINotification['priority'];
  category?: NotificationCategory;
  linked_entity_type?: 'task' | 'habit' | 'memory';
  linked_entity_id?: string;
  estimated_minutes?: number;
  reasoningContext?: { taskTitle?: string; habitName?: string; streak?: number; postponeCount?: number };
}): Omit<AINotification, 'id' | 'created_at'> {
  const store = useStore.getState();
  const signals = collectSignals();
  const prefs = store.notificationPreferences;
  const tone = prefs.tone;

  const reasoning = generateReasoning(input.type, signals, input.reasoningContext);
  const messageWithTone = applyTone(input.message, tone, reasoning);
  const actions = pickActions(input.type, signals);
  const decision = shouldNotifyNow(signals, { priority: input.priority }, prefs);

  return {
    title: input.title,
    message: messageWithTone,
    type: input.type,
    priority: input.priority ?? 'medium',
    scheduled_at: decision.shouldNotify
      ? new Date().toISOString()
      : new Date(Date.now() + (decision.delayMinutes ?? 15) * 60000).toISOString(),
    status: 'pending',
    ai_generated: true,
    linked_entity_type: input.linked_entity_type,
    linked_entity_id: input.linked_entity_id,
    reasoning,
    category: input.category,
    escalation_level: 0,
    snooze_count: 0,
    postpone_count: input.reasoningContext?.postponeCount,
    tone,
    estimated_minutes: input.estimated_minutes,
    actions,
  };
}
