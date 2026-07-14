'use client';
import { useEffect, useState } from 'react';

const LAUNCH_KEY = 'july-plan-launch-shown';
const ANIMATION_DURATION = 5500; // slightly more than the 5.05s animation + fade

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

      // Auto-hide after animation completes
      setTimeout(() => {
        setPhase('done');
      }, ANIMATION_DURATION);
    });
  }, []);

  // While checking or playing, show ONLY the animation HTML (not children)
  if (phase === 'checking' || phase === 'playing') {
    return (
      <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
        {phase === 'playing' && (
          <iframe
            src="/logo-animation.html"
            className="w-full h-full border-0"
            title="July Plan Logo Animation"
            allow="accelerometer"
          />
        )}
        {/* Skip button */}
        <button
          onClick={() => setPhase('done')}
          className="absolute bottom-6 right-6 text-white/40 hover:text-white/70 text-xs uppercase tracking-wider transition-colors z-10"
        >
          Skip →
        </button>
      </div>
    );
  }

  // Animation done — render children
  return <>{children}</>;
}
