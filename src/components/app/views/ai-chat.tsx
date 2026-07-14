'use client';
import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth/context';
import { aiChat, aiExtractMemories } from '@/lib/ai';
import { tryLocalParse, parseWithAI, executeActions, type AppAction, type ActionEnvelope } from '@/lib/ai/action-router';
import { buildLocalContext, retrieveRelevantMemories } from '@/lib/ai/context';
import { parseCommand, executeMemoryCommand, detectCategory } from '@/lib/ai/commands';
import { parseTaskAction, executeTaskAction } from '@/lib/ai/task-manager';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Brain, Send, Loader2, Trash2, Sparkles, User, Bot, Cpu, HelpCircle,
} from 'lucide-react';
import { todayISO, cn } from '@/lib/utils';

const SUGGESTIONS = [
  'What should I focus on today?',
  'Remember that I am preparing for BCA',
  'Add gym tomorrow 7 AM',
  'Show my memories',
  'Help',
  'Generate my evening plan',
];

export function AIChatView() {
  const settings = useStore((s) => s.settings);
  const tasks = useStore((s) => s.tasks);
  const habits = useStore((s) => s.habits);
  const finance = useStore((s) => s.finance);
  const chatHistory = useStore((s) => s.aiChatHistory);
  const appendAIChat = useStore((s) => s.appendAIChat);
  const clearAIChat = useStore((s) => s.clearAIChat);
  const addMemory = useStore((s) => s.addMemory);
  const memories = useStore((s) => s.memories);

  const { profile, isOffline } = useAuth();
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<{ message: string; execute: () => void } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory]);

  async function handleSend(rawMessage: string) {
    const message = rawMessage.trim();
    if (!message || busy) return;

    // Check for pending confirmation (yes/no)
    if (pendingConfirm) {
      const lower = message.toLowerCase();
      if (lower === 'yes' || lower === 'y' || lower === 'ok' || lower === 'haan' || lower === 'confirm' || lower === 'pakka' || lower === 'kar do') {
        pendingConfirm.execute();
        appendAIChat({ role: 'user', content: message });
        appendAIChat({ role: 'assistant', content: '✅ Done successfully.' });
        setPendingConfirm(null);
        return;
      } else {
        appendAIChat({ role: 'user', content: message });
        appendAIChat({ role: 'assistant', content: '❌ Cancelled.' });
        setPendingConfirm(null);
        return;
      }
    }

    setError(null);
    appendAIChat({ role: 'user', content: message });
    setInput('');
    setBusy(true);

    try {
      const today = todayISO();

      // ─── STEP 1: Try local fast-path parse (INSTANT, no AI) ───
      const localResult = tryLocalParse(message);

      if (localResult) {
        if (localResult.actions.length > 0 && !localResult.needs_confirmation) {
          const { results, navigateTo } = executeActions(localResult.actions);
          const replyText = localResult.reply || results.map(r => r.message).join('\n');
          appendAIChat({ role: 'assistant', content: replyText });

          if (profile?.id && !isOffline) {
            for (const result of results) {
              if (result.taskId) {
                const { pushTask } = await import('@/lib/sync');
                const task = useStore.getState().tasks.find((t) => t.id === result.taskId);
                if (task) pushTask(profile.id, task);
              }
            }
          }
          if (navigateTo) setTimeout(() => onNavigate(navigateTo as ViewKey), 500);
        } else if (localResult.needs_confirmation) {
          appendAIChat({ role: 'assistant', content: localResult.reply || localResult.confirmation_question || 'Confirm?' });
          setPendingConfirm({
            message: localResult.confirmation_question || 'Confirm?',
            execute: () => {
              const { results } = executeActions(localResult.actions);
              appendAIChat({ role: 'assistant', content: results.map(r => r.message).join('\n') });
            },
          });
        } else if (localResult.reply) {
          appendAIChat({ role: 'assistant', content: localResult.reply });
        } else {
          const { results, navigateTo } = executeActions(localResult.actions);
          appendAIChat({ role: 'assistant', content: results.map(r => r.message).join('\n') || localResult.reply });
          if (navigateTo) setTimeout(() => onNavigate(navigateTo as ViewKey), 500);
        }
        setBusy(false);
        return;
      }

      // ─── STEP 2: AI fallback (when local parse doesn't match) ───
      const ctx = buildLocalContext({
        todayTasks: tasks.filter((t) => t.status !== 'archived').slice(0, 5).map((t) => ({
          title: t.title, priority: t.priority, time: t.time, done: !!t.completionLog?.[today],
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
        userQuery: message,
      });

      const history = chatHistory.slice(-6).map((m) => ({ role: m.role, content: m.content }));

      const envelope = await parseWithAI(message, ctx, history, {
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

      if (envelope.actions.length > 0 && !envelope.needs_confirmation) {
        const { results, navigateTo } = executeActions(envelope.actions);
        const replyText = envelope.reply || results.map(r => r.message).join('\n');
        appendAIChat({ role: 'assistant', content: replyText });
        if (navigateTo) setTimeout(() => onNavigate(navigateTo as ViewKey), 500);

        if (profile?.id && !isOffline) {
          for (const result of results) {
            if (result.taskId) {
              const { pushTask } = await import('@/lib/sync');
              const task = useStore.getState().tasks.find((t) => t.id === result.taskId);
              if (task) pushTask(profile.id, task);
            }
          }
        }
      } else if (envelope.needs_confirmation) {
        appendAIChat({ role: 'assistant', content: envelope.reply || envelope.confirmation_question || 'Confirm?' });
        setPendingConfirm({
          message: envelope.confirmation_question ?? 'Confirm?',
          execute: () => {
            const { results } = executeActions(envelope.actions);
            appendAIChat({ role: 'assistant', content: results.map(r => r.message).join('\n') || 'Done.' });
          },
        });
      } else {
        appendAIChat({ role: 'assistant', content: envelope.reply });
      }

      // ─── Auto-extract memories ───
      try {
        const conv = `User: ${message}\n\nAssistant: ${envelope.reply}`;
        const extraction = await aiExtractMemories(conv, {
          profile: {
            provider: settings.aiProvider ?? 'zai',
            model_chat: settings.aiModelChat ?? 'glm-4.6',
            model_planning: settings.aiModelPlanning ?? 'glm-4.6',
            model_reports: settings.aiModelReports ?? 'glm-4.6',
            fallback_model: 'glm-4.5',
            temperature: 0.1,
            max_tokens: 600,
            prompt_style: 'coach',
            enabled_modules_json: settings.aiEnabledModules ?? [],
          },
          userId: profile?.id,
        });

        if (Array.isArray(extraction.json)) {
          for (const m of extraction.json as Array<Record<string, string | number | undefined>>) {
            if (m.memory_type && m.memory_key && m.memory_value) {
              const existing = memories.find(
                (e) => e.title.toLowerCase() === (m.memory_key as string).toLowerCase() ||
                       e.content.toLowerCase() === (m.memory_value as string).toLowerCase(),
              );
              if (!existing) {
                useStore.getState().addMemory({
                  title: m.memory_key as string,
                  content: m.memory_value as string,
                  category: (m.memory_type as string) ?? 'custom',
                  importance: 'medium',
                  confidence: (m.confidence_score as number) ?? 0.6,
                  source: 'chat',
                });
              }
            }
          }
        }
      } catch { /* silent */ }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI request failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 shrink-0">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">AI Coach</p>
          <h1 className="text-3xl font-bold tracking-tight mt-1 flex items-center gap-2">
            <Brain className="h-7 w-7 text-primary" />
            AI Assistant
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Provider: <span className="font-medium">{settings.aiProvider}</span> ·
            Model: <span className="font-medium">{settings.aiModelChat}</span> ·
            <span className="ml-1">{memories.filter((m) => !m.archived && !m.disabled).length} memories</span>
            {isOffline && <span className="text-amber-500"> · offline</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHelp(!showHelp)}
          >
            <HelpCircle className="h-3.5 w-3.5 mr-1" /> Commands
          </Button>
          <Button variant="ghost" size="icon" onClick={() => clearAIChat()} title="Clear chat">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Help panel */}
      {showHelp && (
        <Card className="shrink-0">
          <CardContent className="p-4 text-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">AI Commands</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowHelp(false)}>Close</Button>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Memory</div>
                <ul className="text-xs space-y-1">
                  <li><code className="bg-muted px-1 rounded">remember that I wake up at 5 AM</code></li>
                  <li><code className="bg-muted px-1 rounded">forget my coffee preference</code></li>
                  <li><code className="bg-muted px-1 rounded">show my memories</code></li>
                  <li><code className="bg-muted px-1 rounded">search memories for coding</code></li>
                  <li><code className="bg-muted px-1 rounded">summarize my memories</code></li>
                </ul>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Tasks</div>
                <ul className="text-xs space-y-1">
                  <li><code className="bg-muted px-1 rounded">add gym tomorrow 7 AM</code></li>
                  <li><code className="bg-muted px-1 rounded">delete today's workout</code></li>
                  <li><code className="bg-muted px-1 rounded">complete grocery task</code></li>
                  <li><code className="bg-muted px-1 rounded">move meeting to Friday</code></li>
                  <li><code className="bg-muted px-1 rounded">show today's tasks</code></li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chat messages */}
      <Card className="flex-1 min-h-0 flex flex-col">
        <CardContent className="flex-1 min-h-0 p-0">
          <div
            ref={scrollRef}
            className="h-full overflow-y-auto scroll-thin p-4 space-y-3"
          >
            {chatHistory.length === 0 && (
              <div className="text-center py-12 space-y-4">
                <div className="inline-flex h-14 w-14 rounded-2xl bg-primary/10 items-center justify-center">
                  <Sparkles className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Ask your AI coach</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    I remember everything you tell me. I can manage tasks, set reminders, and use your memories to answer personally.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center max-w-md">
                  {SUGGESTIONS.map((s) => (
                    <Button
                      key={s}
                      variant="outline"
                      size="sm"
                      onClick={() => handleSend(s)}
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {chatHistory.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="h-8 w-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-lg p-3 text-sm whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  {msg.content}
                </div>
                {msg.role === 'user' && (
                  <div className="h-8 w-8 shrink-0 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}
            {busy && (
              <div className="flex gap-3 justify-start">
                <div className="h-8 w-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
            {error && (
              <div className="text-xs text-red-500 bg-red-500/10 p-2 rounded">
                {error}
              </div>
            )}
          </div>
        </CardContent>

        {/* Input */}
        <div className="border-t border-border p-3 flex gap-2 shrink-0">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(input);
              }
            }}
            placeholder="Ask anything, or try: 'remember that...', 'add task tomorrow 7 AM', 'show memories'..."
            disabled={false}
          />
          <Button onClick={() => handleSend(input)} disabled={busy || !input.trim()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </Card>
    </div>
  );
}
