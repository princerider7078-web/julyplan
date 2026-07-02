'use client';
import { useEffect, useState, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth/context';
import { aiChat } from '@/lib/ai';
import { buildLocalContext } from '@/lib/ai/context';
import {
  buildNotification, collectSignals, shouldBatch, shouldNotifyNow,
} from '@/lib/ai/notification-engine';
import { trackNotificationAction, refreshLearningProfile } from '@/lib/ai/learning-engine';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bell, Sparkles, Loader2, X, CheckCircle2, Clock, AlertTriangle,
  Brain, Heart, Droplet, Moon, Dumbbell, BookOpen, Trophy, Zap, Target,
  RotateCcw, Coffee, Layers, ChevronDown, ChevronUp,
} from 'lucide-react';
import { cn, todayISO, formatTime12, formatDateLong } from '@/lib/utils';
import type { AINotification, NotificationAction } from '@/lib/types';
import type { ViewKey } from '../sidebar';

interface Props {
  onNavigate: (v: ViewKey) => void;
}

const NOTIF_TYPES = [
  { value: 'briefing',       label: 'Morning Brief',     icon: Sparkles,    color: 'text-amber-500' },
  { value: 'review',         label: 'Evening Review',    icon: Moon,        color: 'text-violet-500' },
  { value: 'task',           label: 'Task Reminder',     icon: Clock,       color: 'text-cyan-500' },
  { value: 'priority',       label: 'Priority Alert',    icon: AlertTriangle, color: 'text-red-500' },
  { value: 'habit',          label: 'Habit Reminder',    icon: CheckCircle2, color: 'text-emerald-500' },
  { value: 'goal',           label: 'Goal Reminder',     icon: Trophy,      color: 'text-orange-500' },
  { value: 'motivation',     label: 'Motivation',        icon: Zap,         color: 'text-yellow-500' },
  { value: 'health',         label: 'Health',            icon: Heart,       color: 'text-pink-500' },
  { value: 'hydration',      label: 'Hydration',         icon: Droplet,     color: 'text-blue-500' },
  { value: 'workout',        label: 'Workout',           icon: Dumbbell,    color: 'text-red-500' },
  { value: 'sleep',          label: 'Sleep',             icon: Moon,        color: 'text-indigo-500' },
  { value: 'study',          label: 'Study',             icon: BookOpen,    color: 'text-emerald-500' },
  { value: 'focus',          label: 'Focus',             icon: Target,      color: 'text-purple-500' },
  { value: 'procrastination',label: 'Procrastination',   icon: AlertTriangle, color: 'text-orange-500' },
  { value: 'deadline',       label: 'Deadline',          icon: Clock,       color: 'text-red-500' },
  { value: 'suggestion',     label: 'AI Suggestion',     icon: Brain,       color: 'text-violet-500' },
  { value: 'reschedule',     label: 'Smart Reschedule',  icon: RotateCcw,   color: 'text-cyan-500' },
  { value: 'achievement',    label: 'Achievement',       icon: Trophy,      color: 'text-yellow-500' },
] as const;

const PRIORITY_COLORS = {
  low: 'bg-emerald-500/15 text-emerald-500',
  medium: 'bg-amber-500/15 text-amber-500',
  high: 'bg-orange-500/15 text-orange-500',
  critical: 'bg-red-500/15 text-red-500',
};

const ACTION_LABELS: Record<NotificationAction, { label: string; icon: typeof CheckCircle2 }> = {
  complete:     { label: 'Complete',  icon: CheckCircle2 },
  start:        { label: 'Start',     icon: Zap },
  snooze:       { label: 'Snooze',    icon: Clock },
  reschedule:   { label: 'Reschedule',icon: RotateCcw },
  ask_ai:       { label: 'Ask AI',    icon: Brain },
  skip:         { label: 'Skip',      icon: X },
  split:        { label: 'Split',     icon: Layers },
  break_subtasks: { label: 'Subtasks', icon: Layers },
  convert_habit: { label: 'Habit',    icon: RotateCcw },
  delay:        { label: 'Delay',     icon: Clock },
};

function getIcon(type: AINotification['type']) {
  const found = NOTIF_TYPES.find((t) => t.value === type);
  return found?.icon ?? Bell;
}

const ESCALATION_LABELS = ['', 'Gentle', 'Motivational', 'Reschedule?', 'Recovery'];

