begin;

create or replace function public.admin_create_manual_product_order(
  p_user_id uuid,
  p_product_id uuid,
  p_offer_id uuid,
  p_quantity integer,
  p_input_values jsonb default '{}'::jsonb,
  p_payment_mode text default 'wallet',
  p_fulfillment_mode text default 'supplier',
  p_admin_note text default null
)
returns public.product_orders
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
  v_product public.store_products;
  v_offer public.store_product_offers;
  v_order public.product_orders;
  v_order_item_id uuid;
  v_field jsonb;
  v_fields jsonb;
  v_field_id text;
  v_field_label text;
  v_field_type text;
  v_field_value text;
  v_field_pattern text;
  v_required boolean;
  v_supplier_product_id text;
  v_unit_price numeric(20,8);
  v_subtotal numeric(20,8);
  v_total numeric(20,8);
  v_discount numeric(20,8);
  v_before numeric(20,8);
  v_after numeric(20,8);
  v_unit integer;
  v_note text := nullif(trim(p_admin_note), '');
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

  if p_payment_mode not in ('wallet','complimentary') then raise exception 'Invalid payment mode'; end if;
  if p_fulfillment_mode not in ('supplier','manual') then raise exception 'Invalid fulfillment mode'; end if;
  if p_payment_mode = 'complimentary' and v_admin.role::text not in ('super_admin','owner') then
    raise exception 'Complimentary orders require owner permission';
  end if;
  if p_quantity is null or p_quantity < 1 then raise exception 'Invalid quantity'; end if;
  if p_input_values is null or jsonb_typeof(p_input_values) <> 'object' then
    raise exception 'Product input values must be an object';
  end if;

  select * into v_settings from public.platform_settings where id = 1;
  if not found or v_settings.usd_to_egp_rate <= 0 then raise exception 'Platform settings are missing'; end if;

  select * into v_product from public.store_products where id = p_product_id for share;
  if not found or not v_product.active or v_product.status = 'unavailable' then
    raise exception 'Product is unavailable';
  end if;

  select * into v_offer from public.store_product_offers where id = p_offer_id for share;
  if not found or v_offer.product_id <> v_product.id or not v_offer.active or not v_offer.available then
    raise exception 'Offer is unavailable';
  end if;
  if p_quantity < v_product.minimum_quantity or p_quantity > v_product.maximum_quantity then
    raise exception 'Invalid quantity for product';
  end if;
  if v_offer.stock is not null and v_offer.stock < p_quantity then raise exception 'Offer stock is insufficient'; end if;
  if v_offer.supplier_price_usd < 0 or v_offer.profit_usd < 0
     or v_offer.supplier_price_usd + v_offer.profit_usd <= 0 then
    raise exception 'Offer price is invalid';
  end if;

  v_fields := case
    when jsonb_typeof(v_offer.required_fields) = 'array' and jsonb_array_length(v_offer.required_fields) > 0
      then v_offer.required_fields
    else coalesce(v_product.required_fields, '[]'::jsonb)
  end;
  if jsonb_typeof(v_fields) <> 'array' then raise exception 'Required fields configuration is invalid'; end if;

  for v_field in select value from jsonb_array_elements(v_fields)
  loop
    v_field_id := nullif(trim(v_field ->> 'id'), '');
    v_field_label := coalesce(nullif(trim(v_field ->> 'label'), ''), v_field_id, 'Required field');
    v_field_type := coalesce(nullif(lower(trim(v_field ->> 'type')), ''), 'text');
    v_field_value := trim(coalesce(p_input_values ->> v_field_id, ''));
    v_field_pattern := nullif(v_field ->> 'pattern', '');
    begin
      v_required := coalesce((v_field ->> 'required')::boolean, false);
    exception when others then
      raise exception 'Required fields configuration is invalid';
    end;

    if v_required and (v_field_id is null or v_field_value = '') then
      raise exception 'Missing required field: %', v_field_label;
    end if;
    if length(v_field_value) > 500 then raise exception 'Input is too long: %', v_field_label; end if;
    if v_field_value <> '' then
      if v_field_type = 'email' and v_field_value !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
        raise exception 'Invalid email: %', v_field_label;
      elsif v_field_type = 'number' and v_field_value !~ '^[0-9]+$' then
        raise exception 'Invalid numeric value: %', v_field_label;
      elsif v_field_type = 'tel' and v_field_value !~ '^\+?[0-9][0-9[:space:]()-]{6,20}$' then
        raise exception 'Invalid phone number: %', v_field_label;
      elsif v_field_type = 'url' and v_field_value !~* '^https?://[^[:space:]]+$' then
        raise exception 'Invalid URL: %', v_field_label;
      end if;
      if v_field_pattern is not null then
        begin
          if v_field_value !~ v_field_pattern then raise exception 'INPUT_PATTERN_MISMATCH'; end if;
        exception
          when sqlstate 'P0001' then raise exception 'Invalid field format: %', v_field_label;
          when invalid_regular_expression then raise exception 'Required field pattern is invalid: %', v_field_label;
        end;
      end if;
    end if;
  end loop;

  v_supplier_product_id := coalesce(
    nullif(trim(v_product.supplier_product_id), ''),
    nullif(trim(v_product.provider_data ->> 'provider_category_id'), '')
  );
  if p_fulfillment_mode = 'supplier' then
    if v_supplier_product_id is null then raise exception 'Provider product ID is missing'; end if;
    if nullif(trim(v_offer.provider_offer_id), '') is null then raise exception 'Provider offer ID is missing'; end if;
  end if;

  v_unit_price := round(v_offer.supplier_price_usd + v_offer.profit_usd, 8);
  v_subtotal := round(v_unit_price * p_quantity, 8);
  v_discount := case when p_payment_mode = 'complimentary' then v_subtotal else 0 end;
  v_total := round(v_subtotal - v_discount, 8);

  if p_payment_mode = 'wallet' then
    select * into v_wallet from public.account_wallets where user_id = p_user_id for update;
    if not found then raise exception 'Customer wallet not found'; end if;
    if v_wallet.is_frozen then raise exception 'Customer wallet is frozen'; end if;
    v_before := v_wallet.balance_usd;
    if v_before < v_total then raise exception 'Insufficient wallet balance'; end if;
    v_after := round(v_before - v_total, 8);
  end if;

  insert into public.product_orders (
    user_id, status, subtotal_usd, discount_usd, total_usd, usd_to_egp_rate,
    total_egp_snapshot, customer_note, admin_note
  ) values (
    p_user_id, case when p_fulfillment_mode = 'supplier' then 'pending' else 'processing' end,
    v_subtotal, v_discount, v_total, v_settings.usd_to_egp_rate,
    round(v_total * v_settings.usd_to_egp_rate, 2), null,
    concat_ws(' — ', v_note, 'Created manually by admin')
  ) returning * into v_order;

  insert into public.product_order_items (
    order_id, product_id, offer_id, provider_offer_id, product_name, offer_name,
    product_image_url, supplier_product_id, quantity, supplier_price_usd,
    profit_usd, unit_price_usd, total_price_usd, input_values, status
  ) values (
    v_order.id, v_product.id, v_offer.id, v_offer.provider_offer_id,
    v_product.name_ar, v_offer.name_ar, v_product.image_url, v_supplier_product_id,
    p_quantity, v_offer.supplier_price_usd, v_offer.profit_usd, v_unit_price,
    v_subtotal, p_input_values,
    case when p_fulfillment_mode = 'supplier' then 'pending' else 'processing' end
  ) returning id into v_order_item_id;

  if p_fulfillment_mode = 'supplier' then
    for v_unit in 1..p_quantity loop
      insert into public.product_supplier_jobs (
        order_id, order_item_id, product_id, offer_id, provider_offer_id,
        supplier_product_id, unit_number, quantity, input_values, status
      ) values (
        v_order.id, v_order_item_id, v_product.id, v_offer.id, v_offer.provider_offer_id,
        v_supplier_product_id, v_unit, 1, p_input_values, 'pending'
      );
    end loop;
  end if;

  if p_payment_mode = 'wallet' then
    update public.account_wallets set balance_usd = v_after, updated_at = now() where id = v_wallet.id;
    insert into public.account_wallet_transactions (
      user_id, wallet_id, type, amount_usd, balance_before_usd, balance_after_usd,
      exchange_rate, amount_egp_snapshot, reference_type, reference_id, description, created_by
    ) values (
      p_user_id, v_wallet.id, 'purchase', v_total, v_before, v_after,
      v_settings.usd_to_egp_rate, round(v_total * v_settings.usd_to_egp_rate, 2),
      'product_order', v_order.id, format('Admin-created product order %s', v_order.order_id), v_admin_id
    );
  end if;

  insert into public.product_order_status_history (order_id, old_status, new_status, changed_by, note)
  values (v_order.id, null, v_order.status, v_admin_id,
    format('Manual admin order; payment=%s; fulfillment=%s', p_payment_mode, p_fulfillment_mode));

  insert into public.notifications (user_id, type, title, message, entity_type, entity_id, action_url)
  values (p_user_id, 'product_order_created', 'تم إنشاء طلب لك بواسطة الدعم',
    format('تم إنشاء الطلب %s لك بواسطة فريق DevPlay.', v_order.order_id),
    'product_order', v_order.id, '/orders');

  insert into public.activity_logs (
    user_id, actor_id, action, entity_type, entity_id, description, new_data
  ) values (
    p_user_id, v_admin_id, 'admin_manual_product_order_created', 'product_order', v_order.id,
    coalesce(v_note, 'Admin created a product order for customer'),
    jsonb_build_object('order_id',v_order.order_id,'product_id',v_product.id,'offer_id',v_offer.id,
      'quantity',p_quantity,'payment_mode',p_payment_mode,'fulfillment_mode',p_fulfillment_mode,
      'subtotal_usd',v_subtotal,'total_usd',v_total)
  );

  return v_order;
end;
$function$;

revoke all on function public.admin_create_manual_product_order(uuid,uuid,uuid,integer,jsonb,text,text,text) from public;
grant execute on function public.admin_create_manual_product_order(uuid,uuid,uuid,integer,jsonb,text,text,text) to authenticated;

commit;
