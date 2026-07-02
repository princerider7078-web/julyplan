'use client';
import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { refreshLearningProfile } from '@/lib/ai/learning-engine';
import { testFireTaskNotification, getUpcomingTaskCount } from '@/lib/ai/notification-scheduler';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Bell, Moon, Volume2, Brain, Clock, Layers, TrendingUp, Zap, AlarmClock, Play,
} from 'lucide-react';
import type { NotificationCategory, NotificationTone } from '@/lib/types';
import { cn, todayISO } from '@/lib/utils';

const TONES: { value: NotificationTone; label: string; example: string }[] = [
  { value: 'professional', label: 'Professional', example: '"Coding starts in 15 min. → Suggested based on your 9-11 PM productivity."' },
  { value: 'friendly', label: 'Friendly', example: '"Coding starts soon! 😊 (You usually finish faster at night.)"' },
  { value: 'motivational', label: 'Motivational', example: '"Coding time — you\'ve got this! 💪 Your night sessions are productive."' },
  { value: 'minimal', label: 'Minimal', example: '"Coding in 15 min."' },
  { value: 'strict', label: 'Strict', example: '"Coding now. ⚠ No more delays. Suggested based on your night productivity."' },
];

const CATEGORIES: { value: NotificationCategory; label: string }[] = [
  { value: 'task', label: 'Tasks' },
  { value: 'habit', label: 'Habits' },
  { value: 'health', label: 'Health' },
  { value: 'work', label: 'Work' },
  { value: 'study', label: 'Study' },
  { value: 'finance', label: 'Finance' },
  { value: 'goal_progress', label: 'Goal Progress' },
  { value: 'ai_insights', label: 'AI Insights' },
  { value: 'deadlines', label: 'Deadlines' },
  { value: 'personal', label: 'Personal' },
  { value: 'achievements', label: 'Achievements' },
  { value: 'weekly_reports', label: 'Weekly Reports' },
];

