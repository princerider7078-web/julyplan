'use client';
import { useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus, Search, Trash2, Pencil, Pin, Star, Archive, Lock, Eye, EyeOff,
  Brain, Filter, ArrowUpDown, Merge, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AIMemoryItem, MemoryCategory, MemoryImportance } from '@/lib/types';

const CATEGORIES: { value: MemoryCategory; label: string }[] = [
  { value: 'personal', label: 'Personal' },
  { value: 'goals', label: 'Goals' },
  { value: 'habits', label: 'Habits' },
  { value: 'routine', label: 'Routine' },
  { value: 'preferences', label: 'Preferences' },
  { value: 'health', label: 'Health' },
  { value: 'work', label: 'Work' },
  { value: 'education', label: 'Education' },
  { value: 'relationships', label: 'Relationships' },
  { value: 'skills', label: 'Skills' },
  { value: 'projects', label: 'Projects' },
  { value: 'events', label: 'Events' },
  { value: 'custom', label: 'Custom' },
];

const IMPORTANCE: { value: MemoryImportance; label: string; color: string }[] = [
  { value: 'critical', label: 'Critical', color: 'bg-red-500/15 text-red-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500/15 text-orange-500' },
  { value: 'medium', label: 'Medium', color: 'bg-amber-500/15 text-amber-500' },
  { value: 'low', label: 'Low', color: 'bg-emerald-500/15 text-emerald-500' },
];

const CATEGORY_COLORS: Record<MemoryCategory, string> = {
  personal: '#ef4444',
  goals: '#f97316',
  habits: '#eab308',
  routine: '#22c55e',
  preferences: '#10b981',
  health: '#06b6d4',
  work: '#3b82f6',
  education: '#8b5cf6',
  relationships: '#ec4899',
  skills: '#64748b',
  projects: '#a855f7',
  events: '#14b8a6',
  custom: '#78716c',
};

type SortKey = 'recent' | 'created' | 'importance' | 'useCount' | 'alphabetical';

