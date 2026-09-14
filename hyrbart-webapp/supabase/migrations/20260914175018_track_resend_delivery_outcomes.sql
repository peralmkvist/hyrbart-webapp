alter table public.user_notifications
  add column if not exists email_provider_id text,
  add column if not exists email_last_event text,
  add column if not exists email_delivered_at timestamptz,
  add column if not exists email_terminal_failed_at timestamptz;

create index if not exists idx_user_notifications_email_provider_id
  on public.user_notifications(email_provider_id)
  where email_provider_id is not null;
