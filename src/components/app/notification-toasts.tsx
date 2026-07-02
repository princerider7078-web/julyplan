'use client';
import { useToastStore } from '@/lib/notifications/toast';
import { CHANNELS } from '@/lib/notifications/channels';
import { X, Bell, CheckCircle2 } from 'lucide-react';
import { cn, formatTime12 } from '@/lib/utils';

export function NotificationToasts() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-16 right-4 z-[100] space-y-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const channel = CHANNELS.find((c) => c.id === toast.channelId);
        const color = channel?.ledColor ?? '#64748b';
        return (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto rounded-lg border-l-4 bg-card shadow-lg p-3',
              'animate-in slide-in-from-right-full duration-300',
            )}
            style={{ borderLeftColor: color }}
          >
            <div className="flex items-start gap-2">
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `${color}20` }}
              >
                <Bell className="h-4 w-4" style={{ color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-sm truncate">{toast.title}</span>
                  {toast.systemShown && (
                    <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{toast.body}</p>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {formatTime12(toast.timestamp.slice(11, 16))}
                  {channel && ` · ${channel.name}`}
                  {!toast.systemShown && ' · in-app only'}
                </div>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-muted-foreground hover:text-foreground shrink-0"
                aria-label="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
