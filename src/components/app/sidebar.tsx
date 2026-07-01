'use client';
import { useStore } from '@/lib/store';
import { cn, todayISO } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  LayoutDashboard, ListChecks, FolderTree, Sunrise, Repeat,
  Wallet, CalendarDays, BarChart3, Settings, Flame, X,
} from 'lucide-react';
import { SectionIcon } from './icon';

export type ViewKey =
  | 'dashboard' | 'today' | 'tasks' | 'sections'
  | 'routine' | 'habits' | 'finance' | 'monthly'
  | 'reports' | 'settings';

interface NavItem {
  key: ViewKey;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: 'count' | 'wasted' | 'streak';
}

const NAV: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard',  icon: LayoutDashboard },
  { key: 'today',     label: 'Today Plan', icon: ListChecks, badge: 'count' },
  { key: 'tasks',     label: 'Tasks',      icon: FolderTree },
  { key: 'sections',  label: 'Sections',   icon: SectionIcon as unknown as typeof LayoutDashboard },
  { key: 'routine',   label: 'Daily Routine', icon: Sunrise },
  { key: 'habits',    label: 'Habits',     icon: Repeat, badge: 'streak' },
  { key: 'finance',   label: 'Finance',    icon: Wallet },
  { key: 'monthly',   label: 'July Plan',  icon: CalendarDays, badge: 'wasted' },
  { key: 'reports',   label: 'Reports',    icon: BarChart3 },
  { key: 'settings',  label: 'Settings',   icon: Settings },
];

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
  const today = todayISO();

  // Today's pending count
  const todayPending = tasks.filter(
    (t) => t.status !== 'archived' && t.repeatRule !== 'none' && !t.completionLog?.[today],
  ).length + tasks.filter(
    (t) => t.status === 'pending' && t.repeatRule === 'none' && !t.completionLog?.[today],
  ).length;

  // Current habit streak (best of all habits)
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

  // Wasted days this month — count days where <30% of habits done
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

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          'fixed md:sticky top-0 left-0 z-50 md:z-auto',
          'h-screen md:h-screen w-72 shrink-0',
          'bg-sidebar text-sidebar-foreground border-r border-sidebar-border',
          'flex flex-col transition-transform duration-300',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold shadow-md shadow-orange-500/20">
              J
            </div>
            <div className="leading-tight">
              <div className="font-bold text-sm">July Plan</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Personal Execution OS
              </div>
            </div>
          </div>
          <button
            className="md:hidden p-1 rounded hover:bg-sidebar-accent"
            onClick={onMobileClose}
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto scroll-thin px-3 py-4 space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = current === item.key;
            let badge: React.ReactNode = null;
            if (item.badge === 'count' && todayPending > 0) {
              badge = (
                <span className="ml-auto text-xs bg-primary/15 text-primary rounded-full px-2 py-0.5 font-medium">
                  {todayPending}
                </span>
              );
            }
            if (item.badge === 'streak' && bestStreak > 0) {
              badge = (
                <span className="ml-auto text-xs flex items-center gap-1 text-orange-500 font-medium">
                  <Flame className="h-3.5 w-3.5" />
                  {bestStreak}
                </span>
              );
            }
            if (item.badge === 'wasted') {
              const danger = wasted >= settings.maxWastedDays;
              badge = (
                <span className={cn(
                  'ml-auto text-xs rounded-full px-2 py-0.5 font-medium',
                  danger ? 'bg-red-500/20 text-red-500' : 'bg-muted text-muted-foreground',
                )}>
                  {wasted}/{settings.maxWastedDays}
                </span>
              );
            }
            return (
              <button
                key={item.key}
                onClick={() => { onNavigate(item.key); onMobileClose(); }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium',
                  'transition-colors',
                  active
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                    : 'hover:bg-sidebar-accent text-sidebar-foreground/80 hover:text-sidebar-foreground',
                )}
              >
                {item.key === 'sections' ? (
                  <SectionIcon name="FolderTree" className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
                <span>{item.label}</span>
                {badge}
              </button>
            );
          })}
        </nav>

        {/* Footer: monthly progress */}
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
              Wasted-day limit reached — recover today
            </Badge>
          )}
        </div>
      </aside>
    </>
  );
}
