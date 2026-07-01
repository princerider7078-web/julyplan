'use client';
import { useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { TaskDialog } from '../task-dialog';
import { SectionIcon } from '../icon';
import {
  todayISO, formatTime12, priorityStyle, PRIORITY_RANK, cn,
} from '@/lib/utils';
import type { Task } from '@/lib/types';
import {
  Plus, Search, MoreVertical, Pencil, Trash2, Copy, Archive,
  MoveRight, CheckCircle2, Circle, Filter, FolderInput,
} from 'lucide-react';

export function TasksView() {
  const tasks = useStore((s) => s.tasks);
  const sections = useStore((s) => s.sections);
  const deleteTask = useStore((s) => s.deleteTask);
  const archiveTask = useStore((s) => s.archiveTask);
  const duplicateTask = useStore((s) => s.duplicateTask);
  const moveTask = useStore((s) => s.moveTask);
  const toggleTaskComplete = useStore((s) => s.toggleTaskComplete);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Task | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [moveTarget, setMoveTarget] = useState<Task | null>(null);

  const [search, setSearch] = useState('');
  const [filterSection, setFilterSection] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('active');

  const today = todayISO();

  const filtered = useMemo(() => {
    return tasks
      .filter((t) => {
        // status
        if (filterStatus === 'active' && t.status === 'archived') return false;
        if (filterStatus === 'archived' && t.status !== 'archived') return false;
        if (filterStatus === 'completed' && !(t.repeatRule === 'none' && t.status === 'completed')) return false;
        // section
        if (filterSection !== 'all' && t.sectionId !== filterSection) return false;
        // priority
        if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
        // search
        if (search) {
          const q = search.toLowerCase();
          if (
            !t.title.toLowerCase().includes(q) &&
            !t.description?.toLowerCase().includes(q) &&
            !t.notes?.toLowerCase().includes(q)
          ) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const pr = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
        if (pr !== 0) return pr;
        return b.createdAt.localeCompare(a.createdAt);
      });
  }, [tasks, search, filterSection, filterPriority, filterStatus]);

  function handleEdit(task: Task) {
    setEditTarget(task);
    setDialogOpen(true);
  }

  function handleAddNew() {
    setEditTarget(null);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">All Tasks</p>
          <h1 className="text-3xl font-bold tracking-tight mt-1">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filtered.length} task{filtered.length === 1 ? '' : 's'}
          </p>
        </div>
        <Button onClick={handleAddNew}>
          <Plus className="h-4 w-4 mr-1" /> New Task
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select value={filterSection} onValueChange={setFilterSection}>
              <SelectTrigger className="w-[140px]"><Filter className="h-3.5 w-3.5 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                {sections.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Task list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-sm text-muted-foreground">No tasks match the current filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => {
            const ps = priorityStyle(t.priority);
            const section = sections.find((s) => s.id === t.sectionId);
            const done = t.repeatRule === 'none'
              ? t.status === 'completed'
              : !!t.completionLog?.[today];
            const subSection = section?.subSections.find((s) => s.id === t.subSectionId);
            return (
              <Card key={t.id} className={cn('overflow-hidden', done && 'opacity-60')}>
                <CardContent className="p-3 flex items-start gap-3">
                  <Checkbox
                    checked={done}
                    onCheckedChange={() => toggleTaskComplete(t.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn('font-medium text-sm', done && 'line-through')}>
                        {t.title}
                      </span>
                      {section && (
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <SectionIcon
                            name={section.icon}
                            className="h-2.5 w-2.5"
                            style={{ color: section.color }}
                          />
                          {section.name}
                          {subSection && ` / ${subSection.name}`}
                        </Badge>
                      )}
                      <Badge variant="outline" className={cn('text-[10px] border-0', ps.bg, ps.text)}>
                        {ps.label}
                      </Badge>
                      {t.isTopPriority && (
                        <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10">
                          Top
                        </Badge>
                      )}
                      {t.repeatRule !== 'none' && (
                        <Badge variant="outline" className="text-[10px] capitalize">{t.repeatRule}</Badge>
                      )}
                      {t.time && (
                        <Badge variant="outline" className="text-[10px]">
                          {formatTime12(t.time)}
                        </Badge>
                      )}
                    </div>
                    {t.description && (
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {t.description}
                      </div>
                    )}
                    {t.checklistItems.length > 0 && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {t.checklistItems.filter((c) => c.done).length}/{t.checklistItems.length} subtasks
                      </div>
                    )}
                  </div>
                  <div className="flex items-center">
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground" />
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(t)}>
                          <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => duplicateTask(t.id)}>
                          <Copy className="h-3.5 w-3.5 mr-2" /> Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => moveTask(t.id, t.sectionId)}>
                          <MoveRight className="h-3.5 w-3.5 mr-2" /> Move…
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setMoveTarget(t)}>
                          <FolderInput className="h-3.5 w-3.5 mr-2" /> Move to section…
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => archiveTask(t.id)}>
                          <Archive className="h-3.5 w-3.5 mr-2" /> Archive
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteTarget(t)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editTask={editTarget}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{deleteTarget?.title}&quot;. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (deleteTarget) deleteTask(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Move-to-section dialog */}
      <AlertDialog open={!!moveTarget} onOpenChange={(o) => !o && setMoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move task to section</AlertDialogTitle>
            <AlertDialogDescription>
              Choose a destination section for &quot;{moveTarget?.title}&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-2 max-h-72 overflow-y-auto scroll-thin">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  if (moveTarget) moveTask(moveTarget.id, s.id);
                  setMoveTarget(null);
                }}
                className="flex items-center gap-2 p-2 rounded-md hover:bg-accent text-left"
              >
                <SectionIcon name={s.icon} className="h-4 w-4" style={{ color: s.color }} />
                <span className="text-sm font-medium">{s.name}</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {s.subSections.length} sub-sections
                </span>
              </button>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
