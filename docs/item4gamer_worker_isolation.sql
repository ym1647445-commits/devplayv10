begin;

create or replace function public.isolate_item4gamer_supplier_job()
returns trigger language plpgsql security definer set search_path='' as $function$
begin
  if new.provider_code = 'item4gamer' and new.status = 'pending' then
    new.status := 'sending';
    new.delivery_state := 'not_sent';
  end if;
  return new;
end;
$function$;

drop trigger if exists zz_isolate_item4gamer_supplier_job on public.product_supplier_jobs;
create trigger zz_isolate_item4gamer_supplier_job
before insert on public.product_supplier_jobs
for each row execute function public.isolate_item4gamer_supplier_job();

update public.providers
set api_base_url = 'https://item4gamer.com/wp-json/reseller/v1',
    updated_at = now()
where code = 'item4gamer';

notify pgrst, 'reload schema';
commit;
