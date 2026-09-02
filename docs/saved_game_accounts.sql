-- Phase 1: customer-owned saved game identifiers.
create table if not exists public.saved_game_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.store_products(id) on delete cascade,
  nickname text not null,
  identifiers jsonb not null default '{}'::jsonb,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint saved_game_accounts_nickname_length check (char_length(btrim(nickname)) between 2 and 40),
  constraint saved_game_accounts_identifiers_object check (jsonb_typeof(identifiers) = 'object'),
  constraint saved_game_accounts_identifiers_present check (identifiers <> '{}'::jsonb),
  constraint saved_game_accounts_identifiers_size check (octet_length(identifiers::text) <= 4096),
  constraint saved_game_accounts_identifiers_strings check (
    not jsonb_path_exists(identifiers, '$.* ? (@.type() != "string")')
  ),
  constraint saved_game_accounts_exact_identifier_unique unique (user_id, product_id, identifiers)
);

create index if not exists saved_game_accounts_user_product_idx
  on public.saved_game_accounts (user_id, product_id, updated_at desc);

alter table public.saved_game_accounts enable row level security;

drop policy if exists "customers_read_own_saved_game_accounts" on public.saved_game_accounts;
create policy "customers_read_own_saved_game_accounts"
  on public.saved_game_accounts for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "customers_create_own_saved_game_accounts" on public.saved_game_accounts;
create policy "customers_create_own_saved_game_accounts"
  on public.saved_game_accounts for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "customers_update_own_saved_game_accounts" on public.saved_game_accounts;
create policy "customers_update_own_saved_game_accounts"
  on public.saved_game_accounts for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "customers_delete_own_saved_game_accounts" on public.saved_game_accounts;
create policy "customers_delete_own_saved_game_accounts"
  on public.saved_game_accounts for delete to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.saved_game_accounts to authenticated;

create or replace function public.touch_saved_game_accounts_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists saved_game_accounts_touch_updated_at on public.saved_game_accounts;
create trigger saved_game_accounts_touch_updated_at
before update on public.saved_game_accounts
for each row execute function public.touch_saved_game_accounts_updated_at();
