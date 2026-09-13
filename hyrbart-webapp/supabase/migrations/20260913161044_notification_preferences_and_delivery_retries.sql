create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  push_enabled boolean not null default true,
  email_enabled boolean not null default true,
  reminder_enabled boolean not null default true,
  review_enabled boolean not null default true,
  locale text not null default 'sv' check (locale in ('sv','en')),
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

drop policy if exists notification_preferences_select_own on public.notification_preferences;
create policy notification_preferences_select_own on public.notification_preferences
for select to authenticated using (auth.uid() = user_id);

revoke insert, update, delete on public.notification_preferences from anon, authenticated;
grant select on public.notification_preferences to authenticated;

alter table public.user_notifications
  add column if not exists push_attempts smallint not null default 0,
  add column if not exists email_attempts smallint not null default 0,
  add column if not exists push_last_error text,
  add column if not exists email_last_error text,
  add column if not exists last_delivery_attempt_at timestamptz;

create index if not exists user_notifications_failed_delivery_idx
  on public.user_notifications(created_at)
  where push_status = 'failed' or email_status = 'failed';
