-- DevPlay customizable companion preferences. Run once in Supabase SQL Editor.
create table if not exists public.customer_companion_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  name text not null default 'Dev' check (char_length(trim(name)) between 1 and 18),
  tone text not null default 'playful' check (tone in ('playful', 'calm', 'energetic')),
  theme text not null default 'robot' check (theme in ('robot', 'space', 'pixel', 'neon')),
  color text not null default 'violet' check (color in ('violet', 'blue', 'cyan', 'green', 'orange', 'pink')),
  size text not null default 'medium' check (size in ('small', 'medium', 'large')),
  enabled boolean not null default true,
  roaming_enabled boolean not null default true,
  game_invites_enabled boolean not null default true,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.customer_companion_preferences enable row level security;
drop policy if exists "customers_manage_own_companion_preferences" on public.customer_companion_preferences;
create policy "customers_manage_own_companion_preferences" on public.customer_companion_preferences for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.customer_companion_preferences to authenticated;
