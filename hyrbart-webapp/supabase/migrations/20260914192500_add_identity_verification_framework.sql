alter table public.profiles drop constraint if exists profiles_identity_verification_status_check;
alter table public.profiles add constraint profiles_identity_verification_status_check check (identity_verification_status in ('unverified','pending','verified','failed','cancelled','review_required','revoked'));

create table public.identity_verification_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null,
  provider_attempt_id text,
  status text not null default 'pending' check (status in ('pending','verified','failed','cancelled','review_required','revoked')),
  failure_code text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint identity_attempt_provider_attempt_unique unique(provider, provider_attempt_id)
);
create index identity_verification_attempts_user_started_idx on public.identity_verification_attempts(user_id, started_at desc);
alter table public.identity_verification_attempts enable row level security;
revoke all on public.identity_verification_attempts from anon, authenticated;
grant select, insert, update, delete on public.identity_verification_attempts to service_role;

create table public.identity_verification_events (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid references public.identity_verification_attempts(id) on delete set null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null,
  event_type text not null check (event_type in ('started','pending','verified','failed','cancelled','review_required','revoked','retry_requested','provider_rejected')),
  provider_event_id text,
  correlation_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint identity_verification_events_provider_event_unique unique(provider, provider_event_id)
);
create index identity_verification_events_user_created_idx on public.identity_verification_events(user_id, created_at desc);
create index identity_verification_events_attempt_created_idx on public.identity_verification_events(attempt_id, created_at desc);
alter table public.identity_verification_events enable row level security;
revoke all on public.identity_verification_events from anon, authenticated;
grant select, insert on public.identity_verification_events to service_role;

create or replace function public.prevent_identity_verification_event_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'IDENTITY_VERIFICATION_EVENTS_APPEND_ONLY';
end;
$$;
revoke all on function public.prevent_identity_verification_event_mutation() from public, anon, authenticated;
grant execute on function public.prevent_identity_verification_event_mutation() to service_role;
create trigger identity_verification_events_append_only
before update or delete on public.identity_verification_events
for each row execute function public.prevent_identity_verification_event_mutation();

comment on table public.identity_verification_attempts is 'Server-only identity verification attempts. Never stores BankID secrets, personal identity numbers or raw provider payloads.';
comment on table public.identity_verification_events is 'Append-only server-side identity verification audit trail with sanitized metadata only.';
