'use client';
import { useStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  RotateCcw, Trash2, CheckCircle2, CalendarClock, Split, Repeat, AlertTriangle,
} from 'lucide-react';
import { formatDateShort, cn } from '@/lib/utils';
import type { NotificationAction } from '@/lib/types';

const ACTION_LABELS: Record<NotificationAction, { label: string; icon: typeof CheckCircle2; color: string }> = {
  complete:     { label: 'Do Now',        icon: CheckCircle2, color: 'text-emerald-500' },
  reschedule:   { label: 'Tomorrow',      icon: CalendarClock, color: 'text-cyan-500' },
  break_subtasks: { label: 'Break Subtasks', icon: Split, color: 'text-amber-500' },
  convert_habit: { label: 'Make Habit',   icon: Repeat, color: 'text-violet-500' },
  skip:         { label: 'Delete',        icon: Trash2, color: 'text-red-500' },
  snooze:       { label: 'Snooze',        icon: CalendarClock, color: 'text-muted-foreground' },
  ask_ai:       { label: 'Ask AI',        icon: AlertTriangle, color: 'text-primary' },
  start:        { label: 'Start',         icon: CheckCircle2, color: 'text-emerald-500' },
  delay:        { label: 'Delay',         icon: CalendarClock, color: 'text-muted-foreground' },
  split:        { label: 'Split',         icon: Split, color: 'text-amber-500' },
};

export function RecoveryQueueView() {
  const recoveryQueue = useStore((s) => s.recoveryQueue);
  const deleteRecoveryItem = useStore((s) => s.deleteRecoveryItem);
  const deleteTask = useStore((s) => s.deleteTask);
  const updateTask = useStore((s) => s.updateTask);
  const addTask = useStore((s) => s.addTask);

  function handleAction(itemId: string, taskId: string | undefined, action: NotificationAction) {
    // Resolve the action
    switch (action) {
      case 'complete':
        if (taskId) {
          const today = new Date().toISOString().slice(0, 10);
          updateTask(taskId, { status: 'completed', completedAt: new Date().toISOString() });
        }
        deleteRecoveryItem(itemId);
        break;
      case 'reschedule':
        if (taskId) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          updateTask(taskId, { startDate: tomorrow.toISOString().slice(0, 10) });
        }
        deleteRecoveryItem(itemId);
        break;
      case 'break_subtasks':
      case 'split':
        if (taskId) {
          const task = useStore.getState().tasks.find((t) => t.id === taskId);
          if (task) {
            // Create 3 smaller subtasks based on the original
            const today = new Date().toISOString().slice(0, 10);
            ['Part 1', 'Part 2', 'Part 3'].forEach((suffix, i) => {
              addTask({
                title: `${task.title} — ${suffix}`,
                sectionId: task.sectionId,
                subSectionId: task.subSectionId,
                priority: task.priority,
                startDate: today,
                time: undefined,
                repeatRule: 'none',
              });
            });
            deleteTask(taskId);
          }
        }
        deleteRecoveryItem(itemId);
        break;
      case 'convert_habit':
        // Convert task into a daily habit (simplified — just delete task, user adds habit manually)
        if (taskId) deleteTask(taskId);
        deleteRecoveryItem(itemId);
        break;
      case 'skip':
        if (taskId) deleteTask(taskId);
        deleteRecoveryItem(itemId);
        break;
      default:
        deleteRecoveryItem(itemId);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Recovery</p>
        <h1 className="text-3xl font-bold tracking-tight mt-1 flex items-center gap-2">
          <RotateCcw className="h-7 w-7 text-orange-500" />
          Recovery Queue
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Missed tasks land here after 4 escalation levels. AI suggests the best recovery action.
        </p>
      </div>

      {recoveryQueue.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <RotateCcw className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-semibold">No tasks in recovery</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Tasks that get snoozed/ignored 4+ times will appear here with AI recovery suggestions.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {recoveryQueue.map((item) => (
            <Card key={item.id} className="border-l-4 border-l-orange-500">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-sm">{item.title}</span>
                      <Badge variant="outline" className="text-[10px] bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30">
                        Missed {item.missed_count}×
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{item.reason}</p>
                    <div className="p-2 rounded-md bg-primary/5 border border-primary/20 mb-3">
                      <div className="text-xs text-primary font-medium flex items-center gap-1 mb-0.5">
                        <AlertTriangle className="h-3 w-3" /> AI Suggestion
                      </div>
                      <p className="text-xs text-foreground/80">{item.ai_suggestion}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {formatDateShort(item.created_at.slice(0, 10))}
                  </span>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                  {item.suggested_actions.map((action) => {
                    const meta = ACTION_LABELS[action];
                    if (!meta) return null;
                    const Icon = meta.icon;
                    return (
                      <Button
                        key={action}
                        size="sm"
                        variant="outline"
                        onClick={() => handleAction(item.id, item.task_id, action)}
                        className="h-8"
                      >
                        <Icon className={cn('h-3.5 w-3.5 mr-1', meta.color)} />
                        {meta.label}
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
