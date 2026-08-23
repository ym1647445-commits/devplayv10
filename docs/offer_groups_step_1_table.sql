-- STEP 1/3: run this file alone, then wait for Success.
set lock_timeout = '15s';

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

notify pgrst, 'reload schema';

