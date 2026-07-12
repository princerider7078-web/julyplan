'use client';
import { useEffect, useState } from 'react';
import { getSyncStatus, onSyncStatusChange, type SyncStatus } from '@/lib/sync';
import { useAuth } from '@/lib/auth/context';
import { Cloud, CloudOff, RefreshCw, Check, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SyncIndicator({ className }: { className?: string }) {
  const [status, setStatus] = useState<SyncStatus>('idle');
  const { isOffline, profile } = useAuth();

  useEffect(() => {
    const unsub = onSyncStatusChange(setStatus);
    // Defer initial status read to microtask
    queueMicrotask(() => setStatus(getSyncStatus()));
    return unsub;
  }, []);

  // Don't show if offline mode or not logged in
  if (isOffline || !profile || profile.id === 'offline-user') {
    return (
      <div className={cn('flex items-center gap-1 text-xs text-muted-foreground', className)}>
        <CloudOff className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Local only</span>
      </div>
    );
  }

  const config = {
    idle: { icon: Cloud, color: 'text-muted-foreground', label: 'Synced' },
    syncing: { icon: RefreshCw, color: 'text-amber-500 animate-spin', label: 'Syncing...' },
    synced: { icon: Check, color: 'text-emerald-500', label: 'Synced' },
    error: { icon: AlertTriangle, color: 'text-red-500', label: 'Sync error' },
  }[status];

  const Icon = config.icon;

  return (
    <div className={cn('flex items-center gap-1 text-xs', config.color, className)}>
      <Icon className={cn('h-3.5 w-3.5', status === 'syncing' && 'animate-spin')} />
      <span className="hidden sm:inline">{config.label}</span>
    </div>
  );
}
