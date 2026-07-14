'use client';
import { cn } from '@/lib/utils';

interface ProgressRingProps {
  value: number;          // 0-100
  size?: number;
  strokeWidth?: number;
  className?: string;
  color?: string;         // CSS color (overrides gradient)
  trackColor?: string;
  label?: React.ReactNode;
  sublabel?: React.ReactNode;
  useGradient?: boolean;  // V6: use accent gradient instead of solid color
}

export function ProgressRing({
  value, size = 80, strokeWidth = 8, className, color, trackColor, label, sublabel, useGradient = false,
}: ProgressRingProps) {
  const v = Math.max(0, Math.min(100, value));
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (v / 100) * c;

  // Unique ID for gradient so multiple rings can coexist
  const gradId = `prg-grad-${size}-${Math.round(r)}`;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          {useGradient && (
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--grad-from)" />
              <stop offset="100%" stopColor="var(--grad-to)" />
            </linearGradient>
          )}
        </defs>
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={trackColor ?? 'var(--muted)'}
          strokeWidth={strokeWidth}
          opacity={0.5}
        />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={useGradient ? `url(#${gradId})` : (color ?? 'var(--primary)')}
          strokeWidth={strokeWidth}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s var(--ease-emphasized)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {label ?? <span className="text-sm font-semibold">{v}%</span>}
        {sublabel ?? null}
      </div>
    </div>
  );
}
