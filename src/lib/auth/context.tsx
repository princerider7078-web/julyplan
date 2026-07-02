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

function readInitialOffline(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('july-plan-offline') === 'true';
}

const OFFLINE_PROFILE = {
  id: 'offline-user',
  email: 'offline@local',
  name: 'Offline User',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authedProfile, setAuthedProfile] = useState<{ id: string; email: string; name?: string } | null>(null);
  // Loading is FALSE immediately in offline mode (no Supabase to check),
  // TRUE if we need to wait for the Supabase session check.
  const [isOffline, setIsOffline] = useState<boolean>(readInitialOffline);
  const [sessionChecked, setSessionChecked] = useState<boolean>(isOffline || !supabaseConfigured);

  useEffect(() => {
    if (!supabaseConfigured || isOffline) {
      return;
    }

    let cancelled = false;

    // Async getSession — setState happens in the callback, not the effect body
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
      setSessionChecked(true);
    }).catch(() => {
      if (cancelled) return;
      setSessionChecked(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
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

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [isOffline]);

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
      value={{ user, profile, loading: !sessionChecked, isOffline, signIn, signUp, signInOffline, signOut }}
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
