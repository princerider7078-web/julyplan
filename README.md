# July Plan V3.1 — Personal AI Operating System

A cloud-powered personal life OS with AI at the center. Built with Next.js 16, Supabase, Capacitor, and a provider-agnostic AI brain.

![July Plan](https://img.shields.io/badge/version-3.1-amber) ![License](https://img.shields.io/badge/license-MIT-green) ![Platform](https://img.shields.io/badge/platform-Web%20%2B%20Android-blue)

## Features

### 18 Modules
- **Dashboard** — priority execution grid, today's Top 3, habit quick-mark
- **Today Plan** — priority-ordered task list
- **Tasks** — full CRUD with sections, subtasks, recurring, reminders
- **Sections** — 8 default sections + custom create
- **Daily Routine** — 6 AM → 12 AM timeline (20 blocks)
- **Habits** — streaks, 7-day grid, completion %
- **Finance** — income/expense/savings targets
- **July Plan** — 31-day execution grid + 4 weekly themes
- **Journal** — mood tracking + AI summaries
- **Knowledge Base** — notes with tags + AI auto-tagging
- **AI Assistant** — chat with memory retrieval + natural language commands
- **AI Planner** — morning/afternoon/evening/night/recovery/weekly/monthly plans
- **AI Memory** — long-term memory with 13 categories, pin/favorite/lock/merge
- **Notifications** — 11 AI-generated notification types
- **AI Reports** — daily/weekly/monthly honest summaries
- **Daily Briefing** — morning + evening + weekly + motivation
- **Conversation History** — full chat log with search
- **AI Controls** — provider switching, model config, memory management, logs

### AI Brain (Provider-Agnostic)
- Default: **z-ai-web-dev-sdk** (built-in, no API key needed)
- Swappable to: OpenRouter, Gemini, Groq, OpenAI, Ollama — via Dev Controls UI
- **Long-term memory** stored in Supabase, not in the model
- **Semantic retrieval** (Jaccard similarity + recency + importance scoring; pgvector-ready)
- **Automatic memory extraction** after every chat exchange
- **Natural language commands**: "remember that...", "add gym tomorrow 7 AM", "show my memories"

### Backend
- **Supabase**: PostgreSQL, Auth, RLS, Realtime, pgvector
- 27 tables with strict row-level security (`user_id = auth.uid()`)
- Auto-profile creation on signup
- Edge Functions ready

### Offline-First
- All core features work without internet (localStorage via Zustand)
- Cloud sync activates when authenticated
- APK mode: set `AI Backend URL` in Dev Controls to enable AI on mobile

## Tech Stack
- **Frontend**: Next.js 16 + TypeScript + Tailwind CSS 4 + shadcn/ui
- **State**: Zustand (with localStorage persistence)
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **AI**: z-ai-web-dev-sdk (default) + provider abstraction layer
- **Mobile**: Capacitor (wraps static export as Android APK)
- **Charts**: Recharts

## Quick Start

### Web (development)
```bash
bun install
cp .env.local.example .env.local  # fill in Supabase values
bun run db:push                    # if using Prisma
bun run dev
```

### Supabase Setup
1. Create a Supabase project
2. Run `supabase/schema.sql` in SQL Editor (creates 27 tables + RLS)
3. Run `supabase/v3-migration.sql` (adds pgvector + V3 memory columns)
4. Copy project URL + anon key to `.env.local`

### Android APK Build
```bash
# 1. Switch to static export mode
# Edit next.config.ts → output: "export"

# 2. Move API route out (can't be statically exported)
mv src/app/api src/app/_api_backup

# 3. Build static site
bunx next build

# 4. Sync to Android + build APK
bunx cap copy android
cd android
./gradlew assembleDebug      # debug APK
./gradlew assembleRelease    # release APK (needs keystore.properties)
```

See `download/SETUP-GUIDE.md` for full instructions.

## Project Structure
```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Main app shell (view router)
│   ├── layout.tsx         # Root layout with AuthProvider + ThemeProvider
│   └── api/ai/route.ts    # AI proxy (server-side z-ai SDK)
├── lib/
│   ├── ai/                # AI system
│   │   ├── manager.ts     # AIManager orchestrator
│   │   ├── memory.ts      # Long-term memory CRUD + semantic retrieval
│   │   ├── context.ts     # Context builder (memory + tasks + habits)
│   │   ├── prompts.ts     # Prompt templates per request type
│   │   ├── commands.ts    # Chat command parser (remember/forget/show)
│   │   ├── task-manager.ts# Natural language task CRUD
│   │   └── providers/     # Provider adapters (zai, openrouter, gemini, groq, openai)
│   ├── auth/              # Supabase auth context
│   ├── supabase/          # Supabase client
│   ├── store.ts           # Zustand store (V3 with memories, notifications)
│   ├── types.ts           # All TypeScript entities
│   ├── date-parser.ts     # Natural language date parser
│   └── seed.ts            # Default data (sections, routine, habits)
├── components/
│   ├── app/
│   │   ├── views/         # 18 view components
│   │   ├── sidebar.tsx    # Grouped nav (Main/Life/AI/System)
│   │   ├── task-dialog.tsx
│   │   └── auth/login.tsx
│   └── ui/                # shadcn/ui components
supabase/
├── schema.sql             # 27-table schema + RLS
└── v3-migration.sql       # pgvector + V3 columns
android/                   # Capacitor Android project
scripts/                   # Build scripts (icon generator, etc.)
```

## Security
- ✅ No service role keys in frontend (only anon key, protected by RLS)
- ✅ All tables protected by `user_id = auth.uid()` RLS policies
- ✅ Keystore + passwords in gitignored `keystore.properties`
- ✅ `.env.local` gitignored
- ✅ Memory data scoped per user

## License
MIT — personal use
