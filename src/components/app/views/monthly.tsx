'use client';
import { useMemo } from 'react';
import { useStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  getCurrentWeekOfMonth, cn, todayISO,
} from '@/lib/utils';
import { WEEKLY_WORKOUT_SPLIT } from '@/lib/seed';
import {
  AlertTriangle, CheckCircle2, XCircle, CalendarDays, Flame, Trophy,
} from 'lucide-react';
import type { ViewKey } from '../sidebar';

interface Props {
  onNavigate: (v: ViewKey) => void;
}

export function MonthlyView({ onNavigate }: Props) {
  const weeklyThemes = useStore((s) => s.weeklyThemes);
  const habits = useStore((s) => s.habits);
  const tasks = useStore((s) => s.tasks);
  const settings = useStore((s) => s.settings);
  const today = todayISO();

  const currentWeek = getCurrentWeekOfMonth();
  const todayDate = new Date().getDate();

  // Per-day completion percentage this month (for the 31-day grid)
  const monthData = useMemo(() => {
    const arr: { day: number; pct: number; iso: string; isFuture: boolean; isToday: boolean }[] = [];
    for (let day = 1; day <= 31; day++) {
      const d = new Date();
      d.setDate(day);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isFuture = day > todayDate;
      const isToday = day === todayDate;
      const done = habits.filter((h) => h.log[iso]).length;
      const pct = habits.length ? Math.round((done / habits.length) * 100) : 0;
      arr.push({ day, pct, iso, isFuture, isToday });
    }
    return arr;
  }, [habits, todayDate]);

  // Wasted days
  const wastedDays = monthData.filter((d) => !d.isFuture && !d.isToday && d.pct < 30).length;
  const perfectDays = monthData.filter((d) => !d.isFuture && !d.isToday && d.pct >= 80).length;
  const wastedDanger = wastedDays >= settings.maxWastedDays;

  // Per-week completion
  function weekCompletion(weekStart: number, weekEnd: number) {
    const days = monthData.filter((d) => d.day >= weekStart && d.day <= weekEnd && !d.isFuture);
    if (!days.length) return 0;
    return Math.round(days.reduce((sum, d) => sum + d.pct, 0) / days.length);
  }

  // Monthly goals progress
  const monthlyGoals = tasks.filter(
    (t) => t.sectionId === 'sec-monthly' && t.status !== 'archived',
  );
  const monthlyDone = monthlyGoals.filter((t) => t.status === 'completed').length;

  // Best/worst day
  const pastDays = monthData.filter((d) => !d.isFuture && !d.isToday);
  const bestDay = pastDays.length ? pastDays.reduce((best, d) => d.pct > best.pct ? d : best, pastDays[0]) : null;
  const worstDay = pastDays.length ? pastDays.reduce((worst, d) => d.pct < worst.pct ? d : worst, pastDays[0]) : null;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">July Plan</p>
        <h1 className="text-3xl font-bold tracking-tight mt-1">
          July Plan · Month of Execution
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Build discipline · Improve health · Execute daily · Max {settings.maxWastedDays} wasted days
        </p>
      </div>

      {/* Hero stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1">Day of Month</div>
            <div className="text-2xl font-bold">{todayDate} / 31</div>
            <Progress value={(todayDate / 31) * 100} className="h-1.5 mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1">Perfect Days</div>
            <div className="text-2xl font-bold text-emerald-500 flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              {perfectDays}
            </div>
            <div className="text-xs text-muted-foreground mt-1">≥ 80% habits done</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1">Wasted Days</div>
            <div className={cn(
              'text-2xl font-bold flex items-center gap-2',
              wastedDanger ? 'text-red-500' : 'text-amber-500',
            )}>
              <XCircle className="h-5 w-5" />
              {wastedDays} / {settings.maxWastedDays}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {wastedDanger ? 'Limit reached!' : `${settings.maxWastedDays - wastedDays} remaining`}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1">Best Streak</div>
            <div className="text-2xl font-bold text-orange-500 flex items-center gap-2">
              <Flame className="h-5 w-5" />
              {(() => {
                let best = 0;
                habits.forEach((h) => {
                  let s = 0;
                  const d = new Date();
                  while (true) {
                    const iso = d.toISOString().slice(0, 10);
                    if (h.log[iso]) { s++; d.setDate(d.getDate() - 1); } else break;
                  }
                  best = Math.max(best, s);
                });
                return best;
              })()}d
            </div>
            <div className="text-xs text-muted-foreground mt-1">across all habits</div>
          </CardContent>
        </Card>
      </div>

      {/* Wasted-day warning */}
      {wastedDanger && (
        <div className="flex items-start gap-3 rounded-lg border border-red-500/40 bg-red-500/10 p-4">
          <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold text-red-700 dark:text-red-300">
              Monthly warning — wasted-day limit reached
            </div>
            <p className="text-sm text-red-700/80 dark:text-red-300/80 mt-1">
              You&apos;ve hit the {settings.maxWastedDays}-day limit. Execute every remaining day with full focus to recover the month.
            </p>
          </div>
        </div>
      )}

      {/* 31-day grid */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">July Execution Grid</CardTitle>
          <CardDescription>
            Color = habit completion · {bestDay && `Best: Day ${bestDay.day} (${bestDay.pct}%)`} · {worstDay && `Worst: Day ${worstDay.day} (${worstDay.pct}%)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 md:grid-cols-8 lg:grid-cols-10 gap-1.5">
            {monthData.map((d) => (
              <div
                key={d.day}
                className={cn(
                  'aspect-square rounded-md flex flex-col items-center justify-center text-[11px] font-medium border',
                  d.isFuture && 'opacity-30',
                  d.isToday && 'ring-2 ring-primary',
                )}
                style={{
                  background: d.isFuture
                    ? 'var(--muted)'
                    : `color-mix(in oklch, ${d.pct >= 80 ? '#10b981' : d.pct >= 50 ? '#eab308' : d.pct >= 30 ? '#f97316' : '#ef4444'} ${Math.max(10, d.pct)}%, transparent)`,
                  borderColor: d.pct >= 80 ? '#10b98140' : d.pct >= 50 ? '#eab30840' : d.pct >= 30 ? '#f9731640' : '#ef444440',
                }}
                title={`Day ${d.day}: ${d.pct}% complete`}
              >
                <span>{d.day}</span>
                {!d.isFuture && (
                  <span className="text-[9px] opacity-80">{d.pct}%</span>
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-emerald-500" /> ≥80%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-amber-500" /> 50–79%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-orange-500" /> 30–49%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-red-500" /> &lt;30% (wasted)
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 4-week themes */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          July Weekly Themes
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
          {weeklyThemes.map((w) => {
            const weekStart = (w.week - 1) * 7 + 1;
            const weekEnd = Math.min(31, w.week * 7);
            const pct = weekCompletion(weekStart, weekEnd);
            const isCurrent = w.week === currentWeek;
            const isPast = w.week < currentWeek;
            return (
              <Card
                key={w.week}
                className={cn(
                  'border-t-4',
                  isCurrent && 'ring-2 ring-primary/40',
                )}
                style={{ borderTopColor: isCurrent ? 'var(--primary)' : isPast ? '#10b981' : 'var(--border)' }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">
                      Week {w.week}
                    </div>
                    {isCurrent && <Badge className="text-[10px]">Now</Badge>}
                    {isPast && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                  </div>
                  <div className="font-bold text-sm">{w.title}</div>
                  <ul className="mt-2 space-y-1">
                    {w.focus.map((f, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                        <span className="text-primary mt-0.5">•</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Completion</span>
                      <span className="font-semibold">{pct}%</span>
                    </div>
                    <Progress value={pct} className="h-1.5 mt-1" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Monthly goals */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Monthly Goals</CardTitle>
              <CardDescription>
                {monthlyDone} of {monthlyGoals.length} goals completed
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => onNavigate('tasks')}>
              Manage tasks
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {monthlyGoals.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No monthly goals yet. Add tasks to the &quot;Monthly Plan&quot; section.
            </p>
          ) : (
            <div className="space-y-2">
              {monthlyGoals.map((t) => {
                const done = t.status === 'completed';
                return (
                  <div
                    key={t.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-md border',
                      done && 'bg-emerald-500/5 border-emerald-500/30',
                    )}
                  >
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className={cn('flex-1 text-sm font-medium', done && 'line-through text-muted-foreground')}>
                      {t.title}
                    </span>
                    {t.endDate && (
                      <Badge variant="outline" className="text-[10px]">
                        Due {t.endDate.slice(8)} {new Date(t.endDate + 'T00:00:00').toLocaleDateString(undefined, { month: 'short' })}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weekly workout split reminder */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Weekly Workout Split</CardTitle>
          <CardDescription>Auto-repeats weekly</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {WEEKLY_WORKOUT_SPLIT.map((w) => {
              const isToday = w.day === new Date().toLocaleDateString(undefined, { weekday: 'long' });
              return (
                <div
                  key={w.day}
                  className={cn(
                    'p-3 rounded-md border text-center',
                    isToday && 'bg-primary/10 border-primary/40 ring-1 ring-primary/30',
                  )}
                >
                  <div className="text-xs font-semibold uppercase">{w.day.slice(0, 3)}</div>
                  <div className="text-xs text-muted-foreground mt-1">{w.focus}</div>
                  {isToday && <Badge className="text-[9px] mt-2 w-full justify-center">Today</Badge>}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
