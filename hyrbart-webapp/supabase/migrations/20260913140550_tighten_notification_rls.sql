drop policy if exists user_notifications_update_own on public.user_notifications;
drop policy if exists user_notifications_deny_client_writes on public.user_notifications;
create policy user_notifications_deny_client_writes on public.user_notifications for all to anon,authenticated using (false) with check (false);