export function MemoryManagerView() {
  const memories = useStore((s) => s.memories);
  const addMemory = useStore((s) => s.addMemory);
  const updateMemory = useStore((s) => s.updateMemory);
  const deleteMemory = useStore((s) => s.deleteMemory);
  const mergeMemories = useStore((s) => s.mergeMemories);

  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<string>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('recent');

  // Edit/Create dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AIMemoryItem | null>(null);
  const [createMode, setCreateMode] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<AIMemoryItem | null>(null);

  // Merge mode
  const [mergeMode, setMergeMode] = useState(false);
  const [mergeSource, setMergeSource] = useState<string | null>(null);

  // Form state
  const [fTitle, setFTitle] = useState('');
  const [fContent, setFContent] = useState('');
  const [fCategory, setFCategory] = useState<MemoryCategory>('custom');
  const [fImportance, setFImportance] = useState<MemoryImportance>('medium');
  const [fTags, setFTags] = useState('');
  const [fPinned, setFPinned] = useState(false);
  const [fFavorite, setFFavorite] = useState(false);
  const [fLocked, setFLocked] = useState(false);

  // Filter + sort
  const filtered = useMemo(() => {
    let list = memories.slice();
    if (!showArchived) list = list.filter((m) => !m.archived);
    if (filterCat !== 'all') list = list.filter((m) => m.category === filterCat);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.content.toLowerCase().includes(q) ||
          m.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    const importanceRank: Record<MemoryImportance, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    list.sort((a, b) => {
      // Pinned always on top
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      switch (sortKey) {
        case 'recent': return b.updatedAt.localeCompare(a.updatedAt);
        case 'created': return b.createdAt.localeCompare(a.createdAt);
        case 'importance': return importanceRank[a.importance] - importanceRank[b.importance];
        case 'useCount': return b.useCount - a.useCount;
        case 'alphabetical': return a.title.localeCompare(b.title);
      }
    });
    return list;
  }, [memories, search, filterCat, showArchived, sortKey]);

  function openCreate() {
    setEditTarget(null);
    setCreateMode(true);
    setFTitle(''); setFContent(''); setFCategory('custom');
    setFImportance('medium'); setFTags('');
    setFPinned(false); setFFavorite(false); setFLocked(false);
    setEditOpen(true);
  }

  function openEdit(m: AIMemoryItem) {
    setEditTarget(m);
    setCreateMode(false);
    setFTitle(m.title);
    setFContent(m.content);
    setFCategory(m.category);
    setFImportance(m.importance);
    setFTags(m.tags.join(', '));
    setFPinned(m.pinned);
    setFFavorite(m.favorite);
    setFLocked(m.locked);
    setEditOpen(true);
  }

  function handleSave() {
    if (!fTitle.trim() || !fContent.trim()) return;
    const tags = fTags.split(',').map((t) => t.trim()).filter(Boolean);
    if (editTarget) {
      updateMemory(editTarget.id, {
        title: fTitle.trim(),
        content: fContent.trim(),
        category: fCategory,
        importance: fImportance,
        tags,
        pinned: fPinned,
        favorite: fFavorite,
        locked: fLocked,
      });
    } else {
      addMemory({
        title: fTitle.trim(),
        content: fContent.trim(),
        category: fCategory,
        importance: fImportance,
        confidence: 1.0,
        source: 'manual',
        tags,
        pinned: fPinned,
        favorite: fFavorite,
        locked: fLocked,
      });
    }
    setEditOpen(false);
  }

  function handleMergeClick(id: string) {
    if (!mergeSource) {
      setMergeSource(id);
    } else if (mergeSource === id) {
      setMergeSource(null);
    } else {
      // Merge source -> target (target survives)
      mergeMemories(mergeSource, id);
      setMergeSource(null);
    }
  }

  const totalActive = memories.filter((m) => !m.archived).length;
  const totalArchived = memories.filter((m) => m.archived).length;
  const totalPinned = memories.filter((m) => m.pinned).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Long-Term Memory</p>
          <h1 className="text-3xl font-bold tracking-tight mt-1 flex items-center gap-2">
            <Brain className="h-7 w-7 text-primary" />
            AI Memory Manager
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {totalActive} active · {totalPinned} pinned · {totalArchived} archived
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={mergeMode ? 'default' : 'outline'}
            onClick={() => { setMergeMode(!mergeMode); setMergeSource(null); }}
          >
            <Merge className="h-4 w-4 mr-1" /> {mergeMode ? 'Cancel merge' : 'Merge duplicates'}
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> New Memory
          </Button>
        </div>
      </div>

      {mergeMode && (
        <div className="flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 p-3 text-sm">
          <Merge className="h-4 w-4 text-primary" />
          {mergeSource
            ? `Selected source memory. Now click the TARGET memory to merge into (target survives).`
            : `Click the SOURCE memory you want to merge away.`}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-3 flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search memories by title, content, or tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select value={filterCat} onValueChange={setFilterCat}>
              <SelectTrigger className="w-[150px]"><Filter className="h-3.5 w-3.5 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
              <SelectTrigger className="w-[150px]"><ArrowUpDown className="h-3.5 w-3.5 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="created">Newest First</SelectItem>
                <SelectItem value="importance">Importance</SelectItem>
                <SelectItem value="useCount">Most Used</SelectItem>
                <SelectItem value="alphabetical">A → Z</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={showArchived ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowArchived(!showArchived)}
              className="h-9"
            >
              <Archive className="h-3.5 w-3.5 mr-1" /> Archived
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Memory list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Brain className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-semibold">No memories yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Memories are saved automatically from AI chats, or add one manually.
            </p>
            <Button onClick={openCreate} className="mt-4">
              <Plus className="h-4 w-4 mr-1" /> Add First Memory
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {filtered.map((m) => {
            const catColor = CATEGORY_COLORS[m.category];
            const impMeta = IMPORTANCE.find((i) => i.value === m.importance);
            const isMergeSource = mergeSource === m.id;
            return (
              <Card
                key={m.id}
                className={cn(
                  'border-l-4 transition-all',
                  isMergeSource && 'ring-2 ring-primary',
                  m.disabled && 'opacity-50',
                  mergeMode && 'cursor-pointer hover:ring-1 hover:ring-primary/40',
                )}
                style={{ borderLeftColor: catColor }}
                onClick={mergeMode ? () => handleMergeClick(m.id) : undefined}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {m.pinned && <Pin className="h-3 w-3 text-primary" />}
                        {m.favorite && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
                        {m.locked && <Lock className="h-3 w-3 text-muted-foreground" />}
                        <span className="font-semibold text-sm truncate">{m.title}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-[10px]" style={{ color: catColor, borderColor: catColor }}>
                          {m.category}
                        </Badge>
                        {impMeta && (
                          <Badge variant="outline" className={cn('text-[10px] border-0', impMeta.color)}>
                            {impMeta.label}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[10px] capitalize">{m.source}</Badge>
                        {m.useCount > 0 && (
                          <span className="text-[10px] text-muted-foreground">
                            used {m.useCount}×
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-foreground/90 line-clamp-3 mb-2">{m.content}</p>
                  {m.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {m.tags.map((t) => (
                        <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                  {!mergeMode && (
                    <div className="flex items-center gap-1 pt-1 border-t border-border">
                      <Button
                        size="sm" variant="ghost" className="h-7 px-2"
                        onClick={() => updateMemory(m.id, { pinned: !m.pinned })}
                        title={m.pinned ? 'Unpin' : 'Pin'}
                      >
                        <Pin className={cn('h-3.5 w-3.5', m.pinned && 'fill-primary text-primary')} />
                      </Button>
                      <Button
                        size="sm" variant="ghost" className="h-7 px-2"
                        onClick={() => updateMemory(m.id, { favorite: !m.favorite })}
                        title={m.favorite ? 'Unfavorite' : 'Favorite'}
                      >
                        <Star className={cn('h-3.5 w-3.5', m.favorite && 'fill-amber-500 text-amber-500')} />
                      </Button>
                      <Button
                        size="sm" variant="ghost" className="h-7 px-2"
                        onClick={() => updateMemory(m.id, { archived: !m.archived })}
                        title={m.archived ? 'Unarchive' : 'Archive'}
                      >
                        <Archive className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm" variant="ghost" className="h-7 px-2"
                        onClick={() => updateMemory(m.id, { disabled: !m.disabled })}
                        title={m.disabled ? 'Enable' : 'Disable'}
                      >
                        {m.disabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      </Button>
                      <Button
                        size="sm" variant="ghost" className="h-7 px-2"
                        onClick={() => updateMemory(m.id, { locked: !m.locked })}
                        title={m.locked ? 'Unlock' : 'Lock'}
                      >
                        <Lock className={cn('h-3.5 w-3.5', m.locked && 'fill-primary text-primary')} />
                      </Button>
                      <Button
                        size="sm" variant="ghost" className="h-7 px-2"
                        onClick={() => openEdit(m)}
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm" variant="ghost" className="h-7 px-2 ml-auto text-muted-foreground hover:text-red-500"
                        onClick={() => setDeleteTarget(m)}
                        disabled={m.locked}
                        title={m.locked ? 'Unlock to delete' : 'Delete'}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit/Create dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scroll-thin">
          <DialogHeader>
            <DialogTitle>{createMode ? 'New Memory' : 'Edit Memory'}</DialogTitle>
            <DialogDescription>
              {createMode
                ? 'Add a fact the AI should remember forever.'
                : 'Update this memory. Changes apply to all future AI chats.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-2">
              <Label htmlFor="m-title">Title *</Label>
              <Input
                id="m-title"
                value={fTitle}
                onChange={(e) => setFTitle(e.target.value)}
                placeholder="e.g. Wake up time"
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="m-content">Content *</Label>
              <Textarea
                id="m-content"
                value={fContent}
                onChange={(e) => setFContent(e.target.value)}
                placeholder="e.g. I wake up at 5 AM every day."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select value={fCategory} onValueChange={(v) => setFCategory(v as MemoryCategory)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Importance</Label>
                <Select value={fImportance} onValueChange={(v) => setFImportance(v as MemoryImportance)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {IMPORTANCE.map((i) => (
                      <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="m-tags">Tags (comma-separated)</Label>
              <Input
                id="m-tags"
                value={fTags}
                onChange={(e) => setFTags(e.target.value)}
                placeholder="morning, routine, sleep"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="flex items-center justify-between rounded-md border p-2">
                <Label htmlFor="m-pin" className="text-xs cursor-pointer">Pin</Label>
                <Switch id="m-pin" checked={fPinned} onCheckedChange={setFPinned} />
              </div>
              <div className="flex items-center justify-between rounded-md border p-2">
                <Label htmlFor="m-fav" className="text-xs cursor-pointer">Favorite</Label>
                <Switch id="m-fav" checked={fFavorite} onCheckedChange={setFFavorite} />
              </div>
              <div className="flex items-center justify-between rounded-md border p-2">
                <Label htmlFor="m-lock" className="text-xs cursor-pointer">Lock</Label>
                <Switch id="m-lock" checked={fLocked} onCheckedChange={setFLocked} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!fTitle.trim() || !fContent.trim()}>
              {createMode ? 'Create Memory' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete memory?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{deleteTarget?.title}&quot;. The AI will no longer use this fact in future conversations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (deleteTarget) deleteMemory(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
