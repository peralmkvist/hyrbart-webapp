alter table public.booking_reviews
  add column if not exists moderation_status text not null default 'visible'
    check (moderation_status in ('visible','hidden')),
  add column if not exists moderation_reason text,
  add column if not exists moderated_at timestamptz,
  add column if not exists moderated_by uuid references auth.users(id);

create index if not exists booking_reviews_public_idx
  on public.booking_reviews(reviewee_id, submitted_at desc)
  where moderation_status = 'visible';
