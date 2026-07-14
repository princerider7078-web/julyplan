'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth/context';
import { cn, todayISO } from '@/lib/utils';
import { SyncIndicator } from './sync-indicator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Home, ListChecks, Brain, Flame, LayoutGrid,
  Wallet, CalendarDays, BookOpen, BookMarked, Sunrise,
  Sparkles, Coffee, FileText, Bell, RotateCcw,
  BarChart3, Cpu, Settings as SettingsIcon, Plus,
  ChevronRight, LogOut, FolderTree, MessageCircle,
  Cloud, CloudOff, X,
} from 'lucide-react';
import { SectionIcon } from './icon';
import type { ViewKey } from './sidebar';

// ════════════════════════════════════════════════════════
// Bottom Navigation — Material 3 NavigationBar (5 destinations)
// ════════════════════════════════════════════════════════
interface BottomNavProps {
  current: ViewKey;
  onNavigate: (v: ViewKey) => void;
  onMore: () => void;
}

const PRIMARY_DESTINATIONS: { key: ViewKey; label: string; icon: typeof Home }[] = [
  { key: 'dashboard', label: 'Home',  icon: Home },
  { key: 'today',     label: 'Today', icon: ListChecks },
  { key: 'ai-chat',   label: 'AI',    icon: Brain },
  { key: 'habits',    label: 'Habits',icon: Flame },
];

