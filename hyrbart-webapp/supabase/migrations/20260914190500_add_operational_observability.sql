create table if not exists public.operational_events (
  id uuid primary key default gen_random_uuid(),
  correlation_id text not null,
  severity text not null check (severity in ('info','warning','error','critical')),
  event_type text not null,
  source text not null,
  route text,
  entity_type text,
  entity_id text,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists operational_events_correlation_idx on public.operational_events(correlation_id, created_at desc);
create index if not exists operational_events_severity_created_idx on public.operational_events(severity, created_at desc);
create index if not exists operational_events_type_created_idx on public.operational_events(event_type, created_at desc);

alter table public.operational_events enable row level security;
revoke all on table public.operational_events from anon, authenticated;
grant all on table public.operational_events to service_role;

create or replace function public.block_operational_event_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'operational_events is append-only';
end;
$$;

revoke all on function public.block_operational_event_mutation() from public, anon, authenticated;
grant execute on function public.block_operational_event_mutation() to service_role;

drop trigger if exists operational_events_no_update on public.operational_events;
create trigger operational_events_no_update before update on public.operational_events for each row execute function public.block_operational_event_mutation();

drop trigger if exists operational_events_no_delete on public.operational_events;
create trigger operational_events_no_delete before delete on public.operational_events for each row execute function public.block_operational_event_mutation();
