'use client';
import {
  Heart, AudioLines, Laptop, Sunrise, Wallet, CalendarDays, Target, TrendingUp,
  Moon, Dumbbell, Brain, Sparkles, Apple, Coffee, Briefcase, Book, Droplet,
  Footprints, Activity, Smile, Sun, Clock, Bell, Settings, Home, ListChecks,
  type LucideIcon,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  Heart, AudioLines, Laptop, Sunrise, Wallet, CalendarDays, Target, TrendingUp,
  Moon, Dumbbell, Brain, Sparkles, Apple, Coffee, Briefcase, Book, Droplet,
  Footprints, Activity, Smile, Sun, Clock, Bell, Settings, Home, ListChecks,
};

export function SectionIcon({
  name, className, style,
}: { name: string; className?: string; style?: React.CSSProperties }) {
  const Icon = ICONS[name] ?? Target;
  return <Icon className={className} style={style} />;
}

export function resolveIcon(name: string): LucideIcon {
  return ICONS[name] ?? Target;
}
