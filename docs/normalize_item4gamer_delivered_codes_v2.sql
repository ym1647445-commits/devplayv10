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

  select coalesce(
    jsonb_agg(to_jsonb(trim(entry ->> 'code'))),
    '[]'::jsonb
  )
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

-- Build cleaned values in a CTE first. PostgreSQL then allows the UPDATE to
-- join by the job id without an invalid target-table lateral reference.
with cleaned as (
  select
    job.id,
    jsonb_agg(to_jsonb(trim(entry ->> 'code'))) as codes
  from public.product_supplier_jobs as job
  cross join lateral jsonb_array_elements(
    case
      when jsonb_typeof(job.supplier_response -> 'codes') = 'array'
        then job.supplier_response -> 'codes'
      else '[]'::jsonb
    end
  ) as entry
  where job.provider_code = 'item4gamer'
    and jsonb_typeof(job.supplier_response) = 'object'
    and nullif(trim(entry ->> 'code'), '') is not null
  group by job.id
)
update public.product_supplier_jobs as job
set
  supplier_response = jsonb_set(
    job.supplier_response,
    '{delivered_codes}',
    cleaned.codes,
    true
  ),
  updated_at = now()
from cleaned
where job.id = cleaned.id
  and jsonb_array_length(cleaned.codes) > 0;

notify pgrst, 'reload schema';
commit;
