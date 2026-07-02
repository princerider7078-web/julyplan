// In-app notification toast system.
// Shows a visible banner at the top of the screen when a notification fires,
// even if the browser blocks the system notification popup.
// This ensures the user ALWAYS sees notifications in the app.

import { create } from 'zustand';

export interface ToastNotification {
  id: string;
  title: string;
  body: string;
  channelId: string;
  timestamp: string;
  // Whether the system notification was also shown
  systemShown: boolean;
}

interface ToastState {
  toasts: ToastNotification[];
  addToast: (toast: Omit<ToastNotification, 'id' | 'timestamp'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const entry: ToastNotification = {
      ...toast,
      id,
      timestamp: new Date().toISOString(),
    };
    set((s) => ({ toasts: [...s.toasts, entry].slice(-5) }));  // keep last 5
    // Auto-remove after 8 seconds
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 8000);
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  clearToasts: () => set({ toasts: [] }),
}));

// Convenience function to show a toast (can be called from anywhere)
export function showToast(title: string, body: string, channelId: string = 'tasks', systemShown: boolean = false): void {
  useToastStore.getState().addToast({ title, body, channelId, systemShown });
}
