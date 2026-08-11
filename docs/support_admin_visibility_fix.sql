begin;

create or replace function public.admin_list_support_tickets()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_admin public.profiles;
  v_result jsonb;
begin
  select * into v_admin
  from public.profiles
  where id = auth.uid()
    and status::text = 'active'
    and role::text in ('support','admin','super_admin','owner');

  if not found then raise exception 'Admin permission required'; end if;

  select coalesce(jsonb_agg(row_data order by (row_data->>'updated_at')::timestamptz desc), '[]'::jsonb)
  into v_result
  from (
    select jsonb_build_object(
      'id', t.id,
      'ticket_id', t.ticket_id,
      'user_id', t.user_id,
      'category', t.category,
      'subject', t.subject,
      'status', t.status,
      'priority', t.priority,
      'created_at', t.created_at,
      'updated_at', t.updated_at,
      'customer_id', p.customer_id,
      'customer_name', p.full_name,
      'messages', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', m.id,
          'message', m.message,
          'sender_role', m.sender_role,
          'created_at', m.created_at
        ) order by m.created_at)
        from public.support_ticket_messages m
        where m.ticket_id = t.id
      ), '[]'::jsonb)
    ) as row_data
    from public.support_tickets t
    join public.profiles p on p.id = t.user_id
    order by t.updated_at desc
    limit 100
  ) rows;

  return v_result;
end;
$function$;

revoke all on function public.admin_list_support_tickets() from public;
grant execute on function public.admin_list_support_tickets() to authenticated;

commit;
