'use client';
import { useEffect, useRef, useState } from 'react';

const LAUNCH_KEY = 'july-plan-launch-shown';
const ANIMATION_DURATION = 5500;

export function LaunchAnimation({ children }: { children: React.ReactNode }) {
  const [done, setDone] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    queueMicrotask(async () => {
      const shown = sessionStorage.getItem(LAUNCH_KEY);
      if (shown) { setDone(true); return; }

      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReduced) { sessionStorage.setItem(LAUNCH_KEY, '1'); setDone(true); return; }

      sessionStorage.setItem(LAUNCH_KEY, '1');

      // Safety timeout — always finish after 5.5s
      setTimeout(() => setDone(true), ANIMATION_DURATION);

      // Load GSAP + run animation
      try {
        if (!(window as any).gsap) {
          await new Promise<void>((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js';
            s.onload = () => resolve();
            s.onerror = () => reject(new Error('GSAP failed'));
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

        // Wait for DOM
        await new Promise((r) => setTimeout(r, 100));

        const gsap = (window as any).gsap;
        const CE = (window as any).CustomEase;
        if (CE) { gsap.registerPlugin(CE); CE.create('apple', 'M0,0 C0.22,1 0.36,1 1,1'); }
        gsap.ticker.fps(60);
        gsap.defaults({ ease: 'apple' in window ? 'apple' : 'power3.out' });

        const el = containerRef.current;
        if (!el) return;

        const $ = (id: string) => el.querySelector(`#jp-${id}`) as Element | null;
        const circle = $('circle');
        if (!circle) return;

        const circleGlow = $('circleGlow'), arrowShaft = $('arrowShaft'), arrowHead = $('arrowHead');
        const jLetter = $('jLetter'), pClipRect = $('pClipRect');
        const line1 = $('line1'), line2 = $('line2'), line3 = $('line3');
        const checkmark = $('checkmark'), brandText = $('brandText');
        const sweepGlow = $('sweepGlow'), sweepGlow2 = $('sweepGlow2'), stage = $('stage');

        const circleLen = (circle as SVGPathElement).getTotalLength();
        const arrowLen = arrowShaft ? (arrowShaft as SVGPathElement).getTotalLength() : 100;
        const jLen = jLetter ? (jLetter as SVGPathElement).getTotalLength() : 150;
        const checkLen = checkmark ? (checkmark as SVGPathElement).getTotalLength() : 60;

        [circle, circleGlow, sweepGlow, sweepGlow2].forEach((e) => { if (e) { (e as SVGPathElement).style.strokeDasharray = String(circleLen); (e as SVGPathElement).style.strokeDashoffset = String(circleLen); } });
        if (arrowShaft) { (arrowShaft as SVGPathElement).style.strokeDasharray = String(arrowLen); (arrowShaft as SVGPathElement).style.strokeDashoffset = String(arrowLen); }
        if (jLetter) { (jLetter as SVGPathElement).style.strokeDasharray = String(jLen); (jLetter as SVGPathElement).style.strokeDashoffset = String(jLen); }
        if (checkmark) { (checkmark as SVGPathElement).style.strokeDasharray = String(checkLen); (checkmark as SVGPathElement).style.strokeDashoffset = String(checkLen); }

        const sweepSeg = circleLen * 0.18;
        [sweepGlow, sweepGlow2].forEach((e) => { if (e) { (e as SVGPathElement).style.strokeDasharray = `${sweepSeg} ${circleLen - sweepSeg}`; (e as SVGPathElement).style.strokeDashoffset = String(circleLen); } });

        gsap.set([arrowHead, checkmark, $('pLetter'), brandText, line1, line2, line3, circleGlow, sweepGlow, sweepGlow2], { opacity: 0 });
        gsap.set(arrowHead, { scale: 0 });
        gsap.set(checkmark, { scale: 0 });
        gsap.set(brandText, { y: 20, attr: { 'letter-spacing': 20 } });
        gsap.set([line1, line2, line3], { x: -15 });
        gsap.set(pClipRect, { attr: { width: 0 } });
        gsap.set(stage, { opacity: 1 });

        const tl = gsap.timeline();
        tl.to(circle, { strokeDashoffset: 0, duration: 1.2, ease: 'power2.inOut' }, 0)
          .to(circleGlow, { opacity: 0.18, duration: 0.35, ease: 'power2.out' }, 0.8);
        tl.to(arrowShaft, { strokeDashoffset: 0, duration: 0.55, ease: 'power2.inOut' }, 0.9)
          .to(arrowHead, { opacity: 1, scale: 1, duration: 0.25, ease: 'back.out(2.5)' }, 1.35)
          .to(arrowHead, { scale: 0.97, duration: 0.08, ease: 'power2.out' }, 1.40)
          .to(arrowHead, { scale: 1.0, duration: 0.10, ease: 'power2.inOut' }, 1.48);
        tl.to(jLetter, { strokeDashoffset: 0, duration: 0.7, ease: 'power2.inOut' }, 1.5)
          .to(pClipRect, { attr: { width: 90 }, duration: 0.55, ease: 'power2.out' }, 2.2);
        tl.to(line1, { opacity: 1, x: 0, duration: 0.3, ease: 'power2.out' }, 2.5)
          .to(line2, { opacity: 1, x: 0, duration: 0.3, ease: 'power2.out' }, 2.65)
          .to(line3, { opacity: 1, x: 0, duration: 0.3, ease: 'power2.out' }, 2.8);
        tl.to(checkmark, { opacity: 1, scale: 1, duration: 0.2, ease: 'back.out(2)' }, 3.0)
          .to(checkmark, { strokeDashoffset: 0, duration: 0.25, ease: 'power2.inOut' }, 3.05)
          .to(checkmark, { scale: 0.95, duration: 0.10, ease: 'power2.out' }, 3.30)
          .to(checkmark, { scale: 1.00, duration: 0.16, ease: 'elastic.out(1, 0.55)' }, 3.40);
        tl.to(brandText, { opacity: 1, duration: 0.5, ease: 'power2.out' }, 3.5)
          .to(brandText, { y: 0, duration: 0.7, ease: 'power3.out' }, 3.5)
          .to(brandText, { attr: { 'letter-spacing': 6 }, duration: 0.9, ease: 'power3.out' }, 3.5);
        tl.set([sweepGlow, sweepGlow2], { strokeDashoffset: circleLen }, 4.2)
          .to(sweepGlow2, { opacity: 0.35, duration: 0.1, ease: 'power2.out' }, 4.2)
          .to(sweepGlow, { opacity: 0.55, duration: 0.1, ease: 'power2.out' }, 4.2)
          .to([sweepGlow, sweepGlow2], { strokeDashoffset: -sweepSeg, duration: 0.55, ease: 'none' }, 4.2)
          .to([sweepGlow, sweepGlow2], { opacity: 0, duration: 0.2, ease: 'power2.in' }, 4.6);
        tl.to(circleGlow, { opacity: 0, duration: 0.4, ease: 'power2.in' }, 4.2);
      } catch (e) {
        setDone(true);
      }
    });
  }, []);

  if (done) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
      <div id="jp-stage" ref={containerRef} style={{
        width: 'min(560px, 90vw)', aspectRatio: '400 / 480',
        position: 'relative', opacity: 0, willChange: 'opacity, transform',
      }}>
        <svg viewBox="0 0 400 480" xmlns="http://www.w3.org/2000/svg"
          style={{ width: '100%', height: '100%', overflow: 'visible', display: 'block' }}
          aria-label="July Plan logo animation">
          <defs>
            <linearGradient id="jp-cg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#0A2540"/><stop offset="45%" stopColor="#0E5C8B"/><stop offset="100%" stopColor="#18A8A0"/></linearGradient>
            <linearGradient id="jp-jg" x1="0%" y1="100%" x2="0%" y2="0%"><stop offset="0%" stopColor="#0A2540"/><stop offset="100%" stopColor="#18A8A0"/></linearGradient>
            <linearGradient id="jp-pg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#18A8A0"/><stop offset="100%" stopColor="#3DDC97"/></linearGradient>
            <linearGradient id="jp-ag" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="#18A8A0"/><stop offset="100%" stopColor="#7CF0C0"/></linearGradient>
            <linearGradient id="jp-tg" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#FFFFFF"/><stop offset="60%" stopColor="#E8F4F1"/><stop offset="100%" stopColor="#7CF0C0"/></linearGradient>
            <filter id="jp-sgf" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            <filter id="jp-sbf" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
            <clipPath id="jp-pc"><rect x="200" y="100" width="0" height="220" id="jp-pClipRect"/></clipPath>
          </defs>
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
          <path id="jp-sweepGlow" d="M 200,345 A 145,145 0 0,1 55,200 A 145,145 0 0,1 200,55 A 145,145 0 0,1 345,200 A 145,145 0 0,1 200,345" fill="none" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" opacity="0" filter="url(#jp-sbf)"/>
          <path id="jp-sweepGlow2" d="M 200,345 A 145,145 0 0,1 55,200 A 145,145 0 0,1 200,55 A 145,145 0 0,1 345,200 A 145,145 0 0,1 200,345" fill="none" stroke="#7CF0C0" strokeWidth="14" strokeLinecap="round" opacity="0" filter="url(#jp-sbf)"/>
        </svg>
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-white/20 text-sm">Loading…</div>
      </div>
      <button onClick={() => setDone(true)} className="absolute bottom-6 right-6 text-white/40 hover:text-white/70 text-xs uppercase tracking-wider transition-colors z-10">Skip →</button>
    </div>
  );
}
