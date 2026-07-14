'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * July Plan — Professional Product-Level Splash Animation (V3)
 *
 * Cinematic 5.8-second sequence with:
 * - Multi-layer radial gradient background with subtle drift
 * - 8 ambient particles with drift + twinkle motion (not just pulse)
 * - Soft pulsing glow halo behind the logo
 * - GSAP path-drawing logo animation (circle → arrow → J → P → checkmark)
 * - "July Plan" brand text reveal with letter-spacing settle
 * - Tagline "Personal AI Operating System" fade-in below brand
 * - Thin circular loading ring around the logo
 * - Premium exit: scale + fade + subtle blur
 * - Reduced-motion fallback (1.2s brief splash)
 * - Robust GSAP failure fallback (static logo + auto-dismiss)
 */

const ANIMATION_DURATION = 5800;  // total ms before forced dismiss
const EXIT_START = 5000;          // when to begin exit transition

type Phase = 'playing' | 'exiting' | 'done';

export function LaunchAnimation({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<Phase>('playing');
  const containerRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    // Respect reduced-motion users — brief splash, no GSAP
    const prefersReduced = typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setTimeout(() => setPhase('exiting'), 800);
      setTimeout(() => setPhase('done'), 1400);
      return;
    }

    // Schedule exit transitions (always run, regardless of GSAP success)
    const exitTimer = setTimeout(() => setPhase('exiting'), EXIT_START);
    const doneTimer = setTimeout(() => setPhase('done'), ANIMATION_DURATION);

    // Load GSAP + run the SVG path-drawing animation
    (async () => {
      try {
        if (!(window as any).gsap) {
          await new Promise<void>((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js';
            s.onload = () => resolve();
            s.onerror = () => reject(new Error('GSAP CDN failed'));
            document.head.appendChild(s);
          });
        }
        if (!(window as any).CustomEase) {
          await new Promise<void>((resolve) => {
            const s = document.createElement('script');
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/CustomEase.min.js';
            s.onload = () => resolve();
            s.onerror = () => resolve();
            document.head.appendChild(s);
          });
        }

        // Wait two frames for paint
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

        const gsap = (window as any).gsap;
        const CE = (window as any).CustomEase;
        if (CE) {
          gsap.registerPlugin(CE);
          CE.create('apple', 'M0,0 C0.22,1 0.36,1 1,1');
          CE.create('smooth', 'M0,0 C0.25,0.1 0.25,1 1,1');
        }
        gsap.ticker.fps(60);
        gsap.defaults({ ease: 'apple' in gsap ? 'apple' : 'power3.out' });

        const el = containerRef.current;
        if (!el) return;

        const $ = (id: string) => el.querySelector(`#jp-${id}`) as Element | null;

        const circle = $('circle');
        if (!circle) return;

        const circleGlow = $('circleGlow');
        const arrowShaft = $('arrowShaft');
        const arrowHead = $('arrowHead');
        const jLetter = $('jLetter');
        const pLetter = $('pLetter');
        const pClipRect = $('pClipRect');
        const line1 = $('line1'), line2 = $('line2'), line3 = $('line3');
        const checkmark = $('checkmark');
        const brandText = $('brandText');
        const tagline = $('tagline');
        const sweepGlow = $('sweepGlow'), sweepGlow2 = $('sweepGlow2');
        const logoHalo = $('logoHalo');
        const loadingRing = $('loadingRing');
        const loadingRingFill = $('loadingRingFill');

        // Make the stage visible
        el.style.opacity = '1';

        const circleLen = (circle as SVGPathElement).getTotalLength();
        const arrowLen = arrowShaft ? (arrowShaft as SVGPathElement).getTotalLength() : 100;
        const jLen = jLetter ? (jLetter as SVGPathElement).getTotalLength() : 150;
        const checkLen = checkmark ? (checkmark as SVGPathElement).getTotalLength() : 60;

        // Set up stroke-dash for path-draw effect
        [circle, circleGlow, sweepGlow, sweepGlow2].forEach((e) => {
          if (e) {
            (e as SVGPathElement).style.strokeDasharray = String(circleLen);
            (e as SVGPathElement).style.strokeDashoffset = String(circleLen);
          }
        });
        if (arrowShaft) {
          (arrowShaft as SVGPathElement).style.strokeDasharray = String(arrowLen);
          (arrowShaft as SVGPathElement).style.strokeDashoffset = String(arrowLen);
        }
        if (jLetter) {
          (jLetter as SVGPathElement).style.strokeDasharray = String(jLen);
          (jLetter as SVGPathElement).style.strokeDashoffset = String(jLen);
        }
        if (checkmark) {
          (checkmark as SVGPathElement).style.strokeDasharray = String(checkLen);
          (checkmark as SVGPathElement).style.strokeDashoffset = String(checkLen);
        }

        const sweepSeg = circleLen * 0.18;
        [sweepGlow, sweepGlow2].forEach((e) => {
          if (e) {
            (e as SVGPathElement).style.strokeDasharray = `${sweepSeg} ${circleLen - sweepSeg}`;
            (e as SVGPathElement).style.strokeDashoffset = String(circleLen);
          }
        });

        // Initial hidden states — filter nulls
        const hideTargets = [arrowHead, checkmark, pLetter, brandText, tagline, line1, line2, line3, circleGlow, sweepGlow, sweepGlow2, loadingRingFill].filter(Boolean) as Element[];
        gsap.set(hideTargets, { opacity: 0 });
        if (arrowHead) gsap.set(arrowHead, { scale: 0 });
        if (checkmark) gsap.set(checkmark, { scale: 0 });
        if (brandText) gsap.set(brandText, { y: 20, attr: { 'letter-spacing': 20 } });
        if (tagline) gsap.set(tagline, { y: 12 });
        if (line1 && line2 && line3) gsap.set([line1, line2, line3], { x: -15 });
        if (pClipRect) gsap.set(pClipRect, { attr: { width: 0 } });
        if (logoHalo) gsap.set(logoHalo, { opacity: 0, scale: 0.6 });

        // ═══ Build the cinematic timeline ═══
        const tl = gsap.timeline();

        // Scene 0: Logo halo fades in + pulses (0 → 0.6s)
        if (logoHalo) {
          tl.to(logoHalo, { opacity: 0.5, scale: 1, duration: 0.8, ease: 'power2.out' }, 0)
            .to(logoHalo, { opacity: 0.25, scale: 1.08, duration: 1.8, ease: 'sine.inOut', yoyo: true, repeat: -1 }, 0.8);
        }

        // Scene 1: Circle draws (0.2 → 1.4s)
        if (circle) tl.to(circle, { strokeDashoffset: 0, duration: 1.2, ease: 'power2.inOut' }, 0.2);
        if (circleGlow) tl.to(circleGlow, { opacity: 0.2, duration: 0.4, ease: 'power2.out' }, 1.0);

        // Scene 2: Arrow shaft draws + head pops (1.1 → 1.7s)
        if (arrowShaft) tl.to(arrowShaft, { strokeDashoffset: 0, duration: 0.55, ease: 'power2.inOut' }, 1.1);
        if (arrowHead) {
          tl.to(arrowHead, { opacity: 1, scale: 1, duration: 0.28, ease: 'back.out(2.5)' }, 1.55)
            .to(arrowHead, { scale: 0.97, duration: 0.08, ease: 'power2.out' }, 1.60)
            .to(arrowHead, { scale: 1.0, duration: 0.10, ease: 'power2.inOut' }, 1.68);
        }

        // Scene 3: J draws + P reveals (1.7 → 2.9s)
        if (jLetter) tl.to(jLetter, { strokeDashoffset: 0, duration: 0.7, ease: 'power2.inOut' }, 1.7);
        if (pClipRect) tl.to(pClipRect, { attr: { width: 90 }, duration: 0.55, ease: 'power2.out' }, 2.4);

        // Scene 4: Progress lines slide in (2.7 → 3.2s)
        if (line1) tl.to(line1, { opacity: 1, x: 0, duration: 0.3, ease: 'power2.out' }, 2.7);
        if (line2) tl.to(line2, { opacity: 1, x: 0, duration: 0.3, ease: 'power2.out' }, 2.85);
        if (line3) tl.to(line3, { opacity: 1, x: 0, duration: 0.3, ease: 'power2.out' }, 3.0);

        // Scene 5: Checkmark bounce (3.2 → 3.7s)
        if (checkmark) {
          tl.to(checkmark, { opacity: 1, scale: 1, duration: 0.2, ease: 'back.out(2)' }, 3.2)
            .to(checkmark, { strokeDashoffset: 0, duration: 0.25, ease: 'power2.inOut' }, 3.25)
            .to(checkmark, { scale: 0.95, duration: 0.10, ease: 'power2.out' }, 3.50)
            .to(checkmark, { scale: 1.00, duration: 0.16, ease: 'elastic.out(1, 0.55)' }, 3.60);
        }

        // Scene 6: Brand text fades in + settles (3.7 → 4.4s)
        if (brandText) {
          tl.to(brandText, { opacity: 1, duration: 0.5, ease: 'power2.out' }, 3.7)
            .to(brandText, { y: 0, duration: 0.7, ease: 'power3.out' }, 3.7)
            .to(brandText, { attr: { 'letter-spacing': 6 }, duration: 0.9, ease: 'power3.out' }, 3.7);
        }

        // Scene 7: Tagline appears (4.1 → 4.6s)
        if (tagline) {
          tl.to(tagline, { opacity: 0.7, duration: 0.6, ease: 'power2.out' }, 4.1)
            .to(tagline, { y: 0, duration: 0.6, ease: 'power3.out' }, 4.1);
        }

        // Scene 8: Sweep glow (4.4 → 5.0s)
        if (sweepGlow && sweepGlow2) {
          tl.set([sweepGlow, sweepGlow2], { strokeDashoffset: circleLen }, 4.4)
            .to(sweepGlow2, { opacity: 0.35, duration: 0.1, ease: 'power2.out' }, 4.4)
            .to(sweepGlow, { opacity: 0.55, duration: 0.1, ease: 'power2.out' }, 4.4)
            .to([sweepGlow, sweepGlow2], { strokeDashoffset: -sweepSeg, duration: 0.55, ease: 'none' }, 4.4)
            .to([sweepGlow, sweepGlow2], { opacity: 0, duration: 0.2, ease: 'power2.in' }, 4.8);
        }
        if (circleGlow) tl.to(circleGlow, { opacity: 0, duration: 0.4, ease: 'power2.in' }, 4.4);

        // Scene 9: Loading ring fills throughout (0.5 → 4.8s)
        if (loadingRingFill) {
          const ringLen = (loadingRingFill as SVGPathElement).getTotalLength();
          (loadingRingFill as SVGPathElement).style.strokeDasharray = String(ringLen);
          (loadingRingFill as SVGPathElement).style.strokeDashoffset = String(ringLen);
          tl.to(loadingRingFill, { opacity: 0.5, duration: 0.3, ease: 'power2.out' }, 0.5)
            .to(loadingRingFill, { strokeDashoffset: 0, duration: 4.0, ease: 'none' }, 0.5)
            .to(loadingRingFill, { opacity: 0, duration: 0.3, ease: 'power2.in' }, 4.5);
        }
      } catch (e) {
        if (containerRef.current) containerRef.current.style.opacity = '1';
      }
    })();

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, []);

  if (phase === 'done') return <>{children}</>;

  return (
    <>
      {/* Children mount underneath so the fade reveals them smoothly */}
      <div className="block">{children}</div>

      <AnimatePresence>
        <motion.div
          key="launch-overlay"
          exit={{ opacity: 0, scale: 1.04, filter: 'blur(4px)' }}
          transition={{ duration: 0.8, ease: [0.2, 0, 0, 1] }}
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
          style={{
            background: 'radial-gradient(ellipse at 50% 40%, #0c2330 0%, #061218 45%, #020608 80%, #000 100%)',
          }}
        >
          {/* ═══ Ambient particle system — 8 particles with drift + twinkle ═══ */}
          <div className="absolute inset-0 pointer-events-none">
            {[
              { top: '18%', left: '22%', size: 2, color: 'bg-teal-300', delay: '0s', dur: '4s', drift: 'drift-1' },
              { top: '28%', left: '72%', size: 3, color: 'bg-emerald-300', delay: '0.8s', dur: '5s', drift: 'drift-2' },
              { top: '68%', left: '18%', size: 2, color: 'bg-cyan-300', delay: '1.5s', dur: '3.5s', drift: 'drift-3' },
              { top: '72%', left: '78%', size: 2.5, color: 'bg-teal-200', delay: '2.1s', dur: '4.2s', drift: 'drift-1' },
              { top: '40%', left: '10%', size: 1.5, color: 'bg-emerald-200', delay: '1.2s', dur: '3.8s', drift: 'drift-2' },
              { top: '55%', left: '85%', size: 1.5, color: 'bg-cyan-200', delay: '0.4s', dur: '4.5s', drift: 'drift-3' },
              { top: '12%', left: '50%', size: 2, color: 'bg-teal-300', delay: '2.5s', dur: '3.2s', drift: 'drift-1' },
              { top: '85%', left: '45%', size: 1.5, color: 'bg-emerald-300', delay: '1.8s', dur: '4.8s', drift: 'drift-2' },
            ].map((p, i) => (
              <div
                key={i}
                className={cn('absolute rounded-full', p.color, p.drift)}
                style={{
                  top: p.top, left: p.left,
                  width: p.size, height: p.size,
                  animationDelay: p.delay,
                  animationDuration: p.dur,
                  boxShadow: '0 0 8px currentColor',
                }}
              />
            ))}
          </div>

          {/* ═══ Logo stage with halo + SVG animation + loading ring ═══ */}
          <div
            ref={containerRef}
            id="jp-stage"
            style={{
              width: 'min(560px, 84vw)',
              aspectRatio: '400 / 520',
              position: 'relative',
              opacity: 0,
              willChange: 'opacity, transform',
            }}
          >
            {/* Logo halo — soft pulsing glow behind the logo */}
            <div
              id="jp-logoHalo"
              style={{
                position: 'absolute',
                top: '8%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '70%',
                aspectRatio: '1',
                background: 'radial-gradient(circle, rgba(24,168,160,0.35) 0%, rgba(61,220,151,0.12) 40%, transparent 70%)',
                borderRadius: '50%',
                filter: 'blur(20px)',
                pointerEvents: 'none',
              }}
            />

            <svg viewBox="0 0 400 520" xmlns="http://www.w3.org/2000/svg"
              style={{ width: '100%', height: '100%', overflow: 'visible', display: 'block', position: 'relative' }}
              aria-label="July Plan logo animation">
              <defs>
                <linearGradient id="jp-cg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#0A2540"/><stop offset="45%" stopColor="#0E5C8B"/><stop offset="100%" stopColor="#18A8A0"/></linearGradient>
                <linearGradient id="jp-jg" x1="0%" y1="100%" x2="0%" y2="0%"><stop offset="0%" stopColor="#0A2540"/><stop offset="100%" stopColor="#18A8A0"/></linearGradient>
                <linearGradient id="jp-pg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#18A8A0"/><stop offset="100%" stopColor="#3DDC97"/></linearGradient>
                <linearGradient id="jp-ag" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="#18A8A0"/><stop offset="100%" stopColor="#7CF0C0"/></linearGradient>
                <linearGradient id="jp-tg" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#FFFFFF"/><stop offset="60%" stopColor="#E8F4F1"/><stop offset="100%" stopColor="#7CF0C0"/></linearGradient>
                <linearGradient id="jp-ring" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#18A8A0"/><stop offset="100%" stopColor="#3DDC97"/></linearGradient>
                <filter id="jp-sgf" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                <filter id="jp-sbf" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
                <clipPath id="jp-pc"><rect x="200" y="100" width="0" height="220" id="jp-pClipRect"/></clipPath>
              </defs>

              {/* Loading ring — thin circular progress around the logo */}
              <circle id="jp-loadingRing" cx="200" cy="200" r="172" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5"/>
              <circle id="jp-loadingRingFill" cx="200" cy="200" r="172" fill="none" stroke="url(#jp-ring)" strokeWidth="2" strokeLinecap="round" opacity="0" transform="rotate(-90 200 200)"/>

              <path id="jp-circleGlow" d="M 200,345 A 145,145 0 0,1 55,200 A 145,145 0 0,1 200,55 A 145,145 0 0,1 345,200 A 145,145 0 0,1 200,345" fill="none" stroke="url(#jp-cg)" strokeWidth="8" strokeLinecap="round" opacity="0" filter="url(#jp-sgf)"/>
              <path id="jp-circle" d="M 200,345 A 145,145 0 0,1 55,200 A 145,145 0 0,1 200,55 A 145,145 0 0,1 345,200 A 145,145 0 0,1 200,345" fill="none" stroke="url(#jp-cg)" strokeWidth="3" strokeLinecap="round"/>
              <path id="jp-arrowShaft" d="M 175,140 Q 218,108 252,82" fill="none" stroke="url(#jp-ag)" strokeWidth="3.5" strokeLinecap="round"/>
              <path id="jp-arrowHead" d="M 240,92 L 274,60 L 258,98 Z" fill="#7CF0C0" opacity="0" style={{transformOrigin:'268px 78px'}}/>
              <path id="jp-jLetter" d="M 152,243 Q 152,265 175,265 Q 198,265 198,243 L 198,140" fill="none" stroke="url(#jp-jg)" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"/>
              <g clipPath="url(#jp-pc)"><path id="jp-pLetter" d="M 218,278 L 218,138 Q 268,138 268,176 Q 268,214 218,214" fill="none" stroke="url(#jp-pg)" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"/></g>
              <rect id="jp-line1" x="62" y="178" width="56" height="4" rx="2" fill="#3DDC97" opacity="0"/>
              <rect id="jp-line2" x="62" y="198" width="68" height="4" rx="2" fill="#2D9CDB" opacity="0"/>
              <rect id="jp-line3" x="62" y="218" width="48" height="4" rx="2" fill="#6B7280" opacity="0"/>
              <path id="jp-checkmark" d="M 222,270 L 236,286 L 268,252" fill="none" stroke="#18A8A0" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" opacity="0" style={{transformOrigin:'245px 269px'}}/>
              <text id="jp-brandText" x="200" y="418" textAnchor="middle" fontFamily="-apple-system,BlinkMacSystemFont,'SF Pro Display','Helvetica Neue',sans-serif" fontSize="34" fontWeight="300" letterSpacing="20" fill="url(#jp-tg)" opacity="0">July Plan</text>
              <text id="jp-tagline" x="200" y="452" textAnchor="middle" fontFamily="-apple-system,BlinkMacSystemFont,'SF Pro Display','Helvetica Neue',sans-serif" fontSize="11" fontWeight="400" letterSpacing="4" fill="rgba(255,255,255,0.5)" opacity="0">PERSONAL AI OPERATING SYSTEM</text>
              <path id="jp-sweepGlow" d="M 200,345 A 145,145 0 0,1 55,200 A 145,145 0 0,1 200,55 A 145,145 0 0,1 345,200 A 145,145 0 0,1 200,345" fill="none" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" opacity="0" filter="url(#jp-sbf)"/>
              <path id="jp-sweepGlow2" d="M 200,345 A 145,145 0 0,1 55,200 A 145,145 0 0,1 200,55 A 145,145 0 0,1 345,200 A 145,145 0 0,1 200,345" fill="none" stroke="#7CF0C0" strokeWidth="14" strokeLinecap="round" opacity="0" filter="url(#jp-sbf)"/>
            </svg>
          </div>

          {/* Subtle "Skip" affordance */}
          <button
            onClick={() => { setPhase('exiting'); setTimeout(() => setPhase('done'), 800); }}
            className="absolute bottom-8 right-8 text-white/35 hover:text-white/80 text-[10px] uppercase tracking-[0.25em] font-medium transition-colors z-10 px-4 py-2 rounded-full border border-white/12 backdrop-blur-sm"
          >
            Skip
          </button>
        </motion.div>
      </AnimatePresence>
    </>
  );
}

// Tiny cn helper to avoid importing from utils (keeps this file self-contained)
function cn(...inputs: (string | false | null | undefined)[]): string {
  return inputs.filter(Boolean).join(' ');
}
