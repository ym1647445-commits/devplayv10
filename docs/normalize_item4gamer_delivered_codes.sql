begin;

create or replace function public.normalize_item4gamer_delivered_codes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_codes jsonb;
begin
  if new.provider_code <> 'item4gamer'
     or new.supplier_response is null
     or jsonb_typeof(new.supplier_response) <> 'object' then
    return new;
  end if;

  select coalesce(jsonb_agg(to_jsonb(trim(entry ->> 'code'))), '[]'::jsonb)
  into v_codes
  from jsonb_array_elements(
    case
      when jsonb_typeof(new.supplier_response -> 'codes') = 'array'
        then new.supplier_response -> 'codes'
      else '[]'::jsonb
    end
  ) as entry
  where nullif(trim(entry ->> 'code'), '') is not null;

  if jsonb_array_length(v_codes) > 0 then
    new.supplier_response := jsonb_set(
      new.supplier_response,
      '{delivered_codes}',
      v_codes,
      true
    );
  end if;

  return new;
end;
$function$;

drop trigger if exists normalize_item4gamer_delivered_codes_trigger
on public.product_supplier_jobs;

create trigger normalize_item4gamer_delivered_codes_trigger
before insert or update of supplier_response
on public.product_supplier_jobs
for each row
execute function public.normalize_item4gamer_delivered_codes();

-- Clean existing Item4Gamer responses that already contain structured codes.
update public.product_supplier_jobs job
set
  supplier_response = jsonb_set(
    job.supplier_response,
    '{delivered_codes}',
    cleaned.codes,
    true
  ),
  updated_at = now()
from lateral (
  select coalesce(jsonb_agg(to_jsonb(trim(entry ->> 'code'))), '[]'::jsonb) as codes
  from jsonb_array_elements(
    case
      when jsonb_typeof(job.supplier_response -> 'codes') = 'array'
        then job.supplier_response -> 'codes'
      else '[]'::jsonb
    end
  ) as entry
  where nullif(trim(entry ->> 'code'), '') is not null
) cleaned
where job.provider_code = 'item4gamer'
  and jsonb_typeof(job.supplier_response) = 'object'
  and jsonb_array_length(cleaned.codes) > 0;

notify pgrst, 'reload schema';
commit;
