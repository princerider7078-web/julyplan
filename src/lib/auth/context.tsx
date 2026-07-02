'use client';
import { createContext, useContext, useEffect, useState, type ReactNode, useMemo } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, supabaseConfigured } from '@/lib/supabase/client';

interface AuthState {
  user: User | null;
  profile: { id: string; email: string; name?: string } | null;
  loading: boolean;
  isOffline: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, name?: string) => Promise<{ error: string | null }>;
  signInOffline: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

const OFFLINE_PROFILE = {
  id: 'offline-user',
  email: 'offline@local',
  name: 'Offline User',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authedProfile, setAuthedProfile] = useState<{ id: string; email: string; name?: string } | null>(null);
  // Deterministic initial state — server and client render the same HTML.
  // Real values are loaded in the mount effect below; this prevents the
  // hydration mismatch where the server renders the login screen but the
  // client (with localStorage access) renders the dashboard.
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;

    // Defer all setState calls to a microtask so the effect body itself
    // doesn't call setState synchronously (satisfies the lint rule).
    queueMicrotask(() => {
      if (cancelled) return;

      const savedOffline = typeof window !== 'undefined'
        && localStorage.getItem('july-plan-offline') === 'true';

      if (savedOffline) {
        setIsOffline(true);
        setMounted(true);
        return;
      }

      if (!supabaseConfigured) {
        setMounted(true);
        return;
      }

      // Async getSession — setState in the .then callback
      supabase.auth.getSession().then(({ data }) => {
        if (cancelled) return;
        setUser(data.session?.user ?? null);
        if (data.session?.user) {
          setAuthedProfile({
            id: data.session.user.id,
            email: data.session.user.email ?? '',
            name: data.session.user.user_metadata?.name,
          });
        }
        setMounted(true);
      }).catch(() => {
        if (cancelled) return;
        setMounted(true);
      });
    });

    // Subscribe to auth state changes — setState in the callback, not effect body
    let sub: { subscription: { unsubscribe: () => void } } | null = null;
    if (supabaseConfigured) {
      sub = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          setAuthedProfile({
            id: session.user.id,
            email: session.user.email ?? '',
            name: session.user.user_metadata?.name,
          });
          setIsOffline(false);
          localStorage.removeItem('july-plan-offline');
        } else {
          setAuthedProfile(null);
        }
      });
    }

    return () => {
      cancelled = true;
      sub?.subscription.unsubscribe();
    };
  }, []);

  const profile = useMemo(() => {
    if (isOffline) return OFFLINE_PROFILE;
    return authedProfile;
  }, [isOffline, authedProfile]);

  async function signIn(email: string, password: string) {
    if (!supabaseConfigured) return { error: 'Supabase not configured' };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async function signUp(email: string, password: string, name?: string) {
    if (!supabaseConfigured) return { error: 'Supabase not configured' };
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { name: name || email.split('@')[0] } },
    });
    return { error: error?.message ?? null };
  }

  function signInOffline() {
    setIsOffline(true);
    localStorage.setItem('july-plan-offline', 'true');
  }

  async function signOut() {
    if (supabaseConfigured) {
      await supabase.auth.signOut();
    }
    setIsOffline(false);
    localStorage.removeItem('july-plan-offline');
    setAuthedProfile(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        // Loading = "we haven't yet checked localStorage + Supabase session"
        loading: !mounted,
        isOffline,
        signIn,
        signUp,
        signInOffline,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
