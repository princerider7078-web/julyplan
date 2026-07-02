-- ============================================================================
-- July Plan V4 — AI Notification & Alert System Schema
-- Run this AFTER v3-migration.sql in Supabase SQL Editor
-- Adds: notification_history, notification_preferences, notification_queue,
--       ai_learning_profile, reminder_rules tables
-- ============================================================================

-- 1. Notification History (full log of every notification ever sent)
create table if not exists public.notification_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  notification_id text,
  title text not null,
  message text,
  type text,
  category text,
  priority text default 'medium',
  tone text default 'friendly',
  reasoning text,
  escalation_level int default 0,
  snooze_count int default 0,
  actions_json jsonb default '[]'::jsonb,
  linked_entity_type text,
  linked_entity_id uuid,
  status text default 'pending',
  scheduled_at timestamptz not null,
  shown_at timestamptz,
  responded_at timestamptz,
  response_action text,
  ai_generated boolean default true,
  created_at timestamptz default now()
);

create index if not exists idx_notif_history_user on public.notification_history(user_id);
create index if not exists idx_notif_history_status on public.notification_history(status);
create index if not exists idx_notif_history_scheduled on public.notification_history(scheduled_at);

alter table public.notification_history enable row level security;
drop policy if exists "notification_history_select_own" on public.notification_history;
create policy "notification_history_select_own" on public.notification_history for select using (auth.uid() = user_id);
drop policy if exists "notification_history_insert_own" on public.notification_history;
create policy "notification_history_insert_own" on public.notification_history for insert with check (auth.uid() = user_id);
drop policy if exists "notification_history_update_own" on public.notification_history;
create policy "notification_history_update_own" on public.notification_history for update using (auth.uid() = user_id);
drop policy if exists "notification_history_delete_own" on public.notification_history;
create policy "notification_history_delete_own" on public.notification_history for delete using (auth.uid() = user_id);

-- 2. Notification Preferences (per-user settings)
create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  tone text default 'friendly',
  quiet_hours_enabled boolean default true,
  quiet_hours_start text default '22:00',
  quiet_hours_end text default '07:00',
  critical_bypass_quiet boolean default true,
  categories_json jsonb default '{}'::jsonb,
  batching_enabled boolean default true,
  batching_window_minutes int default 15,
  escalation_enabled boolean default true,
  escalation_delay_minutes int default 10,
  learning_enabled boolean default true,
  default_snooze_minutes int default 15,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.notification_preferences enable row level security;
drop policy if exists "notification_preferences_select_own" on public.notification_preferences;
create policy "notification_preferences_select_own" on public.notification_preferences for select using (auth.uid() = user_id);
drop policy if exists "notification_preferences_insert_own" on public.notification_preferences;
create policy "notification_preferences_insert_own" on public.notification_preferences for insert with check (auth.uid() = user_id);
drop policy if exists "notification_preferences_update_own" on public.notification_preferences;
create policy "notification_preferences_update_own" on public.notification_preferences for update using (auth.uid() = user_id);
drop policy if exists "notification_preferences_delete_own" on public.notification_preferences;
create policy "notification_preferences_delete_own" on public.notification_preferences for delete using (auth.uid() = user_id);

-- 3. Notification Queue (pending notifications waiting to be sent)
create table if not exists public.notification_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  notification_id text,
  title text not null,
  message text,
  type text,
  category text,
  priority text default 'medium',
  tone text default 'friendly',
  reasoning text,
  escalation_level int default 0,
  snooze_count int default 0,
  postpone_count int default 0,
  batch_id text,
  actions_json jsonb default '[]'::jsonb,
  linked_entity_type text,
  linked_entity_id uuid,
  estimated_minutes int,
  scheduled_at timestamptz not null,
  status text default 'pending',
  ai_generated boolean default true,
  created_at timestamptz default now()
);

create index if not exists idx_notif_queue_user on public.notification_queue(user_id);
create index if not exists idx_notif_queue_status on public.notification_queue(status);
create index if not exists idx_notif_queue_scheduled on public.notification_queue(scheduled_at);

