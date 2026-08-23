-- OPTIONAL FINAL SAFETY STEP: run alone after the organizer is working.
set lock_timeout = '15s';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'store_product_offers_offer_group_id_fkey'
      and conrelid = 'public.store_product_offers'::regclass
  ) then
    alter table public.store_product_offers
      add constraint store_product_offers_offer_group_id_fkey
      foreign key (offer_group_id)
      references public.store_product_offer_groups(id)
      on delete set null
      not valid;
  end if;
end $$;

