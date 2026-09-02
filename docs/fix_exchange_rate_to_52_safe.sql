begin;

create or replace function public.preserve_wallet_egp_value_on_rate_change()
returns trigger language plpgsql security definer set search_path = '' as $function$
declare v_actor uuid := auth.uid();
begin
  if new.id = 1 and new.usd_to_egp_rate is distinct from old.usd_to_egp_rate then
    if old.usd_to_egp_rate is null or old.usd_to_egp_rate <= 0 or new.usd_to_egp_rate is null or new.usd_to_egp_rate <= 0 then
      raise exception 'USD to EGP rate must be greater than zero';
    end if;
    update public.account_wallets
    set balance_usd=round(balance_usd*old.usd_to_egp_rate/new.usd_to_egp_rate,8),
        frozen_balance_usd=round(frozen_balance_usd*old.usd_to_egp_rate/new.usd_to_egp_rate,8),updated_at=now()
    where user_id is not null;
    insert into public.activity_logs(actor_id,action,entity_type,description,old_data,new_data)
    values(v_actor,'wallets_rebased_for_exchange_rate','platform_settings','Preserved every customer wallet EGP value while changing the store exchange rate',jsonb_build_object('usd_to_egp_rate',old.usd_to_egp_rate),jsonb_build_object('usd_to_egp_rate',new.usd_to_egp_rate));
  end if;
  return new;
end;$function$;

update public.platform_settings set usd_to_egp_rate=52,pricing_updated_at=now(),updated_at=now() where id=1;

update public.store_product_offers as offer
set profit_usd=round(case when settings.api_pricing_mode='percentage' then offer.supplier_price_usd*(settings.default_markup_percentage/100) when settings.api_pricing_mode='manual' then offer.profit_usd else offer.supplier_price_usd*settings.profit_per_usd_egp/settings.usd_to_egp_rate end,8),updated_at=now()
from public.platform_settings as settings
where settings.id=1 and offer.provider_name is not null;

insert into public.activity_logs(actor_id,action,entity_type,description,new_data)
select auth.uid(),'platform_exchange_rate_corrected','platform_settings','Set USD to EGP rate to actual cost basis 52 and repriced provider offers while preserving manual overrides',jsonb_build_object('usd_to_egp_rate',settings.usd_to_egp_rate,'profit_per_usd_egp',settings.profit_per_usd_egp,'pricing_mode',settings.api_pricing_mode,'manual_overrides_preserved',true)
from public.platform_settings as settings where settings.id=1;

notify pgrst,'reload schema';
commit;