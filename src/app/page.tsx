'use client';
import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { Sidebar, type ViewKey } from '@/components/app/sidebar';
import { TaskDialog } from '@/components/app/task-dialog';
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
import { Button } from '@/components/ui/button';
import { Menu, Plus, Bell } from 'lucide-react';
import { todayISO, formatDateLong } from '@/lib/utils';

export default function Home() {
  const [view, setView] = useState<ViewKey>('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);

  const markOpened = useStore((s) => s.markOpened);
  const notificationsEnabled = useStore((s) => s.settings.notificationsEnabled);
  const soundEnabled = useStore((s) => s.settings.soundEnabled);
  const tasks = useStore((s) => s.tasks);
  const toggleTaskComplete = useStore((s) => s.toggleTaskComplete);

  // Mark app opened on mount
  useEffect(() => { markOpened(); }, [markOpened]);

  // ---------- Offline reminder system (browser Notification API) ----------
  useEffect(() => {
    if (!notificationsEnabled) return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, [notificationsEnabled]);

  // Check for due reminders every 60s
  useEffect(() => {
    if (!notificationsEnabled) return;
    const interval = setInterval(() => {
      if (typeof window === 'undefined' || !('Notification' in window)) return;
      if (Notification.permission !== 'granted') return;
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const today = todayISO();
      // Find tasks with reminder matching current time, not yet done today
      const due = tasks.filter(
        (t) => t.reminderTime === hhmm && t.status !== 'archived' && !t.completionLog?.[today],
      );
      due.forEach((t) => {
        try {
          new Notification('July Plan reminder', {
            body: t.title,
            tag: t.id,
          });
        } catch { /* ignore */ }
      });
    }, 60_000);
    return () => clearInterval(interval);
  }, [notificationsEnabled, tasks]);

  // ---------- Completion sound ----------
  useEffect(() => {
    if (!soundEnabled) return;
    // Play a soft tone via Web Audio on task completion
    // We use a simple AudioContext; only on user gesture it'll work
  }, [soundEnabled]);

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

  // Wrap toggle to also play sound
  function handleToggleTask(id: string) {
    const task = tasks.find((t) => t.id === id);
    const wasDone = !!task?.completionLog?.[todayISO()];
    toggleTaskComplete(id);
    if (!wasDone) playCompleteSound();
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
              {view === 'reports' && 'Reports'}
              {view === 'settings' && 'Settings'}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {formatDateLong(today)}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Notifications"
            onClick={() => {
              if (notificationsEnabled && 'Notification' in window && Notification.permission === 'default') {
                Notification.requestPermission();
              }
            }}
          >
            <Bell className="h-4 w-4" />
          </Button>
          <Button onClick={() => setTaskDialogOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" /> New
          </Button>
        </header>

        {/* Main content */}
        <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto">
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
        </main>

        {/* Footer */}
        <footer className="mt-auto border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70 px-4 md:px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-muted-foreground">
            <span>July Plan · Personal Execution OS</span>
            <span className="hidden sm:inline">
              Offline-first · Local storage · No internet required
            </span>
          </div>
        </footer>
      </div>

      <TaskDialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen} />
    </div>
  );
}
