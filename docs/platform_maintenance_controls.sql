begin;

alter table public.platform_settings add column if not exists maintenance_mode boolean not null default false;
alter table public.platform_settings add column if not exists orders_enabled boolean not null default true;
alter table public.platform_settings add column if not exists deposits_enabled boolean not null default true;
alter table public.platform_settings add column if not exists wallet_transfers_enabled boolean not null default true;
alter table public.platform_settings add column if not exists supplier_dispatch_enabled boolean not null default true;
alter table public.platform_settings add column if not exists maintenance_message text not null default 'نُجري حاليًا تحسينات مهمة على DevPlay. سنعود للعمل قريبًا.';
alter table public.platform_settings add column if not exists maintenance_title text not null default 'DevPlay تحت التحديث حاليًا';
alter table public.platform_settings add column if not exists expected_return_at timestamptz;
alter table public.platform_settings add column if not exists support_telegram_url text not null default 'https://t.me/DevPlaySupport';
alter table public.platform_settings add column if not exists support_whatsapp_url text not null default 'https://wa.me/201035966569';
alter table public.platform_settings add column if not exists wallet_operations_enabled boolean not null default true;

update public.platform_settings
set maintenance_message = coalesce(nullif(trim(maintenance_message), ''), 'نُجري حاليًا تحسينات مهمة على DevPlay. سنعود للعمل قريبًا.')
where id = 1;

create or replace function public.guard_customer_platform_operations()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_settings public.platform_settings;
  v_is_admin boolean := false;
begin
  select exists(
    select 1 from public.profiles
    where id = auth.uid() and status::text = 'active'
      and role::text in ('admin','super_admin','owner')
  ) into v_is_admin;
  if v_is_admin then return new; end if;

  select * into v_settings from public.platform_settings where id = 1;
  if not found then raise exception 'Platform settings are missing'; end if;
  if v_settings.maintenance_mode then raise exception 'PLATFORM_MAINTENANCE'; end if;
  if tg_table_name = 'product_orders' and not v_settings.orders_enabled then raise exception 'ORDERS_PAUSED'; end if;
  if tg_table_name = 'deposit_requests' and (not v_settings.wallet_operations_enabled or not v_settings.deposits_enabled) then raise exception 'DEPOSITS_PAUSED'; end if;
  if tg_table_name = 'customer_wallet_transfers' and (not v_settings.wallet_operations_enabled or not v_settings.wallet_transfers_enabled) then raise exception 'WALLET_TRANSFERS_PAUSED'; end if;
  return new;
end;
$function$;

drop trigger if exists guard_product_orders_platform_state on public.product_orders;
create trigger guard_product_orders_platform_state before insert on public.product_orders for each row execute function public.guard_customer_platform_operations();
drop trigger if exists guard_deposit_requests_platform_state on public.deposit_requests;
create trigger guard_deposit_requests_platform_state before insert on public.deposit_requests for each row execute function public.guard_customer_platform_operations();
drop trigger if exists guard_wallet_transfers_platform_state on public.customer_wallet_transfers;
create trigger guard_wallet_transfers_platform_state before insert on public.customer_wallet_transfers for each row execute function public.guard_customer_platform_operations();


