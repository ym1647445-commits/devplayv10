begin;

create or replace function public.activate_item4gamer_parent_product()
returns trigger language plpgsql security definer set search_path='' as $function$
declare
  v_product_data jsonb;
begin
  if new.provider_name <> 'item4gamer' or not new.active or not new.available then
    return new;
  end if;

  select coalesce(provider_data,'{}'::jsonb)
  into v_product_data
  from public.store_products
  where id=new.product_id;

  update public.store_products
  set active=true,
      status='available',
      supplier_product_id=coalesce(nullif(new.provider_product_id,''),supplier_product_id),
      provider_data=v_product_data || jsonb_build_object(
        'provider','item4gamer',
        'provider_product_id',coalesce(nullif(new.provider_product_id,''),new.product_id::text),
        'provider_category_id',coalesce(nullif(new.provider_product_id,''),new.product_id::text),
        'catalog_type',coalesce(new.provider_data->>'catalog_type','topup'),
        'product_type','provider_group'
      ),
      updated_at=now()
  where id=new.product_id
    and (not active or status='unavailable' or coalesce(provider_data->>'provider','')<>'item4gamer');

  return new;
end;
$function$;

drop trigger if exists item4gamer_activate_parent_product on public.store_product_offers;
create trigger item4gamer_activate_parent_product
after insert or update of active,available,provider_product_id
on public.store_product_offers
for each row when (new.provider_name='item4gamer')
execute function public.activate_item4gamer_parent_product();

commit;
