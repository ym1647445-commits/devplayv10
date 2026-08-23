begin;

alter table public.platform_settings add column if not exists rewards_enabled boolean not null default false;
update public.platform_settings set rewards_enabled=false,egp_deposit_fee_per_1000=0,egp_deposit_minimum_fee=0,usd_deposit_fixed_fee=0,updated_at=now() where id=1;

create or replace function public.create_deposit_request_v2(p_payment_method_id text,p_requested_amount numeric,p_sender_account text,p_transaction_reference text,p_proof_path text,p_customer_note text default null)
returns public.deposit_requests language plpgsql security definer set search_path to '' as $function$
declare
  v_user_id uuid:=auth.uid(); v_profile public.profiles; v_method public.payment_methods;
  v_settings public.platform_settings; v_request public.deposit_requests;
  v_credit_usd numeric(20,8); v_sender text:=nullif(trim(p_sender_account),'');
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_requested_amount is null or p_requested_amount<=0 or p_requested_amount>10000000 then raise exception 'Invalid deposit amount'; end if;
  if nullif(trim(p_proof_path),'') is null then raise exception 'Transfer proof is required'; end if;
  select * into v_profile from public.profiles where id=v_user_id;
  if not found or v_profile.status<>'active' then raise exception 'Customer account is unavailable'; end if;
  if v_profile.deposits_restricted_until is not null and v_profile.deposits_restricted_until>now() then raise exception 'Customer deposits are restricted'; end if;
  select * into v_method from public.payment_methods where id=p_payment_method_id and enabled=true;
  if not found then raise exception 'Payment method is unavailable'; end if;
  if p_requested_amount<v_method.minimum_amount then raise exception 'Deposit amount is below minimum'; end if;
  if v_method.type::text='egyptian_wallet' and (v_sender is null or v_sender!~'^01[0125][0-9]{8}$') then raise exception 'Invalid sender wallet number'; end if;
  if exists(select 1 from public.deposit_requests where user_id=v_user_id and created_at>now()-interval '30 minutes') then raise exception 'Please wait 30 minutes before creating another deposit request'; end if;
  select * into v_settings from public.platform_settings where id=1;
  if not found or v_settings.usd_to_egp_rate<=0 then raise exception 'Platform settings are missing'; end if;
  v_credit_usd:=case when v_method.currency='EGP' then round(p_requested_amount/v_settings.usd_to_egp_rate,8) else round(p_requested_amount,8) end;
  if v_method.currency<>'EGP' then v_sender:=null; end if;
  insert into public.deposit_requests(user_id,payment_method_id,status,requested_currency,requested_amount,fee_amount,total_to_transfer,credit_usd,usd_to_egp_rate,sender_account,transaction_reference,proof_path,customer_note)
  values(v_user_id,v_method.id,'pending',v_method.currency,p_requested_amount,0,p_requested_amount,v_credit_usd,v_settings.usd_to_egp_rate,v_sender,nullif(trim(p_transaction_reference),''),trim(p_proof_path),nullif(trim(p_customer_note),'')) returning * into v_request;
  insert into public.deposit_status_history(deposit_request_id,old_status,new_status,changed_by,note) values(v_request.id,null,'pending',v_user_id,'Deposit request created without customer fees');
  insert into public.notifications(user_id,type,title,message,entity_type,entity_id,action_url) values(v_user_id,'deposit_request_created','تم استلام طلب إضافة الرصيد',format('تم استلام الطلب %s. المبلغ المحول يساوي المبلغ المضاف بعد المراجعة.',v_request.deposit_id),'deposit_request',v_request.id,'/wallet');
  insert into public.activity_logs(user_id,actor_id,action,entity_type,entity_id,description,new_data) values(v_user_id,v_user_id,'deposit_request_created','deposit_request',v_request.id,'Customer created fee-free deposit request',jsonb_build_object('requested_amount',p_requested_amount,'currency',v_method.currency,'fee_amount',0,'credit_usd',v_credit_usd));
  return v_request;
end;$function$;
revoke all on function public.create_deposit_request_v2(text,numeric,text,text,text,text) from public;
grant execute on function public.create_deposit_request_v2(text,numeric,text,text,text,text) to authenticated;
commit;
