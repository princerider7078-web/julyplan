'use client';
import { cn } from '@/lib/utils';

interface ProgressRingProps {
  value: number;          // 0-100
  size?: number;
  strokeWidth?: number;
  className?: string;
  color?: string;         // CSS color
  trackColor?: string;
  label?: React.ReactNode;
  sublabel?: React.ReactNode;
}

export function ProgressRing({
  value, size = 80, strokeWidth = 8, className, color, trackColor, label, sublabel,
}: ProgressRingProps) {
  const v = Math.max(0, Math.min(100, value));
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (v / 100) * c;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={trackColor ?? 'var(--muted)'}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={color ?? 'var(--primary)'}
          strokeWidth={strokeWidth}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {label ?? <span className="text-sm font-semibold">{v}%</span>}
        {sublabel ?? null}
      </div>
    </div>
  );
}
