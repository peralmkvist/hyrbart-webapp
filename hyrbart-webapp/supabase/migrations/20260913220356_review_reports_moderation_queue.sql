create table if not exists public.review_reports (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.booking_reviews(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('harassment','hate','personal_data','false_information','irrelevant','other')),
  details text,
  status text not null default 'open' check (status in ('open','resolved','dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id),
  resolution_note text,
  unique (review_id, reporter_id)
);

alter table public.review_reports enable row level security;
revoke all on table public.review_reports from anon, authenticated;
grant select, insert, update, delete on table public.review_reports to service_role;

create index if not exists review_reports_status_created_idx
  on public.review_reports(status, created_at desc);
create index if not exists review_reports_review_idx
  on public.review_reports(review_id, status);
