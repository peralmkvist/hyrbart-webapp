revoke all on public.identity_verification_attempts from service_role;
grant select, insert, update, delete on public.identity_verification_attempts to service_role;

revoke all on public.identity_verification_events from service_role;
grant select, insert on public.identity_verification_events to service_role;
