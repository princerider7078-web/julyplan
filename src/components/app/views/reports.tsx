'use client';
import { useMemo } from 'react';
import { useStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  todayISO, getLast7Days, getLast30Days,
} from '@/lib/utils';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, RadialBarChart, RadialBar,
  Legend,
} from 'recharts';
import { TrendingUp, Award, Activity, Moon } from 'lucide-react';

export function ReportsView() {
  const tasks = useStore((s) => s.tasks);
  const habits = useStore((s) => s.habits);
  const routine = useStore((s) => s.routineBlocks);
  const finance = useStore((s) => s.finance);

  const today = todayISO();
  const last7 = getLast7Days();
  const last30 = getLast30Days();

  // ---------- Weekly report ----------
  const weeklyData = useMemo(() => {
    return last7.map((iso) => {
      const d = new Date(iso + 'T00:00:00');
      const label = d.toLocaleDateString(undefined, { weekday: 'short' });

      // habits completed
      const habitDone = habits.filter((h) => h.log[iso]).length;
      const habitPct = habits.length ? Math.round((habitDone / habits.length) * 100) : 0;

      // routine blocks completed
      const routineDone = routine.filter((r) => r.log[iso]).length;

      // tasks completed that day
      const tasksDone = tasks.filter((t) => t.completionLog?.[iso]).length;

      // workout done (special: routine block #2 is Home Workout)
      const workoutDone = routine.find((r) => r.id === 'r2')?.log?.[iso] ? 1 : 0;

      // voice done
      const voiceDone = routine.find((r) => r.id === 'r6')?.log?.[iso] ? 1 : 0;

      // finance spend that day
      const spend = finance
        .filter((f) => f.type === 'expense' && f.date === iso)
        .reduce((sum, f) => sum + f.amount, 0);

      return {
        label,
        iso,
        habitPct,
        routineDone,
        tasksDone,
        workoutDone,
        voiceDone,
        spend,
      };
    });
  }, [last7, habits, routine, tasks, finance]);

  // ---------- Monthly report ----------
  const monthlyData = useMemo(() => {
    return last30.map((iso) => {
      const d = new Date(iso + 'T00:00:00');
      const label = `${d.getDate()}`;
      const habitDone = habits.filter((h) => h.log[iso]).length;
      const habitPct = habits.length ? Math.round((habitDone / habits.length) * 100) : 0;
      return { label, iso, habitPct };
    });
  }, [last30, habits]);

  // ---------- Category breakdown (today) ----------
  const categoryData = useMemo(() => {
    const categories = [
      { name: 'Health', sections: ['sec-health'] },
      { name: 'Voice', sections: ['sec-voice'] },
      { name: 'Study', sections: ['sec-study'] },
      { name: 'Routine', sections: ['sec-routine'] },
      { name: 'Finance', sections: ['sec-finance'] },
      { name: 'Growth', sections: ['sec-growth'] },
    ];
    return categories.map((c) => {
      const inCat = tasks.filter(
        (t) => c.sections.includes(t.sectionId) && t.status !== 'archived' && t.repeatRule !== 'none',
      );
      const done = inCat.filter((t) => t.completionLog?.[today]).length;
      const pct = inCat.length ? Math.round((done / inCat.length) * 100) : 0;
      return { name: c.name, value: pct, fill: pct >= 80 ? '#10b981' : pct >= 50 ? '#eab308' : pct >= 30 ? '#f97316' : '#ef4444' };
    });
  }, [tasks, today]);

  // ---------- Aggregates ----------
  const totalTasksCompleted = tasks.filter((t) => t.status === 'completed').length;
  const totalRoutineDone7 = weeklyData.reduce((s, d) => s + d.routineDone, 0);
  const totalWorkouts7 = weeklyData.reduce((s, d) => s + d.workoutDone, 0);
  const totalVoice7 = weeklyData.reduce((s, d) => s + d.voiceDone, 0);
  const waterConsistency7 = (() => {
    // % of last 7 days where "3L+ water" habit was done
    const waterHabit = habits.find((h) => h.name.toLowerCase().includes('water'));
    if (!waterHabit) return 0;
    const done = last7.filter((d) => waterHabit.log[d]).length;
    return Math.round((done / 7) * 100);
  })();
  const sleepConsistency7 = (() => {
    const sleepHabit = habits.find((h) => h.name.toLowerCase().includes('sleep'));
    if (!sleepHabit) return 0;
    const done = last7.filter((d) => sleepHabit.log[d]).length;
    return Math.round((done / 7) * 100);
  })();

  // Best & worst day
  const past30 = monthlyData.filter((d) => d.iso !== today);
  const bestDay = past30.length
    ? past30.reduce((b, d) => d.habitPct > b.habitPct ? d : b, past30[0])
    : null;
  const worstDay = past30.length
    ? past30.reduce((w, d) => d.habitPct < w.habitPct ? d : w, past30[0])
    : null;

  // Monthly completion %
  const monthAvg = past30.length
    ? Math.round(past30.reduce((s, d) => s + d.habitPct, 0) / past30.length)
    : 0;

  // Missed days
  const wastedDays = past30.filter((d) => d.habitPct < 30).length;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Analytics</p>
        <h1 className="text-3xl font-bold tracking-tight mt-1">Reports & Progress</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Weekly & monthly view of your execution
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Award className="h-3.5 w-3.5" /> Monthly Avg
            </div>
            <div className="text-2xl font-bold">{monthAvg}%</div>
            <div className="text-xs text-muted-foreground mt-1">last 30 days</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Activity className="h-3.5 w-3.5" /> Workouts (7d)
            </div>
            <div className="text-2xl font-bold text-red-500">{totalWorkouts7}</div>
            <div className="text-xs text-muted-foreground mt-1">{totalVoice7} voice sessions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <TrendingUp className="h-3.5 w-3.5" /> Water Consistency
            </div>
            <div className="text-2xl font-bold text-cyan-500">{waterConsistency7}%</div>
            <Progress value={waterConsistency7} className="h-1.5 mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Moon className="h-3.5 w-3.5" /> Sleep Consistency
            </div>
            <div className="text-2xl font-bold text-violet-500">{sleepConsistency7}%</div>
            <Progress value={sleepConsistency7} className="h-1.5 mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Weekly habit line chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Weekly Habit Completion</CardTitle>
          <CardDescription>Daily habit completion % over the last 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="habitPct"
                  name="Habit %"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  dot={{ fill: 'var(--primary)', r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Weekly bar chart - routine/tasks */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Weekly Activity Breakdown</CardTitle>
          <CardDescription>Routine blocks, tasks completed, and spend per day</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="routineDone" name="Routine blocks" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="tasksDone" name="Tasks done" fill="#f97316" radius={[4, 4, 0, 0]} />
                <Bar dataKey="spend" name="Spend ₹" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Today category breakdown */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Today&apos;s Category Score</CardTitle>
            <CardDescription>Per-section completion today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  innerRadius="30%"
                  outerRadius="100%"
                  data={categoryData}
                  startAngle={90}
                  endAngle={-270}
                >
                  <RadialBar background dataKey="value" cornerRadius={6} />
                  <Legend
                    iconSize={10}
                    layout="vertical"
                    verticalAlign="middle"
                    align="right"
                    wrapperStyle={{ fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Monthly Highlights</CardTitle>
            <CardDescription>Best & worst days, total stats</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-md bg-emerald-500/10 border border-emerald-500/30">
              <div>
                <div className="text-xs text-muted-foreground">Best Day</div>
                <div className="font-semibold text-sm">
                  Day {bestDay?.label} · {bestDay?.habitPct}%
                </div>
              </div>
              <Award className="h-5 w-5 text-emerald-500" />
            </div>
            <div className="flex items-center justify-between p-3 rounded-md bg-red-500/10 border border-red-500/30">
              <div>
                <div className="text-xs text-muted-foreground">Worst Day</div>
                <div className="font-semibold text-sm">
                  Day {worstDay?.label} · {worstDay?.habitPct}%
                </div>
              </div>
              <TrendingUp className="h-5 w-5 text-red-500 rotate-180" />
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <div className="p-2 rounded-md bg-muted/50">
                <div className="text-xs text-muted-foreground">Tasks Completed (all-time)</div>
                <div className="text-lg font-bold">{totalTasksCompleted}</div>
              </div>
              <div className="p-2 rounded-md bg-muted/50">
                <div className="text-xs text-muted-foreground">Routine Blocks (7d)</div>
                <div className="text-lg font-bold">{totalRoutineDone7}</div>
              </div>
              <div className="p-2 rounded-md bg-muted/50">
                <div className="text-xs text-muted-foreground">Missed Days (30d)</div>
                <div className="text-lg font-bold text-red-500">{wastedDays}</div>
              </div>
              <div className="p-2 rounded-md bg-muted/50">
                <div className="text-xs text-muted-foreground">Monthly Avg</div>
                <div className="text-lg font-bold">{monthAvg}%</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
