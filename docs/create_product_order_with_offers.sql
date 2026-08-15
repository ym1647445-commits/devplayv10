begin;

alter table public.product_order_items
  add column if not exists offer_id uuid,
  add column if not exists provider_offer_id text,
  add column if not exists offer_name text;

alter table public.product_supplier_jobs
  add column if not exists offer_id uuid,
  add column if not exists provider_offer_id text;

do $migration$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'product_order_items_offer_id_fkey'
      and conrelid = 'public.product_order_items'::regclass
  ) then
    alter table public.product_order_items
      add constraint product_order_items_offer_id_fkey
      foreign key (offer_id) references public.store_product_offers(id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'product_supplier_jobs_offer_id_fkey'
      and conrelid = 'public.product_supplier_jobs'::regclass
  ) then
    alter table public.product_supplier_jobs
      add constraint product_supplier_jobs_offer_id_fkey
      foreign key (offer_id) references public.store_product_offers(id);
  end if;
end
$migration$;

create index if not exists product_order_items_offer_id_idx
  on public.product_order_items (offer_id);

create index if not exists product_supplier_jobs_offer_id_idx
  on public.product_supplier_jobs (offer_id);

create index if not exists product_supplier_jobs_provider_offer_id_idx
  on public.product_supplier_jobs (provider_offer_id);

