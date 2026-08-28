begin;

create or replace function public.claim_item4gamer_supplier_jobs(p_limit integer default 10)
returns setof public.product_supplier_jobs
language plpgsql
security definer
set search_path = ''
as $function$
begin
  return query
  with candidates as (
    select job.id
    from public.product_supplier_jobs as job
    where job.provider_code = 'item4gamer'
      and job.status in ('pending', 'sending')
      and job.delivery_state = 'not_sent'
      and job.supplier_order_id is null
      and job.idempotency_key is not null
      and job.supplier_product_id is not null
      and job.provider_offer_id is not null
    order by job.created_at asc
    for update skip locked
    limit least(50, greatest(1, coalesce(p_limit, 10)))
  )
  update public.product_supplier_jobs as job
  set
    status = 'sending',
    delivery_state = 'dispatching',
    attempts_count = job.attempts_count + 1,
    last_error = null,
    updated_at = now()
  from candidates
  where job.id = candidates.id
  returning job.*;
end;
$function$;

revoke all on function public.claim_item4gamer_supplier_jobs(integer)
from public, anon, authenticated;
grant execute on function public.claim_item4gamer_supplier_jobs(integer)
to service_role;

create index if not exists product_supplier_jobs_item4gamer_claim_idx
on public.product_supplier_jobs (created_at, id)
where provider_code = 'item4gamer'
  and status in ('pending', 'sending')
  and delivery_state = 'not_sent'
  and supplier_order_id is null;

notify pgrst, 'reload schema';
commit;
