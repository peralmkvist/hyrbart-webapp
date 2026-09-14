create table if not exists public.notification_channel_preferences (
  user_id uuid not null references public.profiles(id) on delete cascade,
  notification_type text not null,
  in_app boolean not null default true,
  push boolean not null default true,
  email boolean not null default true,
  sms boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, notification_type),
  constraint notification_channel_preferences_type_check check (notification_type in ('follower','booking','booking_update','message','followed_host_listing','favorite_price_change','search_alert','pickup_return_reminder'))
);

alter table public.notification_channel_preferences enable row level security;
revoke all on table public.notification_channel_preferences from anon;
revoke all on table public.notification_channel_preferences from authenticated;
grant select on table public.notification_channel_preferences to authenticated;

create policy "notification_channel_preferences_select_own"
on public.notification_channel_preferences for select
to authenticated
using ((select auth.uid()) = user_id);

create table if not exists public.notification_preference_audit (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  notification_type text not null,
  channel text not null,
  enabled boolean not null,
  created_at timestamptz not null default now(),
  constraint notification_preference_audit_type_check check (notification_type in ('follower','booking','booking_update','message','followed_host_listing','favorite_price_change','search_alert','pickup_return_reminder')),
  constraint notification_preference_audit_channel_check check (channel in ('in_app','push','email','sms'))
);

alter table public.notification_preference_audit enable row level security;
revoke all on table public.notification_preference_audit from anon;
revoke all on table public.notification_preference_audit from authenticated;
grant select on table public.notification_preference_audit to authenticated;

create policy "notification_preference_audit_select_own"
on public.notification_preference_audit for select
to authenticated
using ((select auth.uid()) = user_id);

create index if not exists notification_preference_audit_user_created_idx on public.notification_preference_audit(user_id, created_at desc);
