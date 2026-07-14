'use client';
import { useState } from 'react';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth/context';
import { aiChat } from '@/lib/ai';
import { buildLocalContext } from '@/lib/ai/context';
import { retrieveRelevantMemories } from '@/lib/ai/memory';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ProgressRing } from '../progress-ring';
import {
  Sun, Moon, Sparkles, Loader2, Clock, CheckCircle2, AlertTriangle,
  Brain, Target, Zap, ArrowRight,
} from 'lucide-react';
import { cn, todayISO, formatDateLong, formatTime12 } from '@/lib/utils';
import type { ViewKey } from '../sidebar';

interface Props {
  onNavigate: (v: ViewKey) => void;
}

const BRIEFING_TYPES = [
  { key: 'morning' as const,  label: 'Morning Briefing',  desc: 'Today\'s priorities, habit status, motivation',     icon: Sun,    color: 'text-amber-500' },
  { key: 'evening' as const,  label: 'Evening Review',    desc: 'What was done, what was missed, tomorrow\'s plan', icon: Moon,   color: 'text-violet-500' },
  { key: 'weekly' as const,   label: 'Weekly Review',     desc: '7-day summary, patterns, focus for next week',     icon: Target, color: 'text-emerald-500' },
  { key: 'motivation' as const,label: 'AI Motivation',    desc: 'Personalized motivation from your memories',       icon: Zap,    color: 'text-orange-500' },
];

