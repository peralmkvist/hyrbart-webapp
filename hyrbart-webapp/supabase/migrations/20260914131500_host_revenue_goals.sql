create table if not exists public.host_revenue_goals (
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null,
  target_amount integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint host_revenue_goals_pkey primary key (user_id, month),
  constraint host_revenue_goals_target_amount_check check (target_amount > 0 and target_amount <= 10000000),
  constraint host_revenue_goals_month_start check (month = date_trunc('month', month::timestamptz)::date)
);

alter table public.host_revenue_goals enable row level security;

drop policy if exists "Users can view own revenue goals" on public.host_revenue_goals;
drop policy if exists "Users can insert own revenue goals" on public.host_revenue_goals;
drop policy if exists "Users can update own revenue goals" on public.host_revenue_goals;
drop policy if exists "Users can delete own revenue goals" on public.host_revenue_goals;

create policy "Users can view own revenue goals"
on public.host_revenue_goals for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert own revenue goals"
on public.host_revenue_goals for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update own revenue goals"
on public.host_revenue_goals for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete own revenue goals"
on public.host_revenue_goals for delete
to authenticated
using ((select auth.uid()) = user_id);