alter table public.notification_queue enable row level security;
drop policy if exists "notification_queue_select_own" on public.notification_queue;
create policy "notification_queue_select_own" on public.notification_queue for select using (auth.uid() = user_id);
drop policy if exists "notification_queue_insert_own" on public.notification_queue;
create policy "notification_queue_insert_own" on public.notification_queue for insert with check (auth.uid() = user_id);
drop policy if exists "notification_queue_update_own" on public.notification_queue;
create policy "notification_queue_update_own" on public.notification_queue for update using (auth.uid() = user_id);
drop policy if exists "notification_queue_delete_own" on public.notification_queue;
create policy "notification_queue_delete_own" on public.notification_queue for delete using (auth.uid() = user_id);

-- 4. AI Learning Profile (per-user behavioral insights)
create table if not exists public.ai_learning_profile (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  avg_snooze_minutes int default 15,
  snooze_count_total int default 0,
  avg_response_time_minutes int default 5,
  no_response_before_hour int default 6,
  no_response_after_hour int default 23,
  productive_hours_json jsonb default '[9, 10, 11, 20, 21, 22]'::jsonb,
  most_postponed_category text,
  most_postponed_task_id uuid,
  habits_at_risk_json jsonb default '[]'::jsonb,
  task_completion_rate numeric default 0,
  habit_completion_rate numeric default 0,
  notification_response_rate numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.ai_learning_profile enable row level security;
drop policy if exists "ai_learning_profile_select_own" on public.ai_learning_profile;
create policy "ai_learning_profile_select_own" on public.ai_learning_profile for select using (auth.uid() = user_id);
drop policy if exists "ai_learning_profile_insert_own" on public.ai_learning_profile;
create policy "ai_learning_profile_insert_own" on public.ai_learning_profile for insert with check (auth.uid() = user_id);
drop policy if exists "ai_learning_profile_update_own" on public.ai_learning_profile;
create policy "ai_learning_profile_update_own" on public.ai_learning_profile for update using (auth.uid() = user_id);
drop policy if exists "ai_learning_profile_delete_own" on public.ai_learning_profile;
create policy "ai_learning_profile_delete_own" on public.ai_learning_profile for delete using (auth.uid() = user_id);

-- 5. Reminder Rules (user-customizable AI notification rules)
create table if not exists public.reminder_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  trigger_type text not null,
  trigger_condition jsonb,
  action_type text not null,
  action_params jsonb,
  enabled boolean default true,
  priority text default 'medium',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.reminder_rules enable row level security;
drop policy if exists "reminder_rules_select_own" on public.reminder_rules;
create policy "reminder_rules_select_own" on public.reminder_rules for select using (auth.uid() = user_id);
drop policy if exists "reminder_rules_insert_own" on public.reminder_rules;
create policy "reminder_rules_insert_own" on public.reminder_rules for insert with check (auth.uid() = user_id);
drop policy if exists "reminder_rules_update_own" on public.reminder_rules;
create policy "reminder_rules_update_own" on public.reminder_rules for update using (auth.uid() = user_id);
drop policy if exists "reminder_rules_delete_own" on public.reminder_rules;
create policy "reminder_rules_delete_own" on public.reminder_rules for delete using (auth.uid() = user_id);

-- 6. Recovery Queue (missed tasks awaiting user decision)
create table if not exists public.recovery_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  task_id uuid,
  habit_id uuid,
  title text not null,
  reason text,
  missed_count int default 0,
  suggested_actions_json jsonb default '[]'::jsonb,
  ai_suggestion text,
  created_at timestamptz default now()
);

alter table public.recovery_queue enable row level security;
drop policy if exists "recovery_queue_select_own" on public.recovery_queue;
create policy "recovery_queue_select_own" on public.recovery_queue for select using (auth.uid() = user_id);
drop policy if exists "recovery_queue_insert_own" on public.recovery_queue;
create policy "recovery_queue_insert_own" on public.recovery_queue for insert with check (auth.uid() = user_id);
drop policy if exists "recovery_queue_update_own" on public.recovery_queue;
create policy "recovery_queue_update_own" on public.recovery_queue for update using (auth.uid() = user_id);
drop policy if exists "recovery_queue_delete_own" on public.recovery_queue;
create policy "recovery_queue_delete_own" on public.recovery_queue for delete using (auth.uid() = user_id);

-- DONE — V4 notification system tables created with RLS.
-- Total: 6 new tables (notification_history, notification_preferences,
--        notification_queue, ai_learning_profile, reminder_rules, recovery_queue)
