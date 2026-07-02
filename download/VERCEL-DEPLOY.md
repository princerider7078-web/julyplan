# July Plan V3.1 — Vercel Deployment Guide

This guide fixes two common Vercel issues:
1. **AI error**: "Configuration file not found or invalid. Please create .z-ai-config"
2. **Login problem**: Supabase auth not working on Vercel

---

## Issue 1: AI Not Working on Vercel

### Why it fails
The `z-ai-web-dev-sdk` reads credentials from a `.z-ai-config` file (only exists in the Z.ai sandbox). Vercel doesn't have this file, so AI calls fail.

### The fix
The `/api/ai` route now supports **5 different AI providers** via environment variables. Set ONE of these on Vercel — no code changes needed.

### Recommended: Groq (FREE + fast)

1. Get a free API key: https://console.groq.com/keys
2. On Vercel: **Settings → Environment Variables → Add**
3. Key: `GROQ_API_KEY`
4. Value: `gsk_your_key_here`
5. Click **Save**, then **Redeploy**

### Alternative: OpenRouter (FREE models available)

1. Get a key: https://openrouter.ai/keys
2. Add env var on Vercel:
   - Key: `OPENROUTER_API_KEY`
   - Value: `sk-or-v1-your_key`
3. Redeploy

### Alternative: Google Gemini (FREE)

1. Get a key: https://aistudio.google.com/app/apikey
2. Add env var on Vercel:
   - Key: `GEMINI_API_KEY`
   - Value: `AIzaSy...`
3. Redeploy

### Alternative: OpenAI (paid)

1. Get a key: https://platform.openai.com/api-keys
2. Add env var on Vercel:
   - Key: `OPENAI_API_KEY`
   - Value: `sk-proj-...`
3. Redeploy

### Verify it works

After deploying, visit:
```
https://your-vercel-url.vercel.app/api/ai
```

You should see:
```json
{"status":"ok","providers":["groq"],"active":"groq","hint":"Using groq"}
```

If you see `"active":"zai-sdk (sandbox fallback)"`, the env var wasn't set correctly — check Vercel redeployed after adding it.

---

## Issue 2: Supabase Login Not Working on Vercel

### Why it fails
Supabase Auth blocks redirects to URLs that aren't in its allowlist. By default, only `http://localhost:3000` is allowed. Your Vercel URL isn't whitelisted yet.

### The fix — add Vercel URL to Supabase

1. Open your Supabase Dashboard:
   https://supabase.com/dashboard/project/uqjnayzrowuhrfmvootz

2. Left sidebar → **Authentication** → **URL Configuration**

3. Under **Site URL**, set:
   ```
   https://your-vercel-url.vercel.app
   ```
   (Replace with your actual Vercel URL)

4. Under **Redirect URLs**, add ALL of these:
   ```
   https://your-vercel-url.vercel.app
   https://your-vercel-url.vercel.app/**
   https://your-vercel-url.vercel.app/auth/callback
   ```
   Also keep `http://localhost:3000` for local dev.

5. Click **Save**

### Also verify on Vercel

Make sure these env vars are set on Vercel (**Settings → Environment Variables**):

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://uqjnayzrowuhrfmvootz.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_5cplBsTI8CiL6IhN5beh0g_pZ1PcqVM` |

### Also verify Supabase Database

If you haven't run the SQL schema yet, login will fail with a database error:

1. Supabase Dashboard → **SQL Editor** → **New Query**
2. Paste contents of `supabase/schema.sql` → **Run**
3. Paste contents of `supabase/v3-migration.sql` → **Run**

### Email confirmation

By default, Supabase requires email confirmation before login works. To disable for testing:

1. Supabase Dashboard → **Authentication** → **Providers** → **Email**
2. Turn OFF **Confirm email**
3. Click **Save**

OR keep it on and check your email (including spam folder) for the confirmation link.

---

## Complete Vercel Env Vars Checklist

Go to Vercel → your project → **Settings → Environment Variables** and add ALL of these:

### Required (for app to work)
| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://uqjnayzrowuhrfmvootz.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_5cplBsTI8CiL6IhN5beh0g_pZ1PcqVM` |

### Required (for AI — pick ONE)
| Key | Where to get it |
|-----|----------------|
| `GROQ_API_KEY` | https://console.groq.com/keys (FREE, recommended) |
| OR `OPENROUTER_API_KEY` | https://openrouter.ai/keys (FREE models) |
| OR `GEMINI_API_KEY` | https://aistudio.google.com/app/apikey (FREE) |
| OR `OPENAI_API_KEY` | https://platform.openai.com/api-keys (paid) |

### Optional (for APK to find your backend)
| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SITE_URL` | `https://your-vercel-url.vercel.app` |

After adding env vars, click **Redeploy** on Vercel for them to take effect.

---

## Testing Checklist

After deployment:

1. **Visit** `https://your-vercel-url.vercel.app/api/ai` (GET)
   - Should show `{"status":"ok","providers":["groq"],"active":"groq"}`

2. **Sign up** with a real email
   - Should NOT show "Database error" (if it does, run the SQL schema)
   - Should send a confirmation email (or auto-confirm if you disabled it)

3. **Sign in** with the same email + password
   - Should redirect to the dashboard (not stay on login page)

4. **Open AI Assistant** → ask "What should I focus on today?"
   - Should get a real AI response within 5 seconds
   - Should NOT see the ".z-ai-config" error

5. **Open AI Planner** → Generate Morning Plan
   - Should produce a time-blocked plan using your real tasks

---

## Troubleshooting

### "Configuration file not found or invalid"
→ You didn't set any AI provider env var on Vercel. Set `GROQ_API_KEY` (free).

### Login stays on the same page / "Invalid login credentials"
→ Either: (a) email not confirmed, (b) wrong password, or (c) Supabase redirect URL not configured. Follow Issue 2 steps above.

### "Database error saving new user"
→ You haven't run `supabase/schema.sql` in your Supabase SQL Editor yet.

### AI works but responses are slow
→ Groq is fastest (free tier). OpenRouter free models can be slow. OpenAI is fast but paid.

### CORS errors in browser console
→ Make sure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set on Vercel (not just in `.env.local`).

### APK can't reach AI
→ In the APK, go to AI Controls → set "AI Backend URL" to your Vercel URL (e.g. `https://your-app.vercel.app`). The APK will call `${url}/api/ai`.