export function BottomNav({ current, onNavigate, onMore }: BottomNavProps) {
  const tasks = useStore((s) => s.tasks);
  const habits = useStore((s) => s.habits);
  const today = todayISO();

  // Badge count for "Today"
  const todayPending =
    tasks.filter((t) => t.status !== 'archived' && t.repeatRule !== 'none' && !t.completionLog?.[today]).length +
    tasks.filter((t) => t.status === 'pending' && t.repeatRule === 'none' && !t.completionLog?.[today]).length;

  // Best streak for Habits badge
  function getStreak(log?: Record<string, boolean>) {
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

  const isMoreActive = !PRIMARY_DESTINATIONS.some((d) => d.key === current);

  return (
    <nav
      className="absolute bottom-0 left-0 right-0 z-30 glass-strong border-t border-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Primary navigation"
    >
      <div className="grid grid-cols-5 h-16 px-2">
        {PRIMARY_DESTINATIONS.map((dest) => {
          const Icon = dest.icon;
          const active = current === dest.key;
          let badge: React.ReactNode = null;
          if (dest.key === 'today' && todayPending > 0) {
            badge = (
              <span className="absolute top-1.5 right-1/2 translate-x-3 h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                {todayPending > 99 ? '99+' : todayPending}
              </span>
            );
          }
          if (dest.key === 'habits' && bestStreak > 0) {
            badge = (
              <span className="absolute top-1.5 right-1/2 translate-x-3 h-4 min-w-4 px-1 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center">
                {bestStreak}
              </span>
            );
          }
          return (
            <button
              key={dest.key}
              onClick={() => onNavigate(dest.key)}
              className={cn(
                'relative flex flex-col items-center justify-center gap-0.5 rounded-2xl transition-all',
                'state-layer text-muted-foreground',
                active && 'text-primary',
              )}
              aria-label={dest.label}
              aria-current={active ? 'page' : undefined}
            >
              <motion.span
                layout
                className={cn(
                  'flex items-center justify-center h-8 w-14 rounded-full transition-all',
                  active && 'gradient-primary text-primary',
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
              </motion.span>
              <span className={cn(
                'text-[11px] font-medium leading-none transition-colors',
                active ? 'font-bold text-primary' : 'text-muted-foreground',
              )}>
                {dest.label}
              </span>
              {badge}
            </button>
          );
        })}
        {/* More button */}
        <button
          onClick={onMore}
          className={cn(
            'relative flex flex-col items-center justify-center gap-0.5 rounded-2xl transition-all',
            'state-layer text-muted-foreground',
            isMoreActive && 'text-primary',
          )}
          aria-label="More navigation"
        >
          <motion.span
            layout
            className={cn(
              'flex items-center justify-center h-8 w-14 rounded-full transition-all',
              isMoreActive && 'gradient-primary text-primary',
            )}
          >
            <LayoutGrid className="h-5 w-5" strokeWidth={isMoreActive ? 2.5 : 2} />
          </motion.span>
          <span className={cn(
            'text-[11px] font-medium leading-none transition-colors',
            isMoreActive ? 'font-bold text-primary' : 'text-muted-foreground',
          )}>
            More
          </span>
        </button>
      </div>
    </nav>
  );
}

// ════════════════════════════════════════════════════════
// Top App Bar — Material 3 Small TopAppBar
// ════════════════════════════════════════════════════════
interface AppBarProps {
  title: string;
  subtitle?: string;
  onBellClick: () => void;
  unreadCount?: number;
  showLogo?: boolean;
}

export function AppBar({ title, subtitle, onBellClick, unreadCount = 0, showLogo = true }: AppBarProps) {
  return (
    <header
      className="absolute top-0 left-0 right-0 z-30 glass border-b border-border"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="flex items-center justify-between h-14 px-3 gap-2">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {showLogo && (
            <div className="h-8 w-8 rounded-xl gradient-primary-strong p-0.5 shrink-0 shadow-md">
              <img
                src="/logo.png"
                alt="July Plan"
                className="h-full w-full rounded-lg object-cover"
              />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold truncate leading-tight">{title}</div>
            {subtitle && (
              <div className="text-[11px] text-muted-foreground truncate leading-tight">{subtitle}</div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <SyncIndicator className="mr-0.5 text-[11px]" />
          <button
            onClick={onBellClick}
            className="relative h-9 w-9 rounded-full flex items-center justify-center state-layer text-foreground hover:bg-accent"
            aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
          >
            <Bell className="h-4.5 w-4.5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

// ════════════════════════════════════════════════════════
// Extended FAB — Material 3 "Add" action
// ════════════════════════════════════════════════════════
interface FabProps {
  onClick: () => void;
  label?: string;
}

export function ExtendedFab({ onClick, label = 'Add Task' }: FabProps) {
  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.2, type: 'spring', stiffness: 380, damping: 26 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        'absolute right-4 z-40 h-14 px-5 rounded-2xl flex items-center gap-2',
        'gradient-primary-strong text-white font-bold text-sm',
        'shadow-xl transition-shadow',
      )}
      style={{
        bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
        boxShadow: 'var(--elevation-4), 0 0 24px color-mix(in oklch, var(--grad-from) 30%, transparent)',
      }}
      aria-label={label}
    >
      <Plus className="h-5 w-5" strokeWidth={3} />
      <span className="pr-1">{label}</span>
    </motion.button>
  );
}

// ════════════════════════════════════════════════════════
// More Sheet — Modal Bottom Sheet for full navigation
// ════════════════════════════════════════════════════════
interface MoreSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  current: ViewKey;
  onNavigate: (v: ViewKey) => void;
}

type NavGroupKey = 'tasks' | 'life' | 'ai' | 'system';
interface NavEntry { key: ViewKey; label: string; icon: typeof Home; badge?: () => React.ReactNode }

const MORE_NAV_GROUPS: { group: NavGroupKey; label: string; items: NavEntry[] }[] = [
  {
    group: 'tasks', label: 'Tasks & Plan',
    items: [
      { key: 'tasks',    label: 'Tasks',    icon: FolderTree },
      { key: 'sections', label: 'Sections', icon: SectionIcon as unknown as typeof Home },
      { key: 'routine',  label: 'Routine',  icon: Sunrise },
      { key: 'monthly',  label: 'July Plan',icon: CalendarDays },
    ],
  },
  {
    group: 'life', label: 'Life',
    items: [
      { key: 'finance',   label: 'Finance', icon: Wallet },
      { key: 'journal',   label: 'Journal', icon: BookOpen },
      { key: 'knowledge', label: 'Notes',   icon: BookMarked },
    ],
  },
  {
    group: 'ai', label: 'AI & Insights',
    items: [
      { key: 'ai-planner',  label: 'AI Planner',   icon: Sparkles },
      { key: 'briefing',    label: 'Daily Briefing', icon: Coffee },
      { key: 'memory',      label: 'Memory',       icon: Brain },
      { key: 'ai-reports',  label: 'AI Reports',   icon: FileText },
      { key: 'history',     label: 'Chat Log',     icon: MessageCircle },
      { key: 'notifications',label: 'Alerts',      icon: Bell },
      { key: 'notif-prefs', label: 'Alert Settings', icon: Bell },
      { key: 'recovery',    label: 'Recovery',     icon: RotateCcw },
    ],
  },
  {
    group: 'system', label: 'System',
    items: [
      { key: 'reports', label: 'Analytics',  icon: BarChart3 },
      { key: 'dev',     label: 'AI Controls',icon: Cpu },
      { key: 'settings',label: 'Settings',   icon: SettingsIcon },
    ],
  },
];

export function MoreSheet({ open, onOpenChange, current, onNavigate }: MoreSheetProps) {
  const habits = useStore((s) => s.habits);
  const memories = useStore((s) => s.memories);
  const recoveryQueue = useStore((s) => s.recoveryQueue);
  const aiNotifications = useStore((s) => s.aiNotifications);
  const settings = useStore((s) => s.settings);
  const { profile, isOffline, signOut } = useAuth();

  // Pre-compute badge values
  const activeMemories = memories.filter((m) => !m.archived && !m.disabled).length;
  const recoveryCount = recoveryQueue.length;
  const pendingNotif = aiNotifications.filter((n) => n.status === 'pending').length;

  function getStreak(log?: Record<string, boolean>) {
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

  function handleNavigate(v: ViewKey) {
    onNavigate(v);
    onOpenChange(false);
  }

  function renderBadge(item: NavEntry): React.ReactNode {
    if (item.key === 'memory' && activeMemories > 0) {
      return <Badge variant="secondary" className="bg-violet-500/15 text-violet-500 text-[10px] h-5 min-w-5 px-1.5 justify-center">{activeMemories}</Badge>;
    }
    if (item.key === 'recovery' && recoveryCount > 0) {
      return <Badge variant="secondary" className="bg-orange-500/15 text-orange-500 text-[10px] h-5 min-w-5 px-1.5 justify-center">{recoveryCount}</Badge>;
    }
    if (item.key === 'notifications' && pendingNotif > 0) {
      return <Badge variant="secondary" className="bg-red-500/15 text-red-500 text-[10px] h-5 min-w-5 px-1.5 justify-center">{pendingNotif}</Badge>;
    }
    if (item.key === 'monthly') {
      const danger = wasted >= settings.maxWastedDays;
      return (
        <Badge variant="secondary" className={cn('text-[10px] h-5 px-1.5', danger ? 'bg-red-500/20 text-red-500' : 'bg-muted text-muted-foreground')}>
          {wasted}/{settings.maxWastedDays}
        </Badge>
      );
    }
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto max-w-[480px] rounded-t-3xl p-0 h-[85dvh] flex flex-col"
        // Material 3 modal sheet — sticks from bottom
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1.5 w-10 rounded-full bg-muted-foreground/30" />
        </div>

        <SheetHeader className="px-5 pt-3 pb-2 text-left">
          <SheetTitle className="text-xl font-bold">Explore July Plan</SheetTitle>
          <SheetDescription className="text-sm">
            All features in one place. Tap to jump in.
          </SheetDescription>
        </SheetHeader>

        {/* Profile / offline card */}
        {profile && (
          <div className="mx-5 my-3 p-3 rounded-2xl gradient-hero border border-border flex items-center gap-3">
            <div className="h-9 w-9 rounded-full gradient-primary-strong text-white flex items-center justify-center font-semibold text-sm shadow-sm">
              {profile.email?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{profile.email ?? 'User'}</div>
              <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                {isOffline ? <><CloudOff className="h-3 w-3" /> Offline mode</> : <><Cloud className="h-3 w-3" /> Cloud synced</>}
              </div>
            </div>
            <button
              onClick={() => signOut()}
              className="h-8 px-3 rounded-full text-xs font-medium flex items-center gap-1 state-layer text-muted-foreground hover:bg-background"
            >
              <LogOut className="h-3.5 w-3.5" />
              Exit
            </button>
          </div>
        )}

        {/* Scrollable nav groups */}
        <div className="flex-1 overflow-y-auto scroll-thin px-5 pb-6 space-y-5">
          {MORE_NAV_GROUPS.map((grp) => (
            <div key={grp.group}>
              <div className="px-1 mb-2 text-[11px] uppercase tracking-widest text-muted-foreground/70 font-semibold">
                {grp.label}
              </div>
              <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border">
                {grp.items.map((item) => {
                  const Icon = item.icon;
                  const active = current === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => handleNavigate(item.key)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-3 text-left transition-colors',
                        'state-layer',
                        active ? 'bg-primary/10' : 'hover:bg-accent/50',
                      )}
                    >
                      <span className={cn(
                        'h-9 w-9 rounded-full flex items-center justify-center shrink-0 transition-all',
                        active ? 'gradient-primary-strong text-white shadow-sm' : 'bg-muted text-muted-foreground',
                      )}>
                        {item.key === 'sections' ? (
                          <SectionIcon name="FolderTree" className="h-4 w-4" />
                        ) : (
                          <Icon className="h-4 w-4" />
                        )}
                      </span>
                      <span className={cn('flex-1 text-sm', active ? 'font-semibold text-foreground' : 'font-medium')}>
                        {item.label}
                      </span>
                      {renderBadge(item)}
                      <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Footer — July progress */}
          <div className="rounded-2xl p-4 gradient-hero border border-primary/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium">July Progress</span>
              <span className="text-xs font-bold text-primary">Day {new Date().getDate()} / 31</span>
            </div>
            <Progress value={(new Date().getDate() / 31) * 100} className="h-1.5 mb-2 [&>div]:gradient-progress" />
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Best streak: <span className="text-orange-500 font-semibold">{bestStreak} days</span></span>
              {wasted >= settings.maxWastedDays && (
                <span className="text-red-500 font-medium">Limit reached</span>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ════════════════════════════════════════════════════════
// Mobile Shell — composes the whole mobile layout
// ════════════════════════════════════════════════════════
interface MobileShellProps {
  current: ViewKey;
  onNavigate: (v: ViewKey) => void;
  onAddTask: () => void;
  title: string;
  subtitle?: string;
  onBellClick: () => void;
  unreadCount?: number;
  children: React.ReactNode;
}

export function MobileShell({
  current, onNavigate, onAddTask, title, subtitle, onBellClick, unreadCount, children,
}: MobileShellProps) {
  const [moreOpen, setMoreOpen] = useState(false);

  // Hide FAB on AI chat view (chat has its own input) and on more-sheet-open views
  const showFab = !['ai-chat', 'ai-planner', 'memory', 'briefing', 'history', 'reports', 'ai-reports', 'dev', 'recovery', 'notif-prefs', 'notification-log', 'notifications', 'settings', 'journal', 'knowledge', 'conversation-history', 'notification-center'].includes(current);

  return (
    <div className="min-h-[100dvh] bg-background flex justify-center">
      <div className="mobile-viewport shadow-2xl">
        <AppBar
          title={title}
          subtitle={subtitle}
          onBellClick={onBellClick}
          unreadCount={unreadCount}
        />

        <main
          className="absolute top-14 left-0 right-0 overflow-y-auto scroll-thin"
          style={{
            bottom: 'calc(64px + env(safe-area-inset-bottom, 0px))',
            paddingTop: '8px',
          }}
        >
          <div className={cn('px-4 pt-2', showFab ? 'pb-40' : 'pb-24')}>
            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {showFab && <ExtendedFab onClick={onAddTask} />}

        <BottomNav
          current={current}
          onNavigate={onNavigate}
          onMore={() => setMoreOpen(true)}
        />

        <MoreSheet
          open={moreOpen}
          onOpenChange={setMoreOpen}
          current={current}
          onNavigate={onNavigate}
        />
      </div>
    </div>
  );
}
