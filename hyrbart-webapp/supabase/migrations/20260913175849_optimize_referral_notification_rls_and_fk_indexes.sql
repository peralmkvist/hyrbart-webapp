create index if not exists booking_reviews_moderated_by_idx on public.booking_reviews(moderated_by);
create index if not exists host_referrals_inviter_user_id_idx on public.host_referrals(inviter_user_id);
create index if not exists host_referrals_referred_user_id_idx on public.host_referrals(referred_user_id);
create index if not exists referral_rewards_user_id_idx on public.referral_rewards(user_id);

drop policy if exists "Users can create their own host referrals" on public.host_referrals;
create policy "Users can create their own host referrals"
on public.host_referrals
for insert
to authenticated
with check ((select auth.uid()) = inviter_user_id);

drop policy if exists "Users can read referrals they are part of" on public.host_referrals;
create policy "Users can read referrals they are part of"
on public.host_referrals
for select
to authenticated
using (((select auth.uid()) = inviter_user_id) or ((select auth.uid()) = referred_user_id));

drop policy if exists "Users can read their own referral rewards" on public.referral_rewards;
create policy "Users can read their own referral rewards"
on public.referral_rewards
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "notification_preferences_select_own" on public.notification_preferences;
create policy "notification_preferences_select_own"
on public.notification_preferences
for select
to authenticated
using ((select auth.uid()) = user_id);
