'use client';
import { useState } from 'react';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth/context';
import { aiNotification, aiChat } from '@/lib/ai';
import { buildLocalContext } from '@/lib/ai/context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Bell, Sparkles, Loader2, X, CheckCircle2, Clock, AlertTriangle,
  Brain, Heart, Droplet, Moon, Dumbbell, BookOpen, Trophy, Zap,
} from 'lucide-react';
import { cn, todayISO, formatTime12, formatDateLong } from '@/lib/utils';
import type { AINotification } from '@/lib/types';

const NOTIF_TYPES = [
  { value: 'briefing',  label: 'Morning Briefing',  icon: Sparkles },
  { value: 'review',    label: 'Evening Review',     icon: Moon },
  { value: 'task',      label: 'Task Reminder',      icon: Clock },
  { value: 'habit',     label: 'Habit Reminder',     icon: CheckCircle2 },
  { value: 'goal',      label: 'Goal Reminder',      icon: Trophy },
  { value: 'motivation',label: 'Motivation',         icon: Zap },
  { value: 'health',    label: 'Health',             icon: Heart },
  { value: 'hydration', label: 'Hydration',          icon: Droplet },
  { value: 'workout',   label: 'Workout',            icon: Dumbbell },
  { value: 'sleep',     label: 'Sleep',              icon: Moon },
  { value: 'study',     label: 'Study',              icon: BookOpen },
] as const;

const PRIORITY_COLORS = {
  low: 'bg-emerald-500/15 text-emerald-500',
  medium: 'bg-amber-500/15 text-amber-500',
  high: 'bg-orange-500/15 text-orange-500',
  critical: 'bg-red-500/15 text-red-500',
};

function getIcon(type: AINotification['type']) {
  const found = NOTIF_TYPES.find((t) => t.value === type);
  return found?.icon ?? Bell;
}

