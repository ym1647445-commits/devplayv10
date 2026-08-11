begin;

create or replace function public.admin_reprice_provider_offers()
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_actor uuid:=auth.uid();
  v_role text;
  v_settings public.platform_settings;
  v_count integer:=0;
begin
  select * into v_settings from public.platform_settings where id=1;
  if not found then raise exception 'Platform settings are missing'; end if;

  -- Allows the migration itself to perform the initial correction.
  if v_actor is not null then
    select role::text into v_role from public.profiles where id=v_actor;
    if v_role not in ('admin','super_admin','owner') then raise exception 'Admin permission required'; end if;
  end if;

  if v_settings.api_pricing_mode='manual' then return 0; end if;

  update public.store_product_offers
  set profit_usd=round(
    case
      when v_settings.api_pricing_mode='percentage'
        then supplier_price_usd*(v_settings.default_markup_percentage/100)
      else supplier_price_usd*v_settings.profit_per_usd_egp/v_settings.usd_to_egp_rate
    end,
    8
  ),updated_at=now()
  where provider_name is not null;

  get diagnostics v_count=row_count;
  if v_actor is not null then
    insert into public.activity_logs(actor_id,action,entity_type,description,new_data)
    values(v_actor,'provider_offers_bulk_repriced','store_product_offer',format('Repriced %s provider offers',v_count),jsonb_build_object('pricing_mode',v_settings.api_pricing_mode,'profit_per_usd_egp',v_settings.profit_per_usd_egp,'usd_to_egp_rate',v_settings.usd_to_egp_rate,'offers_count',v_count));
  end if;
  return v_count;
end
$function$;

revoke all on function public.admin_reprice_provider_offers() from public;
grant execute on function public.admin_reprice_provider_offers() to authenticated;

-- Correct currently imported offers immediately using the saved settings.
do $migration$
declare v_settings public.platform_settings;
begin
  select * into v_settings from public.platform_settings where id=1;
  if found and v_settings.api_pricing_mode<>'manual' then
    update public.store_product_offers
    set profit_usd=round(case when v_settings.api_pricing_mode='percentage' then supplier_price_usd*(v_settings.default_markup_percentage/100) else supplier_price_usd*v_settings.profit_per_usd_egp/v_settings.usd_to_egp_rate end,8),updated_at=now()
    where provider_name is not null;
  end if;
end
$migration$;

notify pgrst, 'reload schema';
commit;
