'use client';
import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth/context';
import { initSync } from '@/lib/sync';
import { Sidebar, type ViewKey } from '@/components/app/sidebar';
import { TaskDialog } from '@/components/app/task-dialog';
import { LoginScreen } from '@/components/app/auth/login';
import { DashboardView } from '@/components/app/views/dashboard';
import { TodayView } from '@/components/app/views/today';
import { TasksView } from '@/components/app/views/tasks';
import { SectionsView } from '@/components/app/views/sections';
import { RoutineView } from '@/components/app/views/routine';
import { HabitsView } from '@/components/app/views/habits';
import { FinanceView } from '@/components/app/views/finance';
import { MonthlyView } from '@/components/app/views/monthly';
import { ReportsView } from '@/components/app/views/reports';
import { SettingsView } from '@/components/app/views/settings';
import { AIChatView } from '@/components/app/views/ai-chat';
import { AIPlannerView } from '@/components/app/views/ai-planner';
import { AIReportsView } from '@/components/app/views/ai-reports';
import { JournalView } from '@/components/app/views/journal';
import { KnowledgeView } from '@/components/app/views/knowledge';
import { DevControlsView } from '@/components/app/views/dev-controls';
// V3 views
import { MemoryManagerView } from '@/components/app/views/memory-manager';
import { BriefingView } from '@/components/app/views/briefing';
import { NotificationCenterView } from '@/components/app/views/notification-center';
import { ConversationHistoryView } from '@/components/app/views/conversation-history';
// V4 views
import { NotificationPreferencesView } from '@/components/app/views/notification-preferences';
import { RecoveryQueueView } from '@/components/app/views/recovery-queue';
// V5: native notification system
import { NotificationLogView } from '@/components/app/views/notification-log';
import { NotificationToasts } from '@/components/app/notification-toasts';
import { Button } from '@/components/ui/button';
import { Menu, Plus, Bell, Loader2 } from 'lucide-react';
import { todayISO, formatDateLong } from '@/lib/utils';
import { SyncIndicator } from '@/components/app/sync-indicator';
import { PageTransition } from '@/components/app/animations';
import { LaunchAnimation } from '@/components/app/launch-animation';
import { AnimatedLogo } from '@/components/app/animated-logo';
import { getNotificationLog } from '@/lib/notifications/service';

