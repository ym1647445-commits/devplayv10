begin;

create or replace function public.set_customer_birth_date(p_birth_date date)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_birth_date is null or p_birth_date > current_date or p_birth_date < date '1900-01-01' then
    raise exception 'Invalid birth date';
  end if;

  select * into v_profile from public.profiles where id = v_user_id for update;
  if not found then raise exception 'Customer profile not found'; end if;
  if v_profile.role::text <> 'customer' then raise exception 'Customer permission required'; end if;
  if v_profile.birth_date_locked or v_profile.birth_date is not null then
    raise exception 'Birth date is locked';
  end if;

  update public.profiles
  set birth_date = p_birth_date, birth_date_locked = true,
      birth_date_added_at = now(), birth_date_updated_by = v_user_id, updated_at = now()
  where id = v_user_id;

  insert into public.activity_logs (user_id,actor_id,action,entity_type,entity_id,description,new_data)
  values (v_user_id,v_user_id,'customer_birth_date_added','profile',v_user_id,
    'Customer added and locked birth date',jsonb_build_object('birth_date',p_birth_date));

  return jsonb_build_object('birth_date',p_birth_date,'birth_date_locked',true);
end;
$function$;

create or replace function public.admin_update_customer_birth_date(
  p_user_id uuid,
  p_birth_date date,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_admin_id uuid := auth.uid();
  v_admin public.profiles;
  v_customer public.profiles;
  v_reason text := nullif(trim(p_reason),'');
  v_old_date date;
begin
  if v_admin_id is null then raise exception 'Authentication required'; end if;
  select * into v_admin from public.profiles where id = v_admin_id;
  if not found or v_admin.status <> 'active'
     or v_admin.role::text not in ('admin','super_admin','owner') then
    raise exception 'Admin permission required';
  end if;
  if p_birth_date is null or p_birth_date > current_date or p_birth_date < date '1900-01-01' then
    raise exception 'Invalid birth date';
  end if;
  if v_reason is null or length(v_reason) < 5 then raise exception 'Birth date change reason is required'; end if;

  select * into v_customer from public.profiles where id = p_user_id for update;
  if not found or v_customer.role::text <> 'customer' then raise exception 'Customer profile not found'; end if;
  v_old_date := v_customer.birth_date;

  update public.profiles
  set birth_date = p_birth_date, birth_date_locked = true,
      birth_date_added_at = coalesce(birth_date_added_at,now()),
      birth_date_updated_by = v_admin_id, updated_at = now()
  where id = p_user_id;

  insert into public.activity_logs (
    user_id,actor_id,action,entity_type,entity_id,description,old_data,new_data
  ) values (
    p_user_id,v_admin_id,'admin_customer_birth_date_updated','profile',p_user_id,v_reason,
    jsonb_build_object('birth_date',v_old_date),jsonb_build_object('birth_date',p_birth_date,'locked',true)
  );

  insert into public.notifications (user_id,type,title,message,entity_type,entity_id,action_url)
  values (p_user_id,'profile_updated','تم تصحيح تاريخ ميلادك',
    'قام فريق خدمة العملاء بتصحيح تاريخ الميلاد المسجل بحسابك.',
    'profile',p_user_id,'/settings');

  return jsonb_build_object('birth_date',p_birth_date,'birth_date_locked',true,'previous_birth_date',v_old_date);
end;
$function$;

revoke all on function public.set_customer_birth_date(date) from public;
revoke all on function public.admin_update_customer_birth_date(uuid,date,text) from public;
grant execute on function public.set_customer_birth_date(date) to authenticated;
grant execute on function public.admin_update_customer_birth_date(uuid,date,text) to authenticated;

commit;
