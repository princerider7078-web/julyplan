# JULY PLAN — Logo Usage & Branding System
## Complete Brand Identity Guide for Production Application

> **Version:** 1.0  
> **Last Updated:** July 2026  
> **Classification:** Internal Brand Document

---

## Table of Contents

1. [Logo Assets Overview](#1-logo-assets-overview)
2. [Logo Design Analysis](#2-logo-design-analysis)
3. [Screen-by-Screen Usage Guide](#3-screen-by-screen-usage-guide)
4. [Logo Decision Matrix](#4-logo-decision-matrix)
5. [Branding Rules](#5-branding-rules)
6. [Motion Branding Guide](#6-motion-branding-guide)
7. [Additional Logo Versions Needed](#7-additional-logo-versions-needed)
8. [Platform-Specific Guidelines](#8-platform-specific-guidelines)
9. [Accessibility & Contrast](#9-accessibility--contrast)
10. [Responsive Behavior](#10-responsive-behavior)

---

## 1. Logo Assets Overview

### Asset A: Static PNG Logo (`logo.png`)
| Property | Value |
|----------|-------|
| File | `public/logo.png` |
| Dimensions | 764 × 764 px |
| Format | PNG (RGBA, transparency) |
| Purpose | Persistent brand identity across all screens |
| Use case | Every non-launch context |

### Asset B: Animated HTML Logo (`logo-animation.html`)
| Property | Value |
|----------|-------|
| File | `public/logo-animation.html` |
| Technology | HTML + SVG + GSAP 3.12.5 + CustomEase |
| Total duration | ~5.05 seconds (4.75s animation + 0.3s fade out) |
| Easing | `cubic-bezier(0.22, 1, 0.36, 1)` — Apple-style spring |
| Framerate | 60 FPS (gsap.ticker.fps(60)) |
| Purpose | Launch experience, first impression, brand storytelling |
| Use case | App launch ONLY — never in persistent UI |

---

## 2. Logo Design Analysis

### Visual Elements (from animated SVG)

The July Plan logo is a sophisticated composite mark containing 7 animated elements:

| Element | Meaning | Color | Animation |
|---------|---------|-------|-----------|
| **Circle** | Completion, cycle, monthly plan | Gradient: `#0A2540` → `#0E5C8B` → `#18A8A0` | Draws clockwise (stroke-dashoffset) |
| **Arrow** | Growth, upward trajectory, progress | Gradient: warm tones | Grows from bottom-left to top-right |
| **Arrow Head** | Direction, goal-reaching | `#7CF0C0` (mint) | Pops in with bounce |
| **J Letter** | "July" | Blue gradient | Draws as stroke path |
| **P Letter** | "Plan" | Teal gradient | Draws with clip-reveal |
| **Checkmark** | Task completion, execution | `#18A8A0` (teal) | Pops in with elastic bounce |
| **Brand Text** | "JULY PLAN" wordmark | White | Fades in with letter-spacing settle |
| **Lines (3)** | Task list, structure | `#3DDC97`, `#2D9CDB`, `#6B7280` | Slide in from left |
| **Sweep Glow** | Premium polish, energy | White + mint | Two-pass sweep around circle |

### Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| Deep Navy | `#0A2540` | Circle gradient start |
| Ocean Blue | `#0E5C8B` | Circle gradient mid |
| Teal | `#18A8A0` | Circle gradient end, checkmark |
| Mint | `#7CF0C0` | Arrow head, sweep glow |
| Green | `#3DDC97` | Line 1 (task complete) |
| Sky Blue | `#2D9CDB` | Line 2 (task pending) |
| Gray | `#6B7280` | Line 3 (task muted) |
| White | `#FFFFFF` | Brand text, sweep glow |
| Amber | `#F97316` | App theme primary (UI accent) |

### Design Philosophy
- **Not a flat icon** — it's a narrative mark that tells the story of planning → executing → completing
- The arrow + circle combo represents "planned growth within a cycle"
- The checkmark inside the P represents "execution completes the plan"
- Premium feel via gradient strokes, glow effects, and Apple-style easing

---

## 3. Screen-by-Screen Usage Guide

### 3.1 App Launch (Cold Start)

| Property | Value |
|----------|-------|
| **Logo** | Animated HTML |
| **Why** | First impression — sets premium tone, tells brand story |
| **Size** | Full-screen centered (min(560px, 90vw)) |
| **Duration** | 5.05s full animation |
| **Frequency** | Once per cold start (not on warm resume) |
| **Light mode** | Black background `#000000` |
| **Dark mode** | Black background `#000000` (same — intentional) |
| **After animation** | Fade to app dashboard |

**Implementation:** Open `logo-animation.html` in a full-screen WebView, detect animation complete via `gsap.tl.eventCallback('onComplete')`, then navigate to dashboard.

---

### 3.2 Splash Screen (Android Native)

| Property | Value |
|----------|-------|
| **Logo** | Static PNG |
| **Why** | Android splash must be instant — no JS/GSAP allowed. System renders drawable before app loads. |
| **Size** | 240×240 dp (centered on amber `#F97316` background) |
| **Duration** | 800ms (Capacitor `launchShowDuration`) |
| **Frequency** | Every app start (system-controlled) |
| **Light mode** | Amber background + PNG logo |
| **Dark mode** | Amber background + PNG logo (same — splash is always branded) |

---

### 3.3 Login Screen

| Property | Value |
|----------|-------|
| **Logo** | Static PNG |
| **Why** | Login is a functional screen — animation would delay the user from signing in |
| **Size** | 80×80 px (h-20 w-20) |
| **Frequency** | Always visible on login screen |
| **Light mode** | PNG on `bg-gradient-to-br from-amber-50 to-orange-100` |
| **Dark mode** | PNG on `dark:from-stone-950 dark:to-stone-900` |
| **Animation** | None — but a subtle CSS fade-in on mount is acceptable |

---

### 3.4 Signup Screen

| Property | Value |
|----------|-------|
| **Logo** | Static PNG |
| **Why** | Same as login — functional screen, no delay |
| **Size** | 80×80 px |
| **Frequency** | Always visible |
| **Animation** | None |

---

### 3.5 Dashboard

| Property | Value |
|----------|-------|
| **Logo** | None (dashboard is data-focused) |
| **Why** | Dashboard real estate is for execution data, not branding |
| **Alternative** | "July Plan" text in header is sufficient |
| **Frequency** | N/A |

---

### 3.6 Navbar (Top Header)

| Property | Value |
|----------|-------|
| **Logo** | None (text "July Plan" or page title only) |
| **Why** | Header space is limited — notification bell + sync indicator + New button need room |
| **Size** | N/A |
| **Frequency** | N/A |

---

### 3.7 Sidebar

| Property | Value |
|----------|-------|
| **Logo** | Static PNG |
| **Why** | Sidebar is persistent — animation would be distracting and waste CPU |
| **Size** | 36×36 px (h-9 w-9) |
| **Frequency** | Always visible when sidebar is open |
| **Light mode** | PNG with `rounded-xl shadow-md shadow-orange-500/20` |
| **Dark mode** | Same PNG (logo has transparency, works on both) |
| **Animation** | None |

---

### 3.8 Settings

| Property | Value |
|----------|-------|
| **Logo** | None (settings is utility-focused) |
| **Alternative** | App name + version text |
| **Frequency** | N/A |

---

### 3.9 AI Assistant (Chat)

| Property | Value |
|----------|-------|
| **Logo** | Static PNG (as AI avatar) |
| **Why** | AI needs a visual identity in chat — PNG logo serves as the AI avatar |
| **Size** | 32×32 px (h-8 w-8 rounded-full) |
| **Frequency** | Every AI response message |
| **Light mode** | PNG on `bg-primary/10` circle |
| **Dark mode** | Same |
| **Animation** | Subtle pulse when AI is typing (CSS `animate-pulse-soft`) |

---

### 3.10 Notifications

| Property | Value |
|----------|-------|
| **Logo** | Static PNG |
| **Why** | System notifications need instant display — no animation |
| **Size** | 48×48 dp (Android standard small icon) |
| **Frequency** | Every notification |
| **Light mode** | PNG |
| **Dark mode** | PNG |
| **Implementation** | `icon: '/logo.png'` in Service Worker `showNotification()` |

---

### 3.11 Widgets (Future)

| Property | Value |
|----------|-------|
| **Logo** | Static PNG (small, 24×24 dp) |
| **Why** | Widget space is extremely limited |
| **Size** | 24×24 dp minimum |

---

### 3.12 Empty States

| Property | Value |
|----------|-------|
| **Logo** | Static PNG (faded, 50% opacity) |
| **Why** | Empty states should feel encouraging, not branded — faded logo is a subtle touch |
| **Size** | 64×64 px |
| **Opacity** | 40-50% |
| **Animation** | Optional subtle float (CSS `animate-pulse-soft`) |

---

### 3.13 Loading Screens (Data Sync)

| Property | Value |
|----------|-------|
| **Logo** | Static PNG |
| **Why** | Loading is brief (1-3s) — animation would be cut short or feel janky |
| **Size** | 64×64 px (h-16 w-16) |
| **Animation** | CSS spinner (Loader2 icon) next to logo, not logo animation |
| **Frequency** | Every auth check / data sync |

---

### 3.14 Onboarding (Future)

| Property | Value |
|----------|-------|
| **Logo** | Animated HTML (first slide only) + Static PNG (subsequent slides) |
| **Why** | First onboarding slide is the "welcome" moment — animation sets the tone. Subsequent slides are educational — static is better. |
| **Size** | Full-width centered (min(400px, 70vw)) |
| **Duration** | Full 5.05s on first slide, static after |
| **Frequency** | Once per new user |

---

### 3.15 Profile

| Property | Value |
|----------|-------|
| **Logo** | None (user avatar goes here) |
| **Alternative** | If no avatar, show user's initials in a branded circle |

---

### 3.16 Share Cards (Future)

| Property | Value |
|----------|-------|
| **Logo** | Static PNG |
| **Why** | Share cards are static images — no animation possible |
| **Size** | 48×48 px (bottom corner of share card) |
| **Background** | White or amber depending on card design |

---

### 3.17 Reports

| Property | Value |
|----------|-------|
| **Logo** | Static PNG (header, small) |
| **Why** | Reports are data-focused — logo is just for attribution |
| **Size** | 24×24 px |

---

### 3.18 PDFs (Future)

| Property | Value |
|----------|-------|
| **Logo** | Static PNG |
| **Why** | PDFs are print-ready — no animation |
| **Size** | 120×120 px (header) |
| **Placement** | Top-left corner of first page |

---

### 3.19 Website (Landing Page — Future)

| Property | Value |
|----------|-------|
| **Logo** | Animated HTML (hero section) + Static PNG (navbar) |
| **Why** | Landing page hero is the marketing moment — animation sells the product. Navbar needs instant branding. |
| **Hero size** | min(560px, 90vw) |
| **Navbar size** | 32×32 px |
| **Frequency** | Animation plays once on page load, then static |

---

### 3.20 PWA

| Property | Value |
|----------|-------|
| **Logo** | Static PNG |
| **Why** | PWA manifest icons must be PNG |
| **Sizes** | 192×192, 512×512 (manifest.json) |
| **Maskable** | Yes (safe zone 80% center) |

---

### 3.21 Browser Tab (Favicon)

| Property | Value |
|----------|-------|
| **Logo** | Static PNG |
| **Why** | Favicons must be instant — no animation |
| **Size** | 32×32 px (browser standard) |
| **Implementation** | `<link rel="icon" href="/logo.png" />` in layout.tsx |

---

### 3.22 App Icon (Android)

| Property | Value |
|----------|-------|
| **Logo** | Static PNG |
| **Why** | Launcher icons must be PNG — no animation |
| **Sizes** | 48, 72, 96, 144, 192 px (all mipmap densities) |
| **Adaptive** | Foreground (logo on transparent) + Background (amber `#F97316`) |

---

### 3.23 Play Store (Future)

| Property | Value |
|----------|-------|
| **Logo** | Static PNG |
| **Size** | 512×512 px (high-res icon) |
| **Feature graphic** | 1024×500 px (logo + tagline on branded background) |

---

### 3.24 GitHub

| Property | Value |
|----------|-------|
| **Logo** | Static PNG |
| **Where** | Repository social preview (1280×640 px) |
| **README** | PNG at top of README.md |

---

### 3.25 Documentation

| Property | Value |
|----------|-------|
| **Logo** | Static PNG |
| **Where** | Top of every doc page |
| **Size** | 32×32 px |

---

### 3.26 Social Media

| Property | Value |
|----------|-------|
| **Logo** | Static PNG |
| **Profile pic** | 400×400 px (square) |
| **Cover banner** | 1500×500 px (logo + tagline on branded background) |
| **Story** | 1080×1920 px (centered logo on dark background) |

---

### 3.27 Marketing

| Property | Value |
|----------|-------|
| **Logo** | Animated HTML (video ads) + Static PNG (print/static ads) |
| **Video** | Record animation as 6s intro clip for video ads |
| **Print** | PNG at 300 DPI minimum |

---

## 4. Logo Decision Matrix

| Screen | PNG | Animated | Reason |
|--------|-----|----------|--------|
| App Launch (cold start) | ❌ | ✅ | Brand storytelling, first impression |
| Splash Screen (Android) | ✅ | ❌ | System-rendered, no JS allowed |
| Login | ✅ | ❌ | Functional screen, no delay |
| Signup | ✅ | ❌ | Functional screen, no delay |
| Dashboard | ❌ | ❌ | Data-focused, no branding needed |
| Navbar | ❌ | ❌ | Space limited |
| Sidebar | ✅ | ❌ | Persistent, animation = distraction |
| Settings | ❌ | ❌ | Utility screen |
| AI Assistant | ✅ | ❌ | AI avatar, persistent in chat |
| Notifications | ✅ | ❌ | System tray, instant display |
| Widgets | ✅ | ❌ | Tiny space, static only |
| Empty States | ✅ (faded) | ❌ | Subtle encouragement |
| Loading Screens | ✅ | ❌ | Brief, CSS spinner suffices |
| Onboarding (slide 1) | ❌ | ✅ | Welcome moment |
| Onboarding (slide 2+) | ✅ | ❌ | Educational, static |
| Profile | ❌ | ❌ | User avatar goes here |
| Share Cards | ✅ | ❌ | Static image format |
| Reports | ✅ (small) | ❌ | Attribution only |
| PDFs | ✅ | ❌ | Print format |
| Website Hero | ❌ | ✅ | Marketing moment |
| Website Navbar | ✅ | ❌ | Instant branding |
| PWA | ✅ | ❌ | Manifest requires PNG |
| Browser Tab | ✅ | ❌ | Favicon = instant |
| App Icon | ✅ | ❌ | Launcher = PNG only |
| Play Store | ✅ | ❌ | Store listing = static |
| GitHub | ✅ | ❌ | Social preview = static |
| Documentation | ✅ | ❌ | Doc pages = static |
| Social Media | ✅ | ❌ | Profile/cover = static |
| Marketing (video) | ❌ | ✅ | Video intro = animation |
| Marketing (print) | ✅ | ❌ | Print = static |

**Summary: Animated logo is used in ONLY 3 places:**
1. App cold launch
2. Onboarding slide 1
3. Website hero / video marketing

**Everywhere else: Static PNG.**

---

## 5. Branding Rules

### 5.1 Do's

✅ Always maintain the logo's aspect ratio (1:1 square)
✅ Use the PNG on appropriate contrast backgrounds
✅ Provide minimum 8px padding around the logo
✅ Use the animated version ONLY for launch/onboarding/hero moments
✅ Keep the amber `#F97316` as the primary brand accent color in UI
✅ Ensure the logo is at least 24×24 px in any context
✅ Use `rounded-xl` or `rounded-2xl` on the logo container for consistent feel
✅ Apply shadow (`shadow-md` or `shadow-lg`) for depth on light backgrounds

### 5.2 Don'ts

❌ Never stretch or distort the logo
❌ Never change the logo colors
❌ Never place the logo on a busy pattern background without a solid overlay
❌ Never use the animated logo in persistent UI (sidebar, navbar, chat)
❌ Never reduce the logo below 24×24 px
❌ Never add additional effects (drop shadow, glow) to the animated version
❌ Never rotate the logo
❌ Never use a screenshot of the animated logo as a static image — use the PNG
❌ Never animate the PNG logo with CSS (use the HTML animation or nothing)
❌ Never show the animated logo more than once per session

### 5.3 Safe Spacing

```
┌─────────────────────────────┐
│                             │
│    ┌─────────────────┐      │
│    │                 │      │
│    │     [LOGO]      │      │  ← Minimum padding = 1/4 logo size
│    │                 │      │     (e.g., 36px logo → 9px padding min)
│    └─────────────────┘      │
│                             │
└─────────────────────────────┘
```

| Logo Size | Minimum Padding |
|-----------|----------------|
| 24px | 6px |
| 36px | 9px |
| 48px | 12px |
| 64px | 16px |
| 80px | 20px |
| 120px | 30px |

### 5.4 Minimum Size

| Context | Minimum Size |
|---------|-------------|
| Favicon | 16×16 px |
| Notification icon | 24×24 px |
| Sidebar/sidebar | 32×32 px |
| AI avatar | 32×32 px |
| Login/launch | 64×64 px |
| Empty states | 48×48 px |
| App launcher | 48×48 px (mdpi) |

### 5.5 Background Colors

| Background | Logo Treatment |
|-----------|---------------|
| White `#FFFFFF` | PNG as-is (logo has dark elements visible on white) |
| Amber `#F97316` | PNG as-is (splash screen) |
| Dark `#0A0A0A` / `#1A1410` | PNG as-is (logo has light elements visible on dark) |
| Gradient (amber→orange) | PNG with `rounded-2xl shadow-lg` |
| Pattern/image | Add solid white/dark overlay (80% opacity) behind logo |

---

## 6. Motion Branding Guide

### 6.1 Where Animation is ALLOWED

| Location | Duration | Loop | Notes |
|----------|----------|------|-------|
| App cold launch | 5.05s full | No (play once) | Skip if user opens within 2s of last close |
| Onboarding slide 1 | 5.05s full | No | Auto-advance to slide 2 after complete |
| Website hero | 5.05s full | No | Play on page load only |
| Marketing video | 5.05s full | No | Use as intro clip |

### 6.2 Where Animation should NEVER be Used

| Location | Reason |
|----------|--------|
| Sidebar | Persistent UI — animation = constant CPU drain |
| Navbar | Distracting, limited space |
| Dashboard | Data-focused, animation steals attention |
| AI chat messages | Avatar must be static for readability |
| Notifications | System tray = instant display |
| Settings | Utility screen, no branding needed |
| Reports | Data-focused, print-ready |
| Any list item | Scrolling + animation = janky |
| Any repeating element | Performance + distraction |

### 6.3 Loop Rules

- **Never loop the full animation.** It's designed as a one-shot reveal.
- The animated logo has a natural ending (brand text settled, sweep complete).
- If a loading state needs animation after the logo, use a CSS spinner — NOT a looping logo.

### 6.4 Performance Rules

| Rule | Implementation |
|------|---------------|
| GSAP loaded only when needed | `dynamic import` in the launch component |
| SVG `will-change` hints | Already set in animation HTML |
| `transform-box: fill-box` | Already set — prevents layout thrashing |
| 60 FPS target | `gsap.ticker.fps(60)` already set |
| No layout animations | All animations use `transform` + `opacity` (GPU-composited) |
| Clean up on unmount | Kill GSAP timeline: `tl.kill()` |

### 6.5 Mobile Optimization

| Concern | Solution |
|---------|----------|
| GSAP library size (~50KB) | Load from CDN, cache aggressively |
| Low-end devices | Fallback: if `requestAnimationFrame` janky, skip to static PNG after 1s |
| Reduced motion preference | Check `window.matchMedia('(prefers-reduced-motion: reduce)')` → show PNG only |
| WebView compatibility | Test in Capacitor WebView — GSAP works in Android Chrome WebView 70+ |

### 6.6 Battery Optimization

- Animation runs for max 5.05s — negligible battery impact
- After animation completes, kill the GSAP timeline + remove the WebView
- Never run animation in background (visibilitychange listener)
- The 60 FPS target is for smoothness, not continuous — it's a one-shot

---

## 7. Additional Logo Versions Needed

Based on the analysis, here are the additional versions to create:

### 7.1 App Icon (Adaptive Android)

| Version | Spec | Status |
|---------|------|--------|
| **Foreground** | Logo on transparent, 66% of canvas | ✅ Generated |
| **Background** | Solid amber `#F97316` | ✅ Generated |
| **Legacy (pre-Android 8)** | Full logo on amber square | ✅ Generated |

### 7.2 Monogram (JP)

| Version | Spec | Purpose |
|---------|------|---------|
| **JP Monogram** | Just "JP" in brand gradient, no circle/arrow | Favicon at 16×16, tiny spaces |

**Status:** Not yet created. Recommended for 16px favicon — the full logo is too detailed at that size.

### 7.3 Notification Icon

| Version | Spec | Purpose |
|---------|------|---------|
| **Silhouette** | White silhouette of the logo on transparent | Android status bar (monochrome required) |

**Status:** Not yet created. **IMPORTANT:** Android status bar icons must be white-on-transparent. The current PNG won't render correctly in the status bar on Android 8+.

### 7.4 AI Avatar

| Version | Spec | Purpose |
|---------|------|---------|
| **Circular crop** | Logo in a circle with `bg-primary/10` | AI chat messages |

**Status:** ✅ Current PNG works (cropped to circle via CSS `rounded-full`).

### 7.5 Favicon

| Version | Spec | Purpose |
|---------|------|---------|
| **32×32 PNG** | Full logo | Browser tab |
| **16×16 PNG** | JP monogram | Tiny tabs |

**Status:** ✅ 32×32 works. 16×16 monogram recommended.

### 7.6 Adaptive Android Icon

| Version | Spec | Status |
|---------|------|--------|
| Foreground | Logo on transparent | ✅ Generated |
| Background | Amber XML | ✅ Generated |

### 7.7 iOS Icon (Future)

| Version | Spec | Purpose |
|---------|------|---------|
| **iOS App Icon** | 1024×1024 PNG, logo on amber bg, no transparency | App Store |

**Status:** Not yet created (iOS not currently supported).

### 7.8 Social Icon

| Version | Spec | Purpose |
|---------|------|---------|
| **Social preview** | 1280×640 PNG, logo + "July Plan" text on gradient | GitHub, Twitter, Facebook |

**Status:** Not yet created.

---

## 8. Platform-Specific Guidelines

### 8.1 Android (Capacitor)

| Element | Spec |
|---------|------|
| Launcher icon | PNG, all mipmap densities (48-192px) |
| Adaptive foreground | PNG, 66% centered on 108-432px transparent |
| Adaptive background | XML vector, amber `#F97316` |
| Splash screen | PNG on amber, 240×240dp, 800ms |
| Notification icon | White silhouette (NOT yet created — use PNG for now) |
| Status bar icon | Must be white-on-transparent (NOT yet created) |

### 8.2 Web (Vercel)

| Element | Spec |
|---------|------|
| Favicon | PNG, 32×32 (in `<link rel="icon">`) |
| PWA icon | PNG, 192×192 + 512×512 (in manifest.json) |
| Open Graph image | PNG, 1200×630 (for social sharing) |
| Apple touch icon | PNG, 180×180 |

### 8.3 iOS (Future)

Follow Apple Human Interface Guidelines:
- App icon: 1024×1024 PNG, no transparency, no alpha
- Rounded corners applied by system (don't pre-round)
- Single layer (no adaptive icon concept)
- Notification icon: 44×44, white-on-transparent

---

## 9. Accessibility & Contrast

### 9.1 Contrast Ratios

| Element | Background | Foreground | Ratio | WCAG |
|---------|-----------|-----------|-------|------|
| Logo on white | `#FFFFFF` | `#0A2540` (darkest) | 15.3:1 | AAA ✅ |
| Logo on amber | `#F97316` | `#0A2540` | 7.2:1 | AAA ✅ |
| Logo on dark | `#0A0A0A` | `#7CF0C0` (mint) | 11.8:1 | AAA ✅ |
| Logo on dark | `#0A0A0A` | `#FFFFFF` (white) | 19.3:1 | AAA ✅ |

### 9.2 Accessibility Rules

- Logo is decorative — screen readers should announce "July Plan" text, not the logo image
- Use `alt="July Plan"` on all logo images
- For animated logo, provide a `prefers-reduced-motion` fallback to static PNG
- Minimum touch target around logo: 44×44 px (Apple HIG) / 48×48 dp (Material)

### 9.3 Color Blindness

The logo uses blue-teal-green gradients which may be difficult for:
- **Deuteranopia** (red-green): Arrow head mint vs circle teal may blend
- **Protanopia** (red-green): Similar issue
- **Tritanopia** (blue-yellow): Minimal impact (logo is blue-teal dominant)

**Mitigation:** The logo relies on shape (circle + arrow + letters) not just color, so colorblind users can still identify it.

---

## 10. Responsive Behavior

| Breakpoint | Logo Size | Treatment |
|-----------|----------|-----------|
| < 640px (mobile) | 32×32 (sidebar), 64×64 (login) | PNG, `rounded-xl` |
| 640-768px (tablet) | 36×36 (sidebar), 80×80 (login) | PNG, `rounded-xl` |
| 768-1024px (desktop) | 36×36 (sidebar), 80×80 (login) | PNG, `rounded-xl` |
| > 1024px (large) | 36×36 (sidebar), 80×80 (login) | PNG, `rounded-xl` |

### Animated Logo Responsive

| Breakpoint | Size | Notes |
|-----------|------|-------|
| < 640px | `min(400px, 90vw)` | Full animation, scaled down |
| 640-1024px | `min(560px, 90vw)` | Full animation, optimal size |
| > 1024px | `560px` fixed | Full animation, max size |

---

## Summary: Key Takeaways

1. **Animated logo = launch-only.** 3 places: cold start, onboarding slide 1, website hero. Everywhere else = static PNG.

2. **PNG is the workhorse.** Used in 20+ locations. Must be available in multiple sizes.

3. **Never mix.** Don't animate the PNG. Don't screenshot the animation. Each asset has its purpose.

4. **Amber is the brand accent.** `#F97316` for backgrounds, splash, UI highlights. The logo itself uses blue-teal-mint.

5. **Accessibility first.** `prefers-reduced-motion` fallback, minimum sizes, alt text, contrast ratios all meet WCAG AAA.

6. **Performance matters.** GSAP animation is 5s one-shot, then killed. PNG is instant everywhere.

7. **Missing assets to create:**
   - Notification silhouette (white-on-transparent for Android status bar)
   - JP monogram (for 16px favicon)
   - Social preview image (1280×640 for GitHub/OG)
   - Open Graph image (1200×630 for link sharing)

---

*This document is the single source of truth for all July Plan logo usage. Any deviation must be approved by the product owner.*
