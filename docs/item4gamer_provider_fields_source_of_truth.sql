-- Item4Gamer owns its offer input fields. Manual bulk fields must never
-- overwrite provider field keys such as game_user_id, save_id, zone_id, etc.
-- Safe to run more than once.

create or replace function public.item4gamer_fields_from_raw(p_raw jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      jsonb_strip_nulls(
        jsonb_build_object(
          'id', field ->> 'data_name',
          'label', coalesce(nullif(field ->> 'name', ''), field ->> 'data_name'),
          'type', case
            when lower(coalesce(field ->> 'type', 'text')) in ('number', 'email', 'url', 'tel')
              then lower(field ->> 'type')
            else 'text'
          end,
          'required', coalesce((field ->> 'required')::boolean, false)
        )
      )
      order by ordinality
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(
    case
      when jsonb_typeof(coalesce(p_raw -> 'fields', '[]'::jsonb)) = 'array'
        then coalesce(p_raw -> 'fields', '[]'::jsonb)
      else '[]'::jsonb
    end
  ) with ordinality as source(field, ordinality)
  where nullif(field ->> 'data_name', '') is not null;
$$;

create or replace function public.protect_item4gamer_offer_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_raw jsonb;
begin
  if new.provider_name <> 'item4gamer' then
    return new;
  end if;

  if new.provider_offer_row_id is not null then
    select raw_data into v_raw
    from public.provider_offers
    where id = new.provider_offer_row_id;
  end if;

  v_raw := coalesce(
    v_raw,
    new.provider_data -> 'raw_data',
    '{}'::jsonb
  );

  new.required_fields := public.item4gamer_fields_from_raw(v_raw);
  new.provider_data := coalesce(new.provider_data, '{}'::jsonb) - 'target_account_field';
  return new;
end;
$$;

drop trigger if exists protect_item4gamer_offer_fields_trigger
  on public.store_product_offers;

create trigger protect_item4gamer_offer_fields_trigger
before insert or update of required_fields, provider_offer_row_id, provider_data
on public.store_product_offers
for each row
execute function public.protect_item4gamer_offer_fields();

-- Restore every existing Item4Gamer offer from its own provider payload.
update public.store_product_offers as offer
set
  required_fields = public.item4gamer_fields_from_raw(source.raw_data),
  provider_data = coalesce(offer.provider_data, '{}'::jsonb) - 'target_account_field',
  updated_at = now()
from public.provider_offers as source
where offer.provider_name = 'item4gamer'
  and source.id = offer.provider_offer_row_id;

-- Parent fields must not be used as a manual fallback for Item4Gamer products.
update public.store_products
set
  required_fields = '[]'::jsonb,
  provider_data = coalesce(provider_data, '{}'::jsonb) - 'target_account_field',
  updated_at = now()
where provider_data ->> 'provider' = 'item4gamer';

notify pgrst, 'reload schema';

