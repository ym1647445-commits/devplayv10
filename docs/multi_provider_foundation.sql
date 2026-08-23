begin;

-- Provider configuration contains public operational metadata only.
-- API keys remain in server-side environment variables or a secrets vault.
create table if not exists public.providers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  adapter_key text not null,
  api_base_url text,
  active boolean not null default false,
  status text not null default 'unknown' check (status in ('healthy','degraded','offline','unknown')),
  selection_mode text not null default 'manual' check (selection_mode in ('manual','auto')),
  expose_name_to_customers boolean not null default true,
  priority integer not null default 0,
  current_balance numeric(20,8),
  balance_currency text not null default 'USD',
  last_balance_at timestamptz,
  last_sync_at timestamptz,
  last_health_check_at timestamptz,
  last_error text,
  successful_orders_count bigint not null default 0 check (successful_orders_count >= 0),
  failed_orders_count bigint not null default 0 check (failed_orders_count >= 0),
  average_execution_seconds numeric(20,2),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.providers (
  code, name, adapter_key, api_base_url, active, status, priority,
  selection_mode, expose_name_to_customers
) values (
  'flexy', 'FlexyGlobal', 'flexy', null, true, 'unknown', 100,
  'manual', true
)
on conflict (code) do update set
  name = excluded.name,
  adapter_key = excluded.adapter_key,
  updated_at = now();

insert into public.providers (
  code, name, adapter_key, active, status, priority,
  selection_mode, expose_name_to_customers
) values (
  'item4gamer', 'Item4Gamer', 'item4gamer', false, 'unknown', 50,
  'manual', true
)
on conflict (code) do nothing;

alter table public.store_products
  add column if not exists product_type text not null default 'service',
  add column if not exists region_mode text not null default 'none',
  add column if not exists default_country_code text,
  add column if not exists default_region_code text,
  add column if not exists provider_selection_mode text not null default 'manual';

do $constraints$
begin
  if not exists (select 1 from pg_constraint where conname = 'store_products_region_mode_check') then
    alter table public.store_products add constraint store_products_region_mode_check
      check (region_mode in ('none','country','region'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'store_products_provider_selection_mode_check') then
    alter table public.store_products add constraint store_products_provider_selection_mode_check
      check (provider_selection_mode in ('manual','auto'));
  end if;
end
$constraints$;

create table if not exists public.internal_packages (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.store_products(id) on delete cascade,
  canonical_key text not null,
  name_ar text not null,
  name_en text,
  country_code text,
  region_code text,
  face_value numeric(20,8),
  face_value_currency text,
  required_fields jsonb not null default '[]'::jsonb,
  instructions_ar text,
  customer_note_ar text,
  active boolean not null default true,
  featured boolean not null default false,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, canonical_key, country_code, region_code)
);

alter table public.store_product_offers
  add column if not exists provider_id uuid references public.providers(id),
  add column if not exists internal_package_id uuid references public.internal_packages(id),
  add column if not exists provider_product_id text,
  add column if not exists provider_variation_id text,
  add column if not exists provider_currency text not null default 'USD',
  add column if not exists provider_status text not null default 'unknown',
  add column if not exists execution_type text,
  add column if not exists estimated_execution_seconds integer,
  add column if not exists is_primary boolean not null default false,
  add column if not exists is_fallback boolean not null default false,
  add column if not exists manual_selling_price_usd numeric(20,8),
  add column if not exists success_rate numeric(7,4),
  add column if not exists last_sync_at timestamptz;

update public.store_product_offers offer
set provider_id = provider.id,
    provider_variation_id = coalesce(offer.provider_variation_id, offer.provider_offer_id),
    provider_currency = coalesce(nullif(offer.provider_currency, ''), 'USD'),
    last_sync_at = coalesce(offer.last_sync_at, offer.updated_at)
from public.providers provider
where provider.code = offer.provider_name
  and offer.provider_id is null;

-- Safe compatibility backfill: every existing provider offer starts as its own
-- package. Admin mapping can merge equivalent packages later without changing
-- the trusted store_product_offers.id used by checkout.
insert into public.internal_packages (
  product_id, canonical_key, name_ar, name_en, required_fields,
  instructions_ar, customer_note_ar, active, sort_order, metadata
)
select
  offer.product_id,
  'legacy:' || offer.id::text,
  offer.name_ar,
  offer.name_en,
  offer.required_fields,
  offer.instructions_ar,
  offer.customer_note_ar,
  offer.active,
  offer.sort_order,
  jsonb_build_object('backfilled_from_store_offer_id', offer.id)
from public.store_product_offers offer
where offer.internal_package_id is null
on conflict do nothing;

update public.store_product_offers offer
set internal_package_id = package.id
from public.internal_packages package
where package.product_id = offer.product_id
  and package.canonical_key = 'legacy:' || offer.id::text
  and offer.internal_package_id is null;

create table if not exists public.provider_product_mappings (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  internal_product_id uuid not null references public.store_products(id) on delete cascade,
  provider_product_id text not null,
  provider_name_snapshot text not null,
  catalog_type text not null check (catalog_type in ('topup','gift_card')),
  country_code text,
  region_code text,
  required_fields jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  is_primary boolean not null default false,
  is_fallback boolean not null default false,
  raw_data jsonb not null default '{}'::jsonb,
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider_id, provider_product_id, catalog_type)
);

