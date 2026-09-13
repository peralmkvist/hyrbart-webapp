create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

alter table public.bookings
  add column if not exists request_expires_at timestamptz,
  add column if not exists reservation_expires_at timestamptz,
  add column if not exists payment_due_at timestamptz,
  add column if not exists pickup_due_at timestamptz,
  add column if not exists return_due_at timestamptz,
  add column if not exists auto_complete_at timestamptz;

create table if not exists public.booking_automation_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  event_type text not null,
  event_key text not null unique,
  scheduled_for timestamptz not null,
  status text not null default 'processing' check (status in ('processing','succeeded','failed')),
  attempts integer not null default 1 check (attempts > 0),
  last_error text,
  executed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.booking_automation_events enable row level security;
revoke all on public.booking_automation_events from anon, authenticated;

create index if not exists booking_automation_events_booking_id_idx on public.booking_automation_events(booking_id);
create index if not exists booking_automation_events_status_scheduled_idx on public.booking_automation_events(status, scheduled_for);
create index if not exists bookings_request_expires_at_idx on public.bookings(request_expires_at) where status = 'requested';
create index if not exists bookings_reservation_expires_at_idx on public.bookings(reservation_expires_at) where status = 'reserved';
create index if not exists bookings_payment_due_at_idx on public.bookings(payment_due_at) where status = 'accepted';
create index if not exists bookings_pickup_due_at_idx on public.bookings(pickup_due_at) where status = 'paid';
create index if not exists bookings_return_due_at_idx on public.bookings(return_due_at) where status = 'active';
create index if not exists bookings_auto_complete_at_idx on public.bookings(auto_complete_at) where status = 'returned';

update public.bookings set pickup_due_at = coalesce(pickup_due_at, rental_start_at)
where pickup_due_at is null and rental_start_at is not null;

update public.bookings
set return_due_at = coalesce(return_due_at, ((end_date::text || ' ' || to_char(rental_start_at at time zone 'Europe/Stockholm', 'HH24:MI:SS'))::timestamp at time zone 'Europe/Stockholm'))
where return_due_at is null and rental_start_at is not null;

update public.bookings set request_expires_at = created_at + interval '24 hours'
where status = 'requested' and request_expires_at is null;
update public.bookings set reservation_expires_at = created_at + interval '12 hours'
where status = 'reserved' and reservation_expires_at is null;
