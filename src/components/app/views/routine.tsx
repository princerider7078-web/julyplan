'use client';
import { useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { ProgressRing } from '../progress-ring';
import { SectionIcon } from '../icon';
import {
  todayISO, formatTime12, routineStyle, cn,
} from '@/lib/utils';
import { WEEKLY_WORKOUT_SPLIT } from '@/lib/seed';
import { CheckCircle2, Circle, Clock } from 'lucide-react';

export function RoutineView() {
  const routine = useStore((s) => s.routineBlocks);
  const toggleRoutine = useStore((s) => s.toggleRoutineBlock);
  const today = todayISO();

  const sorted = useMemo(() => [...routine].sort((a, b) => {
    // sort by start time, but 00:00 (sleep) goes last since it's after midnight
    if (a.startTime === '00:00') return 1;
    if (b.startTime === '00:00') return -1;
    return a.startTime.localeCompare(b.startTime);
  }), [routine]);

  const doneCount = routine.filter((r) => r.log[today]).length;
  const pct = routine.length ? Math.round((doneCount / routine.length) * 100) : 0;

  // Current time
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const weekday = now.toLocaleDateString(undefined, { weekday: 'long' });
  const todayWorkout = WEEKLY_WORKOUT_SPLIT.find((w) => w.day === weekday);

  // Get current block
  const currentBlock = sorted.find((r) => {
    const [sh, sm] = r.startTime.split(':').map(Number);
    const [eh, em] = r.endTime.split(':').map(Number);
    const start = sh * 60 + sm;
    let end = eh * 60 + em;
    // Handle overnight (sleep block 00:00 → 06:00)
    if (end < start) end += 24 * 60;
    return nowMin >= start && nowMin < end;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Daily Timeline</p>
          <h1 className="text-3xl font-bold tracking-tight mt-1">Daily Routine</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {weekday} · Workout: <span className="font-medium">{todayWorkout?.focus}</span>
          </p>
        </div>
        <div className="flex items-center gap-4">
          <ProgressRing value={pct} size={88} strokeWidth={9} />
          <div>
            <div className="text-2xl font-bold">{doneCount}/{routine.length}</div>
            <div className="text-xs text-muted-foreground">blocks done</div>
            <div className="text-xs text-primary font-medium mt-1">
              Now: {currentBlock?.title ?? 'Free time'}
            </div>
          </div>
        </div>
      </div>

      <Progress value={pct} className="h-2" />

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[88px] top-2 bottom-2 w-px bg-border" />

        <div className="space-y-3">
          {sorted.map((r) => {
            const done = !!r.log[today];
            const rs = routineStyle(r.category);
            const isCurrent = currentBlock?.id === r.id;
            const isPast = (() => {
              const [sh, sm] = r.startTime.split(':').map(Number);
              const start = sh * 60 + sm;
              return nowMin > start && !done;
            })();
            return (
              <div key={r.id} className="relative flex items-start gap-4">
                {/* Time column */}
                <div className="w-20 shrink-0 pt-3 text-right">
                  <div className="text-xs font-semibold">{formatTime12(r.startTime)}</div>
                  <div className="text-[10px] text-muted-foreground">{formatTime12(r.endTime)}</div>
                </div>

                {/* Dot on timeline */}
                <div className="relative shrink-0 pt-3.5">
                  <div
                    className={cn(
                      'h-3 w-3 rounded-full border-2 border-background',
                      done ? 'bg-emerald-500' : isCurrent ? 'bg-primary animate-pulse-soft' : isPast ? 'bg-red-500' : 'bg-muted-foreground/40',
                    )}
                  />
                </div>

                {/* Card */}
                <Card
                  className={cn(
                    'flex-1 border-l-4',
                    rs.border,
                    isCurrent && 'ring-2 ring-primary/40',
                  )}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={done}
                        onCheckedChange={() => toggleRoutine(r.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn('font-medium text-sm', done && 'line-through text-muted-foreground')}>
                            {r.title}
                          </span>
                          <Badge variant="outline" className={cn('text-[10px] border-0', rs.chip)}>
                            {rs.label}
                          </Badge>
                          {isCurrent && (
                            <Badge variant="outline" className="text-[10px] border-primary/40 text-primary bg-primary/10">
                              Now
                            </Badge>
                          )}
                          {isPast && !done && (
                            <Badge variant="outline" className="text-[10px] border-red-500/40 text-red-500 bg-red-500/10">
                              Overdue
                            </Badge>
                          )}
                        </div>
                        {r.description && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {r.description}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {r.checklistItems.map((item, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] rounded bg-muted px-1.5 py-0.5 text-muted-foreground"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                      {done ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </div>

      {/* Daily rules summary */}
      <Card>
        <CardContent className="p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
            Daily Rules
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <div className="font-semibold">Sleep</div>
              <div className="text-xs text-muted-foreground">By 12:00 AM · 6+ hours</div>
            </div>
            <div>
              <div className="font-semibold">Water</div>
              <div className="text-xs text-muted-foreground">3–3.5L daily</div>
            </div>
            <div>
              <div className="font-semibold">Protein</div>
              <div className="text-xs text-muted-foreground">80–100g daily</div>
            </div>
            <div>
              <div className="font-semibold">Phone</div>
              <div className="text-xs text-muted-foreground">No phone before sleep</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
