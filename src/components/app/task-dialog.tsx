'use client';
import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, X } from 'lucide-react';
import { useStore } from '@/lib/store';
import type { Task, Priority, TaskType, RepeatRule } from '@/lib/types';
import { todayISO } from '@/lib/utils';
import { v4 as uuid } from 'uuid';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editTask?: Task | null;
  defaultSectionId?: string;
  defaultSubSectionId?: string;
}

const PRIORITIES: Priority[] = ['critical', 'high', 'medium', 'low'];
const TASK_TYPES: { value: TaskType; label: string }[] = [
  { value: 'one-time', label: 'One-time Task' },
  { value: 'daily-recurring', label: 'Daily Recurring' },
  { value: 'weekly-task', label: 'Weekly Task' },
  { value: 'monthly-goal', label: 'Monthly Goal' },
  { value: 'routine-block', label: 'Routine Block' },
  { value: 'checklist-item', label: 'Checklist Item' },
  { value: 'habit-item', label: 'Habit Tracker' },
  { value: 'financial-goal', label: 'Financial Goal' },
];
const REPEAT_RULES: RepeatRule[] = ['none', 'daily', 'weekly', 'monthly'];

export function TaskDialog({ open, onOpenChange, editTask, defaultSectionId, defaultSubSectionId }: Props) {
  // Use a key to remount the form when editTask changes — fresh useState initial values
  const formKey = editTask?.id ?? 'new';
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scroll-thin">
        <DialogHeader>
          <DialogTitle>{editTask ? 'Edit Task' : 'New Task'}</DialogTitle>
          <DialogDescription>
            {editTask ? 'Update the task details.' : 'Create a new task for July Plan.'}
          </DialogDescription>
        </DialogHeader>
        <TaskForm
          key={formKey}
          editTask={editTask}
          defaultSectionId={defaultSectionId}
          defaultSubSectionId={defaultSubSectionId}
          onSaved={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function TaskForm({
  editTask, defaultSectionId, defaultSubSectionId, onSaved,
}: {
  editTask?: Task | null;
  defaultSectionId?: string;
  defaultSubSectionId?: string;
  onSaved: () => void;
}) {
  const sections = useStore((s) => s.sections);
  const addTask = useStore((s) => s.addTask);
  const updateTask = useStore((s) => s.updateTask);

  // Initial state derived directly from props — no useEffect needed
  const [title, setTitle] = useState(editTask?.title ?? '');
  const [description, setDescription] = useState(editTask?.description ?? '');
  const [sectionId, setSectionId] = useState(defaultSectionId ?? editTask?.sectionId ?? sections[0]?.id ?? '');
  const [subSectionId, setSubSectionId] = useState(defaultSubSectionId ?? editTask?.subSectionId ?? '');
  const [priority, setPriority] = useState<Priority>(editTask?.priority ?? 'medium');
  const [type, setType] = useState<TaskType>(editTask?.type ?? 'one-time');
  const [repeatRule, setRepeatRule] = useState<RepeatRule>(editTask?.repeatRule ?? 'none');
  const [startDate, setStartDate] = useState(editTask?.startDate ?? todayISO());
  const [endDate, setEndDate] = useState(editTask?.endDate ?? '');
  const [time, setTime] = useState(editTask?.time ?? '');
  const [reminderTime, setReminderTime] = useState(editTask?.reminderTime ?? '');
  const [notes, setNotes] = useState(editTask?.notes ?? '');
  const [isTopPriority, setIsTopPriority] = useState(editTask?.isTopPriority ?? false);
  const [checklist, setChecklist] = useState<{ id: string; text: string }[]>(
    editTask?.checklistItems.map((c) => ({ id: c.id, text: c.text })) ?? [],
  );
  const [newItem, setNewItem] = useState('');

  const activeSection = sections.find((s) => s.id === sectionId);

  function handleAddChecklist() {
    const text = newItem.trim();
    if (!text) return;
    setChecklist((prev) => [...prev, { id: uuid().slice(0, 8), text }]);
    setNewItem('');
  }

  function handleSave() {
    if (!title.trim() || !sectionId) return;
    const payload = {
      title: title.trim(),
      description: description.trim(),
      sectionId,
      subSectionId: subSectionId || undefined,
      priority,
      type,
      repeatRule,
      startDate,
      endDate: endDate || undefined,
      time: time || undefined,
      reminderTime: reminderTime || undefined,
      notes: notes.trim(),
      isTopPriority,
      checklistItems: checklist.map((c) => ({ ...c, done: false })),
    };
    if (editTask) {
      updateTask(editTask.id, payload);
    } else {
      addTask(payload);
    }
    onSaved();
  }

  return (
    <>
      <div className="grid gap-4 py-2">
        <div className="grid gap-2">
          <Label htmlFor="task-title">Title *</Label>
          <Input
            id="task-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Drink 3L water"
            autoFocus
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="task-desc">Description</Label>
          <Textarea
            id="task-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add details..."
            rows={2}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>Section *</Label>
            <Select value={sectionId} onValueChange={(v) => { setSectionId(v); setSubSectionId(''); }}>
              <SelectTrigger><SelectValue placeholder="Choose section" /></SelectTrigger>
              <SelectContent>
                {sections.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Sub-section</Label>
            <Select value={subSectionId} onValueChange={setSubSectionId} disabled={!activeSection?.subSections.length}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {activeSection?.subSections.map((sub) => (
                  <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as TaskType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TASK_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>Start Date</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>End Date (optional)</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>Time</Label>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Reminder</Label>
            <Input type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} />
          </div>
        </div>

        <div className="grid gap-2">
          <Label>Repeat</Label>
          <Select value={repeatRule} onValueChange={(v) => setRepeatRule(v as RepeatRule)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {REPEAT_RULES.map((r) => (
                <SelectItem key={r} value={r} className="capitalize">
                  {r === 'none' ? 'No repeat' : r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label>Checklist</Label>
          <div className="rounded-md border border-border p-2 space-y-2">
            {checklist.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {checklist.map((c) => (
                  <Badge key={c.id} variant="secondary" className="gap-1">
                    {c.text}
                    <button
                      type="button"
                      onClick={() => setChecklist((prev) => prev.filter((x) => x.id !== c.id))}
                      className="ml-1 rounded-sm hover:bg-background/80"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddChecklist(); } }}
                placeholder="Add a checklist item..."
              />
              <Button type="button" variant="secondary" size="icon" onClick={handleAddChecklist}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="task-notes">Notes</Label>
          <Textarea
            id="task-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Internal notes..."
            rows={2}
          />
        </div>

        <div className="flex items-center justify-between rounded-md border border-border p-3">
          <div>
            <Label htmlFor="top-priority" className="cursor-pointer">Top Priority</Label>
            <p className="text-xs text-muted-foreground">Pin this to the dashboard&apos;s Top 3</p>
          </div>
          <Switch id="top-priority" checked={isTopPriority} onCheckedChange={setIsTopPriority} />
        </div>
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onSaved}>Cancel</Button>
        <Button onClick={handleSave} disabled={!title.trim() || !sectionId}>
          {editTask ? 'Save Changes' : 'Create Task'}
        </Button>
      </DialogFooter>
    </>
  );
}
