'use client';
import { useEffect, useState } from 'react';

const LAUNCH_KEY = 'july-plan-launch-shown';
const ANIMATION_DURATION = 5500;
const IFRAME_LOAD_TIMEOUT = 4000; // if iframe doesn't load in 4s, skip

export function LaunchAnimation({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<'checking' | 'playing' | 'done'>('checking');
  const [iframeLoaded, setIframeLoaded] = useState(false);

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

      sessionStorage.setItem(LAUNCH_KEY, '1');
      setPhase('playing');

      // Safety: if iframe doesn't load in 4s, skip animation
      const loadTimer = setTimeout(() => {
        if (!iframeLoaded) {
          setPhase('done');
        }
      }, IFRAME_LOAD_TIMEOUT);

      // Auto-hide after animation completes
      const animTimer = setTimeout(() => {
        setPhase('done');
      }, ANIMATION_DURATION);

      return () => {
        clearTimeout(loadTimer);
        clearTimeout(animTimer);
      };
    });
  }, [iframeLoaded]);

  if (phase === 'checking' || phase === 'playing') {
    return (
      <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
        {phase === 'playing' && (
          <iframe
            src="/logo-animation.html"
            className="w-full h-full border-0"
            title="July Plan Logo Animation"
            allow="accelerometer"
            onLoad={() => setIframeLoaded(true)}
            // If iframe fails to load, the safety timeout will catch it
          />
        )}
        {/* Show static logo while iframe loads */}
        {!iframeLoaded && phase === 'playing' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-white/60 text-sm animate-pulse">Loading July Plan…</div>
          </div>
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

  return <>{children}</>;
}
