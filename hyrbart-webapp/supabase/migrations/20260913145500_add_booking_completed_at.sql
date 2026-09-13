alter table public.bookings add column if not exists completed_at timestamptz;

update public.bookings
set completed_at = coalesce(completed_at, updated_at)
where status = 'completed' and completed_at is null;
