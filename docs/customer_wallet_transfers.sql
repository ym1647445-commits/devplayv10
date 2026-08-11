begin;

create table if not exists public.customer_wallet_transfers (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id),
  recipient_id uuid not null references public.profiles(id),
  amount_usd numeric(20,8) not null check (amount_usd > 0),
  sender_balance_before_usd numeric(20,8) not null,
  sender_balance_after_usd numeric(20,8) not null,
  recipient_balance_before_usd numeric(20,8) not null,
  recipient_balance_after_usd numeric(20,8) not null,
  note text,
  status text not null default 'completed' check (status in ('completed','reversed')),
  created_at timestamptz not null default now(),
  reversed_at timestamptz,
  constraint customer_wallet_transfers_different_users check (sender_id <> recipient_id)
);

create index if not exists customer_wallet_transfers_sender_created_idx
  on public.customer_wallet_transfers(sender_id, created_at desc);
create index if not exists customer_wallet_transfers_recipient_created_idx
  on public.customer_wallet_transfers(recipient_id, created_at desc);

alter table public.customer_wallet_transfers enable row level security;
drop policy if exists customer_transfers_select_participant on public.customer_wallet_transfers;
create policy customer_transfers_select_participant on public.customer_wallet_transfers
for select to authenticated using (auth.uid() in (sender_id, recipient_id));

create or replace function public.transfer_customer_wallet_balance(
  p_recipient_customer_id text,
  p_amount_usd numeric,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_sender_id uuid := auth.uid();
  v_recipient public.profiles;
  v_sender_wallet public.account_wallets;
  v_recipient_wallet public.account_wallets;
  v_settings public.platform_settings;
  v_amount numeric(20,8);
  v_transfer_id uuid;
  v_note text := nullif(trim(coalesce(p_note, '')), '');
  v_sender_after numeric(20,8);
  v_recipient_after numeric(20,8);
begin
  if v_sender_id is null then raise exception 'Authentication required'; end if;
  v_amount := round(p_amount_usd, 8);
  if v_amount is null or v_amount < 0.10 or v_amount > 1000 then
    raise exception 'Transfer amount must be between 0.10 and 1000 USD';
  end if;
  if v_note is not null and length(v_note) > 200 then raise exception 'Transfer note is too long'; end if;

  select * into v_recipient
  from public.profiles
  where upper(customer_id) = upper(trim(p_recipient_customer_id))
    and role::text = 'customer'
    and status::text = 'active';
  if not found then raise exception 'Recipient customer ID is invalid'; end if;
  if v_recipient.id = v_sender_id then raise exception 'You cannot transfer balance to yourself'; end if;

  perform 1 from public.account_wallets
  where user_id in (v_sender_id, v_recipient.id)
  order by user_id
  for update;

  select * into v_sender_wallet from public.account_wallets where user_id = v_sender_id;
  select * into v_recipient_wallet from public.account_wallets where user_id = v_recipient.id;
  if v_sender_wallet.id is null then raise exception 'Sender wallet not found'; end if;
  if v_recipient_wallet.id is null then raise exception 'Recipient wallet not found'; end if;
  if v_sender_wallet.is_frozen then raise exception 'Your wallet is frozen'; end if;
  if v_recipient_wallet.is_frozen then raise exception 'Recipient wallet is unavailable'; end if;
  if v_sender_wallet.balance_usd < v_amount then raise exception 'Insufficient wallet balance'; end if;

  select * into v_settings from public.platform_settings where id = 1;
  if not found then raise exception 'Platform settings are missing'; end if;
  v_sender_after := round(v_sender_wallet.balance_usd - v_amount, 8);
  v_recipient_after := round(v_recipient_wallet.balance_usd + v_amount, 8);

  insert into public.customer_wallet_transfers (
    sender_id, recipient_id, amount_usd,
    sender_balance_before_usd, sender_balance_after_usd,
    recipient_balance_before_usd, recipient_balance_after_usd, note
  ) values (
    v_sender_id, v_recipient.id, v_amount,
    v_sender_wallet.balance_usd, v_sender_after,
    v_recipient_wallet.balance_usd, v_recipient_after, v_note
  ) returning id into v_transfer_id;

  update public.account_wallets set balance_usd = v_sender_after, updated_at = now() where id = v_sender_wallet.id;
  update public.account_wallets set balance_usd = v_recipient_after, updated_at = now() where id = v_recipient_wallet.id;

  insert into public.account_wallet_transactions (
    user_id, wallet_id, type, amount_usd, balance_before_usd, balance_after_usd,
    exchange_rate, amount_egp_snapshot, reference_type, reference_id, description, created_by
  ) values
  (
    v_sender_id, v_sender_wallet.id, 'adjustment', v_amount,
    v_sender_wallet.balance_usd, v_sender_after, v_settings.usd_to_egp_rate,
    round(v_amount * v_settings.usd_to_egp_rate, 2), 'wallet_transfer_sent', v_transfer_id,
    format('Balance sent to customer %s', v_recipient.customer_id), v_sender_id
  ),
  (
    v_recipient.id, v_recipient_wallet.id, 'adjustment', v_amount,
    v_recipient_wallet.balance_usd, v_recipient_after, v_settings.usd_to_egp_rate,
    round(v_amount * v_settings.usd_to_egp_rate, 2), 'wallet_transfer_received', v_transfer_id,
    'Balance received from another DevPlay customer', v_sender_id
  );

  insert into public.notifications (user_id, type, title, message, entity_type, entity_id, action_url)
  values
  (v_sender_id, 'wallet_transfer_sent', 'تم إرسال الرصيد', format('تم إرسال %s دولار إلى %s.', trim(to_char(v_amount, 'FM9999999990.0000')), v_recipient.customer_id), 'wallet_transfer', v_transfer_id, '/wallet/transactions'),
  (v_recipient.id, 'wallet_transfer_received', 'وصلك رصيد جديد', format('تمت إضافة %s دولار إلى محفظتك من عميل DevPlay.', trim(to_char(v_amount, 'FM9999999990.0000'))), 'wallet_transfer', v_transfer_id, '/wallet/transactions');

  insert into public.activity_logs (user_id, actor_id, action, entity_type, entity_id, description, new_data)
  values (v_sender_id, v_sender_id, 'customer_wallet_transfer', 'wallet_transfer', v_transfer_id, 'Customer transferred wallet balance', jsonb_build_object('recipient_id', v_recipient.id, 'recipient_customer_id', v_recipient.customer_id, 'amount_usd', v_amount));

  return jsonb_build_object(
    'transfer_id', v_transfer_id,
    'amount_usd', v_amount,
    'recipient_customer_id', v_recipient.customer_id,
    'recipient_name', coalesce(v_recipient.full_name, 'DevPlay customer'),
    'balance_after_usd', v_sender_after
  );
end;
$function$;

revoke all on function public.transfer_customer_wallet_balance(text,numeric,text) from public;
grant execute on function public.transfer_customer_wallet_balance(text,numeric,text) to authenticated;

commit;
