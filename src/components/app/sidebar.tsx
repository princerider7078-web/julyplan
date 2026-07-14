'use client';
import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { AnimatedLogo } from '@/components/app/animated-logo';
import { useAuth } from '@/lib/auth/context';
import { cn, todayISO } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  LayoutDashboard, ListChecks, FolderTree, Sunrise, Repeat,
  Wallet, CalendarDays, BarChart3, Settings, Flame, X,
  Brain, Sparkles, BookOpen, BookMarked, Cpu, FileText, LogOut,
  Bell, MessageCircle, Coffee, RotateCcw,
} from 'lucide-react';
import { SectionIcon } from './icon';

export type ViewKey =
  | 'dashboard' | 'today' | 'tasks' | 'sections'
  | 'routine' | 'habits' | 'finance' | 'monthly'
  | 'reports' | 'settings'
  | 'ai-chat' | 'ai-planner' | 'ai-reports'
  | 'journal' | 'knowledge' | 'dev'
  | 'memory' | 'briefing' | 'notifications' | 'history'
  | 'notif-prefs' | 'recovery';

interface NavItem {
  key: ViewKey;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: 'count' | 'wasted' | 'streak' | 'memories' | 'pending' | 'recovery';
  group: 'main' | 'life' | 'ai' | 'system';
}

const NAV: NavItem[] = [
  { key: 'dashboard', label: 'Home',        icon: LayoutDashboard, group: 'main' },
  { key: 'today',     label: 'Today',       icon: ListChecks, badge: 'count', group: 'main' },
  { key: 'tasks',     label: 'Tasks',       icon: FolderTree, group: 'main' },
  { key: 'sections',  label: 'Sections',    icon: SectionIcon as unknown as typeof LayoutDashboard, group: 'main' },
  { key: 'routine',   label: 'Routine',     icon: Sunrise, group: 'life' },
  { key: 'habits',    label: 'Habits',      icon: Repeat, badge: 'streak', group: 'life' },
  { key: 'finance',   label: 'Finance',     icon: Wallet, group: 'life' },
  { key: 'monthly',   label: 'July Plan',   icon: CalendarDays, badge: 'wasted', group: 'life' },
  { key: 'journal',   label: 'Journal',     icon: BookOpen, group: 'life' },
  { key: 'knowledge', label: 'Notes',       icon: BookMarked, group: 'life' },
  { key: 'ai-chat',    label: 'AI Assistant', icon: Brain, group: 'ai' },
  { key: 'briefing',   label: 'Briefing',     icon: Coffee, group: 'ai' },
  { key: 'ai-planner', label: 'Planner',      icon: Sparkles, group: 'ai' },
  { key: 'memory',     label: 'Memory',       icon: Brain, badge: 'memories', group: 'ai' },
  { key: 'notifications', label: 'Alerts',     icon: Bell, badge: 'pending', group: 'ai' },
  { key: 'notif-prefs',label: 'Alert Settings',icon: Bell, group: 'ai' },
  { key: 'recovery',   label: 'Recovery',     icon: RotateCcw, badge: 'recovery', group: 'ai' },
  { key: 'ai-reports', label: 'Reports',      icon: FileText, group: 'ai' },
  { key: 'history',    label: 'Chat Log',     icon: MessageCircle, group: 'ai' },
  { key: 'reports',   label: 'Analytics',  icon: BarChart3, group: 'system' },
  { key: 'dev',       label: 'AI Controls', icon: Cpu, group: 'system' },
  { key: 'settings',  label: 'Settings',   icon: Settings, group: 'system' },
];

const GROUP_LABELS: Record<NavItem['group'], string> = {
  main: 'Main',
  life: 'Life',
  ai: 'AI',
  system: 'System',
};

