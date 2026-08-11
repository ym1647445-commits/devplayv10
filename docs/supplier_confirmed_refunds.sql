begin;

create or replace function public.refund_product_order_after_supplier_confirmation(
  p_order_id uuid,
  p_supplier_evidence jsonb default '{}'::jsonb
)
returns public.product_orders
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_role text;
  v_order public.product_orders;
  v_wallet public.account_wallets;
  v_before numeric(20,8);
  v_after numeric(20,8);
  v_jobs_count integer;
  v_refunded_jobs integer;
  v_completed_jobs integer;
begin
  if v_actor is null then raise exception 'Authentication required'; end if;
  select role::text into v_role from public.profiles where id=v_actor;
  if v_role not in ('admin','super_admin','owner') then
    raise exception 'Admin permission required';
  end if;

  select * into v_order from public.product_orders where id=p_order_id for update;
  if not found then raise exception 'Product order not found'; end if;
  if v_order.status='refunded' then return v_order; end if;
  if v_order.status='completed' then raise exception 'Completed order cannot be auto-refunded'; end if;

  select count(*),count(*) filter(where status='refunded' and lower(coalesce(supplier_status,''))='refunded'),count(*) filter(where status='completed')
  into v_jobs_count,v_refunded_jobs,v_completed_jobs
  from public.product_supplier_jobs where order_id=v_order.id;

  if v_jobs_count=0 then raise exception 'Order has no supplier jobs'; end if;
  if v_completed_jobs>0 then raise exception 'Partially completed order requires manual review'; end if;
  if v_refunded_jobs<>v_jobs_count then raise exception 'Supplier refund is not confirmed for every job'; end if;
  if exists(select 1 from public.product_supplier_jobs where order_id=v_order.id and supplier_order_id is null) then
    raise exception 'Supplier order reference is missing';
  end if;

  if exists(select 1 from public.account_wallet_transactions where reference_type='product_order_refund' and reference_id=v_order.id and type='refund') then
    update public.product_orders set status='refunded',updated_at=now() where id=v_order.id returning * into v_order;
    return v_order;
  end if;

  select * into v_wallet from public.account_wallets where user_id=v_order.user_id for update;
  if not found then raise exception 'Customer wallet not found'; end if;
  v_before:=v_wallet.balance_usd;
  v_after:=round(v_before+v_order.total_usd,8);

  update public.account_wallets set balance_usd=v_after,updated_at=now() where id=v_wallet.id;
  insert into public.account_wallet_transactions(user_id,wallet_id,type,amount_usd,balance_before_usd,balance_after_usd,exchange_rate,amount_egp_snapshot,reference_type,reference_id,description,created_by)
  values(v_order.user_id,v_wallet.id,'refund',v_order.total_usd,v_before,v_after,v_order.usd_to_egp_rate,round(v_order.total_usd*v_order.usd_to_egp_rate,2),'product_order_refund',v_order.id,format('Supplier-confirmed refund for order %s',v_order.order_id),v_actor);

  insert into public.product_order_status_history(order_id,old_status,new_status,changed_by,note)
  values(v_order.id,v_order.status,'refunded',v_actor,'Flexy confirmed that all supplier jobs were refunded; customer wallet credited');
  update public.product_order_items set status='refunded',updated_at=now() where order_id=v_order.id;
  update public.product_orders set status='refunded',supplier_status='refunded',failure_reason=coalesce(failure_reason,'Supplier confirmed refund'),updated_at=now() where id=v_order.id returning * into v_order;
  insert into public.notifications(user_id,type,title,message,entity_type,entity_id,action_url)
  values(v_order.user_id,'product_order_refunded','تم رد قيمة الطلب',format('أعاد المورد قيمة الطلب %s وتمت إضافة %s دولار إلى محفظتك.',v_order.order_id,trim(to_char(v_order.total_usd,'FM999999990.0000'))),'product_order',v_order.id,format('/orders/%s',v_order.id));
  insert into public.activity_logs(user_id,actor_id,action,entity_type,entity_id,description,new_data)
  values(v_order.user_id,v_actor,'supplier_confirmed_order_refund','product_order',v_order.id,'Customer wallet refunded only after supplier confirmation',jsonb_build_object('amount_usd',v_order.total_usd,'balance_before_usd',v_before,'balance_after_usd',v_after,'supplier_evidence',coalesce(p_supplier_evidence,'{}'::jsonb)));
  return v_order;
end
$function$;

revoke all on function public.refund_product_order_after_supplier_confirmation(uuid,jsonb) from public;
grant execute on function public.refund_product_order_after_supplier_confirmation(uuid,jsonb) to authenticated;
notify pgrst, 'reload schema';
commit;
