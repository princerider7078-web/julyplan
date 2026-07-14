'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExplainThisProps {
  /** The topic to explain — e.g. "Memory Manager", "Quiet Hours", "Escalation System" */
  topic: string;
  /** Optional context to help the AI give a relevant explanation */
  context?: string;
  className?: string;
}

/**
 * "Explain this" AI affordance — principle #2 in action.
 * One-tap button that opens a small inline explanation from the AI.
 * Never writes a help doc — the AI teaches in place.
 */
export function ExplainThis({ topic, context, className }: ExplainThisProps) {
  const [open, setOpen] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleExplain() {
    setOpen(true);
    if (explanation) return; // already loaded
    setLoading(true);
    try {
      const { aiChat } = await import('@/lib/ai');
      const { useStore } = await import('@/lib/store');
      const settings = useStore.getState().settings;

      const response = await aiChat(
        `Explain "${topic}" in 2-3 simple sentences for a new user. ${context ?? ''} Use plain language, no jargon.`,
        undefined, [],
        {
          profile: {
            provider: settings.aiProvider ?? 'zai',
            model_chat: settings.aiModelChat ?? 'glm-4.6',
            model_planning: settings.aiModelPlanning ?? 'glm-4.6',
            model_reports: settings.aiModelReports ?? 'glm-4.6',
            fallback_model: 'glm-4.5',
            temperature: 0.5,
            max_tokens: 200,
            prompt_style: 'coach',
            enabled_modules_json: settings.aiEnabledModules ?? [],
          },
        },
      );
      setExplanation(response.text);
    } catch (e) {
      setExplanation('Sorry, I couldn\'t explain that right now. Try again later.');
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={handleExplain}
        className={cn(
          'inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors',
          className,
        )}
      >
        <Sparkles className="h-3 w-3" />
        Explain
      </button>
    );
  }

  return (
    <div className={cn('rounded-md border border-primary/20 bg-primary/5 p-2 text-xs', className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          {loading ? (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Explaining...
            </div>
          ) : (
            <p className="text-foreground/80 leading-relaxed">{explanation}</p>
          )}
        </div>
        <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground shrink-0">
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
