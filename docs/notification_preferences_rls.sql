begin;

alter table public.notification_preferences enable row level security;

do $policies$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'notification_preferences'
      and policyname = 'Users can read own notification preferences'
  ) then
    create policy "Users can read own notification preferences"
      on public.notification_preferences
      for select
      to authenticated
      using (user_id = (select auth.uid()));
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'notification_preferences'
      and policyname = 'Users can create own notification preferences'
  ) then
    create policy "Users can create own notification preferences"
      on public.notification_preferences
      for insert
      to authenticated
      with check (user_id = (select auth.uid()));
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'notification_preferences'
      and policyname = 'Users can update own notification preferences'
  ) then
    create policy "Users can update own notification preferences"
      on public.notification_preferences
      for update
      to authenticated
      using (user_id = (select auth.uid()))
      with check (user_id = (select auth.uid()));
  end if;
end
$policies$;

commit;
