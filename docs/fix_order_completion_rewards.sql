begin;

create or replace function public.admin_update_product_order_status(
  p_order_id uuid,
  p_new_status public.product_order_status,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_actor_id uuid := auth.uid();
  v_is_service_role boolean := coalesce(auth.role(), '') = 'service_role';
  v_order public.product_orders;
  v_profile public.profiles;
  v_old_status text;
  v_new_status text := p_new_status::text;
  v_points_per_usd numeric(20,8) := 100;
  v_reward_points integer := 0;
  v_points_before integer := 0;
  v_points_after integer := 0;
  v_debt_before integer := 0;
  v_debt_after integer := 0;
  v_debt_paid integer := 0;
  v_points_credited integer := 0;
  v_points_deducted integer := 0;
  v_new_debt integer := 0;
  v_existing_credit integer := 0;
  v_existing_reversal integer := 0;
begin
  if not v_is_service_role then
    if v_actor_id is null then
      raise exception 'Authentication required';
    end if;
    if not public.is_admin_user(v_actor_id) then
      raise exception 'Admin permission required';
    end if;
  end if;

  select * into v_order
  from public.product_orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Product order not found';
  end if;

  v_old_status := v_order.status::text;

  if v_old_status = v_new_status then
    return jsonb_build_object(
      'success', true,
      'changed', false,
      'order_id', v_order.order_id,
      'old_status', v_old_status,
      'new_status', v_new_status,
      'reward_points', 0,
      'points_credited', 0,
      'points_deducted', 0,
      'debt_paid', 0,
      'new_debt', 0
    );
  end if;

  select * into v_profile
  from public.profiles
  where id = v_order.user_id
  for update;

  if not found then
    raise exception 'Customer profile not found';
  end if;

  select coalesce(points_per_usd, 100)
  into v_points_per_usd
  from public.platform_settings
  where id = 1;

  v_points_before := coalesce(v_profile.points, 0);
  v_points_after := v_points_before;
  v_debt_before := coalesce(v_profile.points_debt, 0);
  v_debt_after := v_debt_before;
  v_reward_points := greatest(floor(v_order.total_usd * v_points_per_usd)::integer, 0);

  update public.product_orders
  set status = p_new_status,
      completed_at = case
        when v_new_status = 'completed' then coalesce(completed_at, now())
        when v_old_status = 'completed' then null
        else completed_at
      end,
      admin_note = coalesce(nullif(trim(p_note), ''), admin_note),
      updated_at = now()
  where id = v_order.id;

  update public.product_order_items
  set status = p_new_status,
      updated_at = now()
  where order_id = v_order.id;

  if v_new_status = 'completed' and v_old_status <> 'completed' then
    select coalesce(sum(points), 0)
    into v_existing_credit
    from public.points_transactions
    where reference_type = 'product_order'
      and reference_id = v_order.id
      and type = 'order_reward'
      and direction = 'credit';

    select coalesce(sum(points), 0)
    into v_existing_reversal
    from public.points_transactions
    where reference_type = 'product_order'
      and reference_id = v_order.id
      and type = 'refund_reversal'
      and direction = 'debit';

    if v_existing_credit <= v_existing_reversal then
      v_debt_paid := least(v_debt_before, v_reward_points);
      v_points_credited := v_reward_points - v_debt_paid;
      v_debt_after := v_debt_before - v_debt_paid;
      v_points_after := v_points_before + v_points_credited;

      update public.profiles
      set points = v_points_after,
          points_debt = v_debt_after,
          successful_orders_count = coalesce(successful_orders_count, 0) + 1,
          total_spent_usd = coalesce(total_spent_usd, 0) + v_order.total_usd,
          updated_at = now()
      where id = v_profile.id;

      if v_points_credited > 0 then
        insert into public.points_transactions(
          user_id, type, direction, points, balance_before, balance_after,
          reference_type, reference_id, description, created_by
        ) values(
          v_profile.id, 'order_reward', 'credit', v_points_credited,
          v_points_before, v_points_after, 'product_order', v_order.id,
          format('مكافأة اكتمال الطلب %s', v_order.order_id), v_actor_id
        );
      end if;

      insert into public.notifications(
        user_id, type, title, message, entity_type, entity_id, action_url
      ) values(
        v_profile.id,
        'order_points_added',
        'تمت إضافة نقاط الطلب ⭐',
        case
          when v_debt_paid > 0 and v_points_credited > 0 then
            format('اكتمل الطلب %s. تم تسوية %s نقطة مستحقة وإضافة %s نقطة إلى رصيدك.', v_order.order_id, v_debt_paid, v_points_credited)
          when v_debt_paid > 0 then
            format('اكتمل الطلب %s وتم استخدام %s نقطة لتسوية النقاط المستحقة.', v_order.order_id, v_debt_paid)
          else
            format('اكتمل الطلب %s وتمت إضافة %s نقطة إلى حسابك.', v_order.order_id, v_points_credited)
        end,
        'product_order', v_order.id, '/rewards'
      );
    end if;
  end if;

  if v_old_status = 'completed' and v_new_status <> 'completed' then
    select coalesce(sum(points), 0)
    into v_existing_credit
    from public.points_transactions
    where reference_type = 'product_order'
      and reference_id = v_order.id
      and type = 'order_reward'
      and direction = 'credit';

    select coalesce(sum(points), 0)
    into v_existing_reversal
    from public.points_transactions
    where reference_type = 'product_order'
      and reference_id = v_order.id
      and type = 'refund_reversal'
      and direction = 'debit';

    v_reward_points := greatest(v_existing_credit - v_existing_reversal, 0);
    v_points_deducted := least(v_points_before, v_reward_points);
    v_new_debt := v_reward_points - v_points_deducted;
    v_points_after := v_points_before - v_points_deducted;
    v_debt_after := v_debt_before + v_new_debt;

    update public.profiles
    set points = v_points_after,
        points_debt = v_debt_after,
        successful_orders_count = greatest(coalesce(successful_orders_count, 0) - 1, 0),
        total_spent_usd = greatest(coalesce(total_spent_usd, 0) - v_order.total_usd, 0),
        updated_at = now()
    where id = v_profile.id;

    if v_reward_points > 0 then
      insert into public.points_transactions(
        user_id, type, direction, points, balance_before, balance_after,
        reference_type, reference_id, description, created_by
      ) values(
        v_profile.id, 'refund_reversal', 'debit', v_reward_points,
        v_points_before, v_points_after, 'product_order', v_order.id,
        format('استرجاع نقاط الطلب %s بعد تغيير حالته إلى %s', v_order.order_id, v_new_status),
        v_actor_id
      );
    end if;
  end if;

  insert into public.product_order_status_history(
    order_id, old_status, new_status, changed_by, note
  ) values(
    v_order.id, v_order.status, p_new_status, v_actor_id, nullif(trim(p_note), '')
  );

  perform public.refresh_customer_level(v_profile.id);

  insert into public.activity_logs(
    user_id, actor_id, action, entity_type, entity_id, description, old_data, new_data
  ) values(
    v_profile.id, v_actor_id, 'product_order_status_updated', 'product_order', v_order.id,
    format('Product order status changed from %s to %s', v_old_status, v_new_status),
    jsonb_build_object('status', v_old_status, 'points', v_points_before, 'points_debt', v_debt_before),
    jsonb_build_object('status', v_new_status, 'points', v_points_after, 'points_debt', v_debt_after, 'reward_points', v_reward_points)
  );

  return jsonb_build_object(
    'success', true,
    'changed', true,
    'order_id', v_order.order_id,
    'old_status', v_old_status,
    'new_status', v_new_status,
    'reward_points', v_reward_points,
    'points_credited', v_points_credited,
    'points_deducted', v_points_deducted,
    'debt_paid', v_debt_paid,
    'new_debt', v_new_debt
  );
end;
$function$;

revoke all on function public.admin_update_product_order_status(uuid, public.product_order_status, text) from public;
grant execute on function public.admin_update_product_order_status(uuid, public.product_order_status, text) to authenticated;
grant execute on function public.admin_update_product_order_status(uuid, public.product_order_status, text) to service_role;

do $backfill$
declare
  v_order record;
  v_profile public.profiles;
  v_points_per_usd numeric(20,8);
  v_reward integer;
  v_before integer;
  v_after integer;
begin
  select coalesce(points_per_usd, 100)
  into v_points_per_usd
  from public.platform_settings
  where id = 1;

  for v_order in
    select o.id, o.order_id, o.user_id, o.total_usd
    from public.product_orders o
    where o.status = 'completed'
      and not exists(
        select 1
        from public.points_transactions pt
        where pt.reference_type = 'product_order'
          and pt.reference_id = o.id
          and pt.type = 'order_reward'
          and pt.direction = 'credit'
      )
    order by o.completed_at, o.created_at
  loop
    select * into v_profile
    from public.profiles
    where id = v_order.user_id
    for update;

    if found then
      v_reward := greatest(floor(v_order.total_usd * v_points_per_usd)::integer, 0);
      v_before := coalesce(v_profile.points, 0);
      v_after := v_before + v_reward;

      update public.profiles
      set points = v_after,
          successful_orders_count = coalesce(successful_orders_count, 0) + 1,
          total_spent_usd = coalesce(total_spent_usd, 0) + v_order.total_usd,
          updated_at = now()
      where id = v_profile.id;

      if v_reward > 0 then
        insert into public.points_transactions(
          user_id, type, direction, points, balance_before, balance_after,
          reference_type, reference_id, description, created_by
        ) values(
          v_profile.id, 'order_reward', 'credit', v_reward, v_before, v_after,
          'product_order', v_order.id,
          format('مكافأة اكتمال الطلب %s (تسوية تلقائية)', v_order.order_id), null
        );
      end if;

      insert into public.notifications(
        user_id, type, title, message, entity_type, entity_id, action_url
      ) values(
        v_profile.id, 'order_points_added', 'تمت إضافة نقاط طلب سابق ⭐',
        format('تمت إضافة %s نقطة المستحقة عن الطلب %s.', v_reward, v_order.order_id),
        'product_order', v_order.id, '/rewards'
      );
    end if;
  end loop;
end;
$backfill$;

notify pgrst, 'reload schema';

commit;
