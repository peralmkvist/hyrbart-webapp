create table if not exists public.search_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('active','paused','expired')),
  query_text text,
  category text,
  place text,
  center_lat double precision,
  center_lng double precision,
  radius_km integer not null default 10 check (radius_km between 1 and 50),
  start_date date not null,
  end_date date not null,
  max_total_price integer check (max_total_price is null or max_total_price >= 0),
  min_rating numeric(2,1) check (min_rating is null or (min_rating >= 0 and min_rating <= 5)),
  discount_only boolean not null default false,
  locale text not null default 'sv' check (locale in ('sv','en')),
  notification_channel text not null default 'in_app_push' check (notification_channel in ('in_app','in_app_push')),
  criteria_hash text not null,
  last_evaluated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date),
  unique (user_id, criteria_hash)
);

create index if not exists search_alerts_status_start_idx on public.search_alerts(status, start_date);
create index if not exists search_alerts_user_created_idx on public.search_alerts(user_id, created_at desc);

create table if not exists public.search_alert_matches (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references public.search_alerts(id) on delete cascade,
  product_key text not null,
  last_signature text,
  is_matching boolean not null default false,
  last_matched_at timestamptz,
  last_notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (alert_id, product_key)
);

create index if not exists search_alert_matches_alert_idx on public.search_alert_matches(alert_id);

alter table public.search_alerts enable row level security;
alter table public.search_alert_matches enable row level security;

revoke all on public.search_alerts from anon;
revoke all on public.search_alert_matches from anon;
grant select,insert,update,delete on public.search_alerts to authenticated;

create policy search_alerts_select_own on public.search_alerts for select to authenticated using ((select auth.uid()) = user_id);
create policy search_alerts_insert_own on public.search_alerts for insert to authenticated with check ((select auth.uid()) = user_id);
create policy search_alerts_update_own on public.search_alerts for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy search_alerts_delete_own on public.search_alerts for delete to authenticated using ((select auth.uid()) = user_id);
