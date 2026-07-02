'use client';
import { useState } from 'react';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth/context';
import { aiJournalSummary } from '@/lib/ai';
import { pushJournalEntry } from '@/lib/sync';
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
import { BookOpen, Plus, Trash2, Sparkles, Loader2, Smile, Frown, Meh } from 'lucide-react';
import { todayISO, formatDateShort, cn } from '@/lib/utils';

export function JournalView() {
  const journal = useStore((s) => s.journal);
  const settings = useStore((s) => s.settings);
  const addJournalEntry = useStore((s) => s.addJournalEntry);
  const updateJournalEntry = useStore((s) => s.updateJournalEntry);
  const deleteJournalEntry = useStore((s) => s.deleteJournalEntry);
  const { profile, isOffline } = useAuth();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState(7);
  const [date, setDate] = useState(todayISO());
  const [reflectionType, setReflectionType] = useState<'daily' | 'weekly' | 'monthly' | 'free'>('daily');
  const [aiBusy, setAiBusy] = useState<string | null>(null);

  function handleOpen() {
    setTitle(''); setContent(''); setMood(7); setDate(todayISO()); setReflectionType('daily');
    setOpen(true);
  }

  async function handleSave() {
    if (!content.trim()) return;
    const id = addJournalEntry({
      entry_date: date,
      title: title.trim() || undefined,
      content: content.trim(),
      mood_score: mood,
      reflection_type: reflectionType,
    });
    setOpen(false);

    // Push to Supabase if authed
    if (profile?.id && !isOffline) {
      pushJournalEntry(profile.id, {
        id,
        entry_date: date,
        title: title.trim() || undefined,
        content: content.trim(),
        mood_score: mood,
        reflection_type: reflectionType,
      });
    }
  }

  async function handleAISummary(entryId: string, entryContent: string, entryMood: number) {
    setAiBusy(entryId);
    try {
      const response = await aiJournalSummary(entryContent, entryMood, {
        profile: {
          provider: settings.aiProvider ?? 'zai',
          model_chat: settings.aiModelChat ?? 'glm-4.6',
          model_planning: settings.aiModelPlanning ?? 'glm-4.6',
          model_reports: settings.aiModelReports ?? 'glm-4.6',
          fallback_model: 'glm-4.5',
          temperature: settings.aiTemperature ?? 0.7,
          max_tokens: settings.aiMaxTokens ?? 1500,
          prompt_style: 'coach',
          enabled_modules_json: settings.aiEnabledModules ?? [],
        },
        userId: profile?.id,
      });
      updateJournalEntry(entryId, { ai_summary: response.text });
    } catch (e) {
      console.warn('AI summary failed', e);
    } finally {
      setAiBusy(null);
    }
  }

  function moodEmoji(score: number) {
    if (score >= 8) return <Smile className="h-4 w-4 text-emerald-500" />;
    if (score >= 5) return <Meh className="h-4 w-4 text-amber-500" />;
    return <Frown className="h-4 w-4 text-red-500" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Reflection</p>
          <h1 className="text-3xl font-bold tracking-tight mt-1 flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-primary" />
            Journal
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {journal.length} entries · AI summarizes your reflections
          </p>
        </div>
        <Button onClick={handleOpen}>
          <Plus className="h-4 w-4 mr-1" /> New Entry
        </Button>
      </div>

      {journal.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-semibold">No journal entries yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Write your first reflection. The AI will summarize patterns over time.
            </p>
            <Button onClick={handleOpen} className="mt-4">
              <Plus className="h-4 w-4 mr-1" /> Write First Entry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {journal.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{entry.title ?? 'Untitled'}</span>
                      <Badge variant="outline" className="text-[10px]">{formatDateShort(entry.entry_date)}</Badge>
                      <Badge variant="outline" className="text-[10px] flex items-center gap-1">
                        {moodEmoji(entry.mood_score)} {entry.mood_score}/10
                      </Badge>
                      <Badge variant="outline" className="text-[10px] capitalize">{entry.reflection_type}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm" variant="outline"
                      onClick={() => handleAISummary(entry.id, entry.content, entry.mood_score)}
                      disabled={aiBusy === entry.id}
                    >
                      {aiBusy === entry.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Sparkles className="h-3.5 w-3.5" />}
                      <span className="ml-1 text-xs">Summarize</span>
                    </Button>
                    <Button
                      size="sm" variant="ghost" className="text-muted-foreground hover:text-red-500"
                      onClick={() => deleteJournalEntry(entry.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-foreground/90 whitespace-pre-wrap line-clamp-6">
                  {entry.content}
                </p>
                {entry.ai_summary && (
                  <div className="mt-3 p-2 rounded-md bg-primary/5 border border-primary/20">
                    <div className="flex items-center gap-1 text-xs text-primary font-medium mb-1">
                      <Sparkles className="h-3 w-3" /> AI Summary
                    </div>
                    <p className="text-xs text-foreground/80">{entry.ai_summary}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New entry dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Journal Entry</DialogTitle>
            <DialogDescription>Write freely. The AI will summarize patterns over time.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="j-date">Date</Label>
                <Input id="j-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Reflection Type</Label>
                <Select value={reflectionType} onValueChange={(v) => setReflectionType(v as typeof reflectionType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="free">Free</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="j-title">Title (optional)</Label>
              <Input
                id="j-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="A short title"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="j-content">Content</Label>
              <Textarea
                id="j-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What happened today? How do you feel? What did you learn?"
                rows={6}
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label>Mood: {mood}/10 {moodEmoji(mood)}</Label>
              <Input
                type="range"
                min={1} max={10}
                value={mood}
                onChange={(e) => setMood(parseInt(e.target.value, 10))}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>1 · terrible</span><span>5 · neutral</span><span>10 · great</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!content.trim()}>Save Entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
