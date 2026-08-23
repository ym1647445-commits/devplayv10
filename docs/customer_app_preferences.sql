-- DevPlay Android onboarding preferences.
-- Run once in Supabase SQL Editor before enabling the onboarding survey.

create table if not exists public.customer_app_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  primary_goal text,
  typical_monthly_spend_egp numeric(20, 2),
  topup_frequency text,
  notify_price_drops boolean not null default true,
  notify_coupons boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customer_game_preferences (
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.store_products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

alter table public.customer_app_preferences enable row level security;
alter table public.customer_game_preferences enable row level security;

drop policy if exists "customers_manage_own_app_preferences" on public.customer_app_preferences;
create policy "customers_manage_own_app_preferences"
on public.customer_app_preferences for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "customers_manage_own_game_preferences" on public.customer_game_preferences;
create policy "customers_manage_own_game_preferences"
on public.customer_game_preferences for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create or replace function public.save_customer_app_preferences(
  p_primary_goal text,
  p_typical_monthly_spend_egp numeric,
  p_topup_frequency text,
  p_product_ids uuid[],
  p_notify_price_drops boolean default true,
  p_notify_coupons boolean default true
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_typical_monthly_spend_egp is not null and p_typical_monthly_spend_egp < 0 then
    raise exception 'Invalid monthly spend';
  end if;

  if exists (
    select 1 from unnest(coalesce(p_product_ids, '{}'::uuid[])) as selected_id
    where not exists (
      select 1 from public.store_products product
      where product.id = selected_id and product.active = true
    )
  ) then
    raise exception 'Invalid favorite product';
  end if;

  insert into public.customer_app_preferences (
    user_id, primary_goal, typical_monthly_spend_egp, topup_frequency,
    notify_price_drops, notify_coupons, updated_at
  ) values (
    v_user_id, nullif(trim(p_primary_goal), ''), p_typical_monthly_spend_egp,
    nullif(trim(p_topup_frequency), ''), p_notify_price_drops, p_notify_coupons, now()
  )
  on conflict (user_id) do update set
    primary_goal = excluded.primary_goal,
    typical_monthly_spend_egp = excluded.typical_monthly_spend_egp,
    topup_frequency = excluded.topup_frequency,
    notify_price_drops = excluded.notify_price_drops,
    notify_coupons = excluded.notify_coupons,
    updated_at = now();

  delete from public.customer_game_preferences where user_id = v_user_id;
  insert into public.customer_game_preferences (user_id, product_id)
  select v_user_id, selected_id
  from unnest(coalesce(p_product_ids, '{}'::uuid[])) as selected_id
  on conflict do nothing;

  update public.profiles
  set onboarding_completed = true, updated_at = now()
  where id = v_user_id;
end;
$function$;

revoke all on function public.save_customer_app_preferences(text, numeric, text, uuid[], boolean, boolean) from public;
grant execute on function public.save_customer_app_preferences(text, numeric, text, uuid[], boolean, boolean) to authenticated;