export function NotificationPreferencesView() {
  const prefs = useStore((s) => s.notificationPreferences);
  const learning = useStore((s) => s.learningProfile);
  const updatePrefs = useStore((s) => s.updateNotificationPreferences);

  // Refresh learning profile on mount
  useEffect(() => {
    refreshLearningProfile();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Smart Alerts</p>
        <h1 className="text-3xl font-bold tracking-tight mt-1 flex items-center gap-2">
          <Bell className="h-7 w-7 text-primary" />
          Notification Preferences
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          The AI adapts to your behavior — tone, timing, and frequency tune themselves over time.
        </p>
      </div>

      {/* Auto Task Notifications (V4.1) */}
      <AutoTaskNotificationsCard />

      {/* Tone */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-primary" />
            Notification Tone
          </CardTitle>
          <CardDescription>AI adapts wording to your preferred style</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {TONES.map((t) => (
            <button
              key={t.value}
              onClick={() => updatePrefs({ tone: t.value })}
              className={cn(
                'w-full text-left p-3 rounded-lg border-2 transition-colors',
                prefs.tone === t.value ? 'border-primary bg-primary/10' : 'hover:bg-accent/40',
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm">{t.label}</span>
                {prefs.tone === t.value && <Badge className="text-[10px]">Active</Badge>}
              </div>
              <p className="text-xs text-muted-foreground italic">{t.example}</p>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Moon className="h-4 w-4 text-violet-500" />
                Quiet Hours
              </CardTitle>
              <CardDescription>Non-critical notifications delayed to morning summary</CardDescription>
            </div>
            <Switch
              checked={prefs.quiet_hours_enabled}
              onCheckedChange={(v) => updatePrefs({ quiet_hours_enabled: v })}
            />
          </div>
        </CardHeader>
        {prefs.quiet_hours_enabled && (
          <CardContent className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="quiet-start">Start</Label>
              <Input
                id="quiet-start"
                type="time"
                value={prefs.quiet_hours_start}
                onChange={(e) => updatePrefs({ quiet_hours_start: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="quiet-end">End</Label>
              <Input
                id="quiet-end"
                type="time"
                value={prefs.quiet_hours_end}
                onChange={(e) => updatePrefs({ quiet_hours_end: e.target.value })}
              />
            </div>
            <div className="col-span-2 flex items-center justify-between rounded-md border p-2">
              <Label htmlFor="critical-bypass" className="text-xs cursor-pointer">
                Critical alerts bypass quiet hours
              </Label>
              <Switch
                id="critical-bypass"
                checked={prefs.critical_bypass_quiet}
                onCheckedChange={(v) => updatePrefs({ critical_bypass_quiet: v })}
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Categories */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4 text-cyan-500" />
            Category Toggles
          </CardTitle>
          <CardDescription>Enable/disable each notification type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {CATEGORIES.map((c) => (
              <div key={c.value} className="flex items-center justify-between p-2 rounded-md border">
                <span className="text-sm">{c.label}</span>
                <Switch
                  checked={prefs.categories[c.value] ?? true}
                  onCheckedChange={(v) =>
                    updatePrefs({
                      categories: { ...prefs.categories, [c.value]: v },
                    })
                  }
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Smart Batching */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="h-4 w-4 text-emerald-500" />
                Smart Batching
              </CardTitle>
              <CardDescription>Group multiple notifications into one alert</CardDescription>
            </div>
            <Switch
              checked={prefs.batching_enabled}
              onCheckedChange={(v) => updatePrefs({ batching_enabled: v })}
            />
          </div>
        </CardHeader>
        {prefs.batching_enabled && (
          <CardContent className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Batch window (minutes)</Label>
              <Input
                type="number"
                min={5}
                max={60}
                value={prefs.batching_window_minutes}
                onChange={(e) =>
                  updatePrefs({ batching_window_minutes: parseInt(e.target.value || '15', 10) })
                }
              />
            </div>
            <div className="text-xs text-muted-foreground self-end">
              Notifications within {prefs.batching_window_minutes} min get combined into one alert.
            </div>
          </CardContent>
        )}
      </Card>

      {/* Escalation */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-orange-500" />
                Escalation System
              </CardTitle>
              <CardDescription>
                Reminder → gentle → motivational → reschedule → recovery queue
              </CardDescription>
            </div>
            <Switch
              checked={prefs.escalation_enabled}
              onCheckedChange={(v) => updatePrefs({ escalation_enabled: v })}
            />
          </div>
        </CardHeader>
        {prefs.escalation_enabled && (
          <CardContent className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Delay between levels (minutes)</Label>
              <Input
                type="number"
                min={5}
                max={120}
                value={prefs.escalation_delay_minutes}
                onChange={(e) =>
                  updatePrefs({ escalation_delay_minutes: parseInt(e.target.value || '10', 10) })
                }
              />
            </div>
            <div className="text-xs text-muted-foreground self-end">
              Level 4 → task moves to Recovery Queue automatically.
            </div>
          </CardContent>
        )}
      </Card>

      {/* AI Learning Profile */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-4 w-4 text-violet-500" />
                AI Learning Profile
              </CardTitle>
              <CardDescription>The AI learns from your behavior</CardDescription>
            </div>
            <Switch
              checked={prefs.learning_enabled}
              onCheckedChange={(v) => updatePrefs({ learning_enabled: v })}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="p-2 rounded-md bg-muted/50">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> Avg snooze
              </div>
              <div className="text-lg font-bold">{learning.avg_snooze_minutes} min</div>
              <div className="text-[10px] text-muted-foreground">{learning.snooze_count_total} snoozes tracked</div>
            </div>
            <div className="p-2 rounded-md bg-muted/50">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Task completion
              </div>
              <div className="text-lg font-bold">{Math.round(learning.task_completion_rate * 100)}%</div>
              <div className="text-[10px] text-muted-foreground">last 7 days</div>
            </div>
            <div className="p-2 rounded-md bg-muted/50">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Habit completion
              </div>
              <div className="text-lg font-bold">{Math.round(learning.habit_completion_rate * 100)}%</div>
              <div className="text-[10px] text-muted-foreground">last 7 days</div>
            </div>
            <div className="p-2 rounded-md bg-muted/50">
              <div className="text-xs text-muted-foreground">Active hours</div>
              <div className="text-sm font-bold">
                {learning.no_response_before_hour}:00 – {learning.no_response_after_hour}:00
              </div>
            </div>
            <div className="p-2 rounded-md bg-muted/50">
              <div className="text-xs text-muted-foreground">Notification response</div>
              <div className="text-lg font-bold">{Math.round(learning.notification_response_rate * 100)}%</div>
            </div>
            <div className="p-2 rounded-md bg-muted/50">
              <div className="text-xs text-muted-foreground">Habits at risk</div>
              <div className="text-lg font-bold">{learning.habits_at_risk.length}</div>
              <div className="text-[10px] text-muted-foreground">streaks ≥ 3 missed today</div>
            </div>
          </div>

          {learning.productive_hours.length > 0 && (
            <div className="p-2 rounded-md bg-muted/50">
              <div className="text-xs text-muted-foreground mb-1">Most productive hours</div>
              <div className="flex flex-wrap gap-1">
                {learning.productive_hours.map((h) => (
                  <Badge key={h} variant="outline" className="text-[10px]">{h}:00</Badge>
                ))}
              </div>
            </div>
          )}

          {learning.most_postponed_category && (
            <div className="p-2 rounded-md bg-amber-500/10 border border-amber-500/30">
              <div className="text-xs text-amber-700 dark:text-amber-400">
                ⚠ Most postponed: <span className="font-semibold">{learning.most_postponed_category}</span> — AI may suggest splitting these tasks.
              </div>
            </div>
          )}

          <Button variant="outline" size="sm" onClick={() => refreshLearningProfile()}>
            <Brain className="h-3.5 w-3.5 mr-1" /> Recompute Now
          </Button>
        </CardContent>
      </Card>

      {/* Default snooze */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            Default Snooze Duration
          </CardTitle>
          <CardDescription>
            Auto-adjusts based on your snooze patterns. Currently: {prefs.default_snooze_minutes} min
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            type="range"
            min={5}
            max={60}
            step={5}
            value={prefs.default_snooze_minutes}
            onChange={(e) => updatePrefs({ default_snooze_minutes: parseInt(e.target.value, 10) })}
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>5 min</span><span>30 min</span><span>60 min</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── V4.1: Auto Task Notifications card ───
function AutoTaskNotificationsCard() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const tasks = useStore((s) => s.tasks);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testBusy, setTestBusy] = useState(false);

  const today = todayISO();
  // Tasks with a time today (not completed)
  const todaysTimedTasks = tasks.filter(
    (t) => t.status !== 'archived' && t.time && !t.completionLog?.[today]
      && (t.repeatRule !== 'none' || t.startDate === today),
  );
  const upcomingCount = getUpcomingTaskCount();

  async function handleTestFire() {
    // Find a task with a time today to test with
    const task = todaysTimedTasks[0];
    if (!task) {
      setTestResult('No timed tasks today. Add a task with a time first.');
      return;
    }
    setTestBusy(true);
    try {
      const result = testFireTaskNotification(task.id);
      setTestResult(result.message);
    } finally {
      setTestBusy(false);
    }
  }

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <AlarmClock className="h-4 w-4 text-primary" />
              Auto Task Notifications
            </CardTitle>
            <CardDescription>
              Fire notifications automatically when task time arrives (scans every 30s)
            </CardDescription>
          </div>
          <Switch
            checked={settings.autoTaskNotifications ?? true}
            onCheckedChange={(v) => updateSettings({ autoTaskNotifications: v })}
          />
        </div>
      </CardHeader>
      {settings.autoTaskNotifications !== false && (
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Fire N minutes before task time</Label>
              <Input
                type="number"
                min={0}
                max={60}
                value={settings.taskNotificationLeadMinutes ?? 0}
                onChange={(e) => updateSettings({ taskNotificationLeadMinutes: parseInt(e.target.value || '0', 10) })}
              />
              <p className="text-[10px] text-muted-foreground">
                0 = fire exactly at task time. 15 = fire 15 min early.
              </p>
            </div>
            <div className="space-y-2">
              <div className="p-2 rounded-md bg-muted/50">
                <div className="text-xs text-muted-foreground">Today's timed tasks</div>
                <div className="text-lg font-bold">{todaysTimedTasks.length}</div>
              </div>
              <div className="p-2 rounded-md bg-muted/50">
                <div className="text-xs text-muted-foreground">Firing in next hour</div>
                <div className="text-lg font-bold">{upcomingCount}</div>
              </div>
            </div>
          </div>

          {/* Browser permission status */}
          <div className="flex items-center justify-between p-2 rounded-md border">
            <div>
              <div className="text-sm font-medium">Browser notification permission</div>
              <p className="text-[10px] text-muted-foreground">
                Required for system pop-ups. In-app notifications work regardless.
              </p>
            </div>
            <Badge variant="outline" className={
              typeof Notification !== 'undefined' && Notification.permission === 'granted'
                ? 'text-emerald-500 border-emerald-500/40'
                : 'text-amber-500 border-amber-500/40'
            }>
              {typeof Notification !== 'undefined' && Notification.permission === 'granted' ? 'Granted' : 'Not granted'}
            </Badge>
          </div>

          {/* Test button */}
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleTestFire} disabled={testBusy}>
              <Play className="h-3.5 w-3.5 mr-1" />
              {testBusy ? 'Firing...' : 'Test fire now'}
            </Button>
            <span className="text-xs text-muted-foreground">
              Fires a test notification for your first timed task today.
            </span>
          </div>
          {testResult && (
            <div className="text-xs p-2 rounded-md bg-primary/5 border border-primary/20">
              {testResult}
            </div>
          )}

          <div className="text-[10px] text-muted-foreground italic">
            ℹ️ Notifications fire automatically when task time arrives. To test immediately, click "Test fire now" or add a task with a time 2 minutes from now.
          </div>
        </CardContent>
      )}
    </Card>
  );
}
