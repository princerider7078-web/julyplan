-- ============================================================================
-- July Plan V2 — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================================================

create extension if not exists "pgcrypto";

-- ============================================================================
-- 1. USERS (profile — extends auth.users)
-- ============================================================================
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text,
  avatar_url text,
  timezone text default 'Asia/Kolkata',
  theme text default 'dark',
  office_start_time text default '18:00',
  office_end_time text default '23:00',
  wake_time text default '06:00',
  sleep_time text default '00:00',
  goal_weight numeric,
  current_weight numeric,
  daily_protein_goal int default 90,
  daily_water_goal int default 3000,
  preferences_json jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. AI PROFILES
create table if not exists public.ai_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  provider text not null default 'zai',
  model_chat text default 'glm-4.6',
  model_planning text default 'glm-4.6',
  model_reports text default 'glm-4.6',
  fallback_model text,
  temperature numeric default 0.7,
  max_tokens int default 1500,
  prompt_style text default 'coach',
  enabled_modules_json jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id)
);

-- 3. TASK CATEGORIES
create table if not exists public.task_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  color text default '#64748b',
  icon text default 'Target',
  sort_order int default 0,
  parent_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. TASKS
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text,
  category_id uuid references public.task_categories(id) on delete set null,
  priority text default 'medium',
  status text default 'pending',
  due_date date,
  due_time text,
  reminder_at timestamptz,
  repeat_rule text default 'none',
  estimated_minutes int,
  actual_minutes int,
  ai_generated boolean default false,
  source_type text default 'manual',
  is_top_priority boolean default false,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  completed_at timestamptz,
  archived_at timestamptz
);
create index if not exists idx_tasks_user on public.tasks(user_id);
create index if not exists idx_tasks_status on public.tasks(status);
create index if not exists idx_tasks_due on public.tasks(due_date);

-- 5. TASK SUBTASKS
create table if not exists public.task_subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  title text not null,
  status text default 'pending',
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 6. TASK COMPLETION LOGS
create table if not exists public.task_completion_logs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  log_date date not null,
  completed boolean default true,
  created_at timestamptz default now(),
  unique (task_id, log_date)
);

-- 7. HABITS
create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  category text,
  target_per_day int default 1,
  repeat_rule text default 'daily',
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 8. HABIT LOGS
create table if not exists public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  log_date date not null,
  value numeric default 1,
  completed boolean default true,
  note text,
  created_at timestamptz default now(),
  unique (habit_id, log_date)
);

-- 9. HEALTH LOGS
create table if not exists public.health_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  log_date date not null,
  weight numeric,
  water_liters numeric,
  calories int,
  protein_grams int,
  sleep_hours numeric,
  workout_minutes int,
  workout_type text,
  recovery_score int,
  notes text,
  created_at timestamptz default now()
);

-- 10. VOICE SESSIONS
create table if not exists public.voice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  log_date date not null,
  duration_minutes int,
  exercises_json jsonb default '[]'::jsonb,
  difficulty int default 3,
  ai_feedback text,
  created_at timestamptz default now()
);

-- 11. MIND SESSIONS
create table if not exists public.mind_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  log_date date not null,
  session_type text,
  duration_minutes int,
  focus_score int,
  notes text,
  created_at timestamptz default now()
);

-- 12. SKIN ROUTINES
create table if not exists public.skin_routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  log_date date not null,
  morning_done boolean default false,
  night_done boolean default false,
  facewash_done boolean default false,
  moisturizer_done boolean default false,
  haircare_done boolean default false,
  beardcare_done boolean default false,
  notes text,
  created_at timestamptz default now(),
  unique (user_id, log_date)
);

-- 13. NUTRITION LOGS
create table if not exists public.nutrition_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  log_date date not null,
  meal_type text,
  items_json jsonb default '[]'::jsonb,
  calories int,
  protein_grams int,
  water_ml int,
  supplements_json jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

