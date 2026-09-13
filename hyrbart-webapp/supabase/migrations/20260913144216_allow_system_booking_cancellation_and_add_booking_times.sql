alter table public.bookings drop constraint if exists bookings_cancelled_by_check;

alter table public.bookings
  add constraint bookings_cancelled_by_check
  check (cancelled_by is null or cancelled_by = any (array['renter'::text,'owner'::text,'system'::text]));

alter table public.bookings
  add column if not exists pickup_time time without time zone,
  add column if not exists return_time time without time zone;

update public.bookings
set
  pickup_time = coalesce(pickup_time, (pickup_due_at at time zone 'Europe/Stockholm')::time),
  return_time = coalesce(return_time, (return_due_at at time zone 'Europe/Stockholm')::time)
where pickup_due_at is not null or return_due_at is not null;
