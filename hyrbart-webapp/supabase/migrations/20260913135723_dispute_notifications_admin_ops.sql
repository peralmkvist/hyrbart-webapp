alter table public.booking_cases
  add column if not exists resolution_type text,
  add column if not exists refund_amount integer,
  add column if not exists payout_amount integer,
  add column if not exists resolution_note text,
  add column if not exists resolved_by uuid references auth.users(id);

alter table public.booking_cases drop constraint if exists booking_cases_resolution_type_check;
alter table public.booking_cases add constraint booking_cases_resolution_type_check
  check (resolution_type is null or resolution_type in ('full_refund','full_payout','split','no_financial_action'));
alter table public.booking_cases add constraint booking_cases_refund_amount_check check (refund_amount is null or refund_amount >= 0);
alter table public.booking_cases add constraint booking_cases_payout_amount_check check (payout_amount is null or payout_amount >= 0);

alter table public.profiles
  add column if not exists account_status text not null default 'active',
  add column if not exists account_status_reason text,
  add column if not exists account_status_changed_at timestamptz;
alter table public.profiles drop constraint if exists profiles_account_status_check;
alter table public.profiles add constraint profiles_account_status_check check (account_status in ('active','restricted','frozen'));

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete cascade,
  notification_type text not null,
  title text not null,
  body text not null,
  url text,
  event_key text unique,
  push_status text not null default 'pending' check (push_status in ('pending','sent','skipped','failed')),
  email_status text not null default 'pending' check (email_status in ('pending','sent','skipped','failed')),
  push_sent_at timestamptz,
  email_sent_at timestamptz,
  read_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists user_notifications_user_created_idx on public.user_notifications(user_id,created_at desc);
create index if not exists user_notifications_booking_idx on public.user_notifications(booking_id);
alter table public.user_notifications enable row level security;
drop policy if exists user_notifications_select_own on public.user_notifications;
create policy user_notifications_select_own on public.user_notifications for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists user_notifications_update_own on public.user_notifications;
create policy user_notifications_update_own on public.user_notifications for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create table if not exists public.admin_support_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete cascade,
  case_id uuid references public.booking_cases(id) on delete cascade,
  admin_user_id uuid not null references auth.users(id),
  note text not null check (char_length(note) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index if not exists admin_support_notes_user_idx on public.admin_support_notes(user_id,created_at desc);
alter table public.admin_support_notes enable row level security;
drop policy if exists admin_support_notes_deny_clients on public.admin_support_notes;
create policy admin_support_notes_deny_clients on public.admin_support_notes for all to anon,authenticated using (false) with check (false);

create table if not exists public.risk_flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete cascade,
  product_id text,
  severity text not null default 'medium' check (severity in ('low','medium','high','critical')),
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  reason text not null check (char_length(reason) between 3 and 1000),
  created_by uuid not null references auth.users(id),
  resolved_by uuid references auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists risk_flags_user_idx on public.risk_flags(user_id,status);
create index if not exists risk_flags_booking_idx on public.risk_flags(booking_id,status);
alter table public.risk_flags enable row level security;
drop policy if exists risk_flags_deny_clients on public.risk_flags;
create policy risk_flags_deny_clients on public.risk_flags for all to anon,authenticated using (false) with check (false);

create table if not exists public.listing_moderation (
  product_id text primary key,
  status text not null default 'active' check (status in ('active','hidden')),
  reason text,
  changed_by uuid references auth.users(id),
  changed_at timestamptz not null default now()
);
alter table public.listing_moderation enable row level security;
drop policy if exists listing_moderation_deny_clients on public.listing_moderation;
create policy listing_moderation_deny_clients on public.listing_moderation for all to anon,authenticated using (false) with check (false);

drop policy if exists booking_automation_events_deny_clients on public.booking_automation_events;
create policy booking_automation_events_deny_clients on public.booking_automation_events for all to anon,authenticated using (false) with check (false);
