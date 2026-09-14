revoke all on table public.search_alerts from authenticated;
revoke all on table public.search_alert_matches from authenticated;
grant select, insert, update, delete on table public.search_alerts to authenticated;
