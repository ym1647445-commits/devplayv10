begin;

create or replace function public.map_item4gamer_store_offer()
returns trigger language plpgsql security definer set search_path='' as $function$
declare
  v_provider public.providers;
  v_package_id uuid;
begin
  if new.provider_name <> 'item4gamer' then return new; end if;
  select * into v_provider from public.providers where code='item4gamer';
  if not found then raise exception 'Item4Gamer provider configuration is missing'; end if;

  v_package_id := new.internal_package_id;
  if v_package_id is null then
    insert into public.internal_packages (
      product_id, canonical_key, name_ar, name_en, required_fields,
      instructions_ar, customer_note_ar, active, sort_order, metadata
    ) values (
      new.product_id, 'item4gamer:' || coalesce(new.provider_variation_id,new.provider_offer_id),
      new.name_ar, new.name_en, coalesce(new.required_fields,'[]'::jsonb),
      new.instructions_ar, new.customer_note_ar, new.active, new.sort_order,
      jsonb_build_object('provider','item4gamer','provider_variation_id',coalesce(new.provider_variation_id,new.provider_offer_id))
    ) returning id into v_package_id;

    update public.store_product_offers set
      provider_id=v_provider.id,
      internal_package_id=v_package_id,
      provider_product_id=coalesce(nullif(new.provider_product_id,''),new.product_id::text),
      provider_variation_id=coalesce(nullif(new.provider_variation_id,''),new.provider_offer_id),
      provider_currency=coalesce(nullif(new.provider_currency,''),'USD'),
      last_sync_at=coalesce(new.last_sync_at,now())
    where id=new.id;
  end if;

  insert into public.provider_variations (
    provider_id, internal_package_id, store_product_offer_id,
    provider_product_id, provider_variation_id, provider_name_snapshot,
    provider_cost, provider_currency, stock, status, required_fields,
    execution_type, active, raw_data, last_sync_at
  ) values (
    v_provider.id, v_package_id, new.id,
    coalesce(nullif(new.provider_product_id,''),new.product_id::text),
    coalesce(nullif(new.provider_variation_id,''),new.provider_offer_id),
    v_provider.name, new.supplier_price_usd, coalesce(nullif(new.provider_currency,''),'USD'),
    new.stock,
    case when new.active and new.available and coalesce(new.stock,1)>0 then 'available' else 'disabled' end,
    coalesce(new.required_fields,'[]'::jsonb), new.execution_type, new.active,
    coalesce(new.provider_data,'{}'::jsonb), coalesce(new.last_sync_at,now())
  ) on conflict (store_product_offer_id) do update set
    provider_cost=excluded.provider_cost,
    provider_currency=excluded.provider_currency,
    stock=excluded.stock,
    status=excluded.status,
    required_fields=excluded.required_fields,
    execution_type=excluded.execution_type,
    active=excluded.active,
    raw_data=excluded.raw_data,
    last_sync_at=excluded.last_sync_at,
    updated_at=now();
  return new;
end;
$function$;

drop trigger if exists item4gamer_store_offer_mapping on public.store_product_offers;
create trigger item4gamer_store_offer_mapping
after insert or update of provider_id,provider_product_id,provider_variation_id,required_fields,supplier_price_usd,available,active
on public.store_product_offers
for each row when (new.provider_name = 'item4gamer')
execute function public.map_item4gamer_store_offer();

notify pgrst, 'reload schema';
commit;
