create table if not exists public.booking_agreements (
  booking_id uuid primary key references public.bookings(id) on delete restrict,
  renter_id uuid not null,
  owner_id uuid not null,
  reference text not null,
  agreement_version text not null default '1',
  snapshot jsonb not null,
  content_hash text not null,
  generated_at timestamptz not null default now(),
  constraint booking_agreements_hash_format check (content_hash ~ '^[0-9a-f]{64}$')
);

create index if not exists booking_agreements_renter_idx on public.booking_agreements(renter_id);
create index if not exists booking_agreements_owner_idx on public.booking_agreements(owner_id);

alter table public.booking_agreements enable row level security;

revoke all on table public.booking_agreements from anon, authenticated;
grant select on table public.booking_agreements to authenticated;
grant select, insert, update, delete on table public.booking_agreements to service_role;

drop policy if exists "Booking parties can read agreement" on public.booking_agreements;
create policy "Booking parties can read agreement"
on public.booking_agreements
for select
to authenticated
using ((select auth.uid()) = renter_id or (select auth.uid()) = owner_id);
