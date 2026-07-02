'use client';
import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import {
  getNotificationLog,
  getNotificationAnalytics,
  clearNotificationLog,
  getPendingNotifications,
  sendTestNotification,
  requestNotificationPermission,
  getPermissionStatus,
  type NotificationLogEntry,
  type ScheduledNotification,
} from '@/lib/notifications/service';
import { rescheduleAll } from '@/lib/notifications/scheduler';
import { CHANNELS } from '@/lib/notifications/channels';
import { isNative } from '@/lib/notifications/platform';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Bell, Trash2, RefreshCw, Clock, CheckCircle2, AlertTriangle,
  BarChart3, History, Smartphone, Globe, Zap, Send,
} from 'lucide-react';
import { formatDateLong, formatTime12, cn } from '@/lib/utils';
import type { ViewKey } from '../sidebar';

interface Props {
  onNavigate: (v: ViewKey) => void;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  mark_done: { label: '✅ Done', color: 'text-emerald-500' },
  snooze_15: { label: '⏰ Snoozed 15m', color: 'text-amber-500' },
  snooze_30: { label: '⏰ Snoozed 30m', color: 'text-amber-500' },
  snooze_60: { label: '⏰ Snoozed 1h', color: 'text-amber-500' },
  skip: { label: '⏭ Skipped', color: 'text-muted-foreground' },
  start_now: { label: '▶ Started', color: 'text-emerald-500' },
  reschedule: { label: '📅 Rescheduled', color: 'text-cyan-500' },
  ask_ai: { label: '🤖 Asked AI', color: 'text-violet-500' },
  view_tasks: { label: '📋 Viewed', color: 'text-blue-500' },
};

