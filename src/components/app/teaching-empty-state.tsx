'use client';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface TeachingEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Example of something to try */
  example?: string;
  /** Button label + onClick for the primary CTA */
  actionLabel?: string;
  onAction?: () => void;
  /** If provided, shows a "Ask AI" button that sends the example to AI chat */
  askAIAction?: () => void;
  className?: string;
}

/**
 * Teaching empty state — principle #4 in action.
 * Never just says "No data" — always teaches what this view is for + gives a concrete example.
 */
export function TeachingEmptyState({
  icon: Icon, title, description, example, actionLabel, onAction, askAIAction, className,
}: TeachingEmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mb-3">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>
      {example && (
        <p className="text-xs text-muted-foreground/70 mt-2 italic max-w-sm">
          Try: "{example}"
        </p>
      )}
      <div className="flex gap-2 mt-4">
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            {actionLabel}
          </button>
        )}
        {askAIAction && (
          <button
            onClick={askAIAction}
            className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-accent/40 transition-colors"
          >
            Ask AI
          </button>
        )}
      </div>
    </div>
  );
}
