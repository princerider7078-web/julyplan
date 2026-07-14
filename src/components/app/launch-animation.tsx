'use client';
import { useEffect, useState } from 'react';
import { AnimatedLogo } from '@/components/app/animated-logo';

const LAUNCH_KEY = 'july-plan-launch-shown';
const ANIMATION_DURATION = 5200;

export function LaunchAnimation({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<'checking' | 'playing' | 'done'>('checking');

  useEffect(() => {
    queueMicrotask(() => {
      const shown = sessionStorage.getItem(LAUNCH_KEY);
      if (shown) {
        setPhase('done');
        return;
      }

      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReduced) {
        sessionStorage.setItem(LAUNCH_KEY, '1');
        setPhase('done');
        return;
      }

      // Show animation
      sessionStorage.setItem(LAUNCH_KEY, '1');
      setPhase('playing');

      // Auto-hide after animation
      setTimeout(() => {
        setPhase('done');
      }, ANIMATION_DURATION);
    });
  }, []);

  // While checking or playing, show ONLY the animation (not children)
  if (phase === 'checking' || phase === 'playing') {
    return (
      <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
        {phase === 'playing' ? (
          <AnimatedLogo size={Math.min(560, (typeof window !== 'undefined' ? window.innerWidth : 560) * 0.9)} showText={true} />
        ) : (
          <div className="h-20 w-20" />
        )}
        <button
          onClick={() => setPhase('done')}
          className="absolute bottom-6 right-6 text-white/40 hover:text-white/70 text-xs uppercase tracking-wider transition-colors"
        >
          Skip →
        </button>
      </div>
    );
  }

  // Animation done — render children
  return <>{children}</>;
}
