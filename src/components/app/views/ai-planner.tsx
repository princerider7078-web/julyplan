'use client';
import { useState } from 'react';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth/context';
import { aiPlan } from '@/lib/ai';
import { buildLocalContext } from '@/lib/ai/context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Clock, Sun, Moon, Coffee, RotateCcw, Calendar, AlertTriangle } from 'lucide-react';
import { todayISO } from '@/lib/utils';

const SLOTS = [
  { key: 'morning' as const,   label: 'Morning Plan',   icon: Sun,      desc: '6 AM – 12 PM',  color: 'text-amber-500' },
  { key: 'afternoon' as const, label: 'Afternoon Plan', icon: Coffee,   desc: '12 PM – 5 PM',  color: 'text-orange-500' },
  { key: 'evening' as const,   label: 'Evening Plan',   icon: Clock,    desc: '5 PM – 11 PM',  color: 'text-cyan-500' },
  { key: 'night' as const,     label: 'Night Plan',     icon: Moon,     desc: '11 PM – 12 AM', color: 'text-violet-500' },
  { key: 'recovery' as const,  label: 'Recovery Plan',  icon: RotateCcw,desc: 'For missed items', color: 'text-red-500' },
  { key: 'weekly' as const,    label: 'Weekly Plan',    icon: Calendar, desc: 'Mon-Sun theme', color: 'text-emerald-500' },
  { key: 'monthly' as const,   label: 'Monthly Plan',   icon: Sparkles,desc: 'July 4-week structure', color: 'text-primary' },
];

export function AIPlannerView() {
  const settings = useStore((s) => s.settings);
  const tasks = useStore((s) => s.tasks);
  const habits = useStore((s) => s.habits);
  const finance = useStore((s) => s.finance);
  const { profile, isOffline } = useAuth();
  const [results, setResults] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate(slot: typeof SLOTS[number]['key']) {
    setBusy(slot);
    setError(null);
    try {
      const today = todayISO();
      const ctx = buildLocalContext({
        todayTasks: tasks
          .filter((t) => t.status !== 'archived')
          .slice(0, 8)
          .map((t) => ({
            title: t.title,
            priority: t.priority,
            time: t.time,
            done: !!t.completionLog?.[today],
          })),
        recentHabits: habits.slice(0, 8).map((h) => {
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
        userProfile: {
          wake_time: '06:00',
          sleep_time: '00:00',
          office_start_time: '18:00',
          office_end_time: '23:00',
          daily_protein_goal: settings.proteinTarget,
          daily_water_goal: settings.waterTarget,
        },
      });

      const response = await aiPlan(slot, ctx, {
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

      setResults((r) => ({ ...r, [slot]: response.text }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Plan generation failed');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">AI Planner</p>
        <h1 className="text-3xl font-bold tracking-tight mt-1 flex items-center gap-2">
          <Sparkles className="h-7 w-7 text-primary" />
          AI Planner
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generate concrete plans for each part of your day, week, or month.
          {isOffline && <span className="text-amber-500"> · offline mode (no memory sync)</span>}
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Slot grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {SLOTS.map((slot) => {
          const Icon = slot.icon;
          const isBusy = busy === slot.key;
          const result = results[slot.key];
          return (
            <Card key={slot.key} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-lg bg-muted flex items-center justify-center ${slot.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{slot.label}</CardTitle>
                      <CardDescription className="text-xs">{slot.desc}</CardDescription>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={result ? 'outline' : 'default'}
                    onClick={() => generate(slot.key)}
                    disabled={isBusy}
                  >
                    {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> :
                     result ? 'Regenerate' : 'Generate'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {result ? (
                  <div className="text-sm whitespace-pre-wrap text-foreground/90 leading-relaxed">
                    {result}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Click Generate to build this plan based on your current data.
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
