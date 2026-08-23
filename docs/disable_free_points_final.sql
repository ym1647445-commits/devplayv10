begin;

alter table public.platform_settings
  add column if not exists rewards_enabled boolean not null default false;
update public.platform_settings set rewards_enabled=false,points_per_usd=0,updated_at=now() where id=1;
update public.reward_store set active=false where active=true;

-- Status updates continue to maintain order statistics, but never create,
-- deduct, backfill or notify about points.
create or replace function public.admin_update_product_order_status(
  p_order_id uuid,
  p_new_status public.product_order_status,
  p_note text default null
)
returns jsonb language plpgsql security definer set search_path='' as $function$
declare
  v_actor_id uuid:=auth.uid();
  v_service boolean:=coalesce(auth.role(),'')='service_role';
  v_order public.product_orders;
  v_old_status text;
  v_new_status text:=p_new_status::text;
begin
  if not v_service then
    if v_actor_id is null then raise exception 'Authentication required'; end if;
    if not public.is_admin_user(v_actor_id) then raise exception 'Admin permission required'; end if;
  end if;
  select * into v_order from public.product_orders where id=p_order_id for update;
  if not found then raise exception 'Product order not found'; end if;
  v_old_status:=v_order.status::text;
  if v_old_status=v_new_status then
    return jsonb_build_object('success',true,'changed',false,'order_id',v_order.order_id,'old_status',v_old_status,'new_status',v_new_status,'reward_points',0,'points_credited',0,'points_deducted',0,'debt_paid',0,'new_debt',0);
  end if;

  update public.product_orders set status=p_new_status,
    completed_at=case when v_new_status='completed' then coalesce(completed_at,now()) when v_old_status='completed' then null else completed_at end,
    admin_note=coalesce(nullif(trim(p_note),''),admin_note),updated_at=now() where id=v_order.id;
  update public.product_order_items set status=p_new_status,updated_at=now() where order_id=v_order.id;

  if v_new_status='completed' and v_old_status<>'completed' then
    update public.profiles set successful_orders_count=coalesce(successful_orders_count,0)+1,
      total_spent_usd=coalesce(total_spent_usd,0)+v_order.total_usd,updated_at=now() where id=v_order.user_id;
  elsif v_old_status='completed' and v_new_status<>'completed' then
    update public.profiles set successful_orders_count=greatest(coalesce(successful_orders_count,0)-1,0),
      total_spent_usd=greatest(coalesce(total_spent_usd,0)-v_order.total_usd,0),updated_at=now() where id=v_order.user_id;
  end if;

  insert into public.product_order_status_history(order_id,old_status,new_status,changed_by,note)
  values(v_order.id,v_order.status,p_new_status,v_actor_id,nullif(trim(p_note),''));
  perform public.refresh_customer_level(v_order.user_id);
  insert into public.activity_logs(user_id,actor_id,action,entity_type,entity_id,description,old_data,new_data)
  values(v_order.user_id,v_actor_id,'product_order_status_updated','product_order',v_order.id,
    format('Product order status changed from %s to %s',v_old_status,v_new_status),jsonb_build_object('status',v_old_status),jsonb_build_object('status',v_new_status));
  return jsonb_build_object('success',true,'changed',true,'order_id',v_order.order_id,'old_status',v_old_status,'new_status',v_new_status,'reward_points',0,'points_credited',0,'points_deducted',0,'debt_paid',0,'new_debt',0);
end;$function$;

revoke all on function public.admin_update_product_order_status(uuid,public.product_order_status,text) from public;
grant execute on function public.admin_update_product_order_status(uuid,public.product_order_status,text) to authenticated,service_role;

-- Disable every currently installed reward redemption entry point while
-- retaining its tables for compatibility/history.
do $block$
declare fn regprocedure;
begin
  for fn in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('redeem_reward','spin_reward_wheel','get_reward_wheel_state')
  loop execute format('revoke all on function %s from public, anon, authenticated',fn); end loop;
end;$block$;

delete from public.notifications where type in ('order_points_added','reward','wheel_reward') and is_read=false;
notify pgrst,'reload schema';
commit;
