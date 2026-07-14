'use client';

import { useEffect } from 'react';
import { useStore } from '@/lib/store';
import { ACCENT_COLORS } from '@/lib/store';
import type { AccentColorKey } from '@/lib/types';

/**
 * V6 ThemeApplier — reads accentColor + gradientIntensity from the store
 * and applies them as CSS variables on :root / .dark at runtime.
 *
 * This lets users switch accent colors and gradient intensity live from Settings
 * without recompiling or reloading.
 *
 * Mounted once at the app root (in layout.tsx).
 */
export function ThemeApplier() {
  const accentColor = useStore((s) => s.settings.accentColor);
  const gradientIntensity = useStore((s) => s.settings.gradientIntensity);
  const themeMode = useStore((s) => s.settings.theme);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isDark = document.documentElement.classList.contains('dark');
    const def = ACCENT_COLORS[accentColor as AccentColorKey] ?? ACCENT_COLORS.amber;
    const palette = isDark ? def.dark : def.light;

    const root = document.documentElement;
    // Apply accent-driven CSS vars (these override globals.css defaults)
    root.style.setProperty('--primary', palette.primary);
    root.style.setProperty('--primary-foreground', palette.primaryForeground);
    root.style.setProperty('--ring', palette.ring);
    root.style.setProperty('--chart-1', palette.chart1);
    root.style.setProperty('--sidebar-primary', palette.primary);
    root.style.setProperty('--sidebar-primary-foreground', palette.primaryForeground);
    root.style.setProperty('--sidebar-ring', palette.ring);

    // Gradient stops — used by .gradient-primary and other premium gradients
    root.style.setProperty('--grad-from', def.gradient.from);
    root.style.setProperty('--grad-to', def.gradient.to);

    // Gradient intensity controls how prominent gradients are (0-1 opacity multiplier)
    const intensityMap: Record<string, number> = { subtle: 0.35, medium: 0.65, vibrant: 1.0 };
    root.style.setProperty('--grad-intensity', String(intensityMap[gradientIntensity] ?? 0.65));
  }, [accentColor, gradientIntensity, themeMode]);

  // Watch for theme class changes (light/dark toggle) and re-apply
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const observer = new MutationObserver(() => {
      // Re-trigger the effect by toggling a no-op state — simplest: re-apply directly
      const isDark = document.documentElement.classList.contains('dark');
      const accentColor = useStore.getState().settings.accentColor as AccentColorKey;
      const def = ACCENT_COLORS[accentColor] ?? ACCENT_COLORS.amber;
      const palette = isDark ? def.dark : def.light;
      const root = document.documentElement;
      root.style.setProperty('--primary', palette.primary);
      root.style.setProperty('--primary-foreground', palette.primaryForeground);
      root.style.setProperty('--ring', palette.ring);
      root.style.setProperty('--chart-1', palette.chart1);
      root.style.setProperty('--sidebar-primary', palette.primary);
      root.style.setProperty('--sidebar-primary-foreground', palette.primaryForeground);
      root.style.setProperty('--sidebar-ring', palette.ring);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return null;
}
