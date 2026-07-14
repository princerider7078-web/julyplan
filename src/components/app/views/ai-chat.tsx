'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth/context';
import { aiExtractMemories } from '@/lib/ai';
import { tryLocalParse, parseWithAI, executeActions } from '@/lib/ai/action-router';
import type { ViewKey } from '@/components/app/sidebar';
import { buildLocalContext } from '@/lib/ai/context';
import { Input } from '@/components/ui/input';
import {
  Brain, Trash2, User,
  ArrowUp, Lightbulb, Zap, Calendar,
  CheckCircle2, Clock, AlertCircle, ChevronRight,
} from 'lucide-react';
import { todayISO, cn } from '@/lib/utils';

// ─── Smart suggestion categories for new users ───
const SUGGESTION_CATEGORIES = [
  {
    icon: Zap,
    color: '#f59e0b',
    title: 'Quick Actions',
    subtitle: 'Manage tasks instantly',
    prompts: [
      'Add gym tomorrow 7 AM',
      "What should I focus on today?",
      'Show my tasks for today',
    ],
  },
  {
    icon: Brain,
    color: '#a855f7',
    title: 'Memory',
    subtitle: 'I\'ll remember anything',
    prompts: [
      'Remember that I am preparing for BCA',
      'Remember I prefer waking up at 5 AM',
      'Show my memories',
    ],
  },
  {
    icon: Calendar,
    color: '#10b981',
    title: 'Planning',
    subtitle: 'Get a smart plan',
    prompts: [
      'Generate my evening plan',
      'Plan my tomorrow',
      'What habits should I build?',
    ],
  },
  {
    icon: Lightbulb,
    color: '#3b82f6',
    title: 'Insights',
    subtitle: 'Personalized advice',
    prompts: [
      'How am I doing this week?',
      'Where can I improve?',
      'Motivate me to stay on track',
    ],
  },
];

// ─── Dynamic status messages ───
type StatusPhase = 'thinking' | 'parsing' | 'executing' | 'finalizing';

function getStatusText(phase: StatusPhase, message: string): string {
  const lowerMsg = message.toLowerCase();
  switch (phase) {
    case 'thinking':
      if (/remember|forget|memory|memorize/.test(lowerMsg)) return 'Accessing your memories…';
      if (/add|create|new|schedule/.test(lowerMsg)) return 'Understanding your request…';
      if (/delete|remove|clear/.test(lowerMsg)) return 'Checking what to remove…';
      if (/plan|schedule|organize/.test(lowerMsg)) return 'Thinking about your plan…';
      if (/show|list|what|how/.test(lowerMsg)) return 'Looking into your data…';
      return 'Thinking…';
    case 'parsing':
      return 'Analyzing intent…';
    case 'executing':
      if (/remember|forget/.test(lowerMsg)) return 'Updating memory…';
      if (/add|create|schedule/.test(lowerMsg)) return 'Creating task…';
      if (/delete|remove/.test(lowerMsg)) return 'Removing…';
      if (/plan/.test(lowerMsg)) return 'Building your plan…';
      return 'Working on it…';
    case 'finalizing':
      return 'Finalizing response…';
  }
}

