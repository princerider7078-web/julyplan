# PROJECT CONTEXT REPORT
## July Plan — Personal AI Operating System

> **Handover documentation for the next AI developer.**  
> Read this completely before touching any code.

---

## 1. Project Overview

| Field | Value |
|-------|-------|
| **Project name** | July Plan |
| **Version** | V5.0 |
| **Repository** | https://github.com/princerider7078-web/julyplan |
| **Live deployment** | https://julyplan.vercel.app |
| **Purpose** | Offline-first personal life operating system with AI at the center — manages tasks, habits, health, finance, journal, and notifications for one user |
| **Target users** | One person only — the owner (a student and programmer following a strict daily routine) |
| **Main problem it solves** | Replaces 10+ apps (todo, habit tracker, finance, journal, etc.) with a single AI-driven personal OS that remembers context and proactively helps execute daily life |
| **Current development stage** | V5.0 — production-ready web app + Android APK. 22 modules, native notification system, AI memory, multi-provider AI. Deployed to Vercel + GitHub. |
| **Overall architecture** | Next.js 16 (App Router) + TypeScript + Zustand (localStorage persistence) + Supabase (cloud sync + auth) + Capacitor (Android APK) + Provider-agnostic AI layer |

---

## 2. Product Vision

### Long-term vision
Build a **personal AI operating system** where AI is not a side feature but the central brain. The app should manage tasks, habits, health, voice, mind, skin, nutrition, finance, journal, knowledge base, calendar, notifications, analytics, and AI coaching — all connected by a shared AI memory that learns from user behavior.

### Core philosophy
- **AI-First**: Every important module has AI support
- **Data-Driven Memory**: AI memory lives in the database, not inside the model
- **Modular Architecture**: Each life domain lives in its own module
- **Provider Agnostic AI**: Works with any AI provider — swap without rewriting
- **Execution over Decoration**: The app must help the user act, not just look nice
- **Offline-First**: Core features work without internet; cloud sync activates when authenticated

### User experience goals
- User can add/edit/complete tasks in under 10 seconds
- User sees today's plan immediately on app open
- AI remembers important facts and uses them in future conversations
- Notifications are smart, contextual, and fire at the right time
- The app feels like a personal life coach, not a generic task manager

---

## 3. Current Progress

### Completed ✅

1. **Authentication** — Supabase Auth (email/password) + offline mode (localStorage only). Auto-profile creation on signup. Sign in / sign up / continue offline flows.

2. **Dashboard** — Priority execution grid (8 categories ordered by importance: Sleep → Nutrition → Workout → Study → Mind → Voice → Looks → Finance), today's Top 3, habit quick-mark, smart warnings, AI suggestion cards.

3. **Today Plan** — Priority-ordered task list grouped by section, expandable checklists, per-section completion progress.

4. **Tasks** — Full CRUD with sections, sub-sections, subtasks, recurring, reminders, priority, search, filters (section/priority/status), archive, duplicate, move.

5. **Sections** — 8 default sections (Health, Voice, Study/Work, Routine, Finance, Weekly Plan, Monthly Plan, Personal Growth) with sub-sections, color + icon customization, reorder.

6. **Daily Routine** — Complete 6 AM → 12 AM timeline (20 blocks) with current/overdue states, checklist items per block, daily rules summary.

7. **Habits** — 10 seeded habits, 7-day mini grid, streaks, missed counts, today/7-day/30-day completion %, add/delete.

8. **Finance** — Income/expense/savings tracking, monthly budget, targets, recent transactions, monthly overview.

9. **July Plan (Monthly)** — 31-day execution grid color-coded by habit completion, 4 weekly themes, wasted-day tracker, monthly goals, weekly workout split.

10. **Journal** — Daily entries with mood (1-10), reflection types, AI summaries per entry, sync to Supabase.

11. **Knowledge Base** — Notes with tags, source types, reference URLs, AI auto-summarization + tag extraction, search.

12. **AI Assistant** — Full chat UI with conversation history, natural language commands, memory retrieval, auto-extraction of durable memories after each exchange.

13. **AI Planner** — 7 plan generators: Morning, Afternoon, Evening, Night, Recovery, Weekly, Monthly.

14. **AI Memory Manager** — 13 categories (personal, goals, habits, routine, preferences, health, work, education, relationships, skills, projects, events, custom), search/filter/sort, pin/favorite/archive/disable/lock/merge duplicates, manual create + edit.

15. **AI Reports** — Daily/weekly/monthly honest summaries using real data.

16. **Daily Briefing** — Morning brief, evening review, weekly review, AI motivation — all using real tasks + memories.

17. **Conversation History** — Full chat log with search, filter by role, stats.

18. **AI Controls (Developer Panel)** — Provider switching (zai/openrouter/gemini/groq/openai/ollama), model config per task type, temperature/max tokens, memory management, request logs, module toggles, AI Backend URL for APK.

19. **Notification System (V5)** — Native Android notifications via `@capacitor/local-notifications`, 10 channels, action buttons (Mark Done/Snooze/Reschedule/Ask AI), background scheduling, Service Worker for web, notification log + analytics, test button, permission management.

20. **Notification Preferences** — 5 tones (professional/friendly/motivational/minimal/strict), quiet hours, 12 category toggles, smart batching, escalation, AI learning profile dashboard.

21. **Recovery Queue** — Missed tasks with AI suggestions, 5 recovery actions (Do Now/Tomorrow/Break Subtasks/Make Habit/Delete).

22. **Analytics** — Recharts visualizations (weekly line chart, bar chart, radial category breakdown, monthly highlights).

23. **Settings** — Theme (light/dark/system), daily targets (water/protein/wasted days), notification toggles, sound, export/import backup, reset.

24. **Android APK** — Release-signed, native notification permissions, 10 channels, background scheduling, Capacitor wrapping.

### Partially Completed ⚠️

1. **Supabase Cloud Sync** — Sync layer exists (`src/lib/sync.ts`) but only partially implements push/pull. Tasks, habits, finance push works; full bidirectional sync not complete. User must run SQL schema manually.

2. **pgvector Semantic Search** — SQL migration exists (`supabase/v3-migration.sql`) with `match_memories()` function, but client-side uses Jaccard similarity fallback (not real vector embeddings). Embeddings column exists but is never populated.

3. **AI Learning Engine** — Tracks snooze patterns, response times, productive hours, but doesn't yet auto-adjust notification timing based on learned patterns (only displays stats).

4. **Location-Based Reminders** — Not implemented (listed as future feature).

5. **Wear OS Support** — Not implemented.

6. **Voice Reminders** — Not implemented.

### Not Started ❌

1. **Calendar Module** — SQL table exists (`calendar_events`) but no UI view.
2. **Health Module** — SQL table exists (`health_logs`) but no UI view.
3. **Voice Module** — SQL table exists (`voice_sessions`) but no UI view.
4. **Mind Module** — SQL table exists (`mind_sessions`) but no UI view.
5. **Skin Module** — SQL table exists (`skin_routines`) but no UI view.
6. **Nutrition Module** — SQL table exists (`nutrition_logs`) but no UI view.
7. **Predictive Analytics** — Not started.
8. **Knowledge Graph** — Not started.
9. **Reinforcement Learning** — Not started.
10. **Burnout Detection** — Not started.

---

## 4. Features

### 4.1 Authentication
- **Purpose**: User identity + cloud sync enablement
- **Status**: ✅ Complete
- **Implementation**: Supabase Auth (email/password) + offline mode bypass
- **Files**: `src/lib/auth/context.tsx`, `src/components/app/auth/login.tsx`, `src/lib/supabase/client.ts`

### 4.2 Dashboard
- **Purpose**: At-a-glance view of today's execution
- **Status**: ✅ Complete
- **Implementation**: Priority execution grid with 8 categories, Top 3 tasks, habit quick-mark, smart warnings, next routine block
- **Files**: `src/components/app/views/dashboard.tsx`

### 4.3 Task Management
- **Purpose**: CRUD for tasks with sections, subtasks, recurring, reminders
- **Status**: ✅ Complete
- **Implementation**: Zustand store + TaskDialog component + natural language commands via AI
- **Files**: `src/lib/store.ts`, `src/components/app/task-dialog.tsx`, `src/components/app/views/tasks.tsx`, `src/components/app/views/today.tsx`, `src/lib/ai/task-manager.ts`

### 4.4 Sections Management
- **Purpose**: Organize tasks into 8 default sections + custom
- **Status**: ✅ Complete
- **Files**: `src/lib/seed.ts`, `src/components/app/views/sections.tsx`

### 4.5 Daily Routine
- **Purpose**: 6 AM → 12 AM timeline with 20 blocks
- **Status**: ✅ Complete
- **Files**: `src/lib/seed.ts` (DEFAULT_ROUTINE), `src/components/app/views/routine.tsx`

### 4.6 Habit Tracking
- **Purpose**: Daily habit completion with streaks
- **Status**: ✅ Complete
- **Files**: `src/components/app/views/habits.tsx`

### 4.7 Finance Tracker
- **Purpose**: Income/expense/savings tracking
- **Status**: ✅ Complete
- **Files**: `src/components/app/views/finance.tsx`

### 4.8 July Plan (Monthly View)
- **Purpose**: 31-day execution grid + 4 weekly themes
- **Status**: ✅ Complete
- **Files**: `src/components/app/views/monthly.tsx`, `src/lib/seed.ts` (DEFAULT_WEEKLY_THEMES)

### 4.9 Journal
- **Purpose**: Daily reflections with mood + AI summaries
- **Status**: ✅ Complete
- **Files**: `src/components/app/views/journal.tsx`

### 4.10 Knowledge Base
- **Purpose**: Notes with tags + AI auto-tagging
- **Status**: ✅ Complete
- **Files**: `src/components/app/views/knowledge.tsx`

### 4.11 AI Assistant (Chat)
- **Purpose**: Conversational AI with memory + natural language commands
- **Status**: ✅ Complete
- **Implementation**: Command parser (remember/forget/show/edit/delete/summarize/search/help) + task manager (add/delete/complete/move/rename/show) + regular AI chat with semantic memory retrieval
- **Files**: `src/components/app/views/ai-chat.tsx`, `src/lib/ai/commands.ts`, `src/lib/ai/task-manager.ts`, `src/lib/ai/context.ts`, `src/lib/ai/prompts.ts`

