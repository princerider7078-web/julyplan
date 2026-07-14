'use client';
import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth/context';
import { initSync } from '@/lib/sync';
import { TaskDialog } from '@/components/app/task-dialog';
import { LoginScreen } from '@/components/app/auth/login';
import { MobileShell } from '@/components/app/mobile-shell';
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
import { Loader2 } from 'lucide-react';
import { todayISO } from '@/lib/utils';
import { LaunchAnimation } from '@/components/app/launch-animation';
import { AnimatedLogo } from '@/components/app/animated-logo';
import { getNotificationLog } from '@/lib/notifications/service';
import type { ViewKey } from '@/components/app/sidebar';

// Title + subtitle per view for the Material 3 TopAppBar
const VIEW_META: Record<ViewKey, { title: string; subtitle?: string }> = {
  dashboard:     { title: 'July Plan',       subtitle: 'Personal AI Operating System' },
  today:         { title: 'Today',           subtitle: "Today's tasks & focus" },
  tasks:         { title: 'Tasks',           subtitle: 'All your tasks' },
  sections:      { title: 'Sections',        subtitle: 'Life areas & categories' },
  routine:       { title: 'Routine',         subtitle: 'Daily timeline' },
  habits:        { title: 'Habits',          subtitle: 'Build discipline daily' },
  finance:       { title: 'Finance',         subtitle: 'Track spending & income' },
  monthly:       { title: 'July Plan',       subtitle: 'Month overview & themes' },
  reports:       { title: 'Analytics',       subtitle: 'Insights & trends' },
  settings:      { title: 'Settings',        subtitle: 'Configure your app' },
  'ai-chat':     { title: 'AI Assistant',    subtitle: 'Ask anything, anytime' },
  'ai-planner':  { title: 'AI Planner',      subtitle: 'Draft your day with AI' },
  'ai-reports':  { title: 'AI Reports',      subtitle: 'Generated insights' },
  journal:       { title: 'Journal',         subtitle: 'Your thoughts & reflections' },
  knowledge:     { title: 'Notes',           subtitle: 'Knowledge base' },
  dev:           { title: 'AI Controls',     subtitle: 'Advanced AI settings' },
  memory:        { title: 'Memory',          subtitle: 'What AI remembers about you' },
  briefing:      { title: 'Daily Briefing',  subtitle: 'Your AI-prepared summary' },
  notifications: { title: 'Alerts',          subtitle: 'Recent notifications' },
  history:       { title: 'Chat Log',        subtitle: 'AI conversation history' },
  'notif-prefs': { title: 'Alert Settings',  subtitle: 'Tune your reminders' },
  recovery:      { title: 'Recovery',        subtitle: 'Catch-up queue' },
};

export default function Home() {
  const [view, setView] = useState<ViewKey>('dashboard');
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
  const autoTaskNotifications = useStore((s) => s.settings.autoTaskNotifications);

  useEffect(() => {
    if (!autoTaskNotifications || !notificationsEnabled) return;
    if (typeof window === 'undefined') return;

    let cancelled = false;

    async function initNotifSystem() {
      try {
        const { initNotifications } = await import('@/lib/notifications/service');
        await initNotifications();

        if (cancelled) return;

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
    const interval = setInterval(update, 5000);
    return () => clearInterval(interval);
  }, [view]);

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
        <div className="min-h-[100dvh] flex items-center justify-center bg-background">
          <div className="text-center space-y-4">
            <AnimatedLogo size={72} showText={false} className="mx-auto" />
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

  const meta = VIEW_META[view] ?? { title: 'July Plan' };

  return (
    <>
      <MobileShell
        current={view}
        onNavigate={setView}
        onAddTask={() => setTaskDialogOpen(true)}
        title={meta.title}
        subtitle={meta.subtitle}
        onBellClick={() => setView('notifications')}
        unreadCount={unreadNotifCount}
      >
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
      </MobileShell>

      {/* In-app notification toasts (rendered above mobile shell) */}
      <NotificationToasts />

      <TaskDialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen} />
    </>
  );
}