-- 14. FINANCE ENTRIES
create table if not exists public.finance_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  entry_type text not null,
  amount numeric not null,
  category text,
  note text,
  entry_date date not null,
  target_name text,
  target_amount numeric,
  created_at timestamptz default now()
);
create index if not exists idx_finance_user on public.finance_entries(user_id);
create index if not exists idx_finance_date on public.finance_entries(entry_date);

-- 15. JOURNAL ENTRIES
create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  entry_date date not null,
  title text,
  content text,
  mood_score int,
  reflection_type text default 'daily',
  ai_summary text,
  created_at timestamptz default now()
);

-- 16. KNOWLEDGE NOTES
create table if not exists public.knowledge_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  content text,
  tags_json jsonb default '[]'::jsonb,
  source_type text,
  reference_url text,
  ai_summary text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 17. CALENDAR EVENTS
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text,
  event_type text,
  start_at timestamptz not null,
  end_at timestamptz,
  linked_task_id uuid,
  linked_habit_id uuid,
  created_at timestamptz default now()
);

-- 18. NOTIFICATIONS
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  message text,
  notification_type text,
  scheduled_at timestamptz not null,
  repeat_rule text,
  status text default 'pending',
  linked_entity_type text,
  linked_entity_id uuid,
  ai_generated boolean default false,
  created_at timestamptz default now()
);

-- 19. AI MEMORIES
create table if not exists public.ai_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  memory_type text not null,
  memory_key text not null,
  memory_value text not null,
  confidence_score numeric default 0.5,
  source_module text,
  last_used_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, memory_type, memory_key)
);

-- 20. AI REQUESTS
create table if not exists public.ai_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  request_type text not null,
  prompt_text text,
  context_json jsonb,
  provider text,
  model text,
  token_usage int,
  response_preview text,
  created_at timestamptz default now()
);

-- 21. AI RESPONSES
create table if not exists public.ai_responses (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.ai_requests(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  response_text text,
  structured_json jsonb,
  response_type text,
  rating int,
  created_at timestamptz default now()
);

-- 22. ANALYTICS DAILY
create table if not exists public.analytics_daily (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  log_date date not null,
  task_score int,
  habit_score int,
  health_score int,
  voice_score int,
  mind_score int,
  finance_score int,
  overall_score int,
  ai_summary text,
  created_at timestamptz default now(),
  unique (user_id, log_date)
);

-- 23. ANALYTICS WEEKLY
create table if not exists public.analytics_weekly (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  week_start date not null,
  week_end date not null,
  best_day date,
  worst_day date,
  consistency_score int,
  notes text,
  ai_summary text,
  created_at timestamptz default now(),
  unique (user_id, week_start)
);

-- 24. ANALYTICS MONTHLY
create table if not exists public.analytics_monthly (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  month_key text not null,
  completed_tasks int,
  missed_tasks int,
  wasted_days int,
  growth_summary text,
  ai_summary text,
  created_at timestamptz default now(),
  unique (user_id, month_key)
);

-- 25. APP SETTINGS
create table if not exists public.app_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  key text not null,
  value_json jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, key)
);

-- 26. ROUTINE BLOCKS
create table if not exists public.routine_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  start_time text not null,
  end_time text not null,
  category text,
  description text,
  checklist_items_json jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

-- 27. ROUTINE COMPLETION LOGS
create table if not exists public.routine_completion_logs (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routine_blocks(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  log_date date not null,
  completed boolean default true,
  created_at timestamptz default now(),
  unique (routine_id, log_date)
);

-- ============================================================================
-- ROW LEVEL SECURITY — enable on all tables
-- ============================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'users','ai_profiles','task_categories','tasks','task_subtasks',
    'task_completion_logs','habits','habit_logs','health_logs',
    'voice_sessions','mind_sessions','skin_routines','nutrition_logs',
    'finance_entries','journal_entries','knowledge_notes','calendar_events',
    'notifications','ai_memories','ai_requests','ai_responses',
    'analytics_daily','analytics_weekly','analytics_monthly',
    'app_settings','routine_blocks','routine_completion_logs'
  ]
  loop
    execute format('alter table public.%s enable row level security;', t);
  end loop;
