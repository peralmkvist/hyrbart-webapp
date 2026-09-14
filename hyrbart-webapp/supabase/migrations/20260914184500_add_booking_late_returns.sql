create table if not exists public.booking_late_returns (
  booking_id uuid primary key references public.bookings(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  renter_id uuid not null references public.profiles(id) on delete cascade,
  scheduled_return_at timestamptz not null,
  detected_at timestamptz not null default now(),
  returned_at timestamptz,
  overdue_minutes integer not null default 0 check (overdue_minutes >= 0),
  estimated_extension_amount integer not null default 0 check (estimated_extension_amount >= 0),
  currency text not null default 'SEK',
  calculation_version text not null default 'effective-rate-v1',
  fee_status text not null default 'pending_review' check (fee_status in ('pending_review','waived','settled')),
  escalation_level smallint not null default 1 check (escalation_level between 1 and 3),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists booking_late_returns_owner_idx on public.booking_late_returns(owner_id, created_at desc);
create index if not exists booking_late_returns_renter_idx on public.booking_late_returns(renter_id, created_at desc);
create index if not exists booking_late_returns_unresolved_idx on public.booking_late_returns(escalation_level, scheduled_return_at) where resolved_at is null;

alter table public.booking_late_returns enable row level security;
revoke all on public.booking_late_returns from anon, authenticated;
grant select on public.booking_late_returns to authenticated;
grant all on public.booking_late_returns to service_role;

create policy booking_late_returns_participant_select on public.booking_late_returns
for select to authenticated
using ((select auth.uid()) = owner_id or (select auth.uid()) = renter_id);
