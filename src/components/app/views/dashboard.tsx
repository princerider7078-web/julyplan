'use client';
import { useMemo } from 'react';
import { useStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { ProgressRing } from '../progress-ring';
import { SectionIcon } from '../icon';
import {
  todayISO, formatDateLong, formatTime12, getCurrentWeekOfMonth,
  priorityStyle, completionPct, cn,
} from '@/lib/utils';
import { WEEKLY_WORKOUT_SPLIT } from '@/lib/seed';
import {
  Flame, CalendarDays, Droplet, Dumbbell, Brain, AudioLines,
  Sparkles, Wallet, AlertTriangle, ArrowRight, Sun, Moon,
} from 'lucide-react';
import type { ViewKey } from '../sidebar';

interface Props {
  onNavigate: (v: ViewKey) => void;
  onAddTask: () => void;
}

// Section → category for priority ordering on the dashboard
const DASHBOARD_PRIORITY = [
  { sectionId: 'sec-routine', subId: 'sub-night',     label: 'Sleep',     icon: Moon,     color: '#8b5cf6' },
  { sectionId: 'sec-health',  subId: 'sub-food',      label: 'Nutrition', icon: Droplet,  color: '#f97316' },
  { sectionId: 'sec-health',  subId: 'sub-body',      label: 'Workout',   icon: Dumbbell, color: '#ef4444' },
  { sectionId: 'sec-study',   subId: undefined,       label: 'Study/Work',icon: Brain,    color: '#10b981' },
  { sectionId: 'sec-health',  subId: 'sub-mind',      label: 'Mind',      icon: Brain,    color: '#a855f7' },
  { sectionId: 'sec-voice',   subId: undefined,       label: 'Voice',     icon: AudioLines, color: '#f97316' },
  { sectionId: 'sec-health',  subId: 'sub-skin',      label: 'Looks',     icon: Sparkles, color: '#ec4899' },
  { sectionId: 'sec-finance', subId: undefined,       label: 'Finance',   icon: Wallet,   color: '#22c55e' },
];

export function DashboardView({ onNavigate, onAddTask }: Props) {
  const tasks = useStore((s) => s.tasks);
  const habits = useStore((s) => s.habits);
  const routineBlocks = useStore((s) => s.routineBlocks);
  const finance = useStore((s) => s.finance);
  const weeklyThemes = useStore((s) => s.weeklyThemes);
  const settings = useStore((s) => s.settings);
  const toggleTaskComplete = useStore((s) => s.toggleTaskComplete);

  const today = todayISO();
  const todayDate = new Date();
  const weekday = todayDate.toLocaleDateString(undefined, { weekday: 'long' });
  const currentWeek = getCurrentWeekOfMonth();
  const todayWorkout = WEEKLY_WORKOUT_SPLIT.find((w) => w.day === weekday);

  // Top 3 priority tasks
  const topTasks = useMemo(() => {
    return tasks
      .filter((t) =>
        t.status !== 'archived' &&
        t.isTopPriority &&
        !t.completionLog?.[today],
      )
      .slice(0, 3);
  }, [tasks, today]);

  // Per-category completion percentage for today
  const categoryScores = DASHBOARD_PRIORITY.map((cat) => {
    const inCategory = tasks.filter(
      (t) =>
        t.sectionId === cat.sectionId &&
        (cat.subId ? t.subSectionId === cat.subId : true) &&
        t.status !== 'archived' &&
        t.repeatRule !== 'none',
    );
    const done = inCategory.filter((t) => t.completionLog?.[today]).length;
    return { ...cat, score: completionPct(done, inCategory.length), done, total: inCategory.length };
  });

  // Overall daily score
  const overallScore = categoryScores.length
    ? Math.round(categoryScores.reduce((sum, c) => sum + c.score, 0) / categoryScores.length)
    : 0;

  // Best habit streak
  function getStreak(log: Record<string, boolean> | undefined) {
    if (!log) return 0;
    let streak = 0;
    const d = new Date();
    while (true) {
      const iso = d.toISOString().slice(0, 10);
      if (log[iso]) { streak++; d.setDate(d.getDate() - 1); } else break;
    }
    return streak;
  }
  const bestStreak = Math.max(0, ...habits.map((h) => getStreak(h.log)));

  // Wasted days this month
  function getMonthWasted() {
    const day = new Date().getDate();
    let wasted = 0;
    for (let i = 1; i < day; i++) {
      const d = new Date();
      d.setDate(i);
      const iso = d.toISOString().slice(0, 10);
      const done = habits.filter((h) => h.log[iso]).length;
      const pct = habits.length ? done / habits.length : 0;
      if (pct < 0.3) wasted++;
    }
    return wasted;
  }
  const wasted = getMonthWasted();
  const wastedDanger = wasted >= settings.maxWastedDays;

  // Today's finance
  const todaySpend = finance
    .filter((f) => f.type === 'expense' && f.date === today)
    .reduce((sum, f) => sum + f.amount, 0);
  const monthSpend = finance
    .filter((f) => f.type === 'expense' && f.date.slice(0, 7) === today.slice(0, 7))
    .reduce((sum, f) => sum + f.amount, 0);

  // Next routine block
  const nowMin = todayDate.getHours() * 60 + todayDate.getMinutes();
  const nextRoutine = routineBlocks
    .filter((r) => {
      const [h, m] = r.startTime.split(':').map(Number);
      return h * 60 + m > nowMin;
    })
    .sort((a, b) => a.startTime.localeCompare(b.startTime))[0];

  // Smart warnings
  const warnings: string[] = [];
  // sleep missed yesterday?
  const yesterdayISO = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const sleepDone = habits.find((h) => h.name.toLowerCase().includes('sleep'))?.log?.[yesterdayISO];
  if (sleepDone === false) warnings.push('Sleep was missed last night — recover with a 20-min nap today.');
  // workout missed 2 days in a row
  const workoutHabit = habits.find((h) => h.name.toLowerCase().includes('workout'));
  if (workoutHabit) {
    const d1 = workoutHabit.log[yesterdayISO];
    const d2 = workoutHabit.log[new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10)];
    if (d1 === false && d2 === false) warnings.push('Workout missed 2 days in a row — highlighted in red.');
  }
  if (wastedDanger) warnings.push(`Wasted-day limit (${settings.maxWastedDays}) reached — execute today with full focus.`);

  const weekTheme = weeklyThemes.find((w) => w.week === currentWeek);

  return (
    <div className="space-y-6">
      {/* Header strip */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {formatDateLong(today)}
          </p>
          <h1 className="text-3xl font-bold tracking-tight mt-1">
            July Plan · Week {currentWeek}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build discipline · Improve health · Execute daily
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ProgressRing value={overallScore} size={88} strokeWidth={9} />
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Today&apos;s Execution</div>
            <div className="text-2xl font-bold">{overallScore}%</div>
            <div className="flex items-center gap-2 text-xs">
              <Flame className="h-3.5 w-3.5 text-orange-500" />
              <span className="font-medium">{bestStreak} day streak</span>
            </div>
          </div>
        </div>
      </div>

      {/* Smart warnings */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((w, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm"
            >
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              <span className="text-red-700 dark:text-red-300">{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Top 3 priorities */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sun className="h-4 w-4 text-amber-500" />
                Today&apos;s Top 3
              </CardTitle>
              <CardDescription>Execute these first, no excuses</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={onAddTask}>
              Add task
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {topTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No top priorities pinned for today.</p>
              <p className="text-xs mt-1">Mark tasks as &quot;Top Priority&quot; to feature them here.</p>
            </div>
          ) : (
            topTasks.map((t, idx) => {
              const ps = priorityStyle(t.priority);
              return (
                <div
                  key={t.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border',
                    'hover:bg-accent/40 transition-colors',
                  )}
                >
                  <div className={cn(
                    'h-7 w-7 shrink-0 rounded-md flex items-center justify-center text-xs font-bold',
                    ps.bg, ps.text,
                  )}>
                    {idx + 1}
                  </div>
                  <Checkbox
                    checked={!!t.completionLog?.[today]}
                    onCheckedChange={() => toggleTaskComplete(t.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{t.title}</div>
                    {t.time && (
                      <div className="text-xs text-muted-foreground">{formatTime12(t.time)}</div>
                    )}
                  </div>
                  <Badge variant="outline" className={cn(ps.bg, ps.text, 'border-0 text-xs')}>
                    {ps.label}
                  </Badge>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Priority-ordered progress grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Priority Execution
          </h2>
          <span className="text-xs text-muted-foreground">
            Ordered by importance
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {categoryScores.map((cat) => {
            const Icon = cat.icon;
            const danger = cat.score === 0 && cat.total > 0;
            return (
              <Card
                key={cat.label}
                className={cn(
                  'overflow-hidden border-l-4',
                  danger && 'bg-red-500/5',
                )}
                style={{ borderLeftColor: cat.color }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className="h-9 w-9 rounded-lg flex items-center justify-center"
                      style={{ background: `${cat.color}20` }}
                    >
                      <Icon className="h-4 w-4" style={{ color: cat.color }} />
                    </div>
                    <ProgressRing
                      value={cat.score}
                      size={44}
                      strokeWidth={5}
                      color={cat.color}
                      label={<span className="text-[11px] font-bold">{cat.score}%</span>}
                    />
                  </div>
                  <div className="text-sm font-semibold">{cat.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {cat.done} / {cat.total} done today
                  </div>
                  <Progress value={cat.score} className="h-1 mt-2" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Lower row: workout, finance, week theme, next routine */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's workout */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-red-500" />
              Today&apos;s Workout
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{weekday}</div>
            <div className="text-sm text-muted-foreground mt-1">
              {todayWorkout?.focus ?? 'Rest day'}
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="mt-3 -ml-2 text-primary"
              onClick={() => onNavigate('routine')}
            >
              View routine <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </CardContent>
        </Card>

        {/* Finance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wallet className="h-4 w-4 text-emerald-500" />
              Finance Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{todaySpend.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">
              ₹{monthSpend.toLocaleString()} this month
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="mt-3 -ml-2 text-primary"
              onClick={() => onNavigate('finance')}
            >
              Open tracker <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </CardContent>
        </Card>

        {/* Week theme */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-cyan-500" />
              Week {currentWeek} Focus
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">{weekTheme?.title ?? 'July Execution'}</div>
            <ul className="text-xs text-muted-foreground mt-1.5 space-y-0.5">
              {(weekTheme?.focus ?? []).slice(0, 3).map((f, i) => (
                <li key={i} className="truncate">• {f}</li>
              ))}
            </ul>
            <Button
              size="sm"
              variant="ghost"
              className="mt-3 -ml-2 text-primary"
              onClick={() => onNavigate('monthly')}
            >
              July overview <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </CardContent>
        </Card>

        {/* Next routine */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Moon className="h-4 w-4 text-violet-500" />
              Next Routine
            </CardTitle>
          </CardHeader>
          <CardContent>
            {nextRoutine ? (
              <>
                <div className="text-sm font-bold">{nextRoutine.title}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {formatTime12(nextRoutine.startTime)} — {formatTime12(nextRoutine.endTime)}
                </div>
                <div className="text-xs mt-2 line-clamp-2 text-muted-foreground">
                  {nextRoutine.description}
                </div>
              </>
            ) : (
              <>
                <div className="text-sm font-bold">Day complete</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Rest well — tomorrow&apos;s plan starts at 6:00 AM
                </div>
              </>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="mt-3 -ml-2 text-primary"
              onClick={() => onNavigate('routine')}
            >
              Full timeline <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Habit quick-mark */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-500" />
                Daily Habits
              </CardTitle>
              <CardDescription>Tap to mark done</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => onNavigate('habits')}>
              View all
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {habits.slice(0, 10).map((h) => {
              const done = !!h.log[today];
              const streak = getStreak(h.log);
              return (
                <div
                  key={h.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => useStore.getState().toggleHabit(h.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); useStore.getState().toggleHabit(h.id); } }}
                  className={cn(
                    'text-left p-3 rounded-lg border transition-all cursor-pointer',
                    done
                      ? 'border-emerald-500/40 bg-emerald-500/10'
                      : 'hover:bg-accent/40',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <Checkbox checked={done} />
                    {streak > 0 && (
                      <span className="flex items-center gap-0.5 text-[10px] text-orange-500">
                        <Flame className="h-2.5 w-2.5" /> {streak}
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-medium mt-2 line-clamp-2 leading-tight">
                    {h.name}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
