-- STEP 2/3: run this file alone after step 1 succeeds.
-- Keeping the first lock very short avoids the previous deadlock.
set lock_timeout = '15s';

alter table public.store_product_offers
  add column if not exists offer_group_id uuid;

notify pgrst, 'reload schema';

