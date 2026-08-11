begin;

alter table public.support_tickets
  add column if not exists source text not null default 'customer',
  add column if not exists ai_summary text,
  add column if not exists admin_last_read_at timestamptz,
  add column if not exists customer_last_read_at timestamptz;

alter table public.support_tickets drop constraint if exists support_tickets_source_check;
alter table public.support_tickets add constraint support_tickets_source_check
  check (source in ('customer','devplay_ai'));

create or replace function public.send_support_ticket_message(p_ticket_id uuid,p_message text)
returns void language plpgsql security definer set search_path to '' as $f$
declare v_user uuid:=auth.uid();v_ticket public.support_tickets;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if length(trim(p_message))<1 or length(trim(p_message))>3000 then raise exception 'Invalid message'; end if;
  select * into v_ticket from public.support_tickets where id=p_ticket_id and user_id=v_user for update;
  if not found then raise exception 'Ticket not found'; end if;
  if v_ticket.status='closed' then raise exception 'Closed conversation cannot be updated'; end if;
  insert into public.support_ticket_messages(ticket_id,sender_id,sender_role,message)
  values(v_ticket.id,v_user,'customer',trim(p_message));
  update public.support_tickets set status='open',updated_at=now(),customer_last_read_at=now() where id=v_ticket.id;
  insert into public.notifications(user_id,type,title,message,entity_type,entity_id,action_url)
  select p.id,'support_customer_message','رسالة جديدة من عميل',format('%s: %s',coalesce(nullif(pr.full_name,''),pr.customer_id),left(trim(p_message),120)),'support_ticket',v_ticket.id,'/admin/support?ticket='||v_ticket.id
  from public.profiles p cross join public.profiles pr
  where pr.id=v_user and p.status::text='active' and p.role::text in('support','admin','super_admin','owner');
end;$f$;

create or replace function public.create_ai_escalated_ticket(p_category text,p_subject text,p_message text,p_ai_summary text)
returns public.support_tickets language plpgsql security definer set search_path to '' as $f$
declare v_user uuid:=auth.uid();v_ticket public.support_tickets;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_category not in('deposit','order','wallet','account','suggestion','other') then p_category:='other'; end if;
  if length(trim(p_subject))<3 or length(trim(p_subject))>120 then raise exception 'Invalid subject'; end if;
  if length(trim(p_message))<1 or length(trim(p_message))>3000 then raise exception 'Invalid message'; end if;
  insert into public.support_tickets(user_id,category,subject,source,ai_summary)
  values(v_user,p_category,trim(p_subject),'devplay_ai',left(trim(p_ai_summary),3000)) returning * into v_ticket;
  insert into public.support_ticket_messages(ticket_id,sender_id,sender_role,message)
  values(v_ticket.id,v_user,'customer',trim(p_message)),(v_ticket.id,v_user,'devplay_ai','ملخص DevPlay AI للفريق:'||E'\n'||left(trim(p_ai_summary),3000));
  insert into public.notifications(user_id,type,title,message,entity_type,entity_id,action_url)
  select p.id,'support_ai_escalation','DevPlay AI حوّل محادثة',format('%s: %s',coalesce(nullif(pr.full_name,''),pr.customer_id),left(trim(p_subject),100)),'support_ticket',v_ticket.id,'/admin/support?ticket='||v_ticket.id
  from public.profiles p cross join public.profiles pr
  where pr.id=v_user and p.status::text='active' and p.role::text in('support','admin','super_admin','owner');
  return v_ticket;
end;$f$;

create or replace function public.mark_support_ticket_read(p_ticket_id uuid)
returns void language plpgsql security definer set search_path to '' as $f$
declare v_user public.profiles;v_ticket public.support_tickets;
begin
  select * into v_user from public.profiles where id=auth.uid();
  if not found then raise exception 'Authentication required'; end if;
  select * into v_ticket from public.support_tickets where id=p_ticket_id;
  if not found then raise exception 'Ticket not found'; end if;
  if v_user.role::text in('support','admin','super_admin','owner') and v_user.status::text='active' then
    update public.support_tickets set admin_last_read_at=now() where id=p_ticket_id;
  elsif v_ticket.user_id=v_user.id then
    update public.support_tickets set customer_last_read_at=now() where id=p_ticket_id;
  else raise exception 'Permission denied'; end if;
end;$f$;

create or replace function public.admin_list_support_tickets()
returns jsonb language plpgsql security definer set search_path to '' as $f$
declare v_admin public.profiles;v_result jsonb;
begin
  select * into v_admin from public.profiles where id=auth.uid() and status::text='active' and role::text in('support','admin','super_admin','owner');
  if not found then raise exception 'Admin permission required'; end if;
  select coalesce(jsonb_agg(row_data order by (row_data->>'updated_at')::timestamptz desc),'[]'::jsonb) into v_result from(
    select jsonb_build_object('id',t.id,'ticket_id',t.ticket_id,'user_id',t.user_id,'category',t.category,'subject',t.subject,'status',t.status,'priority',t.priority,'source',t.source,'ai_summary',t.ai_summary,'created_at',t.created_at,'updated_at',t.updated_at,'customer_id',p.customer_id,'customer_name',p.full_name,
      'unread_count',(select count(*) from public.support_ticket_messages um where um.ticket_id=t.id and um.sender_role='customer' and um.created_at>coalesce(t.admin_last_read_at,'epoch'::timestamptz)),
      'messages',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'message',m.message,'sender_role',m.sender_role,'created_at',m.created_at) order by m.created_at) from public.support_ticket_messages m where m.ticket_id=t.id),'[]'::jsonb)) row_data
    from public.support_tickets t join public.profiles p on p.id=t.user_id order by t.updated_at desc limit 200
  ) rows;
  return v_result;
end;$f$;

revoke all on function public.send_support_ticket_message(uuid,text) from public;
revoke all on function public.create_ai_escalated_ticket(text,text,text,text) from public;
revoke all on function public.mark_support_ticket_read(uuid) from public;
grant execute on function public.send_support_ticket_message(uuid,text) to authenticated;
grant execute on function public.create_ai_escalated_ticket(text,text,text,text) to authenticated;
grant execute on function public.mark_support_ticket_read(uuid) to authenticated;

commit;