create table if not exists public.provider_variations (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  product_mapping_id uuid references public.provider_product_mappings(id) on delete set null,
  internal_package_id uuid not null references public.internal_packages(id) on delete cascade,
  store_product_offer_id uuid unique references public.store_product_offers(id) on delete set null,
  provider_product_id text not null,
  provider_variation_id text not null,
  provider_name_snapshot text not null,
  provider_cost numeric(20,8) not null check (provider_cost >= 0),
  provider_currency text not null default 'USD',
  stock integer check (stock is null or stock >= 0),
  status text not null default 'unknown' check (status in ('available','out_of_stock','disabled','unknown')),
  required_fields jsonb not null default '[]'::jsonb,
  execution_type text,
  estimated_execution_seconds integer check (estimated_execution_seconds is null or estimated_execution_seconds >= 0),
  success_rate numeric(7,4),
  active boolean not null default true,
  is_primary boolean not null default false,
  is_fallback boolean not null default false,
  raw_data jsonb not null default '{}'::jsonb,
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider_id, provider_product_id, provider_variation_id)
);

insert into public.provider_variations (
  provider_id, internal_package_id, store_product_offer_id,
  provider_product_id, provider_variation_id, provider_name_snapshot,
  provider_cost, provider_currency, stock, status, required_fields,
  execution_type, estimated_execution_seconds, success_rate, active,
  is_primary, is_fallback, raw_data, last_sync_at
)
select
  offer.provider_id,
  offer.internal_package_id,
  offer.id,
  coalesce(nullif(offer.provider_product_id, ''), nullif(product.supplier_product_id, ''), product.provider_data ->> 'provider_category_id', ''),
  coalesce(nullif(offer.provider_variation_id, ''), offer.provider_offer_id),
  offer.provider_name,
  offer.supplier_price_usd,
  offer.provider_currency,
  offer.stock,
  case when offer.active and offer.available and coalesce(offer.stock, 1) > 0 then 'available' else 'disabled' end,
  offer.required_fields,
  offer.execution_type,
  offer.estimated_execution_seconds,
  offer.success_rate,
  offer.active,
  offer.is_primary,
  offer.is_fallback,
  offer.provider_data,
  coalesce(offer.last_sync_at, offer.updated_at)
from public.store_product_offers offer
join public.store_products product on product.id = offer.product_id
where offer.provider_id is not null
  and offer.internal_package_id is not null
  and coalesce(nullif(offer.provider_product_id, ''), nullif(product.supplier_product_id, ''), product.provider_data ->> 'provider_category_id') is not null
on conflict (store_product_offer_id) do nothing;

create table if not exists public.provider_pricing_rules (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('global','category','product','provider','variation')),
  provider_id uuid references public.providers(id) on delete cascade,
  category_id uuid references public.store_categories(id) on delete cascade,
  product_id uuid references public.store_products(id) on delete cascade,
  provider_variation_id uuid references public.provider_variations(id) on delete cascade,
  mode text not null check (mode in ('fixed_usd','percentage','manual')),
  fixed_profit_usd numeric(20,8),
  markup_percentage numeric(12,6),
  manual_selling_price_usd numeric(20,8),
  priority integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (manual_selling_price_usd is null or manual_selling_price_usd >= 0)
);

alter table public.product_order_items
  add column if not exists internal_package_id uuid references public.internal_packages(id),
  add column if not exists provider_id uuid references public.providers(id),
  add column if not exists provider_code text,
  add column if not exists provider_name text,
  add column if not exists provider_product_id text,
  add column if not exists provider_variation_id text,
  add column if not exists provider_cost_usd numeric(20,8),
  add column if not exists selling_price_usd numeric(20,8),
  add column if not exists customer_paid_usd numeric(20,8),
  add column if not exists required_fields_snapshot jsonb not null default '[]'::jsonb,
  add column if not exists currency_snapshot text not null default 'USD';

alter table public.product_supplier_jobs
  add column if not exists provider_id uuid references public.providers(id),
  add column if not exists provider_code text,
  add column if not exists provider_variation_row_id uuid references public.provider_variations(id),
  add column if not exists idempotency_key text,
  add column if not exists delivery_state text not null default 'not_sent';

create unique index if not exists product_supplier_jobs_idempotency_key_uidx
  on public.product_supplier_jobs(idempotency_key)
  where idempotency_key is not null;
create index if not exists store_product_offers_package_idx on public.store_product_offers(internal_package_id);
create index if not exists store_product_offers_provider_idx on public.store_product_offers(provider_id);
create index if not exists provider_variations_package_idx on public.provider_variations(internal_package_id, active, status);
create index if not exists provider_product_mappings_product_idx on public.provider_product_mappings(internal_product_id, provider_id);

alter table public.providers enable row level security;
alter table public.internal_packages enable row level security;
alter table public.provider_product_mappings enable row level security;
alter table public.provider_variations enable row level security;
alter table public.provider_pricing_rules enable row level security;

drop policy if exists providers_public_read on public.providers;
create policy providers_public_read on public.providers for select to authenticated
using (active = true);
drop policy if exists internal_packages_public_read on public.internal_packages;
create policy internal_packages_public_read on public.internal_packages for select to anon, authenticated
using (active = true);
drop policy if exists provider_variations_public_read on public.provider_variations;
create policy provider_variations_public_read on public.provider_variations for select to anon, authenticated
using (active = true);

-- Existing admin/service-role code continues to manage these tables. No secret
-- value is stored in any public table created by this migration.

notify pgrst, 'reload schema';
commit;
