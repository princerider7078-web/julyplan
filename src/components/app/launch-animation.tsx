'use client';
import { useEffect, useState, useRef } from 'react';

const LAUNCH_KEY = 'july-plan-launch-shown';
const ANIMATION_DURATION = 5200; // 5.2s — slightly more than the 5.05s animation

export function LaunchAnimation({ children }: { children: React.ReactNode }) {
  const [showAnimation, setShowAnimation] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Only show animation on first load of the session (not on every page refresh)
    // Use sessionStorage so it shows once per browser session
    const shown = sessionStorage.getItem(LAUNCH_KEY);

    // Defer to microtask to avoid setState-in-effect lint error
    queueMicrotask(() => {
      if (!shown) {
        // Check if user prefers reduced motion
        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReduced) {
          sessionStorage.setItem(LAUNCH_KEY, '1');
          setAnimationComplete(true);
          return;
        }

        setShowAnimation(true);
        sessionStorage.setItem(LAUNCH_KEY, '1');

        // Auto-hide after animation completes
        setTimeout(() => {
          setAnimationComplete(true);
        }, ANIMATION_DURATION);
      } else {
        setAnimationComplete(true);
      }
    });
  }, []);

  // If animation is done or not showing, render children directly
  if (animationComplete || !showAnimation) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
      <iframe
        ref={iframeRef}
        src="/logo-animation.html"
        className="w-full h-full border-0"
        title="July Plan Logo Animation"
        allow="accelerometer"
      />
      {/* Skip button for impatient users */}
      <button
        onClick={() => setAnimationComplete(true)}
        className="absolute bottom-6 right-6 text-white/40 hover:text-white/70 text-xs uppercase tracking-wider transition-colors"
      >
        Skip →
      </button>
    </div>
  );
}