### 4.12 AI Planner
- **Purpose**: Generate time-blocked plans for 7 slots
- **Status**: ✅ Complete
- **Files**: `src/components/app/views/ai-planner.tsx`

### 4.13 AI Memory Manager
- **Purpose**: Long-term memory with 13 categories + full CRUD
- **Status**: ✅ Complete
- **Files**: `src/components/app/views/memory-manager.tsx`, `src/lib/ai/memory.ts`

### 4.14 AI Reports
- **Purpose**: Daily/weekly/monthly honest summaries
- **Status**: ✅ Complete
- **Files**: `src/components/app/views/ai-reports.tsx`

### 4.15 Daily Briefing
- **Purpose**: Morning brief + evening review + weekly + motivation
- **Status**: ✅ Complete
- **Files**: `src/components/app/views/briefing.tsx`

### 4.16 Conversation History
- **Purpose**: Full chat log with search + stats
- **Status**: ✅ Complete
- **Files**: `src/components/app/views/conversation-history.tsx`

### 4.17 AI Controls (Developer Panel)
- **Purpose**: Provider switching, model config, memory management, logs
- **Status**: ✅ Complete
- **Files**: `src/components/app/views/dev-controls.tsx`, `src/lib/ai/providers/index.ts`

### 4.18 Notification System (V5)
- **Purpose**: Native Android + web notifications with channels, actions, scheduling
- **Status**: ✅ Complete (web needs permission grant; APK has full native)
- **Implementation**: Capacitor LocalNotifications plugin + Service Worker fallback + 30s web polling + localStorage persistence
- **Files**: `src/lib/notifications/service.ts`, `src/lib/notifications/scheduler.ts`, `src/lib/notifications/channels.ts`, `src/lib/notifications/actions.ts`, `src/lib/notifications/platform.ts`, `src/components/app/views/notification-log.tsx`, `src/components/app/views/notification-preferences.tsx`, `src/components/app/views/recovery-queue.tsx`, `public/sw.js`

### 4.19 Analytics
- **Purpose**: Charts + monthly highlights
- **Status**: ✅ Complete
- **Files**: `src/components/app/views/reports.tsx`

### 4.20 Settings
- **Purpose**: Theme, targets, export/import, reset
- **Status**: ✅ Complete
- **Files**: `src/components/app/views/settings.tsx`

### 4.21 Android APK
- **Purpose**: Native Android app with background notifications
- **Status**: ✅ Complete (release-signed)
- **Files**: `android/`, `capacitor.config.ts`, `scripts/gen-android-icons.py`

---

## 5. Tech Stack

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 16.1.1 | App Router framework |
| React | 19.0.0 | UI library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Styling |
| shadcn/ui | New York | Component library |
| Radix UI | Various | Accessible primitives |
| Lucide React | 0.525.0 | Icons |
| Recharts | 2.15.4 | Charts |
| Framer Motion | 12.23.2 | Animations |

### State Management
| Technology | Purpose |
|-----------|---------|
| Zustand | Global state with localStorage persistence (version 5) |
| TanStack Query | Available but primarily using Zustand |

### Backend
| Technology | Purpose |
|-----------|---------|
| Supabase | PostgreSQL + Auth + RLS + Realtime + Storage |
| Prisma | Available but NOT used for app data (Supabase client used instead) |
| Next.js API Routes | `/api/ai` — AI proxy route (server-side, hides API keys) |

### Authentication
| Technology | Purpose |
|-----------|---------|
| Supabase Auth | Email/password authentication |
| @supabase/ssr | Server-side rendering compatible client |

### AI
| Technology | Purpose |
|-----------|---------|
| z-ai-web-dev-sdk | Default AI provider (sandbox only — uses `.z-ai-config`) |
| Provider abstraction | Custom adapter pattern for OpenRouter/Gemini/Groq/OpenAI/Ollama |
| /api/ai route | Server-side proxy that hides API keys, supports 5 providers |

### Database
| Technology | Purpose |
|-----------|---------|
| Supabase PostgreSQL | Cloud database |
| pgvector | Vector embeddings for semantic memory search (SQL ready, not yet populated) |
| localStorage | Offline-first persistence via Zustand |

### Mobile
| Technology | Purpose |
|-----------|---------|
| Capacitor | Wraps static export as Android APK |
| @capacitor/local-notifications | Native Android notifications |

### Build Tools
| Tool | Purpose |
|------|---------|
| Bun | Package manager + runtime |
| Next.js Turbopack | Dev server + build |
| Gradle | Android APK build |
| ESLint | Code linting |

