'use client';
import { useState } from 'react';
import { useStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { SectionIcon } from '../icon';
import {
  ChevronUp, ChevronDown, Pencil, Plus, Trash2, FolderPlus,
} from 'lucide-react';
import type { Section } from '@/lib/types';

const ICON_OPTIONS = [
  'Heart', 'AudioLines', 'Laptop', 'Sunrise', 'Wallet', 'CalendarDays',
  'Target', 'TrendingUp', 'Brain', 'Dumbbell', 'Book', 'Coffee', 'Briefcase',
  'Sparkles', 'Apple', 'Droplet', 'Moon', 'Sun', 'Smile', 'Activity',
];
const COLOR_OPTIONS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981', '#06b6d4',
  '#8b5cf6', '#ec4899', '#64748b',
];

export function SectionsView() {
  const sections = useStore((s) => s.sections);
  const tasks = useStore((s) => s.tasks);
  const renameSection = useStore((s) => s.renameSection);
  const deleteSection = useStore((s) => s.deleteSection);
  const reorderSection = useStore((s) => s.reorderSection);
  const addSection = useStore((s) => s.addSection);
  const addSubSection = useStore((s) => s.addSubSection);

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Section | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Section | null>(null);
  const [addSubTarget, setAddSubTarget] = useState<Section | null>(null);
  const [subName, setSubName] = useState('');

  const sorted = [...sections].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Organize</p>
          <h1 className="text-3xl font-bold tracking-tight mt-1">Sections</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {sections.length} sections · {sections.reduce((sum, s) => sum + s.subSections.length, 0)} sub-sections
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> New Section
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {sorted.map((s, idx) => {
          const taskCount = tasks.filter((t) => t.sectionId === s.id && t.status !== 'archived').length;
          const completedCount = tasks.filter(
            (t) => t.sectionId === s.id && t.status === 'completed',
          ).length;
          return (
            <Card key={s.id} className="overflow-hidden border-l-4" style={{ borderLeftColor: s.color }}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-lg flex items-center justify-center"
                      style={{ background: `${s.color}20` }}
                    >
                      <SectionIcon name={s.icon} className="h-5 w-5" style={{ color: s.color }} />
                    </div>
                    <div>
                      <CardTitle className="text-base">{s.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {taskCount} active · {completedCount} completed
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7"
                      disabled={idx === 0}
                      onClick={() => reorderSection(s.id, 'up')}
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7"
                      disabled={idx === sorted.length - 1}
                      onClick={() => reorderSection(s.id, 'down')}
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {s.subSections.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No sub-sections yet</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {s.subSections.map((sub) => {
                      const subCount = tasks.filter(
                        (t) => t.subSectionId === sub.id && t.status !== 'archived',
                      ).length;
                      return (
                        <Badge key={sub.id} variant="secondary" className="text-xs">
                          {sub.name}
                          <span className="ml-1 text-muted-foreground">{subCount}</span>
                        </Badge>
                      );
                    })}
                  </div>
                )}
                <div className="flex items-center gap-2 mt-4">
                  <Button
                    size="sm" variant="outline"
                    onClick={() => { setEditTarget(s); }}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Rename
                  </Button>
                  <Button
                    size="sm" variant="outline"
                    onClick={() => { setAddSubTarget(s); setSubName(''); }}
                  >
                    <FolderPlus className="h-3.5 w-3.5 mr-1" /> Sub-section
                  </Button>
                  <Button
                    size="sm" variant="ghost"
                    className="ml-auto text-red-600 hover:text-red-700"
                    onClick={() => setDeleteTarget(s)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add section dialog */}
      <AddSectionDialog
        open={addOpen || !!editTarget}
        onOpenChange={(o) => { if (!o) { setAddOpen(false); setEditTarget(null); } }}
        editTarget={editTarget}
        onAdd={(name, icon, color) => addSection(name, icon, color)}
        onRename={(id, name) => renameSection(id, name)}
      />

      {/* Add sub-section dialog */}
      <Dialog open={!!addSubTarget} onOpenChange={(o) => !o && setAddSubTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add sub-section to {addSubTarget?.name}</DialogTitle>
            <DialogDescription>Sub-sections help organize tasks within a section.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label htmlFor="sub-name">Name</Label>
            <Input
              id="sub-name"
              value={subName}
              onChange={(e) => setSubName(e.target.value)}
              placeholder="e.g. Morning Routine"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                if (addSubTarget && subName.trim()) {
                  addSubSection(addSubTarget.id, subName.trim());
                  setAddSubTarget(null);
                  setSubName('');
                }
              }}
              disabled={!subName.trim()}
            >
              Add sub-section
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete section?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{deleteTarget?.name}&quot; and all{' '}
              {deleteTarget ? tasks.filter((t) => t.sectionId === deleteTarget.id).length : 0}{' '}
              tasks inside it. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (deleteTarget) deleteSection(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Delete section
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AddSectionDialog({
  open, onOpenChange, editTarget, onAdd, onRename,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editTarget: Section | null;
  onAdd: (name: string, icon: string, color: string) => void;
  onRename: (id: string, name: string) => void;
}) {
  // Use a key so the form remounts (with fresh useState) whenever the target changes
  const formKey = editTarget?.id ?? 'new';
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editTarget ? 'Rename Section' : 'New Section'}</DialogTitle>
          <DialogDescription>
            {editTarget
              ? 'Update the section name and appearance.'
              : 'Create a custom section to organize your tasks.'}
          </DialogDescription>
        </DialogHeader>
        <AddSectionForm
          key={formKey}
          editTarget={editTarget}
          onAdd={onAdd}
          onRename={onRename}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function AddSectionForm({
  editTarget, onAdd, onRename, onDone,
}: {
  editTarget: Section | null;
  onAdd: (name: string, icon: string, color: string) => void;
  onRename: (id: string, name: string) => void;
  onDone: () => void;
}) {
  const [name, setName] = useState(editTarget?.name ?? '');
  const [icon, setIcon] = useState(editTarget?.icon ?? 'Target');
  const [color, setColor] = useState(editTarget?.color ?? '#64748b');

  return (
    <>
      <div className="grid gap-3 py-2">
        <div className="grid gap-2">
          <Label htmlFor="sec-name">Name</Label>
          <Input
            id="sec-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Hobbies"
            autoFocus
          />
        </div>
        {!editTarget && (
          <>
            <div className="grid gap-2">
              <Label>Icon</Label>
              <Select value={icon} onValueChange={setIcon}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map((i) => (
                    <SelectItem key={i} value={i}>{i}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`h-8 w-8 rounded-md border-2 ${color === c ? 'border-foreground' : 'border-transparent'}`}
                    style={{ background: c }}
                    aria-label={c}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onDone}>Cancel</Button>
        <Button
          disabled={!name.trim()}
          onClick={() => {
            if (editTarget) onRename(editTarget.id, name.trim());
            else onAdd(name.trim(), icon, color);
            onDone();
          }}
        >
          {editTarget ? 'Save' : 'Create'}
        </Button>
      </DialogFooter>
    </>
  );
}
