begin;

create or replace function public.admin_adjust_customer_wallet(
  p_user_id uuid,
  p_direction text,
  p_amount_usd numeric,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_admin_id uuid := auth.uid();
  v_admin public.profiles;
  v_customer public.profiles;
  v_wallet public.account_wallets;
  v_settings public.platform_settings;
  v_before numeric(20,8);
  v_after numeric(20,8);
  v_reason text := nullif(trim(p_reason), '');
  v_transaction_id uuid;
begin
  if v_admin_id is null then raise exception 'Authentication required'; end if;

  select * into v_admin from public.profiles where id = v_admin_id;
  if not found or v_admin.status <> 'active'
     or v_admin.role::text not in ('admin','super_admin','owner') then
    raise exception 'Admin permission required';
  end if;

  select * into v_customer from public.profiles where id = p_user_id;
  if not found or v_customer.role::text <> 'customer' then
    raise exception 'Customer profile not found';
  end if;

  if p_direction not in ('credit','debit') then raise exception 'Invalid wallet direction'; end if;
  if p_amount_usd is null or p_amount_usd <= 0 or p_amount_usd > 100000 then raise exception 'Invalid wallet amount'; end if;
  if v_reason is null or length(v_reason) < 3 then raise exception 'Adjustment reason is required'; end if;

  select * into v_settings from public.platform_settings where id = 1;
  if not found then raise exception 'Platform settings are missing'; end if;

  select * into v_wallet from public.account_wallets where user_id = p_user_id for update;
  if not found then raise exception 'Customer wallet not found'; end if;

  v_before := v_wallet.balance_usd;
  if p_direction = 'debit' and v_before < p_amount_usd then
    raise exception 'Insufficient customer wallet balance';
  end if;
  v_after := round(case when p_direction = 'credit' then v_before + p_amount_usd else v_before - p_amount_usd end, 8);

  update public.account_wallets set balance_usd = v_after, updated_at = now() where id = v_wallet.id;

  insert into public.account_wallet_transactions (
    user_id, wallet_id, type, amount_usd, balance_before_usd, balance_after_usd,
    exchange_rate, amount_egp_snapshot, reference_type, description, created_by
  ) values (
    p_user_id, v_wallet.id, 'adjustment', p_amount_usd, v_before, v_after,
    v_settings.usd_to_egp_rate, round(p_amount_usd * v_settings.usd_to_egp_rate, 2),
    'admin_adjustment', v_reason, v_admin_id
  ) returning id into v_transaction_id;

  insert into public.activity_logs (
    user_id, actor_id, action, entity_type, entity_id, description, old_data, new_data
  ) values (
    p_user_id, v_admin_id,
    case when p_direction = 'credit' then 'admin_wallet_credit' else 'admin_wallet_debit' end,
    'account_wallet_transaction', v_transaction_id,
    v_reason,
    jsonb_build_object('balance_usd', v_before),
    jsonb_build_object('balance_usd', v_after, 'amount_usd', p_amount_usd, 'direction', p_direction)
  );

  insert into public.notifications (user_id, type, title, message, entity_type, entity_id, action_url)
  values (
    p_user_id, 'wallet_adjustment',
    case when p_direction = 'credit' then 'تمت إضافة رصيد إلى محفظتك' else 'تم تعديل رصيد محفظتك' end,
    format('%s — القيمة: %s دولار', v_reason, trim(to_char(p_amount_usd, 'FM9999999990.0000'))),
    'account_wallet_transaction', v_transaction_id, '/wallet/transactions'
  );

  return jsonb_build_object(
    'transaction_id', v_transaction_id,
    'balance_before_usd', v_before,
    'balance_after_usd', v_after,
    'direction', p_direction,
    'amount_usd', p_amount_usd
  );
end;
$function$;

revoke all on function public.admin_adjust_customer_wallet(uuid,text,numeric,text) from public;
grant execute on function public.admin_adjust_customer_wallet(uuid,text,numeric,text) to authenticated;

commit;
