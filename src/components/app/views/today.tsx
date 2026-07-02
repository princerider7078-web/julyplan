'use client';
import { useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ProgressRing } from '../progress-ring';
import { SectionIcon } from '../icon';
import {
  todayISO, formatTime12, priorityStyle, PRIORITY_RANK, cn,
} from '@/lib/utils';
import { Plus, CheckCircle2, Circle, Clock } from 'lucide-react';

interface Props {
  onAddTask: () => void;
}

export function TodayView({ onAddTask }: Props) {
  const tasks = useStore((s) => s.tasks);
  const sections = useStore((s) => s.sections);
  const toggleTaskComplete = useStore((s) => s.toggleTaskComplete);
  const toggleChecklistItem = useStore((s) => s.toggleChecklistItem);
  const [expanded, setExpanded] = useState<string | null>(null);

  const today = todayISO();

  // Today's active tasks — recurring + one-time for today
  const todayTasks = useMemo(() => {
    return tasks
      .filter((t) => t.status !== 'archived')
      .filter((t) => {
        // recurring tasks always show today
        if (t.repeatRule !== 'none') return true;
        // one-time tasks: show if start date is today or earlier and not completed
        if (t.completionLog?.[today]) return false;
        return t.startDate <= today && (!t.endDate || t.endDate >= today);
      })
      .sort((a, b) => {
        // top priority first
        if (a.isTopPriority !== b.isTopPriority) return a.isTopPriority ? -1 : 1;
        // priority rank
        const pr = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
        if (pr !== 0) return pr;
        // time
        if (a.time && b.time) return a.time.localeCompare(b.time);
        if (a.time) return -1;
        if (b.time) return 1;
        return 0;
      });
  }, [tasks, today]);

  const doneCount = todayTasks.filter((t) => t.completionLog?.[today]).length;
  const pct = todayTasks.length ? Math.round((doneCount / todayTasks.length) * 100) : 0;

  // Group by section
  const bySection = useMemo(() => {
    const map = new Map<string, typeof todayTasks>();
    todayTasks.forEach((t) => {
      const arr = map.get(t.sectionId) ?? [];
      arr.push(t);
      map.set(t.sectionId, arr);
    });
    return sections
      .map((s) => ({ section: s, tasks: map.get(s.id) ?? [] }))
      .filter((x) => x.tasks.length > 0);
  }, [todayTasks, sections]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Today</p>
          <h1 className="text-3xl font-bold tracking-tight mt-1">Today&apos;s Plan</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Priority-ordered. Execute top-down.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <ProgressRing value={pct} size={88} strokeWidth={9} />
          <div>
            <div className="text-2xl font-bold">{doneCount}/{todayTasks.length}</div>
            <div className="text-xs text-muted-foreground">tasks complete</div>
            <Button size="sm" onClick={onAddTask} className="mt-2">
              <Plus className="h-4 w-4 mr-1" /> Add task
            </Button>
          </div>
        </div>
      </div>

      <Progress value={pct} className="h-2" />

      {todayTasks.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold">All clear</h3>
            <p className="text-sm text-muted-foreground mt-1">
              No tasks scheduled for today. Add one to get started.
            </p>
            <Button onClick={onAddTask} className="mt-4">
              <Plus className="h-4 w-4 mr-1" /> Add task
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {bySection.map(({ section, tasks: sectionTasks }) => {
            const sDone = sectionTasks.filter((t) => t.completionLog?.[today]).length;
            const sPct = Math.round((sDone / sectionTasks.length) * 100);
            return (
              <Card key={section.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <SectionIcon
                        name={section.icon}
                        className="h-4 w-4"
                        style={{ color: section.color }}
                      />
                      {section.name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {sDone}/{sectionTasks.length}
                      </span>
                      <Progress value={sPct} className="h-1.5 w-20" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {sectionTasks.map((t) => {
                    const done = !!t.completionLog?.[today];
                    const ps = priorityStyle(t.priority);
                    const isExpanded = expanded === t.id;
                    const hasChecklist = t.checklistItems.length > 0;
                    const clDone = t.checklistItems.filter((c) => c.done).length;
                    return (
                      <div
                        key={t.id}
                        className={cn(
                          'rounded-lg border transition-all',
                          done ? 'bg-emerald-500/5 border-emerald-500/30' : 'hover:bg-accent/30',
                        )}
                      >
                        <div className="flex items-start gap-3 p-3">
                          <Checkbox
                            checked={done}
                            onCheckedChange={() => toggleTaskComplete(t.id)}
                            className="mt-0.5"
                          />
                          <div
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={() => hasChecklist && setExpanded(isExpanded ? null : t.id)}
                          >
                            <div className={cn(
                              'font-medium text-sm',
                              done && 'line-through text-muted-foreground',
                            )}>
                              {t.title}
                            </div>
                            {t.description && (
                              <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                {t.description}
                              </div>
                            )}
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              {t.time && (
                                <Badge variant="outline" className="text-[10px] font-normal">
                                  <Clock className="h-2.5 w-2.5 mr-1" />
                                  {formatTime12(t.time)}
                                </Badge>
                              )}
                              <Badge variant="outline" className={cn('text-[10px] border-0', ps.bg, ps.text)}>
                                {ps.label}
                              </Badge>
                              {t.isTopPriority && (
                                <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10">
                                  Top priority
                                </Badge>
                              )}
                              {hasChecklist && (
                                <Badge variant="outline" className="text-[10px]">
                                  {clDone}/{t.checklistItems.length} subtasks
                                </Badge>
                              )}
                              {t.repeatRule !== 'none' && (
                                <Badge variant="outline" className="text-[10px] capitalize">
                                  {t.repeatRule}
                                </Badge>
                              )}
                            </div>
                          </div>
                          {done ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                        </div>
                        {isExpanded && hasChecklist && (
                          <div className="border-t border-border px-4 py-3 space-y-2 bg-muted/30">
                            {t.checklistItems.map((c) => (
                              <div key={c.id} className="flex items-center gap-2">
                                <Checkbox
                                  checked={c.done}
                                  onCheckedChange={() => toggleChecklistItem(t.id, c.id)}
                                />
                                <span className={cn(
                                  'text-sm',
                                  c.done && 'line-through text-muted-foreground',
                                )}>
                                  {c.text}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