export function AIChatView({ onNavigate }: { onNavigate?: (v: ViewKey) => void }) {
  const settings = useStore((s) => s.settings);
  const tasks = useStore((s) => s.tasks);
  const habits = useStore((s) => s.habits);
  const finance = useStore((s) => s.finance);
  const chatHistory = useStore((s) => s.aiChatHistory);
  const appendAIChat = useStore((s) => s.appendAIChat);
  const clearAIChat = useStore((s) => s.clearAIChat);
  const memories = useStore((s) => s.memories);

  const { profile, isOffline } = useAuth();
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [statusPhase, setStatusPhase] = useState<StatusPhase>('thinking');
  const [error, setError] = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<{ message: string; execute: () => void } | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [chatHistory, busy, statusPhase]);

  const handleSend = useCallback(async (rawMessage: string) => {
    const message = rawMessage.trim();
    if (!message || busy) return;

    // Check for pending confirmation (yes/no)
    if (pendingConfirm) {
      const lower = message.toLowerCase();
      const isConfirm = /^(yes|y|ok|haan|confirm|pakka|kar do|sure|ha|ji)\b/.test(lower);
      appendAIChat({ role: 'user', content: message });
      if (isConfirm) {
        pendingConfirm.execute();
      } else {
        appendAIChat({ role: 'assistant', content: '❌ Cancelled. Nothing was changed.' });
      }
      setPendingConfirm(null);
      return;
    }

    setError(null);
    setShowSuggestions(false);
    appendAIChat({ role: 'user', content: message });
    setInput('');
    setBusy(true);
    setStatusPhase('thinking');

    try {
      const today = todayISO();

      // ─── STEP 1: Try local fast-path parse (INSTANT, no AI) ───
      const localResult = tryLocalParse(message);

      if (localResult) {
        setStatusPhase('executing');
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
          if (navigateTo) setTimeout(() => onNavigate?.(navigateTo as ViewKey), 500);
        } else if (localResult.needs_confirmation) {
          appendAIChat({ role: 'assistant', content: localResult.reply || localResult.confirmation_question || 'Confirm?' });
          setPendingConfirm({
            message: localResult.confirmation_question || 'Confirm?',
            execute: () => {
              setStatusPhase('executing');
              const { results } = executeActions(localResult.actions);
              appendAIChat({ role: 'assistant', content: results.map(r => r.message).join('\n') });
              if (profile?.id && !isOffline) {
                for (const result of results) {
                  if (result.taskId) {
                    import('@/lib/sync').then(({ deleteTaskRemote }) => deleteTaskRemote(profile.id, result.taskId));
                  }
                }
              }
            },
          });
        } else if (localResult.reply) {
          appendAIChat({ role: 'assistant', content: localResult.reply });
        } else {
          const { results, navigateTo } = executeActions(localResult.actions);
          appendAIChat({ role: 'assistant', content: results.map(r => r.message).join('\n') || localResult.reply });
          if (navigateTo) setTimeout(() => onNavigate?.(navigateTo as ViewKey), 500);
        }
        // ✅ FIXED: set busy=false BEFORE memory extraction (which is non-blocking now)
        setBusy(false);
        return;
      }

      // ─── STEP 2: AI fallback (when local parse doesn't match) ───
      setStatusPhase('parsing');

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

      setStatusPhase('executing');

      if (envelope.actions.length > 0 && !envelope.needs_confirmation) {
        const { results, navigateTo } = executeActions(envelope.actions);
        const replyText = envelope.reply || results.map(r => r.message).join('\n');
        appendAIChat({ role: 'assistant', content: replyText });
        if (navigateTo) setTimeout(() => onNavigate?.(navigateTo as ViewKey), 500);

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
            setStatusPhase('executing');
            const { results } = executeActions(envelope.actions);
            appendAIChat({ role: 'assistant', content: results.map(r => r.message).join('\n') || 'Done.' });
            if (profile?.id && !isOffline) {
              for (const result of results) {
                if (result.taskId) {
                  import('@/lib/sync').then(({ deleteTaskRemote }) => deleteTaskRemote(profile.id, result.taskId));
                }
              }
            }
          },
        });
      } else {
        appendAIChat({ role: 'assistant', content: envelope.reply });
      }

      // ✅ CRITICAL FIX: Set busy=false IMMEDIATELY after the reply is shown.
      // Memory extraction is now fire-and-forget (non-blocking) so the user
      // doesn't see a spinner after the answer is already visible.
      setBusy(false);

      // ─── Auto-extract memories (NON-BLOCKING, fire-and-forget) ───
      // This runs in the background after the reply is shown.
      // Errors are silently ignored — they don't affect the user experience.
      if (envelope.reply && envelope.reply.length > 10) {
        const conv = `User: ${message}\n\nAssistant: ${envelope.reply}`;
        // Fire-and-forget — no await, no busy state
        aiExtractMemories(conv, {
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
        }).then((extraction) => {
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
        }).catch(() => { /* silent — background extraction */ });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI request failed');
      setBusy(false);
    }
  }, [busy, pendingConfirm, profile, isOffline, settings, tasks, habits, finance, chatHistory, memories, onNavigate, appendAIChat]);

  function handleClearChat() {
    clearAIChat();
    setShowSuggestions(true);
    setError(null);
  }

  const activeMemories = memories.filter((m) => !m.archived && !m.disabled).length;

  return (
    <div className="flex flex-col h-full relative">
      {/* ═══ Chat messages area ═══ */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto scroll-thin px-3 py-4 space-y-4"
      >
        {/* Empty state — smart onboarding for new users */}
        {chatHistory.length === 0 ? (
          <div className="space-y-5 animate-fade-in">
            {/* Hero greeting */}
            <div className="text-center pt-2">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 18 }}
                className="inline-flex h-16 w-16 rounded-3xl gradient-primary-strong items-center justify-center shadow-lg mb-3"
              >
                <Brain className="h-8 w-8 text-white" strokeWidth={2} />
              </motion.div>
              <h2 className="text-xl font-bold tracking-tight">Hi, I'm your AI coach</h2>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-xs mx-auto leading-relaxed">
                I can manage tasks, remember anything, plan your day, and give personalized advice. Just type naturally.
              </p>
            </div>

            {/* Capabilities row */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: CheckCircle2, label: 'Tasks', color: '#10b981' },
                { icon: Brain, label: 'Memory', color: '#a855f7' },
                { icon: Calendar, label: 'Planning', color: '#f59e0b' },
              ].map((cap) => (
                <div key={cap.label} className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-card border border-border">
                  <span className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: `color-mix(in oklch, ${cap.color} 15%, transparent)` }}>
                    <cap.icon className="h-4 w-4" style={{ color: cap.color }} />
                  </span>
                  <span className="text-[11px] font-medium">{cap.label}</span>
                </div>
              ))}
            </div>

            {/* Categorized suggestions */}
            {showSuggestions && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Try these</span>
                </div>
                {SUGGESTION_CATEGORIES.map((cat, catIdx) => {
                  const Icon = cat.icon;
                  return (
                    <motion.div
                      key={cat.title}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + catIdx * 0.08 }}
                      className="rounded-2xl border border-border bg-card overflow-hidden"
                    >
                      <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-border/50">
                        <span className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `color-mix(in oklch, ${cat.color} 15%, transparent)` }}>
                          <Icon className="h-3.5 w-3.5" style={{ color: cat.color }} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold">{cat.title}</div>
                          <div className="text-[10px] text-muted-foreground">{cat.subtitle}</div>
                        </div>
                      </div>
                      <div className="p-1.5 space-y-1">
                        {cat.prompts.map((prompt) => (
                          <button
                            key={prompt}
                            onClick={() => handleSend(prompt)}
                            className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-accent/50 transition-colors flex items-center justify-between group"
                          >
                            <span className="flex-1">{prompt}</span>
                            <ChevronRight className="h-3 w-3 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Chat messages */
          <>
            {chatHistory.map((msg, idx) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  'flex gap-2.5',
                  msg.role === 'user' ? 'justify-end' : 'justify-start',
                )}
              >
                {msg.role === 'assistant' && (
                  <div className="h-8 w-8 shrink-0 rounded-xl gradient-primary-strong p-0.5 shadow-md shrink-0">
                    <img src="/logo.png" alt="AI" className="h-full w-full rounded-lg object-cover" />
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-tr-md font-medium'
                      : 'bg-card border border-border rounded-tl-md',
                  )}
                >
                  {msg.content}
                </div>
                {msg.role === 'user' && (
                  <div className="h-8 w-8 shrink-0 rounded-full bg-muted flex items-center justify-center border border-border">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </motion.div>
            ))}

            {/* Dynamic thinking/working indicator */}
            <AnimatePresence>
              {busy && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="flex gap-2.5 justify-start"
                >
                  <div className="h-8 w-8 shrink-0 rounded-xl gradient-primary-strong p-0.5 shadow-md shrink-0">
                    <img src="/logo.png" alt="AI" className="h-full w-full rounded-lg object-cover" />
                  </div>
                  <div className="bg-card border border-border rounded-2xl rounded-tl-md px-3.5 py-3 flex items-center gap-2.5">
                    {/* Animated dots */}
                    <div className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1s' }} />
                      <span className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms', animationDuration: '1s' }} />
                      <span className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms', animationDuration: '1s' }} />
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">
                      {getStatusText(statusPhase, chatHistory[chatHistory.length - 1]?.content ?? '')}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-start gap-2.5 rounded-2xl border border-red-500/30 bg-red-500/10 p-3"
              >
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <span className="text-xs text-red-600 dark:text-red-300">{error}</span>
              </motion.div>
            )}
          </>
        )}
      </div>

      {/* ═══ Input bar — premium AI app style ═══ */}
      <div className="shrink-0 px-3 pb-2 pt-2">
        {/* Status footer — shows AI state when idle */}
        {!busy && chatHistory.length > 0 && (
          <div className="flex items-center justify-between px-2 pb-1.5 text-[10px] text-muted-foreground/70">
            <div className="flex items-center gap-1.5">
              <span className={cn('h-1.5 w-1.5 rounded-full', isOffline ? 'bg-amber-500' : 'bg-emerald-500')} />
              <span>{isOffline ? 'Offline mode' : settings.aiProvider} · {settings.aiModelChat}</span>
            </div>
            <span>{activeMemories} memories</span>
          </div>
        )}

        {/* Pending confirmation hint */}
        {pendingConfirm && (
          <div className="mb-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            Type "yes" to confirm or "no" to cancel
          </div>
        )}

        {/* Input row */}
        <div className="relative flex items-center gap-2">
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(input);
                }
              }}
              placeholder={pendingConfirm ? 'Type yes or no…' : 'Ask anything, or try "remember that…"'}
              disabled={busy}
              className="h-12 rounded-2xl pr-3 pl-4 text-sm bg-card border-border focus-visible:ring-1 focus-visible:ring-primary"
            />
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => handleSend(input)}
            disabled={busy || !input.trim()}
            className={cn(
              'h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 transition-all shadow-md',
              input.trim() && !busy
                ? 'gradient-primary-strong text-white'
                : 'bg-muted text-muted-foreground',
            )}
            aria-label="Send message"
          >
            {busy ? (
              <div className="h-5 w-5 rounded-full border-2 border-current border-t-transparent animate-spin" />
            ) : (
              <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
            )}
          </motion.button>
        </div>

        {/* Clear chat button (when history exists) */}
        {!busy && chatHistory.length > 0 && (
          <div className="flex justify-center mt-1.5">
            <button
              onClick={handleClearChat}
              className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-3 py-1"
            >
              <Trash2 className="h-3 w-3" />
              Clear conversation
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