interface SidebarProps {
  current: ViewKey;
  onNavigate: (v: ViewKey) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ current, onNavigate, mobileOpen, onMobileClose }: SidebarProps) {
  const tasks = useStore((s) => s.tasks);
  const habits = useStore((s) => s.habits);
  const settings = useStore((s) => s.settings);
  const memories = useStore((s) => s.memories);
  const notifications = useStore((s) => s.aiNotifications);
  const { profile, isOffline, signOut } = useAuth();
  const today = todayISO();

  const todayPending = tasks.filter(
    (t) => t.status !== 'archived' && t.repeatRule !== 'none' && !t.completionLog?.[today],
  ).length + tasks.filter(
    (t) => t.status === 'pending' && t.repeatRule === 'none' && !t.completionLog?.[today],
  ).length;

  const activeMemories = memories.filter((m) => !m.archived && !m.disabled).length;
  const pendingNotifCount = notifications.filter((n) => n.status === 'pending').length;
  const recoveryQueue = useStore((s) => s.recoveryQueue);
  const recoveryCount = recoveryQueue.length;

  function getStreak(log: Record<string, boolean> | undefined) {
    if (!log) return 0;
    let streak = 0;
    const d = new Date();
    while (true) {
      const iso = d.toISOString().slice(0, 10);
      if (log[iso]) { streak++; d.setDate(d.getDate() - 1); } else break;
    }
    return streak;
  }
  const bestStreak = Math.max(0, ...habits.map((h) => getStreak(h.log)));

  function getMonthWasted() {
    const day = new Date().getDate();
    let wasted = 0;
    for (let i = 1; i < day; i++) {
      const d = new Date();
      d.setDate(i);
      const iso = d.toISOString().slice(0, 10);
      const done = habits.filter((h) => h.log[iso]).length;
      const pct = habits.length ? done / habits.length : 0;
      if (pct < 0.3) wasted++;
    }
    return wasted;
  }
  const wasted = getMonthWasted();

  const [pendingNotifCountState, setPendingNotifCountState] = useState(0);
  useEffect(() => {
    import('@/lib/notifications/service').then(({ getNotificationLog }) => {
      const log = getNotificationLog();
      const recent = log.filter((e) => !e.action).slice(0, 99).length;
      setPendingNotifCountState(recent);
    });
  }, [notifications]);

  const groups: NavItem['group'][] = ['main', 'life', 'ai', 'system'];

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          'fixed md:sticky top-0 left-0 z-50 md:z-auto',
          'h-screen w-[260px] shrink-0',
          'glass border-r border-sidebar-border',
          'flex flex-col transition-transform duration-300 ease-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <AnimatedLogo size={32} showText={false} className="shrink-0" />
            <div className="leading-tight">
              <div className="font-bold text-sm tracking-tight">July Plan</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Personal AI OS
              </div>
            </div>
          </div>
          <button
            className="md:hidden p-1.5 rounded-lg hover:bg-sidebar-accent transition-colors"
            onClick={onMobileClose}
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User badge */}
        {profile && (
          <div className="px-4 py-2.5 border-b border-sidebar-border flex items-center gap-2">
            <div className={cn(
              'h-2 w-2 rounded-full',
              isOffline ? 'bg-amber-500' : 'bg-emerald-500',
            )} />
            <span className="text-xs text-muted-foreground truncate">
              {isOffline ? 'Offline mode' : profile.email}
            </span>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto scroll-thin px-3 py-3 space-y-4">
          {groups.map((group) => {
            const items = NAV.filter((n) => n.group === group);
            if (items.length === 0) return null;
            return (
              <div key={group} className="space-y-0.5">
                <div className="px-3 text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold">
                  {GROUP_LABELS[group]}
                </div>
                {items.map((item) => {
                  const Icon = item.icon;
                  const active = current === item.key;
                  let badge: React.ReactNode = null;
                  if (item.badge === 'count' && todayPending > 0) {
                    badge = (
                      <span className="ml-auto text-[10px] bg-primary/15 text-primary rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center font-semibold">
                        {todayPending}
                      </span>
                    );
                  }
                  if (item.badge === 'streak' && bestStreak > 0) {
                    badge = (
                      <span className="ml-auto text-[10px] flex items-center gap-0.5 text-orange-500 font-semibold">
                        <Flame className="h-3 w-3" />{bestStreak}
                      </span>
                    );
                  }
                  if (item.badge === 'wasted') {
                    const danger = wasted >= settings.maxWastedDays;
                    badge = (
                      <span className={cn(
                        'ml-auto text-[10px] rounded-full px-2 py-0.5 font-semibold',
                        danger ? 'bg-red-500/20 text-red-500' : 'bg-muted text-muted-foreground',
                      )}>
                        {wasted}/{settings.maxWastedDays}
                      </span>
                    );
                  }
                  if (item.badge === 'memories' && activeMemories > 0) {
                    badge = (
                      <span className="ml-auto text-[10px] bg-violet-500/15 text-violet-500 rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center font-semibold">
                        {activeMemories}
                      </span>
                    );
                  }
                  if (item.badge === 'pending' && pendingNotifCountState > 0) {
                    badge = (
                      <span className="ml-auto text-[10px] bg-red-500/15 text-red-500 rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center font-semibold">
                        {pendingNotifCountState}
                      </span>
                    );
                  }
                  if (item.badge === 'recovery' && recoveryCount > 0) {
                    badge = (
                      <span className="ml-auto text-[10px] bg-orange-500/15 text-orange-500 rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center font-semibold">
                        {recoveryCount}
                      </span>
                    );
                  }
                  return (
                    <button
                      key={item.key}
                      onClick={() => { onNavigate(item.key); onMobileClose(); }}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium',
                        'transition-all duration-200',
                        active
                          ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                          : 'hover:bg-sidebar-accent text-sidebar-foreground/70 hover:text-sidebar-foreground',
                      )}
                    >
                      {item.key === 'sections' ? (
                        <SectionIcon name="FolderTree" className="h-[18px] w-[18px]" />
                      ) : (
                        <Icon className="h-[18px] w-[18px]" />
                      )}
                      <span>{item.label}</span>
                      {badge}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">July Progress</span>
            <span className="font-semibold">
              Day {new Date().getDate()} / 31
            </span>
          </div>
          <Progress value={(new Date().getDate() / 31) * 100} className="h-1.5" />
          {wasted >= settings.maxWastedDays && (
            <Badge variant="destructive" className="w-full justify-center text-[10px]">
              Missed-day limit reached
            </Badge>
          )}
          {profile && (
            <button
              onClick={() => signOut()}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out {isOffline ? '(exit offline)' : ''}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
