'use client';
import { useMemo } from 'react';
import { useStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { ProgressRing } from '../progress-ring';
import { motion } from 'framer-motion';
import { SectionIcon } from '../icon';
import {
  todayISO, formatDateLong, formatTime12, getCurrentWeekOfMonth,
  priorityStyle, completionPct, cn,
} from '@/lib/utils';
import { WEEKLY_WORKOUT_SPLIT } from '@/lib/seed';
import {
  Flame, CalendarDays, Droplet, Dumbbell, Brain, AudioLines,
  Sparkles, Wallet, AlertTriangle, ArrowRight, Sun, Moon,
  Plus, ChevronRight, Coffee, ListChecks, TrendingUp,
} from 'lucide-react';
import type { ViewKey } from '../sidebar';

interface Props {
  onNavigate: (v: ViewKey) => void;
  onAddTask: () => void;
}

const DASHBOARD_PRIORITY = [
  { sectionId: 'sec-routine', subId: 'sub-night',     label: 'Sleep',     icon: Moon,        color: '#8b5cf6' },
  { sectionId: 'sec-health',  subId: 'sub-food',      label: 'Nutrition', icon: Droplet,     color: '#f97316' },
  { sectionId: 'sec-health',  subId: 'sub-body',      label: 'Workout',   icon: Dumbbell,    color: '#ef4444' },
  { sectionId: 'sec-study',   subId: undefined,       label: 'Study',     icon: Brain,       color: '#10b981' },
  { sectionId: 'sec-health',  subId: 'sub-mind',      label: 'Mind',      icon: Sparkles,    color: '#a855f7' },
  { sectionId: 'sec-voice',   subId: undefined,       label: 'Voice',     icon: AudioLines,  color: '#f97316' },
  { sectionId: 'sec-health',  subId: 'sub-skin',      label: 'Looks',     icon: Sparkles,    color: '#ec4899' },
  { sectionId: 'sec-finance', subId: undefined,       label: 'Finance',   icon: Wallet,      color: '#22c55e' },
];

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Late night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Winding down';
}

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

  // Missed days this month
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
  const yesterdayISO = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const sleepDone = habits.find((h) => h.name.toLowerCase().includes('sleep'))?.log?.[yesterdayISO];
  if (sleepDone === false) warnings.push('Sleep was missed last night — recover with a 20-min nap today.');
  const workoutHabit = habits.find((h) => h.name.toLowerCase().includes('workout'));
  if (workoutHabit) {
    const d1 = workoutHabit.log[yesterdayISO];
    const d2 = workoutHabit.log[new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10)];
    if (d1 === false && d2 === false) warnings.push('Workout missed 2 days in a row — recover today.');
  }
  if (wastedDanger) warnings.push(`Missed-day limit (${settings.maxWastedDays}) reached — execute today with full focus.`);

  const weekTheme = weeklyThemes.find((w) => w.week === currentWeek);
  const greeting = getGreeting();
  const dateStr = todayDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

  // Quick actions
  const QUICK_ACTIONS = [
    { label: 'Add Task', icon: Plus, color: 'var(--primary)', onClick: onAddTask },
    { label: 'AI Briefing', icon: Coffee, color: '#a855f7', onClick: () => onNavigate('briefing') },
    { label: 'Today', icon: ListChecks, color: '#10b981', onClick: () => onNavigate('today') },
    { label: 'Planner', icon: Sparkles, color: '#f59e0b', onClick: () => onNavigate('ai-planner') },
  ];

  return (
    <div className="space-y-4">
      {/* Greeting header — premium hero with progress ring */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
        className="rounded-3xl p-5 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/15"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">{dateStr}</div>
            <h1 className="text-2xl font-bold tracking-tight mt-1 leading-tight">{greeting}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Week {currentWeek} of July · {weekday}
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Today</div>
              <div className="text-2xl font-bold leading-none mt-0.5">{overallScore}%</div>
              <div className="flex items-center gap-1 text-[11px] mt-1 justify-end">
                <Flame className="h-3 w-3 text-orange-500" />
                <span className="font-semibold">{bestStreak}</span>
                <span className="text-muted-foreground">d</span>
              </div>
            </div>
            <ProgressRing
              value={overallScore}
              size={72}
              strokeWidth={7}
            />
          </div>
        </div>
      </motion.div>

      {/* Quick actions — Material 3 chip row */}
      <div className="grid grid-cols-4 gap-2">
        {QUICK_ACTIONS.map((qa, idx) => {
          const Icon = qa.icon;
          return (
            <motion.button
              key={qa.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * idx, duration: 0.3 }}
              whileTap={{ scale: 0.96 }}
              onClick={qa.onClick}
              className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-card border border-border state-layer"
            >
              <span
                className="h-10 w-10 rounded-full flex items-center justify-center"
                style={{ background: `color-mix(in oklch, ${qa.color} 15%, transparent)` }}
              >
                <Icon className="h-5 w-5" style={{ color: qa.color }} />
              </span>
              <span className="text-[11px] font-medium leading-tight text-center">{qa.label}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Smart warnings — compact dismissible chips */}
      {warnings.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-2"
        >
          {warnings.map((w, i) => (
            <div
              key={i}
              className="flex items-start gap-2.5 rounded-2xl border border-red-500/30 bg-red-500/8 p-3 text-sm"
            >
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              <span className="text-red-700 dark:text-red-300 text-[13px] leading-snug">{w}</span>
            </div>
          ))}
        </motion.div>
      )}

      {/* Top 3 priorities */}
      <Card className="rounded-3xl overflow-hidden">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-7 w-7 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center">
                <Sun className="h-4 w-4" />
              </span>
              <div>
                <div className="text-sm font-semibold">Top 3 Priorities</div>
                <div className="text-[11px] text-muted-foreground">Execute these first</div>
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={onAddTask} className="h-8 px-2.5 text-xs">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add
            </Button>
          </div>

          {topTasks.length === 0 ? (
            <div className="text-center py-6 px-3 rounded-2xl bg-muted/40 border border-dashed border-border">
              <p className="text-sm text-muted-foreground">No top priorities pinned</p>
              <p className="text-[11px] mt-1 text-muted-foreground/70">Mark tasks as "Top Priority" to feature them here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {topTasks.map((t, idx) => {
                const ps = priorityStyle(t.priority);
                return (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * idx }}
                    className={cn(
                      'flex items-center gap-3 p-2.5 rounded-2xl border',
                      'transition-colors state-layer',
                    )}
                  >
                    <div className={cn(
                      'h-7 w-7 shrink-0 rounded-lg flex items-center justify-center text-xs font-bold',
                      ps.bg, ps.text,
                    )}>
                      {idx + 1}
                    </div>
                    <Checkbox
                      checked={!!t.completionLog?.[today]}
                      onCheckedChange={() => toggleTaskComplete(t.id)}
                      className="shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className={cn(
                        'font-medium text-sm truncate',
                        !!t.completionLog?.[today] && 'line-through text-muted-foreground',
                      )}>
                        {t.title}
                      </div>
                      {t.time && (
                        <div className="text-[11px] text-muted-foreground mt-0.5">{formatTime12(t.time)}</div>
                      )}
                    </div>
                    <Badge variant="outline" className={cn(ps.bg, ps.text, 'border-0 text-[10px] px-2')}>
                      {ps.label}
                    </Badge>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category progress — compact grid (2 cols on mobile) */}
      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <h2 className="text-[11px] uppercase tracking-widest text-muted-foreground/70 font-semibold">
            Daily Execution
          </h2>
          <span className="text-[11px] text-muted-foreground">{overallScore}% overall</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {categoryScores.slice(0, 6).map((cat, idx) => {
            const Icon = cat.icon;
            const danger = cat.score === 0 && cat.total > 0;
            return (
              <motion.div
                key={cat.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 * idx }}
              >
                <Card className={cn(
                  'rounded-2xl border-l-4 overflow-hidden',
                  danger && 'bg-red-500/5',
                )} style={{ borderLeftColor: cat.color }}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div
                        className="h-8 w-8 rounded-lg flex items-center justify-center"
                        style={{ background: `color-mix(in oklch, ${cat.color} 18%, transparent)` }}
                      >
                        <Icon className="h-4 w-4" style={{ color: cat.color }} />
                      </div>
                      <ProgressRing
                        value={cat.score}
                        size={36}
                        strokeWidth={4}
                        color={cat.color}
                        label={<span className="text-[10px] font-bold">{cat.score}%</span>}
                      />
                    </div>
                    <div className="text-xs font-semibold">{cat.label}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {cat.done} of {cat.total} done
                    </div>
                    <Progress value={cat.score} className="h-1 mt-1.5" />
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Two-up info cards: Workout + Finance */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="rounded-2xl">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="h-7 w-7 rounded-lg bg-red-500/15 text-red-500 flex items-center justify-center">
                <Dumbbell className="h-4 w-4" />
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
            </div>
            <button onClick={() => onNavigate('routine')} className="text-left w-full">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Workout</div>
              <div className="text-sm font-bold mt-0.5">{weekday}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                {todayWorkout?.focus ?? 'Rest day'}
              </div>
            </button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="h-7 w-7 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
                <Wallet className="h-4 w-4" />
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
            </div>
            <button onClick={() => onNavigate('finance')} className="text-left w-full">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Today's Spend</div>
              <div className="text-sm font-bold mt-0.5">₹{todaySpend.toLocaleString()}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                ₹{monthSpend.toLocaleString()} this month
              </div>
            </button>
          </CardContent>
        </Card>
      </div>

      {/* Week theme + next routine */}
      <div className="grid grid-cols-1 gap-3">
        <Card className="rounded-2xl">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="h-7 w-7 rounded-lg bg-cyan-500/15 text-cyan-500 flex items-center justify-center">
                  <CalendarDays className="h-4 w-4" />
                </span>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Week {currentWeek} Focus</div>
                  <div className="text-sm font-bold mt-0.5">{weekTheme?.title ?? 'July Execution'}</div>
                </div>
              </div>
              <button
                onClick={() => onNavigate('monthly')}
                className="text-[11px] text-primary font-semibold flex items-center"
              >
                View <ArrowRight className="h-3 w-3 ml-0.5" />
              </button>
            </div>
            {(weekTheme?.focus ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {(weekTheme?.focus ?? []).slice(0, 3).map((f, i) => (
                  <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                    {f}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="h-7 w-7 rounded-lg bg-violet-500/15 text-violet-500 flex items-center justify-center">
                  <Moon className="h-4 w-4" />
                </span>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Next Routine</div>
                  {nextRoutine ? (
                    <>
                      <div className="text-sm font-bold mt-0.5">{nextRoutine.title}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {formatTime12(nextRoutine.startTime)} → {formatTime12(nextRoutine.endTime)}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-sm font-bold mt-0.5">Day complete</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">Rest well — tomorrow starts at 6 AM</div>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={() => onNavigate('routine')}
                className="text-[11px] text-primary font-semibold flex items-center"
              >
                View <ArrowRight className="h-3 w-3 ml-0.5" />
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Habit quick-mark */}
      <Card className="rounded-2xl">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-7 w-7 rounded-lg bg-orange-500/15 text-orange-500 flex items-center justify-center">
                <Flame className="h-4 w-4" />
              </span>
              <div>
                <div className="text-sm font-semibold">Daily Habits</div>
                <div className="text-[11px] text-muted-foreground">Tap to mark done</div>
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => onNavigate('habits')} className="h-8 px-2.5 text-xs">
              View all
            </Button>
          </div>

          {habits.length === 0 ? (
            <div className="text-center py-6 px-3 rounded-2xl bg-muted/40 border border-dashed border-border">
              <p className="text-sm text-muted-foreground">No habits yet</p>
              <p className="text-[11px] mt-1 text-muted-foreground/70">Build your first habit to start a streak</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {habits.slice(0, 6).map((h, idx) => {
                const done = !!h.log[today];
                const streak = getStreak(h.log);
                return (
                  <motion.div
                    key={h.id}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.03 * idx }}
                    whileTap={{ scale: 0.96 }}
                    role="button"
                    tabIndex={0}
                    onClick={() => useStore.getState().toggleHabit(h.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); useStore.getState().toggleHabit(h.id); } }}
                    className={cn(
                      'text-left p-3 rounded-2xl border transition-all cursor-pointer',
                      done
                        ? 'border-emerald-500/40 bg-emerald-500/10'
                        : 'border-border hover:bg-accent/40',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <Checkbox checked={done} className="pointer-events-none" />
                      {streak > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px] text-orange-500 font-semibold">
                          <Flame className="h-2.5 w-2.5" /> {streak}
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-medium mt-2 line-clamp-2 leading-tight">
                      {h.name}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI insight teaser */}
      <motion.button
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onNavigate('briefing')}
        className="w-full rounded-2xl p-4 bg-gradient-to-br from-violet-500/10 via-primary/5 to-transparent border border-violet-500/20 text-left flex items-center gap-3"
      >
        <span className="h-10 w-10 rounded-xl bg-violet-500/15 text-violet-500 flex items-center justify-center shrink-0">
          <TrendingUp className="h-5 w-5" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">Get your AI briefing</div>
          <div className="text-[11px] text-muted-foreground">Daily insight based on your patterns</div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
      </motion.button>
    </div>
  );
}
