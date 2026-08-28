begin;
create table if not exists public.item4gamer_catalog_sync_jobs(
 id uuid primary key default gen_random_uuid(),
 sync_type text not null check(sync_type in('products','variations')),
 category_row_id uuid references public.provider_categories(id) on delete cascade,
 status text not null default 'pending' check(status in('pending','running','completed','failed')),
 requested_by uuid not null references public.profiles(id),
 result jsonb not null default '{}'::jsonb,
 error_message text,
 locked_at timestamptz,
 locked_by text,
 created_at timestamptz not null default now(),
 started_at timestamptz,
 completed_at timestamptz,
 updated_at timestamptz not null default now(),
 check((sync_type='products' and category_row_id is null) or (sync_type='variations' and category_row_id is not null))
);
create unique index if not exists item4gamer_catalog_one_pending_products on public.item4gamer_catalog_sync_jobs(sync_type) where sync_type='products' and status in('pending','running');
create unique index if not exists item4gamer_catalog_one_pending_variation on public.item4gamer_catalog_sync_jobs(category_row_id) where sync_type='variations' and status in('pending','running');
alter table public.item4gamer_catalog_sync_jobs enable row level security;
revoke all on table public.item4gamer_catalog_sync_jobs from public,anon,authenticated;
grant all on table public.item4gamer_catalog_sync_jobs to service_role;
create or replace function public.admin_enqueue_item4gamer_catalog_sync(p_sync_type text,p_category_row_id uuid default null)
returns uuid language plpgsql security definer set search_path='' as $function$
declare v_admin public.profiles;v_id uuid;
begin
 select * into v_admin from public.profiles where id=auth.uid() and status::text='active' and role::text in('admin','super_admin','owner');
 if not found then raise exception 'Admin permission required';end if;
 if p_sync_type not in('products','variations') then raise exception 'Invalid sync type';end if;
 if (p_sync_type='products' and p_category_row_id is not null) or (p_sync_type='variations' and p_category_row_id is null) then raise exception 'Invalid catalog sync target';end if;
 if p_category_row_id is not null and not exists(select 1 from public.provider_categories where id=p_category_row_id and provider_name='item4gamer') then raise exception 'Item4Gamer category not found';end if;
 select id into v_id from public.item4gamer_catalog_sync_jobs where status in('pending','running') and sync_type=p_sync_type and (p_sync_type='products' or category_row_id=p_category_row_id) order by created_at desc limit 1;
 if v_id is not null then return v_id;end if;
 insert into public.item4gamer_catalog_sync_jobs(sync_type,category_row_id,requested_by) values(p_sync_type,p_category_row_id,v_admin.id) returning id into v_id;
 insert into public.activity_logs(user_id,actor_id,action,entity_type,entity_id,description,new_data) values(v_admin.id,v_admin.id,'item4gamer_catalog_sync_queued','item4gamer_catalog_sync_job',v_id,'Queued Item4Gamer catalog sync on static-IP worker',jsonb_build_object('sync_type',p_sync_type,'category_row_id',p_category_row_id));
 return v_id;
end;$function$;
revoke all on function public.admin_enqueue_item4gamer_catalog_sync(text,uuid) from public,anon;
grant execute on function public.admin_enqueue_item4gamer_catalog_sync(text,uuid) to authenticated;
create or replace function public.claim_item4gamer_catalog_sync_jobs(p_limit integer default 3,p_worker text default 'item4gamer-vps')
returns setof public.item4gamer_catalog_sync_jobs language plpgsql security definer set search_path='' as $function$
begin
 if auth.role()<>'service_role' then raise exception 'Service role required';end if;
 return query with candidates as(select id from public.item4gamer_catalog_sync_jobs where status='pending' order by created_at for update skip locked limit least(10,greatest(1,coalesce(p_limit,3)))) update public.item4gamer_catalog_sync_jobs j set status='running',locked_at=now(),locked_by=left(coalesce(p_worker,'item4gamer-vps'),120),started_at=now(),updated_at=now() from candidates where j.id=candidates.id returning j.*;
end;$function$;
revoke all on function public.claim_item4gamer_catalog_sync_jobs(integer,text) from public,anon,authenticated;
grant execute on function public.claim_item4gamer_catalog_sync_jobs(integer,text) to service_role;
notify pgrst,'reload schema';
commit;