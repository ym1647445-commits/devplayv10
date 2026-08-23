-- DevPlay operational policy: rewards paused and deposits credited without fees.
-- Safe to run after docs/create_deposit_request_net_amount.sql.

alter table public.platform_settings
  add column if not exists rewards_enabled boolean not null default false;

update public.platform_settings
set rewards_enabled = false,
    egp_deposit_fee_per_1000 = 0,
    egp_deposit_minimum_fee = 0,
    usd_deposit_fixed_fee = 0,
    updated_at = now()
where id = 1;

create or replace function public.create_deposit_request_v2(
  p_payment_method_id text,
  p_requested_amount numeric,
  p_sender_account text default null,
  p_transaction_reference text default null,
  p_proof_path text default null,
  p_customer_note text default null
)
returns public.deposit_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_method public.payment_methods;
  v_settings public.platform_settings;
  v_request public.deposit_requests;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_requested_amount is null or p_requested_amount <= 0 then raise exception 'Invalid deposit amount'; end if;

  select * into v_method from public.payment_methods
  where id = p_payment_method_id and enabled = true;
  if not found then raise exception 'Payment method is unavailable'; end if;
  if p_requested_amount < v_method.minimum_amount then raise exception 'Amount is below the payment method minimum'; end if;

  select * into v_settings from public.platform_settings where id = 1;
  if not found or v_settings.usd_to_egp_rate <= 0 then raise exception 'Platform exchange rate is unavailable'; end if;

  if exists (
    select 1 from public.deposit_requests
    where user_id = v_user_id and created_at > now() - interval '30 minutes'
      and status in ('pending','under_review')
  ) then raise exception 'Please wait 30 minutes before creating another deposit request'; end if;

  insert into public.deposit_requests (
    user_id, payment_method_id, status, requested_amount, requested_currency,
    fee_amount, total_to_transfer, credit_usd, exchange_rate,
    sender_account, transaction_reference, proof_path, customer_note
  ) values (
    v_user_id, v_method.id, 'pending', round(p_requested_amount, 8), v_method.currency,
    0, round(p_requested_amount, 8),
    case when v_method.currency = 'EGP'
      then round(p_requested_amount / v_settings.usd_to_egp_rate, 8)
      else round(p_requested_amount, 8) end,
    v_settings.usd_to_egp_rate,
    nullif(trim(p_sender_account), ''), nullif(trim(p_transaction_reference), ''),
    nullif(trim(p_proof_path), ''), nullif(trim(p_customer_note), '')
  ) returning * into v_request;

  return v_request;
end;
$$;

revoke all on function public.create_deposit_request_v2(text,numeric,text,text,text,text) from public;
grant execute on function public.create_deposit_request_v2(text,numeric,text,text,text,text) to authenticated;