export function NotificationLogView({ onNavigate }: Props) {
  const tasks = useStore((s) => s.tasks);
  const [log, setLog] = useState<NotificationLogEntry[]>([]);
  const [pending, setPending] = useState<ScheduledNotification[]>([]);
  const [analytics, setAnalytics] = useState(getNotificationAnalytics());
  const [refreshing, setRefreshing] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testBusy, setTestBusy] = useState(false);
  const [permission, setPermission] = useState<'granted' | 'denied' | 'default' | 'unknown'>('unknown');
  const [platform, setPlatform] = useState<'native' | 'web'>('web');

  async function refresh() {
    setRefreshing(true);
    setLog(getNotificationLog());
    setAnalytics(getNotificationAnalytics());
    setPermission(getPermissionStatus());
    setPlatform(isNative() ? 'native' : 'web');
    const pendingNotifs = await getPendingNotifications();
    setPending(pendingNotifs);
    setRefreshing(false);
  }

  useEffect(() => {
    queueMicrotask(() => { refresh(); });
    // Refresh every 30s to pick up new notifications
    const interval = setInterval(() => {
      setLog(getNotificationLog());
      setAnalytics(getNotificationAnalytics());
      setPermission(getPermissionStatus());
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  async function handleRescheduleAll() {
    setRefreshing(true);
    await rescheduleAll();
    await refresh();
  }

  async function handleEnableNotifications() {
    const result = await requestNotificationPermission();
    setPermission(result ? 'granted' : 'denied');
    if (result) {
      setTestResult('✅ Permission granted! Now click "Send Test" to verify.');
    } else {
      setTestResult('❌ Permission denied. Check your browser settings to allow notifications for this site.');
    }
  }

  async function handleSendTest() {
    setTestBusy(true);
    const result = await sendTestNotification();
    setTestResult(result.message);
    setTestBusy(false);
    // Refresh log after a moment to show the test entry
    setTimeout(() => refresh(), 500);
  }

  function handleClearLog() {
    if (confirm('Clear notification history? This cannot be undone.')) {
      clearNotificationLog();
      refresh();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">System Notifications</p>
          <h1 className="text-3xl font-bold tracking-tight mt-1 flex items-center gap-2">
            <Bell className="h-7 w-7 text-primary" />
            Notifications
          </h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
            {platform === 'native' ? (
              <><Smartphone className="h-3.5 w-3.5 text-emerald-500" /> Native Android notifications · channels · action buttons</>
            ) : (
              <><Globe className="h-3.5 w-3.5 text-amber-500" /> Web mode · browser notifications (limited)</>
            )}
            <span className="ml-2">
              Permission:
              <Badge variant="outline" className={cn(
                'ml-1 text-[10px]',
                permission === 'granted' && 'text-emerald-500 border-emerald-500/40',
                permission === 'denied' && 'text-red-500 border-red-500/40',
                permission === 'default' && 'text-amber-500 border-amber-500/40',
              )}>
                {permission === 'granted' ? '✅ Granted' : permission === 'denied' ? '❌ Denied' : permission === 'default' ? '⚠ Not asked' : '? Unknown'}
              </Badge>
            </span>
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {permission !== 'granted' && (
            <Button size="sm" onClick={handleEnableNotifications}>
              <Bell className="h-3.5 w-3.5 mr-1" /> Enable Notifications
            </Button>
          )}
          <Button size="sm" onClick={handleSendTest} disabled={testBusy}>
            <Send className="h-3.5 w-3.5 mr-1" />
            {testBusy ? 'Sending...' : 'Send Test'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleRescheduleAll} disabled={refreshing}>
            <RefreshCw className={cn('h-3.5 w-3.5 mr-1', refreshing && 'animate-spin')} />
            Reschedule All
          </Button>
          <Button variant="outline" size="sm" onClick={() => onNavigate('notif-prefs')}>
            Preferences
          </Button>
        </div>
      </div>

      {/* Test result banner */}
      {testResult && (
        <div className={cn(
          'p-3 rounded-md border text-sm',
          testResult.startsWith('✅') && 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300',
          testResult.startsWith('❌') && 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300',
          !testResult.startsWith('✅') && !testResult.startsWith('❌') && 'bg-primary/5 border-primary/20',
        )}>
          {testResult}
        </div>
      )}

      {/* Web mode warning + enable button */}
      {platform === 'web' && permission !== 'granted' && (
        <Card className="border-l-4 border-l-amber-500 bg-amber-500/5">
          <CardContent className="p-3 flex items-center justify-between gap-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <div className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                  Browser notifications need permission
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Click "Enable Notifications" above. Then "Send Test" to verify. Notifications fire only when this tab is open — install the APK for full background notifications.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analytics Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Bell className="h-3 w-3" /> Sent
            </div>
            <div className="text-2xl font-bold">{analytics.totalSent}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Completed
            </div>
            <div className="text-2xl font-bold text-emerald-500">{analytics.completionRate}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> Snoozed
            </div>
            <div className="text-2xl font-bold text-amber-500">{analytics.snoozeRate}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Ignored
            </div>
            <div className="text-2xl font-bold text-red-500">{analytics.ignoreRate}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Zap className="h-3 w-3" /> Pending
            </div>
            <div className="text-2xl font-bold text-primary">{pending.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Channel breakdown */}
      {Object.keys(analytics.byChannel).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Notifications by Channel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(analytics.byChannel).map(([channelId, count]) => {
              const channel = CHANNELS.find((c) => c.id === channelId);
              const pct = analytics.totalSent > 0 ? (count / analytics.totalSent) * 100 : 0;
              return (
                <div key={channelId} className="flex items-center gap-3">
                  <span className="text-xs w-24">{channel?.name ?? channelId}</span>
                  <Progress value={pct} className="h-2 flex-1" />
                  <span className="text-xs font-medium w-8 text-right">{count}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Pending (scheduled) notifications */}
      {pending.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Scheduled ({pending.length})
            </CardTitle>
            <CardDescription>Upcoming notifications waiting to fire</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 max-h-64 overflow-y-auto scroll-thin">
            {pending.slice(0, 20).map((n) => (
              <div key={n.id} className="flex items-center gap-2 p-2 rounded-md border text-xs">
                <div
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ background: CHANNELS.find((c) => c.id === n.channelId)?.ledColor ?? '#64748b' }}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{n.title}</div>
                  <div className="text-muted-foreground truncate">{n.body}</div>
                </div>
                <div className="text-muted-foreground shrink-0">
                  {formatTime12(n.scheduledAt.toISOString().slice(11, 16))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Notification Log / History */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                Notification History
              </CardTitle>
              <CardDescription>{log.length} notifications fired</CardDescription>
            </div>
            {log.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleClearLog} className="text-red-500">
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {log.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No notifications fired yet. Add tasks with times and they'll fire automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-96 overflow-y-auto scroll-thin">
              {log.slice(0, 50).map((entry) => {
                const channel = CHANNELS.find((c) => c.id === entry.channelId);
                const action = entry.action ? ACTION_LABELS[entry.action] : null;
                const task = entry.taskId ? tasks.find((t) => t.id === entry.taskId) : null;
                return (
                  <div key={entry.id} className="flex items-start gap-2 p-2 rounded-md border text-xs">
                    <div
                      className="h-2 w-2 rounded-full mt-1.5 shrink-0"
                      style={{ background: channel?.ledColor ?? '#64748b' }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium truncate">{entry.title}</span>
                        {channel && (
                          <Badge variant="outline" className="text-[9px]">{channel.name}</Badge>
                        )}
                        {action && (
                          <Badge variant="outline" className={cn('text-[9px] border-0', action.color)}>
                            {action.label}
                          </Badge>
                        )}
                      </div>
                      <div className="text-muted-foreground truncate mt-0.5">{entry.body}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {formatDateLong(entry.firedAt.slice(0, 10))} · {formatTime12(entry.firedAt.slice(11, 16))}
                        {task && ` · ${task.title}`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info banner */}
      <Card className={cn(
        'border-l-4',
        platform === 'native' ? 'border-l-emerald-500' : 'border-l-amber-500',
      )}>
        <CardContent className="p-3 text-xs">
          {platform === 'native' ? (
            <div className="flex items-start gap-2">
              <Smartphone className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold text-emerald-600 dark:text-emerald-400">Native Android Notifications Active</div>
                <p className="text-muted-foreground mt-1">
                  Notifications fire in the system tray + lock screen, even when the app is closed.
                  Action buttons (Mark Done, Snooze, Ask AI) work directly from the notification.
                  Channels can be controlled independently in Android Settings → App → July Plan → Notifications.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <Globe className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold text-amber-600 dark:text-amber-400">Web Mode (Limited Notifications)</div>
                <p className="text-muted-foreground mt-1">
                  Browser notifications only fire when the tab is open. For full background notifications,
                  install the Android APK — it uses native Android notifications with channels, action buttons,
                  and background scheduling that works even when the app is closed.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
