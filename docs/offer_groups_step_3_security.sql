-- STEP 3/3: run this file alone after step 2 succeeds.
set lock_timeout = '15s';

create index if not exists store_product_offer_groups_product_idx
  on public.store_product_offer_groups(product_id, active, sort_order);

create index if not exists store_product_offers_group_idx
  on public.store_product_offers(product_id, offer_group_id, sort_order);

alter table public.store_product_offer_groups enable row level security;

drop policy if exists "offer groups are publicly readable" on public.store_product_offer_groups;
create policy "offer groups are publicly readable"
  on public.store_product_offer_groups for select
  using (
    active = true or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.status = 'active'
        and profiles.role in ('admin', 'super_admin', 'owner')
    )
  );

drop policy if exists "admins manage offer groups" on public.store_product_offer_groups;
create policy "admins manage offer groups"
  on public.store_product_offer_groups for all
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

notify pgrst, 'reload schema';

