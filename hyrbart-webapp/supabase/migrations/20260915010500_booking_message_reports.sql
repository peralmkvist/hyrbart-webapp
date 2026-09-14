create table if not exists public.booking_message_reports (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.booking_messages(id) on delete restrict,
  booking_id uuid not null references public.bookings(id) on delete restrict,
  reporter_id uuid not null references public.profiles(id) on delete restrict,
  reported_user_id uuid not null references public.profiles(id) on delete restrict,
  reason text not null check (reason in ('harassment','hate','threats','personal_data','spam','fraud','other')),
  details text null check (details is null or char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz null,
  reviewed_by uuid null references auth.users(id) on delete set null,
  resolution_note text null check (resolution_note is null or char_length(resolution_note) <= 2000),
  unique (message_id, reporter_id),
  check (reporter_id <> reported_user_id)
);

create index if not exists booking_message_reports_booking_idx on public.booking_message_reports(booking_id, created_at desc);
create index if not exists booking_message_reports_status_idx on public.booking_message_reports(status, created_at desc);
create index if not exists booking_message_reports_reporter_recent_idx on public.booking_message_reports(reporter_id, created_at desc);

alter table public.booking_message_reports enable row level security;

drop policy if exists "reporters can read own message reports" on public.booking_message_reports;
create policy "reporters can read own message reports" on public.booking_message_reports
for select to authenticated using (reporter_id = auth.uid());

drop policy if exists "participants can report counterpart messages" on public.booking_message_reports;
create policy "participants can report counterpart messages" on public.booking_message_reports
for insert to authenticated with check (
  reporter_id = auth.uid()
  and reporter_id <> reported_user_id
  and exists (
    select 1 from public.bookings b
    where b.id = booking_id and auth.uid() in (b.renter_id, b.owner_id)
  )
  and exists (
    select 1 from public.booking_messages m
    where m.id = message_id and m.booking_id = booking_id and m.sender_id = reported_user_id and m.sender_id <> auth.uid()
  )
);

comment on table public.booking_message_reports is 'Immutable user reports of counterpart booking-chat messages for support moderation; original messages are not changed.';
