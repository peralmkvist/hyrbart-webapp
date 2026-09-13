create policy "deny_client_api_rate_limits"
on public.api_rate_limits
for all
to anon, authenticated
using (false)
with check (false);