export function NotificationCenterView() {
  const notifications = useStore((s) => s.aiNotifications);
  const addAINotification = useStore((s) => s.addAINotification);
  const updateAINotification = useStore((s) => s.updateAINotification);
  const dismissAINotification = useStore((s) => s.dismissAINotification);
  const settings = useStore((s) => s.settings);
  const tasks = useStore((s) => s.tasks);
  const habits = useStore((s) => s.habits);
  const finance = useStore((s) => s.finance);
  const { profile, isOffline } = useAuth();

  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  // Generate AI notification of a specific type
  async function generateNotification(type: typeof NOTIF_TYPES[number]['value']) {
    setBusy(type);
    try {
      const today = todayISO();
      const ctx = buildLocalContext({
        todayTasks: tasks.filter((t) => t.status !== 'archived').slice(0, 8).map((t) => ({
          title: t.title,
          priority: t.priority,
          time: t.time,
          done: !!t.completionLog?.[today],
        })),
        recentHabits: habits.slice(0, 8).map((h) => {
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
        // V3: pull relevant memories based on notification type
        userQuery: `${type} reminder motivation`,
      });

      // Use aiNotification for typed reminders, aiChat for briefing/review
      let response;
      if (type === 'briefing' || type === 'review') {
        const prompt = type === 'briefing'
          ? 'Generate a morning briefing for the user. Include: today\'s top 3 priorities, habit status, motivational note (1 sentence). Use their actual data. Max 150 words. Use light Hinglish if natural.'
          : 'Generate an evening review for the user. Include: what was completed today, what was missed, one suggestion for tomorrow. Use their actual data. Max 150 words. Use light Hinglish if natural.';
        response = await aiChat(prompt, ctx, [], {
          profile: {
            provider: settings.aiProvider ?? 'zai',
            model_chat: settings.aiModelChat ?? 'glm-4.6',
            model_planning: settings.aiModelPlanning ?? 'glm-4.6',
            model_reports: settings.aiModelReports ?? 'glm-4.6',
            fallback_model: 'glm-4.5',
            temperature: settings.aiTemperature ?? 0.7,
            max_tokens: settings.aiMaxTokens ?? 1500,
            prompt_style: 'coach',
            enabled_modules_json: settings.aiEnabledModules ?? [],
          },
          userId: profile?.id,
        });
      } else {
        response = await aiNotification(
          type as 'water' | 'workout' | 'sleep' | 'task' | 'habit' | 'finance',
          ctx,
          {
            profile: {
              provider: settings.aiProvider ?? 'zai',
              model_chat: settings.aiModelChat ?? 'glm-4.6',
              model_planning: settings.aiModelPlanning ?? 'glm-4.6',
              model_reports: settings.aiModelReports ?? 'glm-4.6',
              fallback_model: 'glm-4.5',
              temperature: settings.aiTemperature ?? 0.7,
              max_tokens: settings.aiMaxTokens ?? 1500,
              prompt_style: 'coach',
              enabled_modules_json: settings.aiEnabledModules ?? [],
            },
            userId: profile?.id,
          },
        );
      }

      const title = type === 'briefing' ? '🌅 Morning Briefing'
        : type === 'review' ? '🌙 Evening Review'
        : type === 'task' ? '📋 Task Reminder'
        : type === 'habit' ? '✅ Habit Check-in'
        : type === 'goal' ? '🎯 Goal Reminder'
        : type === 'motivation' ? '⚡ Motivation'
        : type === 'health' ? '❤️ Health'
        : type === 'hydration' ? '💧 Hydration'
        : type === 'workout' ? '💪 Workout'
        : type === 'sleep' ? '🌙 Sleep'
        : type === 'study' ? '📚 Study'
        : '🔔 Notification';

      // Determine priority from type
      const priority: AINotification['priority'] =
        type === 'briefing' || type === 'review' ? 'high'
        : type === 'sleep' || type === 'workout' || type === 'task' ? 'high'
        : type === 'habit' || type === 'goal' || type === 'study' ? 'medium'
        : 'low';

      addAINotification({
        title,
        message: response.text,
        type,
        priority,
        scheduled_at: new Date().toISOString(),
        status: 'pending',
        ai_generated: true,
      });
    } catch (e) {
      console.warn('Notification generation failed', e);
    } finally {
      setBusy(null);
    }
  }

  const filtered = filter === 'all'
    ? notifications
    : notifications.filter((n) => n.type === filter);

  const pending = filtered.filter((n) => n.status === 'pending' || n.status === 'shown');
  const dismissed = filtered.filter((n) => n.status === 'dismissed');

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Smart Alerts</p>
        <h1 className="text-3xl font-bold tracking-tight mt-1 flex items-center gap-2">
          <Bell className="h-7 w-7 text-primary" />
          AI Notification Center
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          AI-generated, contextual notifications using your memories + today's data
        </p>
      </div>

      {/* Generate buttons */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Generate AI Notification</CardTitle>
          <CardDescription>Each is generated dynamically from your current data</CardDescription>
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
                  {isBusy
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Icon className="h-4 w-4" />}
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
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {NOTIF_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">
          {pending.length} active · {dismissed.length} dismissed
        </span>
      </div>

      {/* Notification list */}
      {pending.length === 0 && dismissed.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Bell className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-semibold">No notifications yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Generate one above, or they'll be auto-created as you use the app.
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
                return (
                  <Card key={n.id} className={cn(
                    'border-l-4',
                    n.priority === 'critical' && 'border-l-red-500',
                    n.priority === 'high' && 'border-l-orange-500',
                    n.priority === 'medium' && 'border-l-amber-500',
                    n.priority === 'low' && 'border-l-emerald-500',
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
                          </div>
                          <p className="text-sm text-foreground/90 whitespace-pre-wrap">{n.message}</p>
                          <div className="text-[10px] text-muted-foreground mt-2">
                            {formatDateLong(n.scheduled_at.slice(0, 10))} · {formatTime12(n.scheduled_at.slice(11, 16))}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <Button
                            size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-emerald-500"
                            onClick={() => updateAINotification(n.id, { status: 'completed' })}
                            title="Mark complete"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                            onClick={() => dismissAINotification(n.id)}
                            title="Dismiss"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </>
          )}

          {dismissed.length > 0 && (
            <>
              <div className="text-xs uppercase tracking-wider text-muted-foreground pt-4">Dismissed</div>
              {dismissed.slice(0, 5).map((n) => {
                const Icon = getIcon(n.type);
                return (
                  <Card key={n.id} className="opacity-50">
                    <CardContent className="p-3 flex items-center gap-3">
                      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm line-clamp-1">{n.title}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1">{n.message}</div>
                      </div>
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
