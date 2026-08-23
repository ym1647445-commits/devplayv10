-- Disable the legacy redemption steps, redemption links, and assisted
-- execution request feature. Customers can use the normal Support page.
-- Safe to run more than once.

create or replace function public.remove_legacy_redemption_keys(p_data jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(p_data, '{}'::jsonb)
    - 'redemption_mode'
    - 'redemption_steps'
    - 'redemption_url'
    - 'redemption_assisted_enabled'
    - 'redemption_account_label'
    - 'redemption_account_placeholder'
    - 'redemption_instructions_ar';
$$;

create or replace function public.disable_legacy_product_redemption()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.provider_data := public.remove_legacy_redemption_keys(new.provider_data);
  return new;
end;
$$;

drop trigger if exists disable_legacy_product_redemption_trigger
  on public.store_products;

create trigger disable_legacy_product_redemption_trigger
before insert or update of provider_data
on public.store_products
for each row
execute function public.disable_legacy_product_redemption();

update public.store_products
set
  provider_data = public.remove_legacy_redemption_keys(provider_data),
  updated_at = now()
where provider_data ?| array[
  'redemption_mode',
  'redemption_steps',
  'redemption_url',
  'redemption_assisted_enabled',
  'redemption_account_label',
  'redemption_account_placeholder',
  'redemption_instructions_ar'
];

notify pgrst, 'reload schema';

