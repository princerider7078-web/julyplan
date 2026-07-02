'use client';
import { useState } from 'react';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth/context';
import { aiReport } from '@/lib/ai';
import { buildLocalContext } from '@/lib/ai/context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, Sparkles, AlertTriangle } from 'lucide-react';
import { todayISO, getLast7Days, getLast30Days } from '@/lib/utils';

const REPORT_TYPES = [
  { key: 'daily' as const,   label: 'Daily Report',   desc: 'Done, pending, health, finance, suggestion for tomorrow' },
  { key: 'weekly' as const,  label: 'Weekly Report',  desc: 'Best day, worst day, consistency, missed habits, AI suggestion' },
  { key: 'monthly' as const, label: 'Monthly Report', desc: 'Completion %, wasted days, wins, weak areas, plan for next month' },
];

export function AIReportsView() {
  const settings = useStore((s) => s.settings);
  const tasks = useStore((s) => s.tasks);
  const habits = useStore((s) => s.habits);
  const finance = useStore((s) => s.finance);
  const journal = useStore((s) => s.journal);
  const { profile, isOffline } = useAuth();
  const [results, setResults] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate(type: 'daily' | 'weekly' | 'monthly') {
    setBusy(type);
    setError(null);
    try {
      const today = todayISO();
      const last7 = getLast7Days();
      const last30 = getLast30Days();

      // Habit compliance over period
      const period = type === 'daily' ? [today] : type === 'weekly' ? last7 : last30;
      const habitCompliance = habits.length
        ? Math.round(
            (period.reduce((sum, d) => sum + habits.filter((h) => h.log[d]).length, 0) /
              (habits.length * period.length)) * 100,
          )
        : 0;

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
          todaySpend: finance.filter((f) => f.type === 'expense' && f.date === today).reduce((s, f) => s + f.amount, 0),
          monthSpend: finance.filter((f) => f.type === 'expense' && f.date.slice(0, 7) === today.slice(0, 7)).reduce((s, f) => s + f.amount, 0),
          budget: 5000,
        },
        recentJournal: journal.slice(0, 5).map((j) => ({ mood: j.mood_score, content: j.content.slice(0, 100) })),
        analytics: {
          overallScore: habitCompliance,
          habitScore: habitCompliance,
          healthScore: 0,
        },
      });

      const response = await aiReport(type, ctx, {
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

      setResults((r) => ({ ...r, [type]: response.text }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Report generation failed');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">AI Reports</p>
        <h1 className="text-3xl font-bold tracking-tight mt-1 flex items-center gap-2">
          <FileText className="h-7 w-7 text-primary" />
          AI-Generated Reports
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Honest summaries from your actual data. No motivational fluff.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        {REPORT_TYPES.map((rt) => {
          const isBusy = busy === rt.key;
          const result = results[rt.key];
          return (
            <Card key={rt.key} className="flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  {rt.label}
                </CardTitle>
                <CardDescription className="text-xs">{rt.desc}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                {result ? (
                  <div className="text-sm whitespace-pre-wrap text-foreground/90 leading-relaxed flex-1 max-h-96 overflow-y-auto scroll-thin">
                    {result}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic flex-1">
                    Click Generate to build this report from your data.
                  </p>
                )}
                <Button
                  className="mt-4"
                  variant={result ? 'outline' : 'default'}
                  onClick={() => generate(rt.key)}
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
    </div>
  );
}
