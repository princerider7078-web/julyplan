'use client';
import { useState } from 'react';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth/context';
import { aiKnowledgeSummary } from '@/lib/ai';
import { pushKnowledgeNote } from '@/lib/sync';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { BookMarked, Plus, Trash2, Sparkles, Loader2, Search, Link as LinkIcon } from 'lucide-react';
import { formatDateShort, cn } from '@/lib/utils';

export function KnowledgeView() {
  const notes = useStore((s) => s.knowledgeNotes);
  const settings = useStore((s) => s.settings);
  const addKnowledgeNote = useStore((s) => s.addKnowledgeNote);
  const updateKnowledgeNote = useStore((s) => s.updateKnowledgeNote);
  const deleteKnowledgeNote = useStore((s) => s.deleteKnowledgeNote);
  const { profile, isOffline } = useAuth();

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [url, setUrl] = useState('');
  const [sourceType, setSourceType] = useState('note');
  const [aiBusy, setAiBusy] = useState<string | null>(null);

  function handleOpen() {
    setTitle(''); setContent(''); setTags(''); setUrl(''); setSourceType('note');
    setOpen(true);
  }

  async function handleSave() {
    if (!title.trim() || !content.trim()) return;
    const tagsArr = tags.split(',').map((t) => t.trim()).filter(Boolean);
    const id = addKnowledgeNote({
      title: title.trim(),
      content: content.trim(),
      tags: tagsArr,
      source_type: sourceType,
      reference_url: url.trim() || undefined,
    });
    setOpen(false);

    if (profile?.id && !isOffline) {
      pushKnowledgeNote(profile.id, {
        id,
        title: title.trim(),
        content: content.trim(),
        tags_json: tagsArr,
        source_type: sourceType,
        reference_url: url.trim() || undefined,
      });
    }
  }

  async function handleAISummary(noteId: string, noteContent: string) {
    setAiBusy(noteId);
    try {
      const response = await aiKnowledgeSummary(noteContent, {
        profile: {
          provider: settings.aiProvider,
          model_chat: settings.aiModelChat,
          model_planning: settings.aiModelPlanning,
          model_reports: settings.aiModelReports,
          fallback_model: 'glm-4.5',
          temperature: settings.aiTemperature,
          max_tokens: settings.aiMaxTokens,
          prompt_style: 'coach',
          enabled_modules_json: settings.aiEnabledModules,
        },
        userId: profile?.id,
      });
      if (response.json && typeof response.json === 'object') {
        const r = response.json as { summary?: string; tags?: string[] };
        const patch: { ai_summary?: string; tags?: string[] } = {};
        if (r.summary) patch.ai_summary = r.summary;
        if (Array.isArray(r.tags)) patch.tags = r.tags;
        if (Object.keys(patch).length) updateKnowledgeNote(noteId, patch);
      }
    } catch (e) {
      console.warn('AI summary failed', e);
    } finally {
      setAiBusy(null);
    }
  }

  const filtered = notes.filter((n) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      n.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  // Collect all unique tags
  const allTags = Array.from(new Set(notes.flatMap((n) => n.tags))).slice(0, 20);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Learning</p>
          <h1 className="text-3xl font-bold tracking-tight mt-1 flex items-center gap-2">
            <BookMarked className="h-7 w-7 text-primary" />
            Knowledge Base
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {notes.length} notes · AI summarizes & tags automatically
          </p>
        </div>
        <Button onClick={handleOpen}>
          <Plus className="h-4 w-4 mr-1" /> New Note
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes, tags, or content..."
              className="pl-9"
            />
          </div>
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {allTags.map((t) => (
                <button
                  key={t}
                  onClick={() => setSearch(t)}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-muted hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  #{t}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <BookMarked className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-semibold">No notes yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Save coding notes, learning material, articles, references.
            </p>
            <Button onClick={handleOpen} className="mt-4">
              <Plus className="h-4 w-4 mr-1" /> Add First Note
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {filtered.map((note) => (
            <Card key={note.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{note.title}</span>
                      <Badge variant="outline" className="text-[9px] capitalize">{note.source_type}</Badge>
                      <span className="text-[10px] text-muted-foreground">{formatDateShort(note.created_at.slice(0, 10))}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm" variant="outline"
                      onClick={() => handleAISummary(note.id, note.content)}
                      disabled={aiBusy === note.id}
                    >
                      {aiBusy === note.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Sparkles className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      size="sm" variant="ghost" className="text-muted-foreground hover:text-red-500"
                      onClick={() => deleteKnowledgeNote(note.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-foreground/80 whitespace-pre-wrap line-clamp-4 mb-2">
                  {note.content}
                </p>
                {note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {note.tags.map((t) => (
                      <Badge key={t} variant="secondary" className="text-[10px]">#{t}</Badge>
                    ))}
                  </div>
                )}
                {note.ai_summary && (
                  <div className="mt-2 p-2 rounded-md bg-primary/5 border border-primary/20">
                    <div className="flex items-center gap-1 text-xs text-primary font-medium mb-1">
                      <Sparkles className="h-3 w-3" /> AI Summary
                    </div>
                    <p className="text-xs text-foreground/80">{note.ai_summary}</p>
                  </div>
                )}
                {note.reference_url && (
                  <a
                    href={note.reference_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary mt-2 hover:underline"
                  >
                    <LinkIcon className="h-3 w-3" /> {note.reference_url.slice(0, 50)}
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New note dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Knowledge Note</DialogTitle>
            <DialogDescription>Coding notes, articles, learning material, references.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-2">
              <Label htmlFor="k-title">Title *</Label>
              <Input
                id="k-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. React Server Components"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Source Type</Label>
                <Select value={sourceType} onValueChange={setSourceType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="note">Note</SelectItem>
                    <SelectItem value="article">Article</SelectItem>
                    <SelectItem value="book">Book</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="code">Code Snippet</SelectItem>
                    <SelectItem value="reference">Reference</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="k-url">Reference URL (optional)</Label>
                <Input
                  id="k-url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="k-content">Content *</Label>
              <Textarea
                id="k-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="The main content of the note..."
                rows={6}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="k-tags">Tags (comma-separated)</Label>
              <Input
                id="k-tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="react, frontend, ssr"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!title.trim() || !content.trim()}>Save Note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
