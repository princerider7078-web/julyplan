# July Plan V3.1 — Setup Guide

## Step 1: Run Supabase SQL Schema (REQUIRED for cloud sync)

Your Supabase project is reachable and auth works, but the database tables don't exist yet.

### What to do:

1. Open your Supabase Dashboard → https://supabase.com/dashboard/project/uqjnayzrowuhrfmvootz
2. Click **SQL Editor** (left sidebar) → **New query**
3. Open the file `supabase/schema.sql` from this project, copy ALL of it
4. Paste into the SQL Editor → click **Run**
5. Repeat for `supabase/v3-migration.sql` (pgvector + V3 memory columns)

### What this creates:
- 27 tables: users, ai_profiles, tasks, habits, finance_entries, journal_entries, knowledge_notes, ai_memories, ai_requests, ai_responses, analytics_*, notifications, etc.
- Row Level Security on every table (only your data)
- Auto-profile trigger (creates user profile on signup)
- pgvector for semantic memory search
- `match_memories()` function for vector similarity search

### After running SQL:
- Sign up in the app with a real email
- Confirm via the email link Supabase sends
- Sign in → your data now syncs to the cloud
- AI Memory persists across devices

---

## Step 2: Install the APK

File: `JulyPlan-v3.1-release.apk`

1. Transfer the APK to your Android phone
2. Open the APK file (allow "Install from unknown sources" if prompted)
3. Tap **Install** → open **July Plan**

---

## Step 3: Enable AI in the APK

The APK needs to know where your July Plan backend is deployed.

### Option A: Use this sandbox's preview URL (temporary)
1. Open the app → **Continue Offline** (or sign in)
2. Go to **AI Controls** (sidebar → System → AI Controls)
3. In the **AI Backend URL** field, enter:
   ```
   https://preview-<bot-id>.space-z.ai
   ```
   (Replace `<bot-id>` with your actual preview bot ID — check the preview panel in your chat interface)
4. AI Chat, Planner, Reports, Briefings, Notifications will now work in the APK

### Option B: Deploy to Vercel/Netlify (permanent)
1. Push this project to GitHub
2. Import to Vercel → set env vars:
   - `NEXT_PUBLIC_SUPABASE_URL=https://uqjnayzrowuhrfmvootz.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_5cplBsTI8CiL6IhN5beh0g_pZ1PcqVM`
3. Deploy → copy the URL (e.g. `https://july-plan.vercel.app`)
4. In the APK → AI Controls → AI Backend URL → paste the Vercel URL

---

## Step 4: Test AI Features

### AI Memory (works offline + cloud)
- Open **AI Memory** → **New Memory**
- Save: "I am preparing for BCA to become a Quantum Software Developer"
- Open **AI Assistant** → ask "How should I study?"
- AI response will mention quantum computing → memory retrieval working

### AI Chat Commands (work offline)
In AI Assistant, try:
- `remember that I wake up at 5 AM` → saves memory
- `show my memories` → lists all
- `add gym tomorrow 7 AM` → creates task
- `show today's tasks` → lists today
- `help` → shows all commands

### AI Planner (needs backend)
- Open **AI Planner** → click Generate next to Morning Plan
- AI generates a time-blocked plan using your tasks + habits + memories

### AI Notifications (needs backend)
- Open **Notifications** → click Hydration
- AI generates: "Paani abhi bhi nahi? 3L target, 1 glass le lo."
- Uses your actual water target + Hinglish tone

### Daily Briefing (needs backend)
- Open **Daily Briefing** → Generate Morning Briefing
- AI creates: Today's Top 3 + Habit Status + Focus + Motivation
- Uses your real tasks + memories

---

## Troubleshooting

**"AI features require a connection..." in APK**
→ Set AI Backend URL in AI Controls (Step 3)

**Signup fails with "Database error"**
→ You haven't run the SQL schema (Step 1)

**Can't sign in after signup**
→ Check email for confirmation link (Supabase sends it)

**Memories don't sync across devices**
→ Sign in (not offline mode) + run SQL schema first

---

## File Reference

- `supabase/schema.sql` — Main 27-table schema (run first)
- `supabase/v3-migration.sql` — V3 pgvector + memory columns (run second)
- `JulyPlan-v3.1-release.apk` — Release-signed Android APK
- `.env.local` — Supabase env vars (already configured)