create or replace function public.admin_update_platform_availability(
  p_maintenance_mode boolean,
  p_orders_enabled boolean,
  p_deposits_enabled boolean,
  p_wallet_transfers_enabled boolean,
  p_supplier_dispatch_enabled boolean,
  p_maintenance_message text
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_admin public.profiles;
  v_before jsonb;
  v_after jsonb;
  v_message text := left(coalesce(nullif(trim(p_maintenance_message), ''), 'نُجري حاليًا تحسينات مهمة على DevPlay. سنعود للعمل قريبًا.'), 500);
begin
  select * into v_admin from public.profiles
  where id = auth.uid() and status::text = 'active'
    and role::text in ('admin','super_admin','owner');
  if not found then raise exception 'Admin permission required'; end if;

  select to_jsonb(settings) into v_before
  from public.platform_settings settings where id = 1 for update;
  if v_before is null then raise exception 'Platform settings are missing'; end if;

  update public.platform_settings as settings set
    maintenance_mode = p_maintenance_mode,
    orders_enabled = p_orders_enabled,
    deposits_enabled = p_deposits_enabled,
    wallet_transfers_enabled = p_wallet_transfers_enabled,
    supplier_dispatch_enabled = p_supplier_dispatch_enabled,
    maintenance_message = v_message,
    updated_at = now()
  where id = 1
  returning to_jsonb(settings) into v_after;

  insert into public.activity_logs(
    user_id, actor_id, action, entity_type, entity_id,
    description, old_data, new_data
  ) values (
    v_admin.id, v_admin.id, 'platform_maintenance_settings_updated',
    'platform_settings', null,
    'Admin updated platform maintenance and operation availability',
    v_before, v_after
  );
end;
$function$;

revoke all on function public.admin_update_platform_availability(boolean,boolean,boolean,boolean,boolean,text) from public;
grant execute on function public.admin_update_platform_availability(boolean,boolean,boolean,boolean,boolean,text) to authenticated;

create or replace function public.admin_update_platform_availability_v2(
  p_maintenance_mode boolean, p_orders_enabled boolean, p_deposits_enabled boolean,
  p_wallet_transfers_enabled boolean, p_wallet_operations_enabled boolean, p_supplier_dispatch_enabled boolean,
  p_maintenance_title text, p_maintenance_message text, p_expected_return_at timestamptz,
  p_support_telegram_url text, p_support_whatsapp_url text
) returns void language plpgsql security definer set search_path = '' as $function$
declare v_admin public.profiles;v_before jsonb;v_after jsonb;
begin
  select * into v_admin from public.profiles where id=auth.uid() and status::text='active' and role::text in('admin','super_admin','owner');
  if not found then raise exception 'Admin permission required';end if;
  select to_jsonb(settings) into v_before from public.platform_settings settings where id=1 for update;
  if v_before is null then raise exception 'Platform settings are missing';end if;
  update public.platform_settings as settings set maintenance_mode=p_maintenance_mode,orders_enabled=p_orders_enabled,deposits_enabled=p_deposits_enabled,wallet_transfers_enabled=p_wallet_transfers_enabled,wallet_operations_enabled=p_wallet_operations_enabled,supplier_dispatch_enabled=p_supplier_dispatch_enabled,maintenance_title=left(coalesce(nullif(trim(p_maintenance_title),''),'DevPlay تحت التحديث حاليًا'),120),maintenance_message=left(coalesce(nullif(trim(p_maintenance_message),''),'نُجري حاليًا تحسينات مهمة على DevPlay. سنعود للعمل قريبًا.'),500),expected_return_at=p_expected_return_at,support_telegram_url=left(coalesce(nullif(trim(p_support_telegram_url),''),'https://t.me/DevPlaySupport'),300),support_whatsapp_url=left(coalesce(nullif(trim(p_support_whatsapp_url),''),'https://wa.me/201035966569'),300),updated_at=now() where id=1 returning to_jsonb(settings) into v_after;
  insert into public.activity_logs(user_id,actor_id,action,entity_type,entity_id,description,old_data,new_data) values(v_admin.id,v_admin.id,'platform_maintenance_settings_updated','platform_settings',null,'Admin updated platform maintenance and operation availability',v_before,v_after);
end;$function$;
revoke all on function public.admin_update_platform_availability_v2(boolean,boolean,boolean,boolean,boolean,boolean,text,text,timestamptz,text,text) from public;
grant execute on function public.admin_update_platform_availability_v2(boolean,boolean,boolean,boolean,boolean,boolean,text,text,timestamptz,text,text) to authenticated;

commit;
