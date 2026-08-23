begin;

-- Runs inside create_product_order's transaction. Any invalid provider choice
-- raises and rolls back the order, wallet debit, coupon usage and notifications.
create or replace function public.snapshot_multi_provider_order_item()
returns trigger language plpgsql security definer set search_path='' as $function$
declare
  v_offer public.store_product_offers;
  v_provider public.providers;
  v_package public.internal_packages;
begin
  if new.offer_id is null then raise exception 'Offer is required'; end if;
  select * into v_offer from public.store_product_offers where id=new.offer_id for share;
  if not found or v_offer.product_id<>new.product_id then raise exception 'Offer does not belong to product'; end if;
  if not v_offer.active or not v_offer.available or coalesce(v_offer.stock,1)<=0 then raise exception 'Offer is unavailable'; end if;
  if v_offer.provider_id is null or v_offer.internal_package_id is null then raise exception 'Offer provider mapping is incomplete'; end if;
  select * into v_provider from public.providers where id=v_offer.provider_id for share;
  if not found or not v_provider.active or v_provider.status in ('offline') then raise exception 'Provider is unavailable'; end if;
  if v_provider.current_balance is not null and v_provider.balance_currency='USD' and v_provider.current_balance<v_offer.supplier_price_usd then raise exception 'Provider balance is insufficient'; end if;
  select * into v_package from public.internal_packages where id=v_offer.internal_package_id and active=true;
  if not found then raise exception 'Internal package is unavailable'; end if;
  if new.unit_price_usd<v_offer.supplier_price_usd then raise exception 'Selling price cannot be below provider cost'; end if;

  new.internal_package_id:=v_package.id;
  new.provider_id:=v_provider.id;
  new.provider_code:=v_provider.code;
  new.provider_name:=v_provider.name;
  new.provider_product_id:=coalesce(v_offer.provider_product_id,new.supplier_product_id);
  new.provider_variation_id:=coalesce(v_offer.provider_variation_id,v_offer.provider_offer_id);
  new.provider_cost_usd:=v_offer.supplier_price_usd;
  new.selling_price_usd:=new.unit_price_usd;
  new.customer_paid_usd:=new.total_price_usd;
  new.required_fields_snapshot:=coalesce(nullif(v_offer.required_fields,'[]'::jsonb),v_package.required_fields,'[]'::jsonb);
  new.currency_snapshot:='USD';
  new.offer_name:=coalesce(new.offer_name,v_package.name_ar,v_offer.name_ar);
  return new;
end;$function$;

drop trigger if exists product_order_items_multi_provider_snapshot on public.product_order_items;
create trigger product_order_items_multi_provider_snapshot before insert on public.product_order_items
for each row execute function public.snapshot_multi_provider_order_item();

create or replace function public.snapshot_multi_provider_supplier_job()
returns trigger language plpgsql security definer set search_path='' as $function$
declare v_item public.product_order_items; v_variation public.provider_variations;
begin
  select * into v_item from public.product_order_items where id=new.order_item_id;
  if not found then raise exception 'Order item is missing'; end if;
  select * into v_variation from public.provider_variations where store_product_offer_id=new.offer_id and active=true;
  new.provider_id:=v_item.provider_id;
  new.provider_code:=v_item.provider_code;
  new.provider_variation_row_id:=v_variation.id;
  new.provider_offer_id:=v_item.provider_variation_id;
  new.supplier_product_id:=v_item.provider_product_id;
  new.idempotency_key:=coalesce(new.idempotency_key,new.order_id::text||':'||new.order_item_id::text||':'||new.unit_number::text);
  new.delivery_state:='not_sent';
  return new;
end;$function$;

drop trigger if exists product_supplier_jobs_multi_provider_snapshot on public.product_supplier_jobs;
create trigger product_supplier_jobs_multi_provider_snapshot before insert on public.product_supplier_jobs
for each row execute function public.snapshot_multi_provider_supplier_job();

create or replace view public.available_internal_package_providers as
select p.id as product_id,p.slug,p.name_ar as product_name,ip.id as internal_package_id,
 ip.name_ar as package_name,ip.country_code,ip.region_code,o.id as offer_id,
 pr.id as provider_id,pr.code as provider_code,
 case when pr.expose_name_to_customers then pr.name else 'DevPlay Provider' end as provider_display_name,
 o.supplier_price_usd as provider_cost_usd,
 coalesce(o.manual_selling_price_usd,o.supplier_price_usd+o.profit_usd) as selling_price_usd,
 o.stock,o.execution_type,o.estimated_execution_seconds,o.success_rate,pr.priority,
 (p.active and ip.active and o.active and o.available and pr.active and pr.status<>'offline'
  and coalesce(o.stock,1)>0 and (pr.current_balance is null or pr.balance_currency<>'USD' or pr.current_balance>=o.supplier_price_usd)) as available,
 case when not pr.active or pr.status='offline' then 'المورد غير متاح حاليًا'
      when not o.active or not o.available or coalesce(o.stock,1)<=0 then 'غير متوفر حاليًا'
      when pr.current_balance is not null and pr.balance_currency='USD' and pr.current_balance<o.supplier_price_usd then 'رصيد المورد غير كافٍ'
      else null end as unavailable_reason
from public.store_products p join public.internal_packages ip on ip.product_id=p.id
join public.store_product_offers o on o.internal_package_id=ip.id
join public.providers pr on pr.id=o.provider_id;

grant select on public.available_internal_package_providers to anon,authenticated;
notify pgrst,'reload schema';
commit;
