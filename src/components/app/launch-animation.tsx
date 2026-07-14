'use client';
import { useEffect, useState } from 'react';
import { AnimatedLogo } from '@/components/app/animated-logo';

const LAUNCH_KEY = 'july-plan-launch-shown';
const ANIMATION_DURATION = 5200;

export function LaunchAnimation({ children }: { children: React.ReactNode }) {
  const [showAnimation, setShowAnimation] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);

  useEffect(() => {
    const shown = sessionStorage.getItem(LAUNCH_KEY);

    queueMicrotask(() => {
      if (!shown) {
        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReduced) {
          sessionStorage.setItem(LAUNCH_KEY, '1');
          setAnimationComplete(true);
          return;
        }

        setShowAnimation(true);
        sessionStorage.setItem(LAUNCH_KEY, '1');

        setTimeout(() => {
          setAnimationComplete(true);
        }, ANIMATION_DURATION);
      } else {
        setAnimationComplete(true);
      }
    });
  }, []);

  if (animationComplete || !showAnimation) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
      <AnimatedLogo size={Math.min(560, window.innerWidth * 0.9)} showText={true} />
      <button
        onClick={() => setAnimationComplete(true)}
        className="absolute bottom-6 right-6 text-white/40 hover:text-white/70 text-xs uppercase tracking-wider transition-colors"
      >
        Skip →
      </button>
    </div>
  );
}
