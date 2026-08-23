-- Prevent accidental cross-product attachment for Item4Gamer offers.
-- Each store product can only contain variations from its own provider_product_id.

create or replace function public.guard_item4gamer_product_mapping()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expected_product_id text;
begin
  if new.provider_name <> 'item4gamer' then
    return new;
  end if;

  select coalesce(
    provider_data ->> 'provider_product_id',
    provider_data ->> 'provider_category_id',
    supplier_product_id
  )
  into v_expected_product_id
  from public.store_products
  where id = new.product_id;

  if v_expected_product_id is null then
    raise exception 'Item4Gamer store product is missing provider_product_id';
  end if;

  if coalesce(new.provider_product_id, new.provider_data ->> 'provider_product_id')
      is distinct from v_expected_product_id then
    raise exception 'Item4Gamer variation belongs to product %, not %',
      coalesce(new.provider_product_id, new.provider_data ->> 'provider_product_id'),
      v_expected_product_id;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_item4gamer_product_mapping_trigger
  on public.store_product_offers;

create trigger guard_item4gamer_product_mapping_trigger
before insert or update of product_id, provider_product_id, provider_data
on public.store_product_offers
for each row
execute function public.guard_item4gamer_product_mapping();

