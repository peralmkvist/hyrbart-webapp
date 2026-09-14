create or replace function public.block_operational_event_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'operational_events is append-only';
end;
$$;

revoke all on function public.block_operational_event_mutation() from public, anon, authenticated;
grant execute on function public.block_operational_event_mutation() to service_role;
