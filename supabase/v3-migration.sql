-- ============================================================================
-- July Plan V3 — pgvector Semantic Memory Search Migration
-- Run this AFTER schema.sql in: Supabase Dashboard → SQL Editor
-- Enables semantic memory retrieval using vector embeddings.
-- ============================================================================

-- 1. Enable pgvector extension (skip if already enabled)
create extension if not exists vector;

-- 2. Add embedding column to ai_memories (if not exists)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'ai_memories' and column_name = 'embedding'
  ) then
    alter table public.ai_memories add column embedding vector(384);
  end if;
end $$;

-- 3. Add metadata columns to ai_memories for V3 features
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'ai_memories' and column_name = 'title'
  ) then
    alter table public.ai_memories add column title text;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_name = 'ai_memories' and column_name = 'importance'
  ) then
    alter table public.ai_memories add column importance text default 'medium';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_name = 'ai_memories' and column_name = 'source'
  ) then
    alter table public.ai_memories add column source text default 'chat';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_name = 'ai_memories' and column_name = 'pinned'
  ) then
    alter table public.ai_memories add column pinned boolean default false;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_name = 'ai_memories' and column_name = 'favorite'
  ) then
    alter table public.ai_memories add column favorite boolean default false;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_name = 'ai_memories' and column_name = 'archived'
  ) then
    alter table public.ai_memories add column archived boolean default false;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_name = 'ai_memories' and column_name = 'locked'
  ) then
    alter table public.ai_memories add column locked boolean default false;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_name = 'ai_memories' and column_name = 'disabled'
  ) then
    alter table public.ai_memories add column disabled boolean default false;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_name = 'ai_memories' and column_name = 'tags'
  ) then
    alter table public.ai_memories add column tags text[] default '{}';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_name = 'ai_memories' and column_name = 'use_count'
  ) then
    alter table public.ai_memories add column use_count int default 0;
  end if;
end $$;

-- 4. Create ivfflat index for fast semantic search
-- (384 dims works with sentence-transformers/all-MiniLM-L6-v2)
drop index if exists ai_memories_embedding_idx;
create index ai_memories_embedding_idx on public.ai_memories
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- 5. Function to find semantically similar memories
create or replace function match_memories(
  query_embedding vector(384),
  match_count int default 10,
  match_threshold float default 0.3
)
returns table (
  id uuid,
  title text,
  memory_key text,
  memory_value text,
  memory_type text,
  importance text,
  pinned boolean,
  favorite boolean,
  similarity float
)
language sql
security definer set search_path = public
as $$
  select
    m.id,
    m.title,
    m.memory_key,
    m.memory_value,
    m.memory_type,
    m.importance,
    m.pinned,
    m.favorite,
    1 - (m.embedding <=> query_embedding) as similarity
  from public.ai_memories m
  where
    m.user_id = auth.uid()
    and m.archived = false
    and m.disabled = false
    and (m.embedding is not null)
    and 1 - (m.embedding <=> query_embedding) > match_threshold
  order by m.embedding <=> query_embedding
  limit match_count;
$$;

-- 6. Add notifications table for AI-generated notifications (V3)
create table if not exists public.ai_notifications_v3 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  message text,
  type text,
  priority text default 'medium',
  scheduled_at timestamptz not null,
  status text default 'pending',
  ai_generated boolean default true,
  linked_entity_type text,
  linked_entity_id uuid,
  created_at timestamptz default now()
);

alter table public.ai_notifications_v3 enable row level security;

drop policy if exists "ai_notifications_v3_select_own" on public.ai_notifications_v3;
create policy "ai_notifications_v3_select_own" on public.ai_notifications_v3
  for select using (auth.uid() = user_id);
drop policy if exists "ai_notifications_v3_insert_own" on public.ai_notifications_v3;
create policy "ai_notifications_v3_insert_own" on public.ai_notifications_v3
  for insert with check (auth.uid() = user_id);
drop policy if exists "ai_notifications_v3_update_own" on public.ai_notifications_v3;
create policy "ai_notifications_v3_update_own" on public.ai_notifications_v3
  for update using (auth.uid() = user_id);
drop policy if exists "ai_notifications_v3_delete_own" on public.ai_notifications_v3;
create policy "ai_notifications_v3_delete_own" on public.ai_notifications_v3
  for delete using (auth.uid() = user_id);

-- 7. Conversation summaries table
create table if not exists public.conversation_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  session_id text,
  summary text,
  message_count int default 0,
  created_at timestamptz default now()
);

alter table public.conversation_summaries enable row level security;

drop policy if exists "conversation_summaries_select_own" on public.conversation_summaries;
create policy "conversation_summaries_select_own" on public.conversation_summaries
  for select using (auth.uid() = user_id);
drop policy if exists "conversation_summaries_insert_own" on public.conversation_summaries;
create policy "conversation_summaries_insert_own" on public.conversation_summaries
  for insert with check (auth.uid() = user_id);
drop policy if exists "conversation_summaries_delete_own" on public.conversation_summaries;
create policy "conversation_summaries_delete_own" on public.conversation_summaries
  for delete using (auth.uid() = user_id);

-- DONE — pgvector enabled, ai_memories extended with V3 fields,
-- semantic match_memories() function created, notification + summary tables added.
