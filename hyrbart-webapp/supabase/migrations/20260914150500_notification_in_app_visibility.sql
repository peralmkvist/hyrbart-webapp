alter table public.user_notifications
  add column if not exists in_app_visible boolean not null default true;

create index if not exists user_notifications_visible_user_created_idx
  on public.user_notifications(user_id, created_at desc)
  where in_app_visible = true;
