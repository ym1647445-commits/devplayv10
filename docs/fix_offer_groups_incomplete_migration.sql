-- Fix a partially applied offer-groups migration.
-- Safe to run more than once in Supabase SQL Editor.

create table if not exists public.store_product_offer_groups (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.store_products(id) on delete cascade,
  group_key text not null,
  name_ar text not null,
  name_en text,
  description_ar text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, group_key)
);

alter table public.store_product_offers
  add column if not exists offer_group_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'store_product_offers_offer_group_id_fkey'
      and conrelid = 'public.store_product_offers'::regclass
  ) then
    alter table public.store_product_offers
      add constraint store_product_offers_offer_group_id_fkey
      foreign key (offer_group_id)
      references public.store_product_offer_groups(id)
      on delete set null;
  end if;
end $$;

create index if not exists store_product_offer_groups_product_idx
  on public.store_product_offer_groups(product_id, active, sort_order);

create index if not exists store_product_offers_group_idx
  on public.store_product_offers(product_id, offer_group_id, sort_order);

alter table public.store_product_offer_groups enable row level security;

drop policy if exists "offer groups are publicly readable" on public.store_product_offer_groups;
create policy "offer groups are publicly readable"
  on public.store_product_offer_groups
  for select
  using (
    active = true
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.status = 'active'
        and profiles.role in ('admin', 'super_admin', 'owner')
    )
  );

drop policy if exists "admins manage offer groups" on public.store_product_offer_groups;
create policy "admins manage offer groups"
  on public.store_product_offer_groups
  for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.status = 'active'
        and profiles.role in ('admin', 'super_admin', 'owner')
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.status = 'active'
        and profiles.role in ('admin', 'super_admin', 'owner')
    )
  );

-- Existing store_product_offers update policies continue to protect moves.
-- Ask PostgREST to reload the schema immediately.
notify pgrst, 'reload schema';