export default function Home() {
  const [view, setView] = useState<ViewKey>('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);

  const markOpened = useStore((s) => s.markOpened);
  const notificationsEnabled = useStore((s) => s.settings.notificationsEnabled);
  const soundEnabled = useStore((s) => s.settings.soundEnabled);
  const tasks = useStore((s) => s.tasks);
  const toggleTaskComplete = useStore((s) => s.toggleTaskComplete);
  const { profile, loading, isOffline } = useAuth();

  // Mark app opened on mount
  useEffect(() => { markOpened(); }, [markOpened]);

  // Initialize Supabase sync when authed
  useEffect(() => {
    if (profile?.id && !isOffline) {
      initSync(profile.id);
    }
  }, [profile, isOffline]);

  // ---------- Native notification system (V5) ----------
  // Initializes Capacitor LocalNotifications (native) or browser notifications (web).
  // Schedules reminders for all tasks with times: at task time + 10 min before,
  // + 1 hour / 1 day before for high/critical. Also deadline alerts + daily briefing.
  const autoTaskNotifications = useStore((s) => s.settings.autoTaskNotifications);

  useEffect(() => {
    if (!autoTaskNotifications || !notificationsEnabled) return;
    if (typeof window === 'undefined') return;

    let cancelled = false;

    async function initNotifSystem() {
      try {
        // Init native notification service (Capacitor + browser fallback)
        const { initNotifications } = await import('@/lib/notifications/service');
        await initNotifications();

        if (cancelled) return;

        // Schedule all task reminders
        const { rescheduleAll } = await import('@/lib/notifications/scheduler');
        await rescheduleAll();
      } catch (e) {
        console.warn('[Notif] Init failed:', e);
      }
    }

    initNotifSystem();

    return () => { cancelled = true; };
  }, [autoTaskNotifications, notificationsEnabled]);

  // Track unread notification count for bell icon badge
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  useEffect(() => {
    const update = () => {
      const log = getNotificationLog();
      const recent = log.filter((e) => !e.action).length;
      setUnreadNotifCount(Math.min(recent, 99));
    };
    update();
    const interval = setInterval(update, 5000);  // refresh every 5s
    return () => clearInterval(interval);
  }, [view]);  // refresh when view changes too

  function playCompleteSound() {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch { /* ignore */ }
  }

  function handleToggleTask(id: string) {
    const task = tasks.find((t) => t.id === id);
    const wasDone = !!task?.completionLog?.[todayISO()];
    toggleTaskComplete(id);
    if (!wasDone) playCompleteSound();
  }

  // ---------- Loading state ----------
  if (loading) {
    return (
      <LaunchAnimation>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center space-y-4">
            <AnimatedLogo size={80} showText={false} className="mx-auto" />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading July Plan…
            </div>
          </div>
        </div>
      </LaunchAnimation>
    );
  }

  // ---------- Auth gate ----------
  if (!profile) {
    return (
      <LaunchAnimation>
        <LoginScreen />
      </LaunchAnimation>
    );
  }

  const today = todayISO();

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar
        current={view}
        onNavigate={setView}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header */}
        <header className="h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70 sticky top-0 z-30 flex items-center gap-3 px-4 md:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">
              {view === 'dashboard' && 'Dashboard'}
              {view === 'today' && 'Today Plan'}
              {view === 'tasks' && 'Tasks'}
              {view === 'sections' && 'Sections'}
              {view === 'routine' && 'Daily Routine'}
              {view === 'habits' && 'Habits'}
              {view === 'finance' && 'Finance'}
              {view === 'monthly' && 'July Plan'}
              {view === 'reports' && 'Analytics'}
              {view === 'settings' && 'Settings'}
              {view === 'ai-chat' && 'AI Assistant'}
              {view === 'ai-planner' && 'AI Planner'}
              {view === 'ai-reports' && 'AI Reports'}
              {view === 'journal' && 'Journal'}
              {view === 'knowledge' && 'Knowledge Base'}
              {view === 'dev' && 'AI Controls'}
              {view === 'memory' && 'AI Memory Manager'}
              {view === 'briefing' && 'Daily Briefing'}
              {view === 'notifications' && 'Notifications'}
              {view === 'history' && 'Conversation History'}
              {view === 'notif-prefs' && 'Notification Preferences'}
              {view === 'recovery' && 'Recovery Queue'}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {formatDateLong(today)}
              {isOffline && ' · offline'}
            </div>
          </div>
          <SyncIndicator className="mr-1" />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Notifications"
            className="relative"
            onClick={() => setView('notifications')}
          >
            <Bell className="h-4 w-4" />
            {unreadNotifCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadNotifCount > 99 ? '99+' : unreadNotifCount}
              </span>
            )}
          </Button>
          <Button onClick={() => setTaskDialogOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" /> New
          </Button>
        </header>

        {/* In-app notification toasts (always visible, even if browser blocks system notifications) */}
        <NotificationToasts />

        {/* Main content */}
        <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto">
          <PageTransition viewKey={view}>
          {view === 'dashboard' && <DashboardView onNavigate={setView} onAddTask={() => setTaskDialogOpen(true)} />}
          {view === 'today' && <TodayView onAddTask={() => setTaskDialogOpen(true)} />}
          {view === 'tasks' && <TasksView />}
          {view === 'sections' && <SectionsView />}
          {view === 'routine' && <RoutineView />}
          {view === 'habits' && <HabitsView />}
          {view === 'finance' && <FinanceView />}
          {view === 'monthly' && <MonthlyView onNavigate={setView} />}
          {view === 'reports' && <ReportsView />}
          {view === 'settings' && <SettingsView />}
          {view === 'ai-chat' && <AIChatView onNavigate={setView} />}
          {view === 'ai-planner' && <AIPlannerView />}
          {view === 'ai-reports' && <AIReportsView />}
          {view === 'journal' && <JournalView />}
          {view === 'knowledge' && <KnowledgeView />}
          {view === 'dev' && <DevControlsView />}
          {/* V3 views */}
          {view === 'memory' && <MemoryManagerView />}
          {view === 'briefing' && <BriefingView onNavigate={setView} />}
          {view === 'notifications' && <NotificationLogView onNavigate={setView} />}
          {view === 'history' && <ConversationHistoryView />}
          {/* V4 views */}
          {view === 'notif-prefs' && <NotificationPreferencesView />}
          {view === 'recovery' && <RecoveryQueueView />}
          </PageTransition>
        </main>

        {/* Footer */}
        <footer className="mt-auto border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70 px-4 md:px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-muted-foreground">
            <span>July Plan V2 · Personal AI OS</span>
            <span className="hidden sm:inline">
              {isOffline ? 'Offline mode · localStorage only' : 'Supabase synced · AI brain active'}
            </span>
          </div>
        </footer>
      </div>

      <TaskDialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen} />
    </div>
  );
}