export function NotificationCenterView({ onNavigate }: Props) {
  const notifications = useStore((s) => s.aiNotifications);
  const addAINotification = useStore((s) => s.addAINotification);
  const updateAINotification = useStore((s) => s.updateAINotification);
  const dismissAINotification = useStore((s) => s.dismissAINotification);
  const snoozeAINotification = useStore((s) => s.snoozeAINotification);
  const completeAINotification = useStore((s) => s.completeAINotification);
  const escalateNotification = useStore((s) => s.escalateNotification);
  const moveToRecovery = useStore((s) => s.moveToRecovery);
  const settings = useStore((s) => s.settings);
  const prefs = useStore((s) => s.notificationPreferences);
  const tasks = useStore((s) => s.tasks);
  const habits = useStore((s) => s.habits);
  const finance = useStore((s) => s.finance);
  const { profile, isOffline } = useAuth();

  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Refresh learning profile on mount
  useEffect(() => {
    refreshLearningProfile();
  }, []);

  // Auto-detect which notifications should escalate based on snooze count
  useEffect(() => {
    notifications.forEach((n) => {
      if (n.status === 'snoozed' && (n.snooze_count ?? 0) >= 3 && (n.escalation_level ?? 0) < 3) {
        escalateNotification(n.id);
      } else if (n.status === 'snoozed' && (n.snooze_count ?? 0) >= 5 && (n.escalation_level ?? 0) < 4) {
        moveToRecovery(n.id);
      }
    });
  }, [notifications, escalateNotification, moveToRecovery]);

  // ── Generate AI notification of a specific type ──
  async function generateNotification(type: typeof NOTIF_TYPES[number]['value']) {
    setBusy(type);
    try {
      const today = todayISO();
      const ctx = buildLocalContext({
        todayTasks: tasks.filter((t) => t.status !== 'archived').slice(0, 10).map((t) => ({
          title: t.title,
          priority: t.priority,
          time: t.time,
          done: !!t.completionLog?.[today],
        })),
        recentHabits: habits.slice(0, 10).map((h) => {
          let streak = 0;
          const d = new Date();
          while (true) {
            const iso = d.toISOString().slice(0, 10);
            if (h.log[iso]) { streak++; d.setDate(d.getDate() - 1); } else break;
          }
          return { name: h.name, doneToday: !!h.log[today], streak };
        }),
        recentFinance: {
          todaySpend: finance.filter((f) => f.type === 'expense' && f.date === today).reduce((s, f) => s + f.amount, 0),
          monthSpend: finance.filter((f) => f.type === 'expense' && f.date.slice(0, 7) === today.slice(0, 7)).reduce((s, f) => s + f.amount, 0),
          budget: 5000,
        },
        userQuery: `${type} reminder motivation`,
      });

      // Build prompts per type
      const prompts: Record<string, string> = {
        briefing: 'Generate a morning briefing. Include: today\'s top 3 priorities, habit status, motivational note. Use real data. Max 100 words. Light Hinglish OK.',
        review: 'Generate an evening review. Include: completed, missed, suggestion for tomorrow. Max 100 words.',
        task: 'Generate a task reminder for the user\'s most urgent pending task. Use real task title + time. Max 30 words.',
        priority: 'Generate an urgent priority alert. Mention the high-priority task + work remaining. Max 40 words.',
        habit: 'Generate a habit reminder for a habit the user hasn\'t done today. Use real habit name + streak. Max 30 words.',
        goal: 'Generate a goal reminder connecting today\'s tasks to the user\'s long-term goals. Max 40 words.',
        motivation: 'Generate a SHORT motivational message (2-3 sentences) using the user\'s goals + today\'s progress.',
        health: 'Generate a health check reminder. Mention water, posture, or movement. Max 30 words.',
        hydration: 'Generate a hydration reminder using the user\'s actual water target (3L). Hinglish OK. Max 20 words.',
        workout: 'Generate a workout reminder. Mention today\'s workout split. Max 30 words.',
        sleep: 'Generate a sleep reminder. Max 25 words.',
        study: 'Generate a study reminder. Mention the user\'s study subject (BCA). Max 30 words.',
        focus: 'Generate a focus reminder (user has been inactive). Max 25 words.',
        procrastination: 'Generate a procrastination alert. Suggest breaking the task into subtasks. Max 35 words.',
        deadline: 'Generate a deadline prediction alert. Warn about upcoming deadline + suggest 30 min work today. Max 35 words.',
        suggestion: 'Generate an AI suggestion to improve the user\'s day. Based on patterns. Max 30 words.',
        reschedule: 'Generate a smart reschedule message. The user missed a task — propose 3 timing options. Max 40 words.',
        achievement: 'Generate an achievement recognition message. Max 25 words.',
      };

      const response = await aiChat(prompts[type] ?? 'Generate a short reminder.', ctx, [], {
        profile: {
          provider: settings.aiProvider ?? 'zai',
          model_chat: settings.aiModelChat ?? 'glm-4.6',
          model_planning: settings.aiModelPlanning ?? 'glm-4.6',
          model_reports: settings.aiModelReports ?? 'glm-4.6',
          fallback_model: 'glm-4.5',
          temperature: settings.aiTemperature ?? 0.7,
          max_tokens: 300,
          prompt_style: 'coach',
          enabled_modules_json: settings.aiEnabledModules ?? [],
        },
        userId: profile?.id,
      });

      // Build the notification with reasoning + tone + actions via engine
      const notifInput = buildNotification({
        type,
        title: NOTIF_TYPES.find((t) => t.value === type)?.label ?? 'Notification',
        message: response.text,
        priority: ['priority', 'deadline'].includes(type) ? 'high'
          : ['briefing', 'review'].includes(type) ? 'high'
          : ['task', 'habit', 'workout', 'sleep', 'study'].includes(type) ? 'medium'
          : 'low',
        category: type === 'briefing' || type === 'review' ? 'ai_insights'
          : type === 'task' || type === 'priority' || type === 'reschedule' || type === 'procrastination' || type === 'deadline' ? 'task'
          : type === 'habit' ? 'habit'
          : type === 'hydration' || type === 'workout' || type === 'sleep' || type === 'health' ? 'health'
          : type === 'study' ? 'study'
          : type === 'achievement' ? 'achievements'
          : 'ai_insights',
        estimated_minutes: 30,
      });

      addAINotification(notifInput);
    } catch (e) {
      console.warn('Notification generation failed', e);
      // Add error notification
      addAINotification(buildNotification({
        type: 'suggestion',
        title: 'AI Unavailable',
        message: 'Could not generate AI notification. Check your backend URL in AI Controls.',
        priority: 'low',
      }));
    } finally {
      setBusy(null);
    }
  }

  // ── Smart batch preview ──
  const batchPreview = useMemo(() => {
    const signals = collectSignals();
    return shouldBatch(signals.upcomingTasks, prefs);
  }, [tasks, prefs]);

  const filtered = filter === 'all'
    ? notifications
    : notifications.filter((n) => n.type === filter);

  const pending = filtered.filter((n) => n.status === 'pending' || n.status === 'shown' || n.status === 'snoozed');
  const dismissed = filtered.filter((n) => n.status === 'dismissed' || n.status === 'completed' || n.status === 'recovery');

  function handleAction(n: AINotification, action: NotificationAction) {
    switch (action) {
      case 'complete':
        completeAINotification(n.id);
        trackNotificationAction(n.id, 'completed');
        break;
      case 'snooze':
        snoozeAINotification(n.id);
        trackNotificationAction(n.id, 'snoozed', prefs.default_snooze_minutes);
        break;
      case 'skip':
        dismissAINotification(n.id);
        trackNotificationAction(n.id, 'dismissed');
        break;
      case 'ask_ai':
        onNavigate('ai-chat');
        break;
      case 'reschedule':
        if (n.linked_entity_id) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          useStore.getState().updateTask(n.linked_entity_id, { startDate: tomorrow.toISOString().slice(0, 10) });
        }
        dismissAINotification(n.id);
        break;
      case 'start':
        completeAINotification(n.id);
        trackNotificationAction(n.id, 'completed');
        break;
      default:
        dismissAINotification(n.id);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Smart Alerts</p>
          <h1 className="text-3xl font-bold tracking-tight mt-1 flex items-center gap-2">
            <Bell className="h-7 w-7 text-primary" />
            AI Notification Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Every notification includes AI reasoning · Tone: {prefs.tone} ·{' '}
            <button onClick={() => onNavigate('notif-prefs')} className="text-primary hover:underline">
              Preferences
            </button>
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => onNavigate('recovery')}>
          <RotateCcw className="h-3.5 w-3.5 mr-1" />
          Recovery Queue ({useStore.getState().recoveryQueue.length})
        </Button>
      </div>

      {/* Smart batch preview */}
      {batchPreview.batch && (
        <Card className="border-l-4 border-l-emerald-500 bg-emerald-500/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Layers className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-semibold">Smart Batch Preview</span>
              <Badge variant="outline" className="text-[10px]">
                {batchPreview.items.length} tasks · ~{batchPreview.totalMinutes} min
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              {batchPreview.items.map((t) => t.title).join(' · ')}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1 italic">
              AI will batch these into one alert instead of {batchPreview.items.length} separate pings.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generate buttons */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Generate AI Notification</CardTitle>
          <CardDescription>Each includes "why now" reasoning + interactive actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {NOTIF_TYPES.map((t) => {
              const Icon = t.icon;
              const isBusy = busy === t.value;
              return (
                <Button
                  key={t.value}
                  variant="outline"
                  className="flex flex-col items-center gap-1 h-auto py-3"
                  onClick={() => generateNotification(t.value)}
                  disabled={!!busy}
                >
                  {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className={cn('h-4 w-4', t.color)} />}
                  <span className="text-[10px] text-center">{t.label}</span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">Filter:</span>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="text-xs px-2 py-1 rounded-md border border-input bg-background"
        >
          <option value="all">All Types</option>
          {NOTIF_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground ml-auto">
          {pending.length} active · {dismissed.length} archived
        </span>
      </div>

      {/* Notification list */}
      {pending.length === 0 && dismissed.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Bell className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-semibold">No notifications yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Generate one above, or they'll auto-create based on your activity.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {pending.length > 0 && (
            <>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Active</div>
              {pending.map((n) => {
                const Icon = getIcon(n.type);
                const isExpanded = expandedId === n.id;
                const escalationLabel = n.escalation_level ? ESCALATION_LABELS[n.escalation_level] : '';
                return (
                  <Card key={n.id} className={cn(
                    'border-l-4',
                    n.priority === 'critical' && 'border-l-red-500',
                    n.priority === 'high' && 'border-l-orange-500',
                    n.priority === 'medium' && 'border-l-amber-500',
                    n.priority === 'low' && 'border-l-emerald-500',
                    n.status === 'snoozed' && 'opacity-60',
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-semibold text-sm">{n.title}</span>
                            <Badge variant="outline" className={cn('text-[9px] border-0', PRIORITY_COLORS[n.priority])}>
                              {n.priority}
                            </Badge>
                            {n.ai_generated && (
                              <Badge variant="outline" className="text-[9px] border-primary/30 text-primary">
                                <Sparkles className="h-2.5 w-2.5 mr-0.5" /> AI
                              </Badge>
                            )}
                            {n.tone && (
                              <Badge variant="outline" className="text-[9px] capitalize">{n.tone}</Badge>
                            )}
                            {escalationLabel && (
                              <Badge variant="outline" className="text-[9px] bg-orange-500/10 text-orange-600 dark:text-orange-400">
                                ⚠ {escalationLabel}
                              </Badge>
                            )}
                            {n.status === 'snoozed' && (
                              <Badge variant="outline" className="text-[9px]">
                                Snoozed {(n.snooze_count ?? 0)}× → {formatTime12(n.scheduled_at.slice(11, 16))}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-foreground/90 whitespace-pre-wrap">{n.message}</p>

                          {/* AI Reasoning — the differentiator */}
                          {n.reasoning && (
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : n.id)}
                              className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              <Brain className="h-3 w-3" />
                              {isExpanded ? 'Hide reasoning' : 'Why now?'}
                              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </button>
                          )}
                          {isExpanded && n.reasoning && (
                            <div className="mt-2 p-2 rounded-md bg-primary/5 border border-primary/20">
                              <div className="text-xs text-foreground/80 italic">
                                💡 {n.reasoning}
                              </div>
                            </div>
                          )}

                          <div className="text-[10px] text-muted-foreground mt-2">
                            {formatDateLong(n.scheduled_at.slice(0, 10))}
                            {n.scheduled_at.slice(11, 16) && ` · ${formatTime12(n.scheduled_at.slice(11, 16))}`}
                          </div>
                        </div>
                        <Button
                          size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500 shrink-0"
                          onClick={() => { dismissAINotification(n.id); trackNotificationAction(n.id, 'dismissed'); }}
                          title="Dismiss"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {/* Interactive actions */}
                      {n.actions && n.actions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3 pt-2 border-t border-border">
                          {n.actions.map((action) => {
                            const meta = ACTION_LABELS[action];
                            if (!meta) return null;
                            const Icon = meta.icon;
                            return (
                              <Button
                                key={action}
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs"
                                onClick={() => handleAction(n, action)}
                              >
                                <Icon className="h-3 w-3 mr-1" />
                                {meta.label}
                              </Button>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </>
          )}

          {dismissed.length > 0 && (
            <>
              <div className="text-xs uppercase tracking-wider text-muted-foreground pt-4">Archived</div>
              {dismissed.slice(0, 5).map((n) => {
                const Icon = getIcon(n.type);
                return (
                  <Card key={n.id} className="opacity-50">
                    <CardContent className="p-3 flex items-center gap-3">
                      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm line-clamp-1">{n.title}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {n.message.split('\n')[0]}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[9px] capitalize">{n.status}</Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
