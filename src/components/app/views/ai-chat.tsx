'use client';
import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth/context';
import { aiChat, aiExtractMemories } from '@/lib/ai';
import { saveMemory, loadMemories, clearAllMemories } from '@/lib/ai/memory';
import { buildLocalContext } from '@/lib/ai/context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Brain, Send, Loader2, Trash2, Sparkles, User, Bot, Cpu, Zap,
} from 'lucide-react';
import { todayISO } from '@/lib/utils';
import type { AIMemory } from '@/lib/ai/types';

const SUGGESTIONS = [
  'What should I focus on today?',
  'Build my recovery plan',
  'Why am I low on energy?',
  'What habits am I missing?',
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

  const { profile, isOffline } = useAuth();
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [memories, setMemories] = useState<AIMemory[]>([]);
  const [showMemories, setShowMemories] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Load memories on mount (when authed)
  useEffect(() => {
    if (profile?.id && !isOffline) {
      loadMemories(profile.id).then(setMemories);
    }
  }, [profile, isOffline]);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory]);

  async function handleSend(message: string) {
    if (!message.trim() || busy) return;
    setError(null);
    appendAIChat({ role: 'user', content: message.trim() });
    setInput('');
    setBusy(true);

    try {
      // Build context from local store
      const today = todayISO();
      const ctx = buildLocalContext({
        todayTasks: tasks
          .filter((t) => t.status !== 'archived')
          .slice(0, 10)
          .map((t) => ({
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
        memories,
      });

      // History in the format the AI expects
      const history = chatHistory
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await aiChat(message, ctx, history, {
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

      appendAIChat({ role: 'assistant', content: response.text });

      // If authed, try to extract durable memories from this exchange
      if (profile?.id && !isOffline) {
        try {
          const conv = `User: ${message}\n\nAssistant: ${response.text}`;
          const extraction = await aiExtractMemories(conv);
          if (Array.isArray(extraction.json)) {
            for (const m of extraction.json as AIMemory[]) {
              if (m.memory_type && m.memory_key && m.memory_value) {
                await saveMemory(profile.id, m);
              }
            }
            // Refresh memories list
            loadMemories(profile.id).then(setMemories);
          }
        } catch { /* silent */ }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI request failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleClearMemories() {
    if (!profile?.id) return;
    await clearAllMemories(profile.id);
    setMemories([]);
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
            Model: <span className="font-medium">{settings.aiModelChat}</span>
            {isOffline && <span className="text-amber-500"> · offline mode</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMemories(!showMemories)}
          >
            <Cpu className="h-3.5 w-3.5 mr-1" /> Memory ({memories.length})
          </Button>
          <Button variant="ghost" size="icon" onClick={() => clearAIChat()} title="Clear chat">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Memory panel */}
      {showMemories && (
        <Card className="shrink-0">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">AI Memory</CardTitle>
              {memories.length > 0 && (
                <Button variant="ghost" size="sm" onClick={handleClearMemories} className="text-red-500">
                  Clear all
                </Button>
              )}
            </div>
            <CardDescription>
              Durable facts the AI remembers about you. Stored in Supabase, not in the model.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {memories.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                {isOffline
                  ? 'Memory requires sign-in. Switch from offline mode in Settings.'
                  : 'No memories yet. As you chat, the AI will extract durable facts.'}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto scroll-thin">
                {memories.map((m) => (
                  <Badge key={m.id} variant="secondary" className="text-xs">
                    <span className="opacity-60 mr-1">{m.memory_type}:</span>
                    {m.memory_value.slice(0, 60)}
                  </Badge>
                ))}
              </div>
            )}
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
                    I know your tasks, habits, health, and finance. Ask anything.
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
            placeholder="Ask anything about your plan, habits, or progress..."
            disabled={busy}
          />
          <Button onClick={() => handleSend(input)} disabled={busy || !input.trim()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </Card>
    </div>
  );
}
