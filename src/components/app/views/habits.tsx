'use client';
import { useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import { ConfirmDeleteDialog } from '@/components/app/confirm-delete-dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ProgressRing } from '../progress-ring';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  todayISO, getLast7Days, getLast30Days, cn,
} from '@/lib/utils';
import { Plus, Flame, Trash2, CheckCircle2 } from 'lucide-react';

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

function getMissed(log: Record<string, boolean> | undefined, days = 30) {
  if (!log) return 0;
  let missed = 0;
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    if (!log[iso]) missed++;
  }
  return missed;
}

export function HabitsView() {
  const habits = useStore((s) => s.habits);
  const toggleHabit = useStore((s) => s.toggleHabit);
  const addHabit = useStore((s) => s.addHabit);
  const deleteHabit = useStore((s) => s.deleteHabit);

  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Health');
  const [newTarget, setNewTarget] = useState('daily');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const today = todayISO();
  const last7 = getLast7Days();
  const last30 = getLast30Days();

  const todayDone = habits.filter((h) => h.log[today]).length;
  const todayPct = habits.length ? Math.round((todayDone / habits.length) * 100) : 0;

  // Weekly completion percentage
  const weeklyPct = useMemo(() => {
    if (!habits.length) return 0;
    let total = 0, done = 0;
    habits.forEach((h) => {
      last7.forEach((d) => {
        total++;
        if (h.log[d]) done++;
      });
    });
    return total ? Math.round((done / total) * 100) : 0;
  }, [habits, last7]);

  // Monthly completion percentage
  const monthlyPct = useMemo(() => {
    if (!habits.length) return 0;
    let total = 0, done = 0;
    habits.forEach((h) => {
      last30.forEach((d) => {
        total++;
        if (h.log[d]) done++;
      });
    });
    return total ? Math.round((done / total) * 100) : 0;
  }, [habits, last30]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Consistency</p>
          <h1 className="text-3xl font-bold tracking-tight mt-1">Habit Tracker</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {habits.length} habits · {todayDone} done today
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> New Habit
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <ProgressRing value={todayPct} size={56} strokeWidth={6} />
            <div>
              <div className="text-xs text-muted-foreground">Today</div>
              <div className="text-xl font-bold">{todayPct}%</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <ProgressRing value={weeklyPct} size={56} strokeWidth={6} color="#f97316" />
            <div>
              <div className="text-xs text-muted-foreground">7-day</div>
              <div className="text-xl font-bold">{weeklyPct}%</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <ProgressRing value={monthlyPct} size={56} strokeWidth={6} color="#10b981" />
            <div>
              <div className="text-xs text-muted-foreground">30-day</div>
              <div className="text-xl font-bold">{monthlyPct}%</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-14 w-14 rounded-full bg-orange-500/10 flex items-center justify-center">
              <Flame className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Best streak</div>
              <div className="text-xl font-bold">
                {Math.max(0, ...habits.map((h) => getStreak(h.log)))}d
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Habit list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All Habits</CardTitle>
          <CardDescription>Tap any day to toggle · last 7 days shown</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {habits.map((h) => {
            const doneToday = !!h.log[today];
            const streak = getStreak(h.log);
            const missed = getMissed(h.log, 7);
            const wkDone = last7.filter((d) => h.log[d]).length;
            const wkPct = Math.round((wkDone / 7) * 100);
            return (
              <div
                key={h.id}
                className={cn(
                  'rounded-lg border p-3',
                  doneToday ? 'bg-emerald-500/5 border-emerald-500/30' : '',
                )}
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={doneToday}
                    onCheckedChange={() => toggleHabit(h.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{h.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-[10px]">{h.category}</Badge>
                      <span className="text-[10px] text-muted-foreground">{h.target}</span>
                      {streak > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px] text-orange-500 font-medium">
                          <Flame className="h-2.5 w-2.5" /> {streak}d streak
                        </span>
                      )}
                      {missed > 0 && (
                        <span className="text-[10px] text-red-500">
                          {missed} missed (7d)
                        </span>
                      )}
                    </div>
                  </div>
                  {/* 7-day mini grid */}
                  <div className="flex items-center gap-1">
                    {last7.map((d) => {
                      const done = !!h.log[d];
                      const isToday = d === today;
                      return (
                        <button
                          key={d}
                          onClick={() => toggleHabit(h.id, d)}
                          className={cn(
                            'h-6 w-6 rounded text-[10px] flex items-center justify-center',
                            'border transition-colors',
                            done
                              ? 'bg-emerald-500 text-white border-emerald-500'
                              : 'border-border hover:border-muted-foreground',
                            isToday && !done && 'ring-1 ring-primary',
                          )}
                          title={d}
                        >
                          {done ? <CheckCircle2 className="h-3 w-3" /> : new Date(d + 'T00:00:00').getDate()}
                        </button>
                      );
                    })}
                  </div>
                  <Progress value={wkPct} className="h-1.5 w-16 hidden md:block" />
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500"
                    onClick={() => setDeleteTarget({ id: h.id, name: h.name })}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
          {habits.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No habits yet. Add your first habit to start tracking.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add habit dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Habit</DialogTitle>
            <DialogDescription>Habits repeat daily and build streaks.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-2">
              <Label htmlFor="habit-name">Name</Label>
              <Input
                id="habit-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Read 10 pages"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="habit-cat">Category</Label>
                <Input
                  id="habit-cat"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="e.g. Health"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="habit-target">Target</Label>
                <Input
                  id="habit-target"
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                  placeholder="e.g. daily"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              disabled={!newName.trim()}
              onClick={() => {
                addHabit(newName.trim(), newCategory.trim() || 'General', newTarget.trim() || 'daily');
                setNewName(''); setNewCategory('Health'); setNewTarget('daily');
                setAddOpen(false);
              }}
            >
              Create Habit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) deleteHabit(deleteTarget.id); }}
        itemName={deleteTarget?.name ?? ''}
        itemType="habit"
      />
    </div>
  );
}
