begin;

-- Removes only the experimental reward-wheel feature.
-- Existing orders, profiles, points, coupons and reward-store data are untouched.
drop function if exists public.admin_save_reward_wheel(boolean,numeric,text,jsonb);
drop function if exists public.spin_reward_wheel();
drop function if exists public.get_reward_wheel_state();

drop table if exists public.reward_wheel_spins;
drop table if exists public.reward_wheel_prizes;
drop table if exists public.reward_wheel_settings;

notify pgrst, 'reload schema';
commit;
