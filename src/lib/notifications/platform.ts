// Platform detection for notification service.
// Determines if we're running in Capacitor (native Android/iOS) or web browser.

import { Capacitor } from '@capacitor/core';

export type Platform = 'native' | 'web';

export function getPlatform(): Platform {
  try {
    return Capacitor.isNativePlatform() ? 'native' : 'web';
  } catch {
    return 'web';
  }
}

export function isNative(): boolean {
  return getPlatform() === 'native';
}

export function isWeb(): boolean {
  return getPlatform() === 'web';
}