export function BriefingView({ onNavigate }: Props) {
  const settings = useStore((s) => s.settings);
  const tasks = useStore((s) => s.tasks);
  const habits = useStore((s) => s.habits);
  const finance = useStore((s) => s.finance);
  const journal = useStore((s) => s.journal);
  const memories = useStore((s) => s.memories);
  const { profile, isOffline } = useAuth();
  const [results, setResults] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const today = todayISO();

  // Today's status snapshot
  const todayPending = tasks.filter((t) => t.status !== 'archived' && !t.completionLog?.[today]).length;
  const todayDone = tasks.filter((t) => t.completionLog?.[today]).length;
  const habitsDone = habits.filter((h) => h.log[today]).length;
  const habitsPct = habits.length ? Math.round((habitsDone / habits.length) * 100) : 0;
  const todaySpend = finance.filter((f) => f.type === 'expense' && f.date === today).reduce((s, f) => s + f.amount, 0);

  async function generate(type: typeof BRIEFING_TYPES[number]['key']) {
    setBusy(type);
    setError(null);
    try {
      const ctx = buildLocalContext({
        todayTasks: tasks.filter((t) => t.status !== 'archived').slice(0, 10).map((t) => ({
          title: t.title,
          priority: t.priority,
          time: t.time,
          done: !!t.completionLog?.[today],
        })),
        recentHabits: habits.slice(0, 10).map((h) => {
          let streak = 0;
          const d = new Date();
          while (true) {
            const iso = d.toISOString().slice(0, 10);
            if (h.log[iso]) { streak++; d.setDate(d.getDate() - 1); } else break;
          }
          return { name: h.name, doneToday: !!h.log[today], streak };
        }),
        recentFinance: {
          todaySpend,
          monthSpend: finance.filter((f) => f.type === 'expense' && f.date.slice(0, 7) === today.slice(0, 7)).reduce((s, f) => s + f.amount, 0),
          budget: 5000,
        },
        recentJournal: journal.slice(0, 3).map((j) => ({ mood: j.mood_score, content: j.content.slice(0, 100) })),
        userQuery: `${type} briefing motivation review`,
      });

      const prompts: Record<typeof type, string> = {
        morning: `Generate a morning briefing for the user. Use this structure:

🌅 **MORNING BRIEFING**

**Today's Top 3:**
1. [priority 1 from data]
2. [priority 2]
3. [priority 3]

**Habit Status:** [X/Y done so far today]

**Focus for today:** [1 sentence based on patterns]

**Motivation:** [1 sentence using their goals/memories]

Keep it under 200 words. Use their actual data. Light Hinglish OK.`,

        evening: `Generate an evening review. Use this structure:

🌙 **EVENING REVIEW**

**Completed today:** [list from data]

**Missed:** [list from data]

**Habit consistency:** [X%]

**One suggestion for tomorrow:** [specific, actionable]

**Mood note:** [based on recent journal if any]

Keep it under 200 words. Honest, not motivational. Light Hinglish OK.`,

        weekly: `Generate a weekly review based on the user's last 7 days. Use this structure:

📊 **WEEKLY REVIEW**

**Best day:** [day + reason]
**Worst day:** [day + reason]
**Consistency:** [habit %]
**Missed habits:** [list]
**Focus for next week:** [1 sentence]

Under 200 words. Honest. Light Hinglish OK.`,

        motivation: `Generate a SHORT personalized motivational message (3-4 sentences) for the user based on:
- Their goals/memories
- Today's habit status
- Recent patterns

Be specific to them. Not generic. Light Hinglish OK.`,
      };

      const response = await aiChat(prompts[type], ctx, [], {
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

      setResults((r) => ({ ...r, [type]: response.text }));

      // Auto-save morning/evening as a notification
      if (type === 'morning' || type === 'evening') {
        useStore.getState().addAINotification({
          title: type === 'morning' ? '🌅 Morning Briefing' : '🌙 Evening Review',
          message: response.text,
          type: type === 'morning' ? 'briefing' : 'review',
          priority: 'high',
          scheduled_at: new Date().toISOString(),
          status: 'shown',
          ai_generated: true,
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">AI Coach</p>
        <h1 className="text-3xl font-bold tracking-tight mt-1 flex items-center gap-2">
          <Sparkles className="h-7 w-7 text-primary" />
          Daily Briefing
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          AI-generated morning + evening briefings using your memories + today's data
          {isOffline && ' · offline mode'}
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Today snapshot */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <ProgressRing value={habitsPct} size={56} strokeWidth={6} color="#f97316" />
            <div>
              <div className="text-xs text-muted-foreground">Habits</div>
              <div className="text-xl font-bold">{habitsDone}/{habits.length}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-14 w-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Tasks</div>
              <div className="text-xl font-bold">{todayDone} done · {todayPending} pending</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-14 w-14 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Clock className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Today spend</div>
              <div className="text-xl font-bold">₹{todaySpend.toLocaleString()}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-14 w-14 rounded-full bg-violet-500/10 flex items-center justify-center">
              <Brain className="h-6 w-6 text-violet-500" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Memories</div>
              <div className="text-xl font-bold">{memories.filter((m) => !m.archived && !m.disabled).length} active</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Briefing generators */}
      <div className="grid md:grid-cols-2 gap-4">
        {BRIEFING_TYPES.map((bt) => {
          const Icon = bt.icon;
          const isBusy = busy === bt.key;
          const result = results[bt.key];
          return (
            <Card key={bt.key} className="flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Icon className={cn('h-4 w-4', bt.color)} />
                  {bt.label}
                </CardTitle>
                <CardDescription className="text-xs">{bt.desc}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                {result ? (
                  <div className="text-sm whitespace-pre-wrap text-foreground/90 leading-relaxed flex-1 max-h-80 overflow-y-auto scroll-thin p-3 rounded-md bg-muted/30 border border-border">
                    {result}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic flex-1">
                    Click Generate to build this briefing from your data.
                  </p>
                )}
                <Button
                  className="mt-4"
                  variant={result ? 'outline' : 'default'}
                  onClick={() => generate(bt.key)}
                  disabled={isBusy}
                >
                  {isBusy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
                  {result ? 'Regenerate' : 'Generate'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Memory summary */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-4 w-4 text-violet-500" />
                What the AI knows about you
              </CardTitle>
              <CardDescription>Top memories the AI uses for personalization</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => onNavigate('memory')}>
              Manage memories <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {memories.filter((m) => !m.archived && !m.disabled).length === 0 ? (
            <p className="text-sm text-muted-foreground italic text-center py-4">
              No memories yet. The AI learns from your chats — try asking it something!
            </p>
          ) : (
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto scroll-thin">
              {memories.filter((m) => !m.archived && !m.disabled).slice(0, 12).map((m) => (
                <Badge key={m.id} variant="secondary" className="text-xs">
                  <span className="opacity-60 mr-1">{m.category}:</span>
                  {m.title.slice(0, 40)}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