create or replace function public.create_product_order(
  p_items jsonb,
  p_coupon_code text default null,
  p_customer_note text default null
)
returns public.product_orders
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user_id uuid;
  v_wallet public.account_wallets;
  v_settings public.platform_settings;
  v_coupon public.checkout_coupons;
  v_order public.product_orders;
  v_product public.store_products;
  v_offer public.store_product_offers;

  v_item jsonb;
  v_product_id uuid;
  v_offer_id uuid;
  v_supplier_product_id text;
  v_quantity integer;
  v_input_values jsonb;
  v_effective_required_fields jsonb;

  v_required_field jsonb;
  v_required_field_id text;
  v_required_field_label text;
  v_required_field_required boolean;
  v_required_field_value text;

  v_order_item_id uuid;
  v_unit_number integer;
  v_items_count integer;
  v_cart_quantity integer := 0;

  v_unit_price_usd numeric(20, 8);
  v_item_total_usd numeric(20, 8);
  v_subtotal_usd numeric(20, 8) := 0;
  v_total_cost_usd numeric(20, 8) := 0;
  v_profit_before_discount numeric(20, 8) := 0;
  v_discount_usd numeric(20, 8) := 0;
  v_total_usd numeric(20, 8) := 0;
  v_profit_after_discount numeric(20, 8) := 0;

  v_minimum_cart_usd numeric(20, 8);
  v_maximum_discount_usd numeric(20, 8);
  v_eligible_subtotal_usd numeric(20, 8) := 0;
  v_eligible_cost_usd numeric(20, 8) := 0;
  v_item_is_eligible boolean;

  v_user_coupon_usage integer := 0;
  v_customer_level text;
  v_customer_created_at timestamptz;
  v_successful_orders_count integer;
  v_coupon_is_assigned boolean := false;

  v_balance_before numeric(20, 8);
  v_balance_after numeric(20, 8);
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Cart items must be an array';
  end if;

  v_items_count := jsonb_array_length(p_items);
  if v_items_count = 0 then
    raise exception 'Cart is empty';
  end if;
  if v_items_count > 50 then
    raise exception 'Too many cart items';
  end if;

  select * into v_settings
  from public.platform_settings
  where id = 1;
  if not found then
    raise exception 'Platform settings are missing';
  end if;

  select customer_level, created_at, successful_orders_count
  into v_customer_level, v_customer_created_at, v_successful_orders_count
  from public.profiles
  where id = v_user_id;
  if not found then
    raise exception 'Customer profile not found';
  end if;

  select * into v_wallet
  from public.account_wallets
  where user_id = v_user_id
  for update;
  if not found then
    raise exception 'Customer wallet not found';
  end if;
  if v_wallet.is_frozen then
    raise exception 'Customer wallet is frozen';
  end if;

  -- First pass: validate trusted product/offer rows and calculate totals.
  for v_item in select value from jsonb_array_elements(p_items)
  loop
    begin
      v_product_id := (v_item ->> 'product_id')::uuid;
    exception when others then
      raise exception 'Invalid product ID';
    end;

    begin
      v_offer_id := (v_item ->> 'offer_id')::uuid;
    exception when others then
      raise exception 'Invalid offer ID';
    end;

    begin
      v_quantity := (v_item ->> 'quantity')::integer;
    exception when others then
      raise exception 'Invalid product quantity';
    end;

    if v_quantity is null or v_quantity < 1 then
      raise exception 'Invalid quantity';
    end if;
    v_cart_quantity := v_cart_quantity + v_quantity;

    v_input_values := coalesce(v_item -> 'input_values', '{}'::jsonb);
    if jsonb_typeof(v_input_values) <> 'object' then
      raise exception 'Product input values must be an object';
    end if;

    select * into v_product
    from public.store_products
    where id = v_product_id
    for share;
    if not found or not v_product.active or v_product.status = 'unavailable' then
      raise exception 'Product is unavailable';
    end if;

    select * into v_offer
    from public.store_product_offers
    where id = v_offer_id
    for share;
    if not found then
      raise exception 'Offer is unavailable';
    end if;
    if v_offer.product_id <> v_product.id then
      raise exception 'Offer does not belong to product';
    end if;
    if not v_offer.active or not v_offer.available then
      raise exception 'Offer is unavailable';
    end if;
    if v_offer.stock is not null and v_offer.stock < v_quantity then
      raise exception 'Offer stock is insufficient';
    end if;

    if v_quantity < v_product.minimum_quantity
       or v_quantity > v_product.maximum_quantity then
      raise exception 'Invalid quantity for product %', v_product.name_ar;
    end if;

    if v_offer.supplier_price_usd < 0
       or v_offer.profit_usd < 0
       or v_offer.supplier_price_usd + v_offer.profit_usd <= 0 then
      raise exception 'Offer price is invalid';
    end if;

    v_effective_required_fields :=
      case
        -- Gift-card offers deliver a code. An empty offer configuration is
        -- intentional here and must not inherit Player ID from the parent.
        when v_offer.provider_data ->> 'catalog_type' = 'gc'
          then '[]'::jsonb
        when jsonb_typeof(v_offer.required_fields) = 'array'
             and jsonb_array_length(v_offer.required_fields) > 0
          then v_offer.required_fields
        else coalesce(v_product.required_fields, '[]'::jsonb)
      end;

    if jsonb_typeof(v_effective_required_fields) <> 'array' then
      raise exception 'Required fields configuration is invalid';
    end if;

    for v_required_field in
      select value from jsonb_array_elements(v_effective_required_fields)
    loop
      v_required_field_id := nullif(trim(v_required_field ->> 'id'), '');
      v_required_field_label := coalesce(
        nullif(trim(v_required_field ->> 'label'), ''),
        v_required_field_id,
        'Required field'
      );
      begin
        v_required_field_required := coalesce(
          (v_required_field ->> 'required')::boolean,
          false
        );
      exception when others then
        raise exception 'Required fields configuration is invalid';
      end;

      if v_required_field_required and v_required_field_id is null then
        raise exception 'Required fields configuration is invalid';
      end if;

      v_required_field_value := trim(
        coalesce(v_input_values ->> v_required_field_id, '')
      );
      if v_required_field_required and length(v_required_field_value) = 0 then
        raise exception 'Missing required field: %', v_required_field_label;
      end if;
    end loop;

    v_unit_price_usd := round(
      v_offer.supplier_price_usd + v_offer.profit_usd,
      8
    );
    v_item_total_usd := round(v_unit_price_usd * v_quantity, 8);
    v_subtotal_usd := round(v_subtotal_usd + v_item_total_usd, 8);
    v_total_cost_usd := round(
      v_total_cost_usd + (v_offer.supplier_price_usd * v_quantity),
      8
    );
  end loop;

  if v_subtotal_usd <= 0 then
    raise exception 'Invalid cart subtotal';
  end if;
  v_profit_before_discount := round(v_subtotal_usd - v_total_cost_usd, 8);

  -- Coupon validation and offer-based eligible totals.
  if p_coupon_code is not null and length(trim(p_coupon_code)) > 0 then
    select * into v_coupon
    from public.checkout_coupons
    where upper(code) = upper(trim(p_coupon_code))
      and active = true
      and starts_at <= now()
      and (expires_at is null or expires_at > now())
    for update;
    if not found then
      raise exception 'Coupon is invalid or expired';
    end if;

    if v_coupon.usage_limit is not null
       and v_coupon.usage_count >= v_coupon.usage_limit then
      raise exception 'Coupon usage limit reached';
    end if;

    select count(*) into v_user_coupon_usage
    from public.checkout_coupon_usage
    where coupon_id = v_coupon.id and user_id = v_user_id;
    if v_user_coupon_usage >= v_coupon.per_user_limit then
      raise exception 'Coupon user limit reached';
    end if;

    if v_cart_quantity < v_coupon.minimum_items_count then
      raise exception 'Cart does not meet coupon minimum items count';
    end if;
    if v_coupon.first_order_only and v_successful_orders_count > 0 then
      raise exception 'Coupon is available for the first order only';
    end if;

    if v_coupon.audience_type = 'specific_users' then
      select exists (
        select 1 from public.checkout_coupon_users
        where coupon_id = v_coupon.id and user_id = v_user_id
      ) into v_coupon_is_assigned;
      if not v_coupon_is_assigned then
        raise exception 'Coupon is not assigned to this customer';
      end if;
    elsif v_coupon.audience_type = 'new_users' then
      if v_customer_created_at < now() - interval '30 days' then
        raise exception 'Coupon is available for new customers only';
      end if;
    elsif v_coupon.audience_type = 'selected_levels' then
      if not (
        v_customer_level = any(coalesce(v_coupon.selected_levels, '{}'::text[]))
      ) then
        raise exception 'Coupon is not available for this customer level';
      end if;
    elsif v_coupon.audience_type <> 'all_users' then
      raise exception 'Invalid coupon audience configuration';
    end if;

    for v_item in select value from jsonb_array_elements(p_items)
    loop
      v_product_id := (v_item ->> 'product_id')::uuid;
      v_offer_id := (v_item ->> 'offer_id')::uuid;
      v_quantity := (v_item ->> 'quantity')::integer;

      select * into strict v_product
      from public.store_products where id = v_product_id;
      select * into strict v_offer
      from public.store_product_offers
      where id = v_offer_id and product_id = v_product_id;

      v_item_is_eligible := false;
      if v_coupon.application_scope = 'cart' then
        v_item_is_eligible := true;
      elsif v_coupon.application_scope = 'products' then
        select exists (
          select 1 from public.checkout_coupon_products
          where coupon_id = v_coupon.id and product_id = v_product.id
        ) into v_item_is_eligible;
      elsif v_coupon.application_scope = 'categories' then
        select exists (
          select 1 from public.checkout_coupon_categories
          where coupon_id = v_coupon.id and category_id = v_product.category_id
        ) into v_item_is_eligible;
      else
        raise exception 'Invalid coupon application scope';
      end if;

      if v_item_is_eligible then
        v_unit_price_usd := round(
          v_offer.supplier_price_usd + v_offer.profit_usd,
          8
        );
        v_eligible_subtotal_usd := round(
          v_eligible_subtotal_usd + (v_unit_price_usd * v_quantity),
          8
        );
        v_eligible_cost_usd := round(
          v_eligible_cost_usd + (v_offer.supplier_price_usd * v_quantity),
          8
        );
      end if;
    end loop;

    if v_eligible_subtotal_usd <= 0 then
      raise exception 'Coupon does not apply to any cart product';
    end if;

    if v_coupon.currency = 'EGP' then
      v_minimum_cart_usd := round(
        v_coupon.minimum_cart_amount / v_settings.usd_to_egp_rate,
        8
      );
      v_maximum_discount_usd := case
        when v_coupon.maximum_discount is null then null
        else round(v_coupon.maximum_discount / v_settings.usd_to_egp_rate, 8)
      end;
    else
      v_minimum_cart_usd := v_coupon.minimum_cart_amount;
      v_maximum_discount_usd := v_coupon.maximum_discount;
    end if;

    if v_subtotal_usd < v_minimum_cart_usd then
      raise exception 'Cart does not meet coupon minimum';
    end if;

    if v_coupon.type = 'fixed' then
      v_discount_usd := case
        when v_coupon.currency = 'EGP'
          then round(v_coupon.value / v_settings.usd_to_egp_rate, 8)
        else round(v_coupon.value, 8)
      end;
    elsif v_coupon.type = 'percentage' then
      v_discount_usd := round(
        v_eligible_subtotal_usd * (v_coupon.value / 100),
        8
      );
    else
      raise exception 'Invalid coupon discount type';
    end if;

    if v_maximum_discount_usd is not null then
      v_discount_usd := least(v_discount_usd, v_maximum_discount_usd);
    end if;
    v_discount_usd := least(v_discount_usd, v_eligible_subtotal_usd);
  end if;

  v_profit_after_discount := round(
    v_profit_before_discount - v_discount_usd,
    8
  );
  if v_coupon.id is not null
     and (v_profit_after_discount * v_settings.usd_to_egp_rate)
       < v_settings.minimum_profit_egp then
    raise exception 'Coupon discount exceeds safe profit';
  end if;

  v_total_usd := round(v_subtotal_usd - v_discount_usd, 8);
  if v_total_usd <= 0 then
    raise exception 'Invalid checkout total';
  end if;

  v_balance_before := v_wallet.balance_usd;
  if v_balance_before < v_total_usd then
    raise exception 'Insufficient wallet balance';
  end if;
  v_balance_after := round(v_balance_before - v_total_usd, 8);

  insert into public.product_orders (
    user_id, status, subtotal_usd, discount_usd, total_usd,
    usd_to_egp_rate, total_egp_snapshot, coupon_id, coupon_code, customer_note
  ) values (
    v_user_id, 'pending', v_subtotal_usd, v_discount_usd, v_total_usd,
    v_settings.usd_to_egp_rate,
    round(v_total_usd * v_settings.usd_to_egp_rate, 2),
    v_coupon.id, v_coupon.code, nullif(trim(p_customer_note), '')
  ) returning * into v_order;

  -- Second pass: snapshot the selected offer and create one supplier job per unit.
  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_offer_id := (v_item ->> 'offer_id')::uuid;
    v_quantity := (v_item ->> 'quantity')::integer;
    v_input_values := coalesce(v_item -> 'input_values', '{}'::jsonb);

    select * into strict v_product
    from public.store_products where id = v_product_id;
    select * into strict v_offer
    from public.store_product_offers
    where id = v_offer_id and product_id = v_product_id;

    v_supplier_product_id := coalesce(
      nullif(trim(v_product.supplier_product_id), ''),
      nullif(trim(v_product.provider_data ->> 'provider_category_id'), '')
    );
    if v_supplier_product_id is null then
      raise exception 'Provider product ID is missing';
    end if;

    v_unit_price_usd := round(
      v_offer.supplier_price_usd + v_offer.profit_usd,
      8
    );
    v_item_total_usd := round(v_unit_price_usd * v_quantity, 8);

    insert into public.product_order_items (
      order_id, product_id, offer_id, provider_offer_id, product_name,
      offer_name, product_image_url, supplier_product_id, quantity,
      supplier_price_usd, profit_usd, unit_price_usd, total_price_usd,
      input_values, status
    ) values (
      v_order.id, v_product.id, v_offer.id, v_offer.provider_offer_id,
      v_product.name_ar, v_offer.name_ar, v_product.image_url,
      v_supplier_product_id, v_quantity, v_offer.supplier_price_usd,
      v_offer.profit_usd, v_unit_price_usd, v_item_total_usd,
      v_input_values, 'pending'
    ) returning id into v_order_item_id;

    for v_unit_number in 1..v_quantity
    loop
      insert into public.product_supplier_jobs (
        order_id, order_item_id, product_id, offer_id, provider_offer_id,
        supplier_product_id, unit_number, quantity, input_values, status
      ) values (
        v_order.id, v_order_item_id, v_product.id, v_offer.id,
        v_offer.provider_offer_id, v_supplier_product_id,
        v_unit_number, 1, v_input_values, 'pending'
      );
    end loop;
  end loop;

  update public.account_wallets
  set balance_usd = v_balance_after, updated_at = now()
  where id = v_wallet.id;

  insert into public.account_wallet_transactions (
    user_id, wallet_id, type, amount_usd, balance_before_usd,
    balance_after_usd, exchange_rate, amount_egp_snapshot,
    reference_type, reference_id, description, created_by
  ) values (
    v_user_id, v_wallet.id, 'purchase', v_total_usd, v_balance_before,
    v_balance_after, v_settings.usd_to_egp_rate,
    round(v_total_usd * v_settings.usd_to_egp_rate, 2),
    'product_order', v_order.id,
    format('Payment for product order %s', v_order.order_id), v_user_id
  );

  insert into public.product_order_status_history (
    order_id, old_status, new_status, changed_by, note
  ) values (
    v_order.id, null, 'pending', v_user_id,
    'Product order created and wallet charged'
  );

  if v_coupon.id is not null then
    insert into public.checkout_coupon_usage (
      coupon_id, user_id, order_id, discount_usd
    ) values (
      v_coupon.id, v_user_id, v_order.id, v_discount_usd
    );

    update public.checkout_coupons
    set usage_count = usage_count + 1, updated_at = now()
    where id = v_coupon.id;
  end if;

  insert into public.notifications (
    user_id, type, title, message, entity_type, entity_id, action_url
  ) values (
    v_user_id, 'product_order_created', 'تم إنشاء طلبك',
    format(
      'تم إنشاء الطلب %s وخصم %s دولار من محفظتك.',
      v_order.order_id,
      trim(to_char(v_total_usd, 'FM9999999990.0000'))
    ),
    'product_order', v_order.id, '/orders'
  );

  insert into public.activity_logs (
    user_id, actor_id, action, entity_type, entity_id, description, new_data
  ) values (
    v_user_id, v_user_id, 'product_order_created', 'product_order',
    v_order.id, 'Customer created product order',
    jsonb_build_object(
      'order_id', v_order.order_id,
      'subtotal_usd', v_subtotal_usd,
      'discount_usd', v_discount_usd,
      'total_usd', v_total_usd,
      'balance_before_usd', v_balance_before,
      'balance_after_usd', v_balance_after,
      'items_count', v_items_count
    )
  );

  return v_order;
end;
$function$;

commit;