### Hosting
| Platform | Purpose |
|----------|---------|
| Vercel | Web deployment (https://julyplan.vercel.app) |
| GitHub | Source code (https://github.com/princerider7078-web/julyplan) |
| Supabase | Backend (https://uqjnayzrowuhrfmvootz.supabase.co) |

### Notifications
| Technology | Purpose |
|-----------|---------|
| @capacitor/local-notifications | Native Android notifications (APK) |
| Service Worker (`/public/sw.js`) | Reliable web notification display |
| Browser Notification API | Web fallback |
| 30s polling + localStorage | Web scheduling persistence |

### Storage
| Location | Purpose |
|----------|---------|
| localStorage `july-plan-store` | Main app state (Zustand persist) |
| localStorage `july-plan-notif-log` | Notification history |
| localStorage `july-plan-web-scheduled` | Web scheduled notifications |
| localStorage `july-plan-fired-*` | Dedup tracking (per day) |
| localStorage `july-plan-offline` | Offline mode flag |
| Supabase PostgreSQL | Cloud sync (when authenticated) |

---

## 6. Folder Structure

```
julyplan/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx               # Root layout: ThemeProvider + AuthProvider + Toaster
│   │   ├── page.tsx                 # Main app shell: sidebar + view router + notification init
│   │   ├── globals.css              # Tailwind + custom theme (amber/orange palette)
│   │   └── api/
│   │       └── ai/
│   │           └── route.ts         # AI proxy route (server-side, multi-provider, CORS)
│   │
│   ├── lib/                          # Core business logic
│   │   ├── types.ts                 # ALL TypeScript interfaces (Task, Habit, Memory, Notification, etc.)
│   │   ├── store.ts                 # Zustand store with localStorage persist (V5, version 5)
│   │   ├── seed.ts                  # Default data: 8 sections, 20 routine blocks, 10 habits, 4 weekly themes, seed tasks
│   │   ├── utils.ts                 # Date helpers, priority styles, routine styles, progress helpers
│   │   ├── date-parser.ts           # Natural language date/time parser (today/tomorrow/next Monday/in 2 hours)
│   │   ├── sync.ts                  # Supabase sync layer (push/pull helpers)
│   │   ├── db.ts                    # Prisma client (unused for app data — legacy)
│   │   │
│   │   ├── ai/                      # AI system
│   │   │   ├── types.ts             # AIProvider, AIRequest, AIResponse, AIMemory, AIContext, AIProfile
│   │   │   ├── manager.ts           # AIManager orchestrator (singleton)
│   │   │   ├── index.ts             # Public API: aiChat, aiPlan, aiReport, aiNotification, etc.
│   │   │   ├── prompts.ts           # System prompt + per-request-type prompt builders
│   │   │   ├── context.ts           # Context builder (buildLocalContext, buildContext)
│   │   │   ├── memory.ts            # Memory CRUD + semantic retrieval (Jaccard similarity)
│   │   │   ├── commands.ts          # Chat command parser (remember/forget/show/edit/delete/summarize/search/help)
│   │   │   ├── task-manager.ts      # Natural language task CRUD (local fast-path + AI fallback)
│   │   │   ├── notification-engine.ts # AI Decision Engine (15+ signals, reasoning generator, tone adapter, batching)
│   │   │   ├── notification-scheduler.ts # V4.1 auto-fire scheduler (30s polling — LEGACY, replaced by V5)
│   │   │   ├── learning-engine.ts   # AI Learning Engine (snooze patterns, response times, productive hours)
│   │   │   ├── routine-manager.ts   # Routine block management
│   │   │   └── providers/           # Provider adapters
│   │   │       ├── index.ts         # Provider registry
│   │   │       ├── zai.ts           # Default: calls /api/ai route (server-side z-ai-sdk)
│   │   │       ├── openrouter.ts    # OpenRouter adapter (stub — needs NEXT_PUBLIC_OPENROUTER_API_KEY)
│   │   │       ├── gemini.ts        # Gemini adapter (stub — needs NEXT_PUBLIC_GEMINI_API_KEY)
│   │   │       ├── groq.ts          # Groq adapter (stub — needs NEXT_PUBLIC_GROQ_API_KEY)
│   │   │       └── openai.ts        # OpenAI adapter (stub — needs NEXT_PUBLIC_OPENAI_API_KEY)
│   │   │
│   │   ├── notifications/           # V5 Native notification system
│   │   │   ├── service.ts           # Unified service (Capacitor + browser + Service Worker)
│   │   │   ├── scheduler.ts         # Reminder scheduler (multi-reminder per task, deadlines, habits, briefing)
│   │   │   ├── channels.ts          # 10 notification channel definitions
│   │   │   ├── actions.ts           # Action button definitions + snooze options
│   │   │   └── platform.ts          # Capacitor platform detection
│   │   │
│   │   ├── auth/
│   │   │   └── context.tsx          # AuthProvider + useAuth hook (Supabase + offline mode)
│   │   │
│   │   └── supabase/
│   │       └── client.ts            # Browser Supabase client (createBrowserClient)
│   │
│   ├── components/
│   │   ├── app/                     # App-specific components
│   │   │   ├── sidebar.tsx          # Grouped nav (Main/Life/AI/System) with badges
│   │   │   ├── task-dialog.tsx      # Add/Edit task dialog (key-remounted form)
│   │   │   ├── progress-ring.tsx    # SVG progress ring
│   │   │   ├── icon.tsx             # Section icon mapper
│   │   │   ├── theme-provider.tsx   # next-themes wrapper
│   │   │   ├── auth/
│   │   │   │   └── login.tsx        # Login/signup/offline screen
│   │   │   └── views/               # 22 view components (one per module)
│   │   │       ├── dashboard.tsx
│   │   │       ├── today.tsx
│   │   │       ├── tasks.tsx
│   │   │       ├── sections.tsx
│   │   │       ├── routine.tsx
│   │   │       ├── habits.tsx
│   │   │       ├── finance.tsx
│   │   │       ├── monthly.tsx
│   │   │       ├── journal.tsx
│   │   │       ├── knowledge.tsx
│   │   │       ├── ai-chat.tsx
│   │   │       ├── ai-planner.tsx
│   │   │       ├── ai-reports.tsx
│   │   │       ├── memory-manager.tsx
│   │   │       ├── briefing.tsx
│   │   │       ├── notification-log.tsx       # V5: replaces old notification-center
│   │   │       ├── notification-center.tsx    # V4: LEGACY (still in codebase but not rendered)
│   │   │       ├── notification-preferences.tsx
│   │   │       ├── recovery-queue.tsx
│   │   │       ├── conversation-history.tsx
│   │   │       ├── dev-controls.tsx
│   │   │       ├── reports.tsx
│   │   │       └── settings.tsx
│   │   │
│   │   └── ui/                      # shadcn/ui components (50+ files — standard set)
│   │
│   └── hooks/
│       ├── use-mobile.ts            # Mobile detection
│       └── use-toast.ts             # Toast hook
│
├── public/
│   ├── sw.js                        # Service Worker for web notifications
│   ├── logo.svg                     # App logo
│   └── robots.txt
│
├── supabase/                        # SQL schemas (run manually in Supabase SQL Editor)
│   ├── schema.sql                   # V2: 27 tables + RLS + triggers
│   ├── v3-migration.sql             # V3: pgvector + memory columns + match_memories()
│   └── v4-migration.sql             # V4: notification_history, preferences, queue, learning_profile, reminder_rules, recovery_queue
│
├── android/                         # Capacitor Android project
│   ├── app/
│   │   ├── build.gradle             # App build config (signing, version 3.1)
│   │   ├── capacitor.build.gradle   # Capacitor plugin config
│   │   ├── src/main/
│   │   │   ├── AndroidManifest.xml  # Permissions: INTERNET, VIBRATE, BOOT_COMPLETED, WAKE_LOCK, POST_NOTIFICATIONS
│   │   │   ├── res/                 # Icons, splash, styles (custom amber "J" branding)
│   │   │   └── assets/public/       # Web assets (synced via `cap sync`)
│   │   └── keystore.properties      # Signing config (gitignored)
│   ├── keystore/                    # Release keystore (gitignored)
│   ├── local.properties             # SDK path (gitignored)
│   └── gradlew                      # Gradle wrapper
│
├── scripts/
│   └── gen-android-icons.py         # Generates launcher icons + splash screens
│
├── download/                        # Deliverables
│   ├── JulyPlan-v5.0-release.apk    # Latest APK (release-signed)
│   ├── SETUP-GUIDE.md               # Supabase + APK setup instructions
│   └── VERCEL-DEPLOY.md             # Vercel deployment guide
│
├── .env.local.example               # Environment variable template
├── .gitignore                       # Excludes: .env, keystore, APKs, build artifacts, android/app/src/test, skills
├── capacitor.config.ts              # Capacitor config (appId: com.julyplan.app)
├── next.config.ts                   # Next.js config (output: "standalone" for web, "export" for APK)
├── eslint.config.mjs                # ESLint config (ignores android/**, skills, .next)
├── tailwind.config.ts               # Tailwind config
├── package.json                     # Dependencies + scripts
└── README.md                        # Project documentation
```

---

## 7. Important Files

### `src/lib/types.ts`
- **Purpose**: All TypeScript interfaces for the entire app
- **Responsibilities**: Defines Task, Section, Habit, RoutineBlock, FinanceEntry, JournalEntry, KnowledgeNote, AIMemoryItem (13 categories), AINotification (18 types), NotificationPreferences, LearningProfile, RecoveryItem, AppSettings, AppState
- **Dependencies**: None
- **Current status**: ✅ Complete — V5 with all notification types, memory categories, learning profile

### `src/lib/store.ts`
- **Purpose**: Zustand store with localStorage persistence — the single source of truth for all app data
- **Responsibilities**: Tasks, sections, habits, routine blocks, finance, journal, knowledge notes, AI chat history, memories, conversation summaries, AI notifications, notification preferences, learning profile, recovery queue, settings. All CRUD actions.
- **Dependencies**: `zustand`, `uuid`, `./types`, `./seed`
- **Current status**: ✅ Complete — persist version 5 with merge function for schema migrations
- **⚠️ Critical**: The `merge` function in persist config deep-merges settings + notification preferences + learning profile to handle V1→V2→V3→V4→V5 migrations. Never remove this.

### `src/lib/seed.ts`
- **Purpose**: Default data for first-time users
- **Responsibilities**: 8 default sections with sub-sections, 20 routine blocks (6 AM → 12 AM), 10 habits, 4 July weekly themes, 4 finance targets, 10 seed tasks, weekly workout split, body exercises
- **Dependencies**: `./types`
- **Current status**: ✅ Complete

### `src/app/api/ai/route.ts`
- **Purpose**: Server-side AI proxy — hides API keys, supports 5 providers, CORS-enabled
- **Responsibilities**: Receives POST from client, detects which provider to use (Groq > OpenRouter > OpenAI > Gemini > Z.ai public > z-ai-sdk fallback), calls provider, returns response. CORS headers for Capacitor origins. GET health check.
- **Dependencies**: `z-ai-web-dev-sdk` (fallback only), env vars for providers
- **Current status**: ✅ Complete — multi-provider with CORS

### `src/lib/ai/manager.ts`
- **Purpose**: AI Manager orchestrator — the central brain
- **Responsibilities**: Picks model per request type, calls provider, handles fallback, logs to Supabase
- **Dependencies**: `./providers`, `../supabase/client`
- **Current status**: ✅ Complete

### `src/lib/ai/providers/zai.ts`
- **Purpose**: Default AI provider — calls `/api/ai` server route
- **Responsibilities**: Reads `aiBackendUrl` from store (for APK mode), calls `${url}/api/ai`, handles network errors with helpful messages
- **Dependencies**: `../types`, `../../store`
- **Current status**: ✅ Complete — supports both web (relative `/api/ai`) and APK (absolute URL) modes

### `src/lib/ai/memory.ts`
- **Purpose**: Long-term memory system
- **Responsibilities**: CRUD for memories, semantic retrieval (Jaccard similarity + recency + importance + use-frequency scoring), Supabase sync
- **Dependencies**: `../supabase/client`, `../store`, `../types`
- **Current status**: ✅ Complete — uses client-side Jaccard similarity (pgvector ready but not yet using embeddings)

### `src/lib/ai/context.ts`
- **Purpose**: Builds AI context from user data
- **Responsibilities**: `buildLocalContext()` retrieves relevant memories semantically based on user query, assembles tasks/habits/finance/journal into AIContext
- **Dependencies**: `./memory`, `../supabase/client`, `../types`
- **Current status**: ✅ Complete

### `src/lib/ai/commands.ts`
- **Purpose**: Chat command parser
- **Responsibilities**: Detects memory commands (remember/forget/show/edit/delete/summarize/search/help), detects task commands, auto-detects memory category from keywords
- **Dependencies**: `../store`, `../types`
- **Current status**: ✅ Complete

### `src/lib/ai/task-manager.ts`
- **Purpose**: Natural language task CRUD
- **Responsibilities**: Local fast-path parser for common patterns (add/delete/complete/move/rename/show), AI fallback for ambiguous requests, fuzzy task matching
- **Dependencies**: `./index`, `../date-parser`, `../store`
- **Current status**: ✅ Complete

### `src/lib/ai/notification-engine.ts`
- **Purpose**: AI Decision Engine for notifications
- **Responsibilities**: Collects 15+ signals (time, quiet hours, productive hours, pending tasks, habit streaks, etc.), generates reasoning ("why now"), applies tone, picks actions, handles escalation messages, builds complete notification objects
- **Dependencies**: `../store`, `../types`
- **Current status**: ✅ Complete

### `src/lib/ai/learning-engine.ts`
- **Purpose**: AI Learning Engine
- **Responsibilities**: Recomputes learning profile from raw data (snooze patterns, response times, productive hours, completion rates, most postponed task, habits at risk, no-response hours)
- **Dependencies**: `../store`, `../types`
- **Current status**: ✅ Complete — tracks stats but doesn't yet auto-adjust notification timing

### `src/lib/notifications/service.ts`
- **Purpose**: Unified notification service (V5)
- **Responsibilities**: Capacitor LocalNotifications (native) + browser Notification API + Service Worker (web), scheduling, cancellation, permission management, notification log + analytics
- **Dependencies**: `@capacitor/local-notifications`, `./platform`, `./channels`, `./actions`
- **Current status**: ✅ Complete — only logs when notification is ACTUALLY shown (not just scheduled)

### `src/lib/notifications/scheduler.ts`
- **Purpose**: Reminder scheduler
- **Responsibilities**: Schedules multiple reminders per task (at time + 10 min before + 1 hour before for high/critical + 1 day before for critical), deadline alerts (7d/3d/1d/same day/last hour), habit reminders, morning brief + evening review, quiet hours respect, category preference check
- **Dependencies**: `./service`, `./channels`, `../store`, `../types`
- **Current status**: ✅ Complete — has 5-min catch-up window for missed notifications

### `src/lib/auth/context.tsx`
- **Purpose**: Authentication context
- **Responsibilities**: Supabase session management, offline mode, sign in/up/out, profile derivation
- **Dependencies**: `@supabase/supabase-js`, `../supabase/client`
- **Current status**: ✅ Complete — uses `queueMicrotask` to avoid setState-in-effect lint errors

### `src/app/page.tsx`
- **Purpose**: Main app shell
- **Responsibilities**: Auth gate (login screen if not authed), sidebar + view router, notification system initialization, completion sound, header with notification bell + unread badge
- **Dependencies**: All view components, `./lib/auth/context`, `./lib/notifications/service`, `./lib/notifications/scheduler`
- **Current status**: ✅ Complete — 22 views wired up

### `src/components/app/sidebar.tsx`
- **Purpose**: Navigation sidebar
- **Responsibilities**: 4 groups (Main/Life/AI/System), 22 nav items, badges (pending count, streak, memories, recovery, wasted days), auth status, sign out
- **Dependencies**: `../lib/store`, `../lib/auth/context`
- **Current status**: ✅ Complete

### `public/sw.js`
- **Purpose**: Service Worker for web notifications
- **Responsibilities**: Notification display (more reliable than `new Notification()`), notification click handling (opens/focuses app)
- **Current status**: ✅ Complete

### `capacitor.config.ts`
- **Purpose**: Capacitor configuration
- **Responsibilities**: appId, webDir, androidScheme, cleartext, webContentsDebuggingEnabled, splash screen config
- **Current status**: ✅ Complete

### `next.config.ts`
- **Purpose**: Next.js configuration
- **Responsibilities**: `output: "standalone"` for web (with API routes), `output: "export"` for APK (static)
- **⚠️ Critical**: Must switch to `"export"` + move `src/app/api` to `src/app/_api_backup` before APK build. Restore after.
- **Current status**: ✅ Complete

---

## 8. Database Documentation

### Overview
The database is Supabase PostgreSQL with 33 tables across 3 SQL migration files. All tables have Row Level Security (RLS) enabled with `user_id = auth.uid()` policies.

### SQL Files (run in order)
1. `supabase/schema.sql` — V2: 27 tables + RLS + triggers
2. `supabase/v3-migration.sql` — V3: pgvector + memory columns + `match_memories()` function
3. `supabase/v4-migration.sql` — V4: 6 notification tables

### Tables (33 total)

#### Core Tables (V2 schema.sql — 27 tables)

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `users` | User profile (extends auth.users) | id, email, name, timezone, theme, office_start/end_time, wake/sleep_time, goal_weight, current_weight, daily_protein_goal, daily_water_goal |
| `ai_profiles` | AI provider config per user | user_id, provider, model_chat, model_planning, model_reports, fallback_model, temperature, max_tokens, prompt_style, enabled_modules_json |
| `task_categories` | Task sections | user_id, name, color, icon, sort_order, parent_id |
| `tasks` | Tasks | user_id, title, description, category_id, priority, status, due_date, due_time, reminder_at, repeat_rule, estimated_minutes, actual_minutes, ai_generated, source_type, is_top_priority, notes, completed_at, archived_at |
| `task_subtasks` | Checklist items inside tasks | task_id, title, status, sort_order |
| `task_completion_logs` | Daily completion for recurring tasks | task_id, user_id, log_date, completed |
| `habits` | Recurring habits | user_id, title, category, target_per_day, repeat_rule, active |
| `habit_logs` | Daily habit completion | habit_id, user_id, log_date, value, completed, note |
| `health_logs` | Health data | user_id, log_date, weight, water_liters, calories, protein_grams, sleep_hours, workout_minutes, workout_type, recovery_score, notes |
| `voice_sessions` | Voice training logs | user_id, log_date, duration_minutes, exercises_json, difficulty, ai_feedback |
| `mind_sessions` | Meditation + brain practice | user_id, log_date, session_type, duration_minutes, focus_score, notes |
| `skin_routines` | Grooming routines | user_id, log_date, morning_done, night_done, facewash_done, moisturizer_done, haircare_done, beardcare_done, notes |
| `nutrition_logs` | Meal + nutrition data | user_id, log_date, meal_type, items_json, calories, protein_grams, water_ml, supplements_json |
| `finance_entries` | Income/expense/savings | user_id, entry_type, amount, category, note, entry_date, target_name, target_amount |
| `journal_entries` | Journal + reflection | user_id, entry_date, title, content, mood_score, reflection_type, ai_summary |
| `knowledge_notes` | Learning content | user_id, title, content, tags_json, source_type, reference_url, ai_summary |
| `calendar_events` | Events + time blocks | user_id, title, description, event_type, start_at, end_at, linked_task_id, linked_habit_id |
| `notifications` | Scheduled reminders | user_id, title, message, notification_type, scheduled_at, repeat_rule, status, linked_entity_type, linked_entity_id, ai_generated |
| `ai_memories` | Structured long-term memory | user_id, memory_type, memory_key, memory_value, confidence_score, source_module, last_used_at, embedding (vector 384) |
| `ai_requests` | AI prompt log | user_id, request_type, prompt_text, context_json, provider, model, token_usage, response_preview |
| `ai_responses` | AI outputs | request_id, user_id, response_text, structured_json, response_type, rating |
| `analytics_daily` | Daily scores | user_id, log_date, task_score, habit_score, health_score, voice_score, mind_score, finance_score, overall_score, ai_summary |
| `analytics_weekly` | Weekly summaries | user_id, week_start, week_end, best_day, worst_day, consistency_score, notes, ai_summary |
| `analytics_monthly` | Monthly summaries | user_id, month_key, completed_tasks, missed_tasks, wasted_days, growth_summary, ai_summary |
| `app_settings` | Key-value settings | user_id, key, value_json |
| `routine_blocks` | Daily timeline template | user_id, title, start_time, end_time, category, description, checklist_items_json |
| `routine_completion_logs` | Routine block completion | routine_id, user_id, log_date, completed |

#### V3 Migration Tables (v3-migration.sql — extends ai_memories)

| Change | Details |
|--------|---------|
| `ai_memories.embedding` | `vector(384)` column for semantic search |
| `ai_memories.title` | Text column |
| `ai_memories.importance` | Text (low/medium/high/critical) |
| `ai_memories.source` | Text (chat/manual/imported) |
| `ai_memories.pinned` | Boolean |
| `ai_memories.favorite` | Boolean |
| `ai_memories.archived` | Boolean |
| `ai_memories.locked` | Boolean |
| `ai_memories.disabled` | Boolean |
| `ai_memories.tags` | Text[] |
| `ai_memories.use_count` | Int |
| `ivfflat index` | On embedding column for fast cosine similarity |
| `match_memories()` | SQL function for semantic search |

#### V4 Migration Tables (v4-migration.sql — 6 new tables)

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `notification_history` | Full log of every notification | user_id, notification_id, title, message, type, category, priority, tone, reasoning, escalation_level, snooze_count, actions_json, status, scheduled_at, shown_at, responded_at, response_action |
| `notification_preferences` | Per-user notification settings | user_id, tone, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, critical_bypass_quiet, categories_json, batching_enabled, batching_window_minutes, escalation_enabled, escalation_delay_minutes, learning_enabled, default_snooze_minutes |
| `notification_queue` | Pending notifications | user_id, notification_id, title, message, type, priority, tone, reasoning, escalation_level, snooze_count, postpone_count, batch_id, actions_json, scheduled_at, status |
| `ai_learning_profile` | Per-user behavioral insights | user_id, avg_snooze_minutes, snooze_count_total, avg_response_time_minutes, no_response_before_hour, no_response_after_hour, productive_hours_json, most_postponed_category, most_postponed_task_id, habits_at_risk_json, task_completion_rate, habit_completion_rate, notification_response_rate |
| `reminder_rules` | Custom AI notification rules | user_id, name, trigger_type, trigger_condition, action_type, action_params, enabled, priority |
| `recovery_queue` | Missed tasks awaiting decision | user_id, task_id, habit_id, title, reason, missed_count, suggested_actions_json, ai_suggestion |

### RLS Policies
**Every table** has RLS enabled with 4 policies per table:
- SELECT: `auth.uid() = user_id`
- INSERT: `auth.uid() = user_id` (WITH CHECK)
- UPDATE: `auth.uid() = user_id` (USING)
- DELETE: `auth.uid() = user_id` (USING)

Exception: `task_subtasks` joins through `tasks` table to check ownership.

### Triggers
1. `on_auth_user_created` — Auto-creates `users` + `ai_profiles` rows on auth signup
2. `touch_<table>` — Auto-updates `updated_at` on: users, ai_profiles, task_categories, tasks, task_subtasks, habits, app_settings, knowledge_notes, routine_blocks

### Storage Buckets
None configured yet.

### Database Flow
1. User signs up → trigger creates `users` + `ai_profiles` rows
2. App reads/writes to localStorage (Zustand) for instant UI
3. When authenticated, `src/lib/sync.ts` pushes to Supabase async (optimistic UI)
4. On login, pulls remote data and merges into local store
5. AI requests logged to `ai_requests` + `ai_responses` tables
6. Memories stored in `ai_memories` with semantic retrieval via `match_memories()` (when pgvector enabled)

---

## 9. Authentication Flow

### Signup
1. User enters email + password on login screen
2. `signUp()` calls `supabase.auth.signUp()` with `user_metadata.name`
3. Supabase sends confirmation email
4. User clicks confirmation link
5. `on_auth_user_created` trigger fires → creates `users` + `ai_profiles` rows
6. User can now sign in

### Login
1. User enters email + password
2. `signIn()` calls `supabase.auth.signInWithPassword()`
3. Supabase returns session (access_token + refresh_token)
4. `onAuthStateChange` listener fires → sets `authedProfile`
5. `profile` derived via `useMemo` → app renders

### Offline Mode
1. User clicks "Continue Offline" on login screen
2. `signInOffline()` sets `isOffline = true` + saves to `localStorage['july-plan-offline']`
3. `profile` becomes `OFFLINE_PROFILE` ({ id: 'offline-user', email: 'offline@local', name: 'Offline User' })
4. All data stays in localStorage only — no Supabase sync
5. AI features work only if `aiBackendUrl` is set in Dev Controls

### Session
- Supabase manages session automatically (access token + refresh token in cookies)
- `getSession()` called on mount to restore session
- `onAuthStateChange` listener handles login/logout/token refresh

### Logout
1. `signOut()` calls `supabase.auth.signOut()`
2. Clears `isOffline`, `authedProfile`, `user`
3. Removes `localStorage['july-plan-offline']`

### Protected Routes
- No route-level protection — entire app is behind auth gate in `page.tsx`
- If `!profile` → render `<LoginScreen />`
- If `loading` → render loading spinner

### Role System
None — single user app, all authenticated users have full access to their own data (enforced by RLS).

### Hydration Safety
- Initial state is deterministic (`isOffline: false`, `mounted: false`) to prevent SSR/CSR mismatch
- Real values loaded via `queueMicrotask` in `useEffect` (satisfies React 19 `react-hooks/set-state-in-effect` lint rule)

---

## 10. AI System

### Architecture Overview
```
User Message
    ↓
Command Parser (commands.ts) — is this a memory/task command?
    ↓ (no)
AI Chat (index.ts → manager.ts)
    ↓
Context Builder (context.ts) — retrieves relevant memories semantically
    ↓
Prompt Builder (prompts.ts) — system prompt + context + memory header
    ↓
Provider Selection (providers/index.ts) — based on AIProfile
    ↓
Provider Call (zai.ts → /api/ai route → Groq/OpenRouter/etc.)
    ↓
Response
    ↓
Auto Memory Extraction (aiExtractMemories) — extracts durable facts
    ↓
Store in memories array
```

### Prompt System
- **BASE_SYSTEM**: "You are the AI brain of July Plan..." — concise, execution-focused, Hinglish-friendly, 200-word cap
- **CONTEXT_BLOCK**: Injects user profile, today's tasks, habit status, health data, finance snapshot, journal moods, analytics scores
- **MEMORY_HEADER**: Injects top 12 memories with type/key/value/confidence
- **Per-type prompts**: `buildChatPrompt`, `buildPlannerPrompt` (7 slots), `buildReportPrompt` (3 types), `buildNotificationPrompt` (6 types), `buildJournalSummaryPrompt`, `buildKnowledgeSummaryPrompt`, `buildMemoryExtractionPrompt`

### Memory System
- **13 categories**: personal, goals, habits, routine, preferences, health, work, education, relationships, skills, projects, events, custom
- **Storage**: Zustand store (localStorage) + Supabase `ai_memories` table (when authed)
- **Semantic retrieval**: `retrieveRelevantMemories(query, limit)` — Jaccard similarity on tokens (title + content + tags) + recency boost (last 7 days) + importance boost (critical > high > medium > low) + use frequency boost + pinned always included
- **Auto-extraction**: After every AI chat exchange, `aiExtractMemories()` analyzes conversation and extracts durable facts as JSON array
- **Manual commands**: "remember that...", "forget...", "show memories", "search memories for...", "summarize my memories"
- **pgvector ready**: SQL migration exists with `match_memories()` function + ivfflat index, but embeddings not yet populated (client-side Jaccard fallback works)

### Context Building
`buildLocalContext({ userQuery })`:
1. If `userQuery` provided → calls `retrieveRelevantMemories(userQuery, 8)`
2. Maps memories to AIContext format
3. Returns AIContext with: currentDate, todayTasks, recentHabits, recentHealth, recentFinance, recentJournal, analytics, memories

### Task Extraction
`parseTaskAction(input)`:
1. **Local fast-path**: `tryLocalParse()` handles common patterns (add/create/delete/complete/move/rename/show) without AI call
2. **AI fallback**: If local parse fails, calls AI with strict JSON schema prompt
3. **Execution**: `executeTaskAction()` performs CRUD against Zustand store
4. **Fuzzy matching**: `findTaskByQuery()` — exact match → contains → reverse-contains → word overlap

### Notifications
- **AI Decision Engine** (`notification-engine.ts`): Collects 15+ signals, generates reasoning, applies tone, picks actions
- **Reminder Scheduler** (`notifications/scheduler.ts`): Schedules multiple reminders per task
- **Native Service** (`notifications/service.ts`): Capacitor + browser + Service Worker
- **18 notification types**: briefing, review, task, priority, habit, goal, motivation, health, hydration, workout, sleep, study, focus, procrastination, deadline, suggestion, reschedule, achievement

### Embeddings
- **Status**: SQL schema ready (`vector(384)` column + ivfflat index + `match_memories()` function)
- **Current**: Not populated — client-side Jaccard similarity used instead
- **Future**: Could use sentence-transformers/all-MiniLM-L6-v2 (384 dims) to generate embeddings

### Vector Search
- **Status**: `match_memories(query_embedding, match_count, match_threshold)` SQL function exists
- **Current**: Not used — client-side `retrieveRelevantMemories()` uses Jaccard + scoring instead

### AI Providers
| Provider | Status | How to enable |
|----------|--------|---------------|
| zai | ✅ Live (default) | Works in sandbox via `.z-ai-config`; on Vercel via `/api/ai` route |
| Groq | Stub (needs key) | Set `GROQ_API_KEY` env var on Vercel |
| OpenRouter | Stub (needs key) | Set `OPENROUTER_API_KEY` env var on Vercel |
| OpenAI | Stub (needs key) | Set `OPENAI_API_KEY` env var on Vercel |
| Gemini | Stub (needs key) | Set `GEMINI_API_KEY` env var on Vercel |
| Ollama | Stub | Run `ollama serve` locally + add adapter |

### Fallback Logic
1. Try primary provider with configured model
2. If fails → try `fallback_model` on `zai` provider
3. If that fails → throw error

### Rate Limits
None implemented. AI requests are logged to `ai_requests` table but no rate limiting.

### API Routing
- Client calls `aiChat()` / `aiPlan()` / `aiReport()` etc. in `src/lib/ai/index.ts`
- These call `AIManager.complete()` which calls provider adapter
- `zaiProvider` calls `/api/ai` server route (relative URL for web, absolute URL for APK via `aiBackendUrl` setting)
- `/api/ai` route detects which env var is set and calls appropriate provider

### Conversation Flow
1. User types message in AI Chat
2. `parseCommand()` checks if it's a memory/task command
3. If memory command → `executeMemoryCommand()` → return
4. If task command → `parseTaskAction()` → `executeTaskAction()` → return
5. Otherwise → `aiChat()` with context + history (last 6 messages)
6. After response → `aiExtractMemories()` auto-extracts durable facts
7. New memories saved to store (de-duplicated)

---

## 11. APIs

### `/api/ai` (POST)
- **Purpose**: AI proxy — hides API keys, supports 5 providers
- **Input**: `{ messages: AIChatMessage[], model?: string, temperature?: number, max_tokens?: number, response_format?: 'text' | 'json' }`
- **Output**: `{ text: string, json?: unknown, provider: string, model: string, tokensUsed?: number }`
- **Error handling**: 400 (invalid input), 500 (AI provider error with helpful message)
- **CORS**: Allows `https://localhost`, `capacitor://localhost`, `localhost:3000`, `*.vercel.app`
- **Dependencies**: `z-ai-web-dev-sdk` (fallback), env vars (GROQ_API_KEY, OPENROUTER_API_KEY, etc.)

### `/api/ai` (GET)
- **Purpose**: Health check — shows which provider is configured
- **Output**: `{ status: 'ok', providers: string[], active: string, hint: string }`
- **No dependencies**

### Client-side APIs (not HTTP — function calls)
| Function | File | Purpose |
|----------|------|---------|
| `aiChat(message, ctx, history, opts)` | `lib/ai/index.ts` | Regular AI chat |
| `aiPlan(slot, ctx, opts)` | `lib/ai/index.ts` | Generate plans (7 slots) |
| `aiReport(type, ctx, opts)` | `lib/ai/index.ts` | Generate reports (3 types) |
| `aiNotification(type, ctx, opts)` | `lib/ai/index.ts` | Generate notification wording |
| `aiJournalSummary(content, mood, opts)` | `lib/ai/index.ts` | Summarize journal entry |
| `aiKnowledgeSummary(content, opts)` | `lib/ai/index.ts` | Summarize + tag knowledge note |
| `aiExtractMemories(conversation, opts)` | `lib/ai/index.ts` | Extract durable facts from conversation |
| `parseCommand(input)` | `lib/ai/commands.ts` | Parse chat command |
| `executeMemoryCommand(cmd)` | `lib/ai/commands.ts` | Execute memory command |
| `parseTaskAction(input, ctx, opts)` | `lib/ai/task-manager.ts` | Parse natural language task action |
| `executeTaskAction(action)` | `lib/ai/task-manager.ts` | Execute task CRUD |
| `scheduleNotification(notif)` | `lib/notifications/service.ts` | Schedule notification |
| `sendTestNotification()` | `lib/notifications/service.ts` | Send test notification |
| `scheduleTaskReminders(task)` | `lib/notifications/scheduler.ts` | Schedule all reminders for a task |
| `rescheduleAll()` | `lib/notifications/scheduler.ts` | Re-schedule all reminders |

---

## 12. UI/UX

### Navigation
- **Sidebar**: Fixed left (desktop) / slide-in drawer (mobile). 4 groups: Main, Life Modules, AI Brain, System.
- **Header**: Sticky top with page title, date, notification bell (with unread badge), New task button.
- **View routing**: Single-page app with `useState<ViewKey>` — no URL routing (only `/` is exposed).

### Screens (22 views)
| View | Group | Purpose |
|------|-------|---------|
| Dashboard | Main | Priority execution grid + Top 3 + habit quick-mark |
| Today Plan | Main | Priority-ordered task list |
| Tasks | Main | Full CRUD with filters |
| Sections | Main | Section management |
| Daily Routine | Life | 6 AM → 12 AM timeline |
| Habits | Life | Streaks + 7-day grid |
| Finance | Life | Income/expense/savings |
| July Plan | Life | 31-day execution grid |
| Journal | Life | Mood + AI summaries |
| Knowledge | Life | Notes + AI tagging |
| AI Assistant | AI | Chat with memory + commands |
| Daily Briefing | AI | Morning/evening/weekly/motivation |
| AI Planner | AI | 7 plan generators |
| AI Memory | AI | 13-category memory manager |
| Notifications | AI | Log + analytics + test |
| Notif Preferences | AI | Tone/quiet hours/categories/batching |
| Recovery Queue | AI | Missed tasks + 5 actions |
| AI Reports | AI | Daily/weekly/monthly summaries |
| Chat History | AI | Full chat log |
| Analytics | System | Charts + highlights |
| AI Controls | System | Provider/model/memory/logs |
| Settings | System | Theme/targets/export/reset |

### Layouts
- Auth gate: Full-screen centered card (login/signup/offline)
- App: Sidebar (72rem) + main content (max-w-7xl)
- Mobile: Hamburger menu → slide-in sidebar with backdrop

### Components
- shadcn/ui (New York style) — 50+ components
- Custom: ProgressRing (SVG), SectionIcon, TaskDialog (key-remounted form)

### Design System
- **Color palette**: Warm amber/orange primary (no indigo/blue)
- **Light mode**: Cream background, amber primary
- **Dark mode**: Dark stone background, amber primary
- **Accent colors**: Per-section (Health=red, Voice=orange, Study=green, etc.)

### Theme
- `next-themes` with `attribute="class"`, `defaultTheme="dark"`, `enableSystem`
- Custom CSS variables in `globals.css` (oklch color space)

### Responsive Behavior
- Mobile-first design
- Breakpoints: `sm:` (640px), `md:` (768px), `lg:` (1024px)
- Sidebar: `fixed -translate-x-full md:translate-x-0 md:sticky`
- Grid: `grid-cols-2 md:grid-cols-4 lg:grid-cols-4`

### Animations
- Framer Motion available but minimally used
- CSS transitions on hover/focus
- `animate-pulse-soft` custom keyframe for "Now" indicator in routine

### Accessibility
- Semantic HTML (`main`, `header`, `nav`, `section`, `article`)
- ARIA labels on icon buttons
- Keyboard accessible (Radix UI primitives)
- `sr-only` class for screen reader content
- Touch targets ≥ 44px on mobile

---

## 13. Business Logic

### Task Creation
1. User clicks "New" or "Add task"
2. TaskDialog opens (key-remounted for fresh form state)
3. User fills: title, description, section, sub-section, priority, type, start/end date, time, reminder, repeat rule, checklist items, notes, top priority toggle
4. On save → `addTask()` in store → task added to `tasks` array → returns ID
5. If authed → `pushTask()` in sync.ts pushes to Supabase
6. If task has time → `scheduleTaskReminders()` schedules notifications

### Task Editing
1. User clicks edit (dropdown menu in Tasks view)
2. TaskDialog opens with `editTask` prop → form pre-filled (key remounts to reset state)
3. On save → `updateTask()` → patches task → `updatedAt` timestamp
4. If task time changed → `cancelTaskNotifications()` + `scheduleTaskReminders()`

### Task Deletion
1. User clicks delete → confirmation dialog
2. `deleteTask()` removes from store
3. `deleteTaskRemote()` removes from Supabase
4. `cancelTaskNotifications()` cancels scheduled notifications

### Task Completion
1. User clicks checkbox
2. `toggleTaskComplete(id, dateISO?)` — toggles `completionLog[date]`
3. For non-recurring tasks: also updates `status` to 'completed'/'pending'
4. Plays completion sound (Web Audio API, 880Hz sine, 0.25s)
5. If authed → push to Supabase

### Habit Tracking
1. User clicks habit checkbox (or 7-day grid day)
2. `toggleHabit(id, dateISO?)` — toggles `log[date]`
3. Streak calculated on-the-fly (count back from today until miss)
4. If authed → `pushHabitLog()` to Supabase

### Journal
1. User writes entry with mood (1-10) + reflection type
2. `addJournalEntry()` saves to store
3. If authed → `pushJournalEntry()` to Supabase
4. User can click "Summarize" → `aiJournalSummary()` generates AI summary → saved to `ai_summary`

### Finance
1. User adds entry (income/expense/saving) with amount, category, date, note
2. `addFinanceEntry()` saves to store
3. If authed → `pushFinanceEntry()` to Supabase
4. Dashboard cards show today/week/month spend + savings progress

### AI Chat
1. User types message
2. `parseCommand()` checks for memory/task commands
3. If command → execute + return
4. Otherwise → `buildLocalContext({ userQuery: message })` retrieves relevant memories
5. `aiChat(message, ctx, history)` calls AI
6. Response displayed
7. `aiExtractMemories()` auto-extracts durable facts
8. New memories saved (de-duplicated)

### Notifications
1. On app load → `initNotifications()` → creates channels (native) + starts polling (web)
2. `rescheduleAll()` → schedules reminders for all tasks with times
3. For each task: at time + 10 min before + 1 hour before (high/critical) + 1 day before (critical)
4. For deadline tasks: 7d, 3d, 1d, same day, last hour
5. Web: 30s polling checks localStorage scheduled list, fires due ones
6. Native: Capacitor schedules exact-time notifications (background)
7. When notification fires → log entry created (only if actually shown)
8. Action buttons: Mark Done, Snooze, Reschedule, Ask AI

### Memory
1. Auto-extraction after every AI chat
2. Manual: "remember that..." → saves with auto-detected category
3. Semantic retrieval: `retrieveRelevantMemories(query)` — Jaccard similarity + scoring
4. Memory Manager: search, filter by 13 categories, sort, pin, favorite, archive, disable, lock, merge duplicates

---

## 14. Known Bugs

### Bug 1: Web notifications only fire when tab is open
- **Reason**: Browser notifications require the tab to be open (or service worker active). No true background notifications on web.
- **Current workaround**: 30s polling + visibilitychange listener catches up missed notifications when tab becomes visible
- **Possible solution**: Install APK for true background notifications
- **Priority**: Low (inherent browser limitation)

### Bug 2: Supabase sync is partial
- **Reason**: `src/lib/sync.ts` only implements push for tasks/habits/finance/journal/knowledge. Pull on login is partial. No conflict resolution.
- **Current workaround**: Offline mode (localStorage) works fully
- **Possible solution**: Implement full bidirectional sync with timestamp-based conflict resolution
- **Priority**: Medium

### Bug 3: pgvector embeddings not populated
- **Reason**: SQL schema has `vector(384)` column + `match_memories()` function but no code generates embeddings
- **Current workaround**: Client-side Jaccard similarity works for semantic retrieval
- **Possible solution**: Add embedding generation (sentence-transformers) in `/api/ai` route or edge function
- **Priority**: Low (current fallback works)

### Bug 4: Old notification-center.tsx still in codebase
- **Reason**: V5 replaced it with notification-log.tsx but the file wasn't deleted
- **Current workaround**: Not rendered in page.tsx (notification-log.tsx is used instead)
- **Possible solution**: Delete `src/components/app/views/notification-center.tsx`
- **Priority**: Low (cleanup)

### Bug 5: notification-scheduler.ts (V4.1) is legacy
- **Reason**: V5 replaced the 30s polling approach with native notification service, but the old file still exists
- **Current workaround**: Not imported by page.tsx anymore
- **Possible solution**: Delete `src/lib/ai/notification-scheduler.ts`
- **Priority**: Low (cleanup)

### Bug 6: Double initialization on dev server
- **Reason**: React StrictMode + dev server hot reload can cause `initNotifications()` to run twice
- **Current workaround**: `isInitialized` flag prevents double-init
- **Possible solution**: None needed (flag handles it)
- **Priority**: None

---

## 15. Pending Tasks

### High Priority
1. **Delete legacy files**: `notification-center.tsx`, `notification-scheduler.ts`
2. **Full Supabase sync**: Complete bidirectional sync with conflict resolution
3. **APK auto-build via GitHub Actions**: CI/CD pipeline for APK builds on push
4. **Notification testing on physical Android device**: Verify background notifications work

### Medium Priority
1. **Health module UI**: SQL table exists, no view
2. **Voice module UI**: SQL table exists, no view
3. **Mind module UI**: SQL table exists, no view
4. **Skin module UI**: SQL table exists, no view
5. **Nutrition module UI**: SQL table exists, no view
6. **Calendar module UI**: SQL table exists, no view
7. **pgvector embeddings**: Generate + populate embeddings for semantic search
8. **AI Learning Engine auto-adjust**: Use learning profile to auto-adjust notification timing
9. **Predictive analytics**: Workout miss risk, burnout risk, habit break risk

### Low Priority
1. **Location-based reminders**: Office/gym/market proximity
2. **Wear OS support**: Smartwatch notifications
3. **Voice reminders**: AI-generated speech
4. **Calendar + email integration**: Sync with Google Calendar
5. **Knowledge graph**: Connect modules (sleep→energy→workout→weight)
6. **Reinforcement learning**: Optimize notification timing
7. **Burnout detection**: Reduce notification frequency when stressed

### Future Features
1. **PWA support**: Installable web app with offline cache
2. **Multi-language**: i18n support
3. **Themes**: Custom color schemes beyond amber
4. **Widgets**: Android home screen widgets
5. **Backup encryption**: Encrypt export files
6. **AI voice notes**: Transcribe + summarize voice memos

---

## 16. Technical Debt

### Bad Code
1. **`notification-center.tsx`** — 500+ lines, should be deleted (replaced by `notification-log.tsx`)
2. **`notification-scheduler.ts`** — Legacy V4.1 approach, replaced by V5 `notifications/` module
3. **`db.ts`** — Prisma client setup but Prisma not used for app data (Supabase client used instead)
4. **`src/app/api/route.ts`** — Default Next.js API route, does nothing

### Temporary Fixes
1. **`next.config.ts` switching**: Must manually switch between `"standalone"` (web) and `"export"` (APK) + move `api/` folder. Should be automated.
2. **`keystore.properties`**: Signing config in plain text file (gitignored but not ideal)
3. **Zustand persist version**: Currently version 5 — merge function handles migrations but will get complex over time

### Refactoring Needed
1. **Split `store.ts`**: 750+ lines, should be split into separate stores (tasks, habits, notifications, memories, etc.)
2. **Split `page.tsx`**: View routing should be extracted to a separate component
3. **Type narrowing**: Some `as any` casts in notification service (Capacitor types)
4. **Error boundaries**: No React error boundaries — unhandled errors crash the app

### Performance Issues
1. **Memory retrieval**: Jaccard similarity runs on every AI chat — fine for <100 memories but will slow with more
2. **Notification polling**: 30s interval runs even when no notifications scheduled (minor)
3. **Recharts**: All charts render on mount — could lazy-load

### Security Issues
1. **No rate limiting**: `/api/ai` route has no rate limiting — could be abused
2. **No input validation**: `/api/ai` route doesn't validate message content
3. **Service role key**: Not used (good) but Supabase admin operations would need it (edge functions)

### Optimization Opportunities
1. **Memoization**: View components re-render on every store change — could use selectors
2. **Code splitting**: All views loaded eagerly — could lazy-load
3. **Image optimization**: No images currently but `next/image` configured
4. **Bundle size**: Could analyze + reduce

---

## 17. Environment Variables

### Required (for app to work)
| Variable | Purpose | Where to set |
|----------|---------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Vercel env vars + `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (public, protected by RLS) | Vercel env vars + `.env.local` |

### Required (for AI — pick ONE)
| Variable | Purpose | Where to get |
|----------|---------|---------------|
| `GROQ_API_KEY` | Groq provider (free, recommended) | https://console.groq.com/keys |
| `OPENROUTER_API_KEY` | OpenRouter provider (free models) | https://openrouter.ai/keys |
| `GEMINI_API_KEY` | Google Gemini (free) | https://aistudio.google.com/app/apikey |
| `OPENAI_API_KEY` | OpenAI (paid) | https://platform.openai.com/api-keys |
| `ZAI_API_KEY` + `ZAI_BASE_URL` | Z.ai public API | Contact Z.ai |

### Optional
| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SITE_URL` | Site URL for OpenRouter referer header + APK backend |
| `NEXT_PUBLIC_OPENROUTER_API_KEY` | Client-side OpenRouter (NOT recommended — exposes key) |
| `NEXT_PUBLIC_GROQ_API_KEY` | Client-side Groq (NOT recommended — exposes key) |

### Never committed (gitignored)
- `.env` — DATABASE_URL for Prisma (unused)
- `.env.local` — All secrets
- `.env.production` — Production secrets
- `android/keystore/` — Signing keystore
- `android/keystore.properties` — Keystore passwords

### Current values (placeholders only — user must fill in)
```
NEXT_PUBLIC_SUPABASE_URL=https://uqjnayzrowuhrfmvootz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_5cplBsTI8CiL6IhN5beh0g_pZ1PcqVM
GROQ_API_KEY=<user must set on Vercel>
```

---

## 18. Deployment

### Web (Vercel)
1. Push to GitHub `main` branch
2. Vercel auto-deploys
3. Set env vars in Vercel Project Settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `GROQ_API_KEY` (or other AI provider key)
4. Verify: visit `https://julyplan.vercel.app/api/ai` (GET) — should show `{"status":"ok","providers":["groq"]}`

### Supabase Setup
1. Go to https://supabase.com/dashboard/project/uqjnayzrowuhrfmvootz
2. SQL Editor → New Query
3. Paste `supabase/schema.sql` → Run
4. Paste `supabase/v3-migration.sql` → Run
5. Paste `supabase/v4-migration.sql` → Run
6. Authentication → URL Configuration → Add `https://julyplan.vercel.app` to Site URL + Redirect URLs

### Android APK Build
1. Switch `next.config.ts` to `output: "export"`
2. Move `src/app/api` to `src/app/_api_backup` (API routes can't be statically exported)
3. Build: `bunx next build`
4. Sync: `bunx cap sync android`
5. Build APK: `cd android && ./gradlew assembleRelease`
6. APK at: `android/app/build/outputs/apk/release/app-release.apk`
7. Restore: move `_api_backup` back to `api` + switch config to `"standalone"`

### Common Deployment Issues
1. **"Configuration file not found"** — No AI provider env var set on Vercel → set `GROQ_API_KEY`
2. **Login not working** — Supabase redirect URL not configured → add Vercel URL to Auth settings
3. **"Failed to fetch" in APK** — CORS issue → `/api/ai` route has CORS headers (fixed in V5)
4. **APK AI not working** — `aiBackendUrl` not set → set in AI Controls to `https://julyplan.vercel.app`
5. **Hydration mismatch** — Auth context reads localStorage during render → fixed with `queueMicrotask`
6. **Notifications not showing in Chrome** — Permission denied → user must allow in browser settings

---

## 19. Testing

### Manual Tests
1. **Auth**: Sign up → confirm email → sign in → sign out → continue offline
2. **Tasks**: Add → edit → complete → delete → archive → duplicate → move
3. **Habits**: Toggle today → toggle past day → check streak
4. **AI Chat**: "remember that I wake up at 5 AM" → "show my memories" → "add gym tomorrow 7 AM"
5. **AI Planner**: Generate morning plan → verify uses real task data
6. **Notifications**: Send Test button → check log → add task with time → wait for fire
7. **Memory**: Create manually → edit → pin → favorite → archive → merge duplicates
8. **Finance**: Add income/expense → check dashboard cards
9. **Export/Import**: Export backup → import on fresh state
10. **Theme**: Switch light/dark/system

### Edge Cases
1. **Task with no time** → no notifications scheduled
2. **Task time in past** → skip if >5 min ago, fire if within 5 min (catch-up)
3. **Quiet hours** → delay to morning (unless critical + bypass enabled)
4. **Offline mode** → all features work except Supabase sync + AI (unless `aiBackendUrl` set)
5. **Empty store** → seed data loads on first run
6. **Store migration** → V1→V5 merge function backfills missing fields

### Known Failing Tests
None — no automated tests exist.

### Testing Strategy
- No automated tests (no Jest, Vitest, etc.)
- Manual testing via browser (agent-browser CLI)
- Lint: `bun run lint` (ESLint)
- Build: `bunx next build` (catches compile errors)

---

## 20. Design Decisions

### Why Zustand instead of Redux/Context?
- **Decision**: Zustand with localStorage persist
- **Reason**: Simpler API, less boilerplate, built-in persistence, no provider nesting
- **Rejected**: Redux (too much boilerplate), Context (re-renders entire tree)

### Why Supabase instead of Firebase/Custom backend?
- **Decision**: Supabase (PostgreSQL + Auth + RLS)
- **Reason**: PostgreSQL is more powerful than Firestore, RLS is built-in, open source, real-time
- **Rejected**: Firebase (NoSQL, vendor lock-in), Custom Node.js (too much infra)

### Why Capacitor instead of React Native?
- **Decision**: Capacitor wraps the web app as APK
- **Reason**: Single codebase, no rewrite needed, native plugins available
- **Rejected**: React Native (would require complete UI rewrite)

### Why z-ai-web-dev-sdk as default provider?
- **Decision**: z-ai provider calls `/api/ai` server route which uses z-ai-web-dev-sdk
- **Reason**: No API key needed in sandbox, works out of the box, GLM-4.6 is high quality
- **Rejected**: Direct OpenAI/Groq calls (would need keys from day 1)

### Why localStorage + Supabase dual mode?
- **Decision**: Offline-first (localStorage) with optional cloud sync (Supabase)
- **Reason**: App must work without internet; cloud sync is bonus
- **Rejected**: Cloud-only (would break offline), localStorage-only (no cross-device sync)

### Why 30s polling for web notifications instead of setTimeout?
- **Decision**: 30s polling + localStorage persistence
- **Reason**: setTimeout clears on page reload; polling survives reloads + catches up missed notifications
- **Rejected**: setTimeout (unreliable), Service Worker push (requires push server)

### Why Jaccard similarity instead of real vector embeddings?
- **Decision**: Client-side Jaccard similarity for memory retrieval
- **Reason**: No need for embedding API, works offline, fast for <100 memories
- **Rejected**: OpenAI embeddings (requires API key + network), local sentence-transformers (too heavy for browser)
- **Future**: pgvector SQL ready — can switch to real embeddings when ready

### Why single-page app with view state instead of URL routing?
- **Decision**: `useState<ViewKey>` for view switching
- **Reason**: Only `/` route is exposed in the sandbox; simpler navigation
- **Rejected**: Next.js routing (would need multiple routes, not supported in sandbox)

### Why `queueMicrotask` in auth context?
- **Decision**: Defer setState in useEffect to microtask
- **Reason**: React 19's `react-hooks/set-state-in-effect` lint rule flags synchronous setState in effects; `queueMicrotask` satisfies the rule while still running immediately
- **Rejected**: `setTimeout(fn, 0)` (visible delay), ignoring the rule (lint error)

---

## 21. Coding Standards

### Naming Conventions
- **Files**: `kebab-case.ts` for libs, `PascalCase.tsx` for components
- **Variables/functions**: `camelCase`
- **Types/interfaces**: `PascalCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **CSS classes**: Tailwind utility classes (no custom CSS except `globals.css`)

### Folder Conventions
- `src/lib/` — Business logic, stores, types, utils
- `src/lib/ai/` — AI system (manager, providers, memory, context, prompts)
- `src/lib/notifications/` — Notification system
- `src/lib/auth/` — Auth context
- `src/lib/supabase/` — Supabase client
- `src/components/app/` — App-specific components
- `src/components/app/views/` — One file per view
- `src/components/ui/` — shadcn/ui components (don't modify)
- `src/app/` — Next.js App Router (pages, layouts, API routes)

### State Management Rules
- All state in Zustand store (`src/lib/store.ts`)
- Use `useStore((s) => s.field)` selector pattern (not `useStore()` without selector)
- Persist with `persist` middleware + `createJSONStorage(() => localStorage)`
- Bump `version` + add `merge` function when schema changes
- Deep-merge nested objects (settings, preferences) in `merge` function

### Error Handling
- Try/catch in async functions
- `console.warn` for non-critical errors (notification, sync)
- `console.error` for critical errors
- User-facing errors: toast notifications or inline error messages
- AI errors: helpful message with next steps (e.g. "Set GROQ_API_KEY on Vercel")

### API Rules
- `/api/ai` is the only API route
- CORS headers on all responses (including errors)
- `OPTIONS` preflight handler
- Server-side only — never expose API keys to client
- Env var detection: `process.env.GROQ_API_KEY` > `process.env.OPENROUTER_API_KEY` > etc.

### Database Rules
- All tables have `user_id` column
- RLS enabled on every table with `auth.uid() = user_id` policies
- Use `upsert` with `onConflict` for idempotent writes
- Triggers for `updated_at` + auto-profile creation
- Never expose service role key in frontend

### Component Rules
- `'use client'` directive at top of all interactive components
- Use shadcn/ui components — don't reinvent
- Key-remount forms when editing different entities (use `key={entity.id ?? 'new'}`)
- Props: use TypeScript interfaces, not inline types
- Avoid `useEffect` for derived state — use `useMemo`

### Code Style
- TypeScript strict mode
- No `any` (use `unknown` + type guard)
- Prefer early returns
- Prefer composition over inheritance
- JSDoc comments on exported functions
- Inline comments for complex logic (notification scheduling, memory retrieval)

---

## 22. Current State Summary

### What is Stable ✅
- Authentication (Supabase + offline)
- All 22 views render correctly
- Task/Habit/Finance/Journal/Knowledge CRUD
- AI Chat with memory + commands
- AI Planner/Reports/Briefing
- Memory Manager (13 categories, full CRUD)
- Notification system (web + APK)
- Settings (theme, targets, export/import)
- Android APK (release-signed, native notifications)
- Vercel deployment (auto-deploy on push)
- GitHub repository (clean, no secrets)

### What is Incomplete ⚠️
- Supabase sync (push only, no full pull/conflict resolution)
- pgvector embeddings (SQL ready, not populated)
- AI Learning Engine (tracks stats but doesn't auto-adjust)
- 6 module UIs missing (Health, Voice, Mind, Skin, Nutrition, Calendar) — SQL tables exist
- No automated tests
- No CI/CD for APK builds

### What Should Be Built Next
1. Delete legacy files (`notification-center.tsx`, `notification-scheduler.ts`)
2. Complete Supabase bidirectional sync
3. Build missing module UIs (Health, Voice, Mind, Skin, Nutrition, Calendar)
4. Add automated tests
5. GitHub Actions for APK auto-build
6. pgvector embedding generation

### What Should NEVER Be Changed 🚫
- Zustand store persist version (always increment, never decrease)
- `merge` function in persist config (handles migrations)
- `/api/ai` CORS headers (APK breaks without them)
- `queueMicrotask` in auth context (prevents hydration mismatch)
- `.gitignore` exclusions (`.env`, keystore, APKs)
- RLS policies on all tables
- `capacitor.config.ts` `androidScheme: 'https'` (APK breaks without it)

---

## 23. Next AI Instructions

### Project Goals
Continue building July Plan as the best personal AI operating system. Focus on:
1. Completing missing module UIs (Health, Voice, Mind, Skin, Nutrition, Calendar)
2. Full Supabase sync with conflict resolution
3. Real vector embeddings for semantic memory search
4. Predictive analytics (workout miss risk, burnout detection)
5. Automated testing

### Development Philosophy
- **Offline-first**: Every feature must work without internet
- **AI-driven**: AI is the center, not a side feature
- **Execution-focused**: Help the user act, not just plan
- **Provider-agnostic**: Never hardcode one AI provider
- **User data is sacred**: Never lose data — always persist before any operation

### Coding Style
- TypeScript strict, no `any`
- Zustand for state, shadcn/ui for components
- `'use client'` on all interactive components
- Key-remount forms for editing
- `queueMicrotask` in effects to avoid setState lint errors
- Comments on complex logic
- Helpful error messages with next steps

### Things to Avoid
- ❌ Don't remove the `merge` function in Zustand persist — it handles V1→V5 migrations
- ❌ Don't remove CORS headers from `/api/ai` — APK breaks without them
- ❌ Don't use `setTimeout` for notification scheduling — use the polling system
- ❌ Don't log notifications at schedule time — only log when actually shown
- ❌ Don't expose API keys to the client — use `/api/ai` server route
- ❌ Don't hardcode Supabase URL/key — use env vars
- ❌ Don't skip RLS on any new table
- ❌ Don't use `output: "export"` in `next.config.ts` for web mode (breaks API routes)
- ❌ Don't delete `public/sw.js` — web notifications need it

### Important Assumptions
1. Only one user uses this app (the owner)
2. Supabase project is at `https://uqjnayzrowuhrfmvootz.supabase.co`
3. Vercel deployment is at `https://julyplan.vercel.app`
4. GitHub repo is `https://github.com/princerider7078-web/julyplan`
5. User has Groq + OpenRouter API keys set on Vercel
6. User wants Hinglish-English tone in AI responses
7. User is a student + programmer following a strict daily routine (6 AM wake, 12 AM sleep, 6 PM-11 PM office)
8. The app is centered around a "July Plan" monthly execution theme

### Critical Rules
1. **Always bump Zustand persist version** when changing AppState shape
2. **Always add new fields to `merge` function** so old users don't break
3. **Always test APK build** after touching `capacitor.config.ts` or notification code
4. **Always run `bun run lint`** before committing
5. **Always restore `next.config.ts` to `"standalone"` after APK build**
6. **Always move `src/app/api` back after APK build**
7. **Never commit `.env.local`, keystore, or APKs**
8. **Never remove `queueMicrotask` from auth context** (hydration breaks)

### Expected Quality Level
- Production-ready code
- No console errors in browser
- No ESLint errors
- All views render without crashing
- Notifications fire reliably (web + APK)
- AI responses are contextual + use memories
- APK installs without developer warning (release-signed)

---

## 24. Full Project Timeline

### V1 (July 1, 2026) — Offline Task Manager
- Built as a simple offline personal task manager
- 10 views: Dashboard, Today Plan, Tasks, Sections, Daily Routine, Habits, Finance, July Plan, Reports, Settings
- localStorage only (Zustand persist)
- No AI, no cloud, no auth
- APK built (V1.0 debug)

### V2 (July 1, 2026) — Cloud + AI
- Added Supabase backend (27 tables + RLS)
- Added AI system (z-ai-web-dev-sdk + provider abstraction)
- Added Auth (Supabase email/password + offline mode)
- Added 6 new views: AI Assistant, AI Planner, AI Reports, Journal, Knowledge Base, AI Controls
- Added sync layer (partial)
- APK built (V3.0 debug)

### V3 (July 2, 2026) — AI Memory + Commands
- Added long-term memory system (13 categories)
- Added semantic memory retrieval (Jaccard similarity)
- Added automatic memory extraction after every chat
- Added chat commands (remember/forget/show/edit/delete/summarize/search/help)
- Added natural language task CRUD (add/delete/complete/move/rename/show)
- Added natural language date parser (today/tomorrow/next Monday/in 2 hours)
- Added 4 new views: AI Memory Manager, Daily Briefing, Notification Center, Conversation History
- Added pgvector SQL migration (ready but not yet using embeddings)
- APK built (V3.1 release-signed)

### V4 (July 2, 2026) — Smart Notification System
- Rebuilt notification system with AI reasoning on every notification
- Added AI Decision Engine (15+ signals)
- Added AI Learning Engine (snooze patterns, response times, productive hours)
- Added Escalation System (5 levels: reminder → gentle → motivational → reschedule → recovery)
- Added Recovery Queue (missed tasks with AI suggestions)
- Added Notification Preferences (5 tones, quiet hours, 12 category toggles, batching)
- Added 18 notification types
- Added interactive action buttons
- Added smart batching
- APK built (V4.1)

### V5 (July 2-3, 2026) — Native Notifications + Fixes
- Replaced in-app "AI Notification Center" with native Android notification system
- Added `@capacitor/local-notifications` plugin
- Added 10 notification channels (Android)
- Added Service Worker for reliable web notifications
- Added 30s web polling + localStorage persistence (survives reloads)
- Added "Send Test" + "Enable Notifications" buttons
- Added 5-min catch-up window for missed notifications
- Fixed 5 critical bugs (lying log, unreliable setTimeout, category check, past task skip, silent permission failure)
- Added notification icon click → navigate to Notifications view
- APK built (V5.0 release-signed)

### Why Major Changes Happened
- **V2**: User requested cloud sync + AI — Supabase + z-ai-sdk added
- **V3**: User wanted AI to remember things — memory system + commands added
- **V4**: User provided detailed PRD for AI notification system — smart notifications built
- **V5**: User reported notifications not working in Chrome — native notification system + bug fixes

---

## 25. Recovery Guide

### If the project breaks tomorrow, here's how to recover:

#### 1. Clone + Install
```bash
git clone https://github.com/princerider7078-web/julyplan.git
cd julyplan
bun install
```

#### 2. Environment
```bash
cp .env.local.example .env.local
# Edit .env.local:
# NEXT_PUBLIC_SUPABASE_URL=https://uqjnayzrowuhrfmvootz.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_5cplBsTI8CiL6IhN5beh0g_pZ1PcqVM
# GROQ_API_KEY=gsk_your_key
```

#### 3. Database
1. Go to https://supabase.com/dashboard/project/uqjnayzrowuhrfmvootz
2. SQL Editor → Run `supabase/schema.sql`
3. SQL Editor → Run `supabase/v3-migration.sql`
4. SQL Editor → Run `supabase/v4-migration.sql`
5. Authentication → URL Configuration → Add your URL to Redirect URLs

#### 4. Dependencies
```bash
bun install  # installs all deps
```

#### 5. Dev Server
```bash
bun run dev  # starts on port 3000
```

#### 6. Build
```bash
bunx next build  # web build (standalone)
```

#### 7. APK Build
```bash
# Switch to static export
# Edit next.config.ts → output: "export"
mv src/app/api src/app/_api_backup
bunx next build
bunx cap sync android
cd android
# Install JDK 21 + Android SDK 34
./gradlew assembleRelease
# APK: android/app/build/outputs/apk/release/app-release.apk
# Restore web env
mv src/app/_api_backup src/app/api
# Edit next.config.ts → output: "standalone"
```

#### 8. Important Files to Check
- `src/lib/store.ts` — Is persist version 5? Is merge function intact?
- `src/app/api/ai/route.ts` — Are CORS headers present? Are all 5 providers handled?
- `src/lib/auth/context.tsx` — Is `queueMicrotask` in useEffect?
- `src/lib/notifications/service.ts` — Is Service Worker registration present?
- `public/sw.js` — Does it exist?
- `capacitor.config.ts` — Is `androidScheme: 'https'`?
- `next.config.ts` — Is it `"standalone"` for web?
- `.gitignore` — Are `.env`, keystore, APKs excluded?

#### 9. Backup Strategy
- **Code**: GitHub (https://github.com/princerider7078-web/julyplan)
- **User data**: localStorage (export via Settings → Export backup)
- **Cloud data**: Supabase (auto-backed up by Supabase)
- **APK**: `/home/z/my-project/download/JulyPlan-v5.0-release.apk`
- **Keystore**: `android/keystore/july-plan-release.keystore` (CRITICAL — if lost, can't update APK)

#### 10. Emergency Contacts
- Supabase Dashboard: https://supabase.com/dashboard/project/uqjnayzrowuhrfmvootz
- Vercel Dashboard: https://vercel.com/dashboard
- GitHub Repo: https://github.com/princerider7078-web/julyplan

---

## Assumptions (explicitly marked)

1. **ASSUMPTION**: User has Groq + OpenRouter API keys set on Vercel (stated by user)
2. **ASSUMPTION**: User wants Hinglish-English tone in AI responses (stated in prompts)
3. **ASSUMPTION**: User is the only user (single-user app, no multi-tenancy)
4. **ASSUMPTION**: Supabase SQL schema has been run (user was instructed to run it)
5. **UNKNOWN**: Whether user has actually run all 3 SQL migrations
6. **UNKNOWN**: Whether notifications work on user's physical Android device (not tested)
7. **UNKNOWN**: Whether Supabase Auth email confirmation is enabled or disabled
8. **FACT**: Vercel deployment is live at https://julyplan.vercel.app
9. **FACT**: GitHub repo is up to date with V5.0 code
10. **FACT**: APK V5.0 is release-signed with keystore `CN=July Plan, OU=Personal, O=JulyPlan, L=India, ST=India, C=IN`

---

*End of Project Context Report. This document is exhaustive and should enable any senior engineer to continue development immediately.*
