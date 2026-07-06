// Supabase browser client — uses NEXT_PUBLIC_ env vars (safe to expose)
// Fallback values are hardcoded so the app works even if Vercel env vars
// are not set (the anon key is PUBLIC — protected by Supabase RLS, not secret).
import { createBrowserClient } from '@supabase/ssr';

// These are PUBLIC values (anon key, not service role).
// Safe to hardcode — security comes from Row Level Security, not key secrecy.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uqjnayzrowuhrfmvootz.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_5cplBsTI8CiL6IhN5beh0g_pZ1PcqVM';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.log('[JulyPlan] Using hardcoded Supabase config (env vars not set on this deployment).');
}

export const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const supabaseConfigured = !!(
  SUPABASE_URL &&
  SUPABASE_ANON_KEY &&
  !SUPABASE_URL.includes('placeholder')
);