end $$;

-- ============================================================================
-- RLS POLICIES — user can only read/write their own rows
-- ============================================================================

-- users
drop policy if exists "users_select_own" on public.users;
create policy "users_select_own" on public.users for select using (auth.uid() = id);
drop policy if exists "users_insert_own" on public.users;
create policy "users_insert_own" on public.users for insert with check (auth.uid() = id);
drop policy if exists "users_update_own" on public.users;
create policy "users_update_own" on public.users for update using (auth.uid() = id);
drop policy if exists "users_delete_own" on public.users;
create policy "users_delete_own" on public.users for delete using (auth.uid() = id);

-- Generic policies for user_id-scoped tables
do $$
declare t text;
begin
  foreach t in array array[
    'ai_profiles','task_categories','tasks',
    'task_completion_logs','habits','habit_logs','health_logs',
    'voice_sessions','mind_sessions','skin_routines','nutrition_logs',
    'finance_entries','journal_entries','knowledge_notes','calendar_events',
    'notifications','ai_memories','ai_requests','ai_responses',
    'analytics_daily','analytics_weekly','analytics_monthly',
    'app_settings','routine_blocks','routine_completion_logs'
  ]
  loop
    execute format('drop policy if exists "%s_select_own" on public.%s;', t, t);
    execute format('create policy "%s_select_own" on public.%s for select using (auth.uid() = user_id);', t, t);
    execute format('drop policy if exists "%s_insert_own" on public.%s;', t, t);
    execute format('create policy "%s_insert_own" on public.%s for insert with check (auth.uid() = user_id);', t, t);
    execute format('drop policy if exists "%s_update_own" on public.%s;', t, t);
    execute format('create policy "%s_update_own" on public.%s for update using (auth.uid() = user_id);', t, t);
    execute format('drop policy if exists "%s_delete_own" on public.%s;', t, t);
    execute format('create policy "%s_delete_own" on public.%s for delete using (auth.uid() = user_id);', t, t);
  end loop;
end $$;

-- task_subtasks: scoped via parent task
drop policy if exists "task_subtasks_select_own" on public.task_subtasks;
create policy "task_subtasks_select_own" on public.task_subtasks for select
  using (exists (select 1 from public.tasks t where t.id = task_id and t.user_id = auth.uid()));
drop policy if exists "task_subtasks_insert_own" on public.task_subtasks;
create policy "task_subtasks_insert_own" on public.task_subtasks for insert
  with check (exists (select 1 from public.tasks t where t.id = task_id and t.user_id = auth.uid()));
drop policy if exists "task_subtasks_update_own" on public.task_subtasks;
create policy "task_subtasks_update_own" on public.task_subtasks for update
  using (exists (select 1 from public.tasks t where t.id = task_id and t.user_id = auth.uid()));
drop policy if exists "task_subtasks_delete_own" on public.task_subtasks;
create policy "task_subtasks_delete_own" on public.task_subtasks for delete
  using (exists (select 1 from public.tasks t where t.id = task_id and t.user_id = auth.uid()));

-- ============================================================================
-- TRIGGER — auto-create user profile on auth signup
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.users (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  insert into public.ai_profiles (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- TRIGGER — auto-update updated_at
-- ============================================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'users','ai_profiles','task_categories','tasks','task_subtasks',
    'habits','app_settings','knowledge_notes','routine_blocks'
  ]
  loop
    execute format('drop trigger if exists touch_%s on public.%s;', t, t);
    execute format('create trigger touch_%s before update on public.%s for each row execute function public.touch_updated_at();', t, t);
  end loop;
end $$;

-- DONE — 27 tables, full RLS, auto-profile-on-signup
