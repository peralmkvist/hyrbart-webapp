create table if not exists public.critical_product_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null check (event_name in ('activation_completed','booking_created','booking_status_changed','payment_captured','deviation_detected')),
  event_version integer not null default 1,
  actor_id uuid references public.profiles(id) on delete set null,
  booking_id uuid references public.bookings(id) on delete set null,
  product_id text,
  correlation_id text,
  idempotency_key text,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists critical_product_events_idempotency_idx on public.critical_product_events(idempotency_key) where idempotency_key is not null;
create index if not exists critical_product_events_name_created_idx on public.critical_product_events(event_name, created_at desc);
create index if not exists critical_product_events_actor_created_idx on public.critical_product_events(actor_id, created_at desc);
create index if not exists critical_product_events_booking_created_idx on public.critical_product_events(booking_id, created_at desc);

alter table public.critical_product_events enable row level security;
revoke all on public.critical_product_events from public, anon, authenticated;
grant all on public.critical_product_events to service_role;
