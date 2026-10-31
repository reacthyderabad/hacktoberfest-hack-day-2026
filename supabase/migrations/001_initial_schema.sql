-- ═══════════════════════════════════════════════════════════════════════════
-- Elah Studio AI — Supabase Database Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable required extensions
create extension if not exists "uuid-ossp";

-- ─── User Profiles ──────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  display_name text,
  avatar_url  text,
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, split_part(new.email, '@', 1));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── Projects ───────────────────────────────────────────────────────────────
create table if not exists public.projects (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        text not null default 'Untitled Project',
  description text,
  -- Serialised Elah Project JSON (the same format used by localStorage)
  project_data jsonb,
  -- Metadata
  fps         integer default 30,
  stage_width  integer default 1920,
  stage_height integer default 1080,
  duration_frames integer default 0,
  thumbnail_url text,
  -- Status
  is_archived boolean default false,
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null
);

-- ─── AI Editing History ─────────────────────────────────────────────────────
create table if not exists public.ai_edit_history (
  id          uuid primary key default uuid_generate_v4(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  -- The user's natural-language request
  prompt      text not null,
  -- The structured plan the AI produced (StudioEditPlan JSON)
  plan        jsonb,
  -- Outcome
  status      text not null default 'pending'
                check (status in ('pending', 'applied', 'rejected', 'failed')),
  -- Summary of what was applied
  applied_summary text,
  -- Number of operations that were actually executed
  applied_count integer default 0,
  -- Whether the local planner was used (fallback)
  is_local_fallback boolean default false,
  created_at  timestamptz default now() not null
);

-- ─── Media Metadata ─────────────────────────────────────────────────────────
-- Stores metadata about imported media assets (NOT the binary files themselves)
create table if not exists public.media_assets (
  id            uuid primary key default uuid_generate_v4(),
  project_id    uuid references public.projects(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  -- Elah asset ID (from MediaAsset.id)
  elah_asset_id text,
  name          text not null,
  mime_type     text,
  byte_size     bigint,
  duration_sec  float,
  width         integer,
  height        integer,
  -- Supabase Storage path (optional — only when uploaded to Storage)
  storage_path  text,
  -- Public URL or blob URL
  src           text,
  thumbnail_url text,
  created_at    timestamptz default now() not null
);

-- ─── Row Level Security ─────────────────────────────────────────────────────

alter table public.profiles         enable row level security;
alter table public.projects         enable row level security;
alter table public.ai_edit_history  enable row level security;
alter table public.media_assets     enable row level security;

-- Profiles: users can only read/update their own
create policy "profiles: own access"
  on public.profiles for all using (auth.uid() = id);

-- Projects: users own their projects
create policy "projects: own access"
  on public.projects for all using (auth.uid() = user_id);

-- AI edit history: users own their history
create policy "ai_edit_history: own access"
  on public.ai_edit_history for all using (auth.uid() = user_id);

-- Media assets: users own their assets
create policy "media_assets: own access"
  on public.media_assets for all using (auth.uid() = user_id);

-- ─── Updated-at trigger ──────────────────────────────────────────────────────
create or replace function public.update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger projects_updated_at
  before update on public.projects
  for each row execute procedure public.update_updated_at();

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.update_updated_at();

-- ─── Indexes ────────────────────────────────────────────────────────────────
create index if not exists idx_projects_user_id      on public.projects(user_id);
create index if not exists idx_ai_history_project_id on public.ai_edit_history(project_id);
create index if not exists idx_ai_history_user_id    on public.ai_edit_history(user_id);
create index if not exists idx_media_project_id      on public.media_assets(project_id);
