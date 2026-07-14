'use client';
import { useEffect, useRef } from 'react';

/**
 * July Plan Animated Logo — reusable React component.
 * Renders the SVG inline + runs the GSAP animation.
 * Can be used at ANY size via the `size` prop.
 *
 * Usage:
 *   <AnimatedLogo size={36} />   // sidebar
 *   <AnimatedLogo size={80} />   // login
 *   <AnimatedLogo size={560} />  // launch
 *   <AnimatedLogo size={560} playOnce={false} />  // loop (not recommended)
 */

interface AnimatedLogoProps {
  size?: number;          // pixel size (default: 80)
  playOnce?: boolean;     // true = play once on mount, false = play every time visible (default: true)
  showText?: boolean;     // show "July Plan" text at bottom (default: true for large sizes)
  className?: string;
}

export function AnimatedLogo({
  size = 80,
  playOnce = true,
  showText = true,
  className,
}: AnimatedLogoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;
    if (playOnce && playedRef.current) return;
    playedRef.current = true;

    // Dynamically load GSAP + CustomEase
    let tl: any = null;

    import('https://esm.sh/gsap@3.12.5').then(async (gsapModule) => {
      const gsap = gsapModule.default || gsapModule;
      try {
        const customEaseModule = await import('https://esm.sh/gsap@3.12.5/CustomEase');
        const CustomEase = customEaseModule.CustomEase || customEaseModule.default?.CustomEase;
        if (CustomEase) gsap.registerPlugin(CustomEase);
        if (CustomEase) CustomEase.create('apple', 'M0,0 C0.22,1 0.36,1 1,1');
      } catch { /* CustomEase optional */ }

      gsap.ticker.fps(60);
      gsap.defaults({ ease: 'apple' in gsap ? 'apple' : 'power3.out' });

      const el = containerRef.current;
      if (!el) return;

      // Get SVG elements
      const $ = (id: string) => el.querySelector(`#${id}`) as Element | null;

      const circle = $('circle');
      const circleGlow = $('circleGlow');
      const arrowShaft = $('arrowShaft');
      const arrowHead = $('arrowHead');
      const jLetter = $('jLetter');
      const pLetter = $('pLetter');
      const pClipRect = $('pClipRect');
      const line1 = $('line1');
      const line2 = $('line2');
      const line3 = $('line3');
      const checkmark = $('checkmark');
      const brandText = $('brandText');
      const sweepGlow = $('sweepGlow');
      const sweepGlow2 = $('sweepGlow2');

      if (!circle) return;

      // Measure path lengths
      const circleLen = (circle as SVGPathElement).getTotalLength();
      const arrowLen = (arrowShaft as SVGPathElement)?.getTotalLength() ?? 100;
      const jLen = (jLetter as SVGPathElement)?.getTotalLength() ?? 150;
      const checkLen = (checkmark as SVGPathElement)?.getTotalLength() ?? 60;

      // Set initial states
      [circle, circleGlow, sweepGlow, sweepGlow2].forEach((el2) => {
        if (el2) {
          (el2 as SVGPathElement).style.strokeDasharray = String(circleLen);
          (el2 as SVGPathElement).style.strokeDashoffset = String(circleLen);
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
      [sweepGlow, sweepGlow2].forEach((el2) => {
        if (el2) {
          (el2 as SVGPathElement).style.strokeDasharray = `${sweepSeg} ${circleLen - sweepSeg}`;
          (el2 as SVGPathElement).style.strokeDashoffset = String(circleLen);
        }
      });

      gsap.set([arrowHead, checkmark, pLetter, brandText, line1, line2, line3, circleGlow, sweepGlow, sweepGlow2], { opacity: 0 });
      gsap.set(arrowHead, { scale: 0 });
      gsap.set(checkmark, { scale: 0 });
      gsap.set(brandText, { y: 20, attr: { 'letter-spacing': 20 } });
      gsap.set([line1, line2, line3], { x: -15 });
      gsap.set(pClipRect, { attr: { width: 0 } });

      // Build timeline
      tl = gsap.timeline({ id: 'julyPlanLogo' });

      // Scene 1: Circle draws (0 → 1.2s)
      tl.to(circle, { strokeDashoffset: 0, duration: 1.2, ease: 'power2.inOut' }, 0)
        .to(circleGlow, { opacity: 0.18, duration: 0.35, ease: 'power2.out' }, 0.8);

      // Scene 2: Arrow shaft draws + head pops (0.9 → 1.5s)
      tl.to(arrowShaft, { strokeDashoffset: 0, duration: 0.55, ease: 'power2.inOut' }, 0.9)
        .to(arrowHead, { opacity: 1, scale: 1, duration: 0.25, ease: 'back.out(2.5)' }, 1.35)
        .to(arrowHead, { scale: 0.97, duration: 0.08, ease: 'power2.out' }, 1.40)
        .to(arrowHead, { scale: 1.0, duration: 0.10, ease: 'power2.inOut' }, 1.48);

      // Scene 3: J draws + P reveals (1.5 → 2.8s)
      tl.to(jLetter, { strokeDashoffset: 0, duration: 0.7, ease: 'power2.inOut' }, 1.5)
        .to(pClipRect, { attr: { width: 90 }, duration: 0.55, ease: 'power2.out' }, 2.2);

      // Scene 4: Progress lines slide in (2.5 → 3.0s)
      tl.to(line1, { opacity: 1, x: 0, duration: 0.3, ease: 'power2.out' }, 2.5)
        .to(line2, { opacity: 1, x: 0, duration: 0.3, ease: 'power2.out' }, 2.65)
        .to(line3, { opacity: 1, x: 0, duration: 0.3, ease: 'power2.out' }, 2.8);

      // Scene 5: Checkmark bounce (3.0 → 3.5s)
      tl.to(checkmark, { opacity: 1, scale: 1, duration: 0.2, ease: 'back.out(2)' }, 3.0)
        .to(checkmark, { strokeDashoffset: 0, duration: 0.25, ease: 'power2.inOut' }, 3.05)
        .to(checkmark, { scale: 0.95, duration: 0.10, ease: 'power2.out' }, 3.30)
        .to(checkmark, { scale: 1.00, duration: 0.16, ease: 'elastic.out(1, 0.55)' }, 3.40);

      // Scene 6: Brand text fades in (3.5 → 4.2s)
      tl.to(brandText, { opacity: 1, duration: 0.5, ease: 'power2.out' }, 3.5)
        .to(brandText, { y: 0, duration: 0.7, ease: 'power3.out' }, 3.5)
        .to(brandText, { attr: { 'letter-spacing': 6 }, duration: 0.9, ease: 'power3.out' }, 3.5);

      // Scene 7: Sweep glow (4.2 → 4.75s)
      tl.set([sweepGlow, sweepGlow2], { strokeDashoffset: circleLen }, 4.2)
        .to(sweepGlow2, { opacity: 0.35, duration: 0.1, ease: 'power2.out' }, 4.2)
        .to(sweepGlow, { opacity: 0.55, duration: 0.1, ease: 'power2.out' }, 4.2)
        .to([sweepGlow, sweepGlow2], { strokeDashoffset: -sweepSeg, duration: 0.55, ease: 'none' }, 4.2)
        .to([sweepGlow, sweepGlow2], { opacity: 0, duration: 0.2, ease: 'power2.in' }, 4.6);

      // Fade out circle glow
      tl.to(circleGlow, { opacity: 0, duration: 0.4, ease: 'power2.in' }, 4.2);
    }).catch((e) => {
      console.warn('[AnimatedLogo] GSAP load failed:', e);
    });

    return () => {
      if (tl) tl.kill();
    };
  }, [playOnce]);

  // Hide text for small sizes
  const shouldShowText = showText && size >= 120;

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: size,
        height: size * (480 / 400),  // maintain aspect ratio
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg
        viewBox="0 0 400 480"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: '100%', overflow: 'visible' }}
        aria-label="July Plan"
      >
        <defs>
          <linearGradient id="circleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0A2540" />
            <stop offset="45%" stopColor="#0E5C8B" />
            <stop offset="100%" stopColor="#18A8A0" />
          </linearGradient>
          <linearGradient id="jGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#0A2540" />
            <stop offset="100%" stopColor="#18A8A0" />
          </linearGradient>
          <linearGradient id="pGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#18A8A0" />
            <stop offset="100%" stopColor="#3DDC97" />
          </linearGradient>
          <linearGradient id="arrowGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#18A8A0" />
            <stop offset="100%" stopColor="#7CF0C0" />
          </linearGradient>
          <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="60%" stopColor="#E8F4F1" />
            <stop offset="100%" stopColor="#7CF0C0" />
          </linearGradient>
          <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="sweepBlur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
          <clipPath id="pClip">
            <rect x="200" y="100" width="0" height="220" id="pClipRect" />
          </clipPath>
        </defs>

        <path id="circleGlow"
          d="M 200,345 A 145,145 0 0,1 55,200 A 145,145 0 0,1 200,55 A 145,145 0 0,1 345,200 A 145,145 0 0,1 200,345"
          fill="none" stroke="url(#circleGrad)" strokeWidth="8" strokeLinecap="round"
          opacity="0" filter="url(#softGlow)" />
        <path id="circle"
          d="M 200,345 A 145,145 0 0,1 55,200 A 145,145 0 0,1 200,55 A 145,145 0 0,1 345,200 A 145,145 0 0,1 200,345"
          fill="none" stroke="url(#circleGrad)" strokeWidth="3" strokeLinecap="round" />
        <g id="arrowGroup">
          <path id="arrowShaft"
            d="M 175,140 Q 218,108 252,82"
            fill="none" stroke="url(#arrowGrad)" strokeWidth="3.5" strokeLinecap="round" />
          <path id="arrowHead"
            d="M 240,92 L 274,60 L 258,98 Z"
            fill="#7CF0C0" opacity="0"
            style={{ transformOrigin: '268px 78px' }} />
        </g>
        <path id="jLetter"
          d="M 152,243 Q 152,265 175,265 Q 198,265 198,243 L 198,140"
          fill="none" stroke="url(#jGrad)" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
        <g clipPath="url(#pClip)">
          <path id="pLetter"
            d="M 218,278 L 218,138 Q 268,138 268,176 Q 268,214 218,214"
            fill="none" stroke="url(#pGrad)" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <g id="progressLines">
          <rect id="line1" x="62" y="178" width="56" height="4" rx="2" fill="#3DDC97" opacity="0" />
          <rect id="line2" x="62" y="198" width="68" height="4" rx="2" fill="#2D9CDB" opacity="0" />
          <rect id="line3" x="62" y="218" width="48" height="4" rx="2" fill="#6B7280" opacity="0" />
        </g>
        <path id="checkmark"
          d="M 222,270 L 236,286 L 268,252"
          fill="none" stroke="#18A8A0" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round"
          opacity="0" style={{ transformOrigin: '245px 269px' }} />
        {shouldShowText && (
          <text id="brandText"
            x="200" y="418" textAnchor="middle"
            fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif"
            fontSize="34" fontWeight="300" letterSpacing="20"
            fill="url(#textGrad)" opacity="0">July Plan</text>
        )}
        <path id="sweepGlow"
          d="M 200,345 A 145,145 0 0,1 55,200 A 145,145 0 0,1 200,55 A 145,145 0 0,1 345,200 A 145,145 0 0,1 200,345"
          fill="none" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round"
          opacity="0" filter="url(#sweepBlur)" />
        <path id="sweepGlow2"
          d="M 200,345 A 145,145 0 0,1 55,200 A 145,145 0 0,1 200,55 A 145,145 0 0,1 345,200 A 145,145 0 0,1 200,345"
          fill="none" stroke="#7CF0C0" strokeWidth="14" strokeLinecap="round"
          opacity="0" filter="url(#sweepBlur)" />
      </svg>
    </div>
  );
}
