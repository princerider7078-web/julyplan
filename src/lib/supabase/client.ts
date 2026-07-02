// Supabase browser client — uses NEXT_PUBLIC_ env vars (safe to expose)
import { createBrowserClient } from '@supabase/ssr';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn('[JulyPlan] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Cloud sync disabled.');
}

export const supabase = createBrowserClient(
  url ?? 'https://placeholder.supabase.co',
  anonKey ?? 'placeholder-anon-key',
);

export const supabaseConfigured = !!(url && anonKey && !url.includes('placeholder'));
