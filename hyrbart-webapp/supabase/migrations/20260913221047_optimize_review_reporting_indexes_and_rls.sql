create index if not exists review_reports_reporter_idx on public.review_reports(reporter_id);
create index if not exists review_reports_resolved_by_idx on public.review_reports(resolved_by) where resolved_by is not null;

drop policy if exists "review participants read after reveal" on public.booking_reviews;
create policy "review participants read after reveal"
on public.booking_reviews
for select
to authenticated
using (
  reviewer_id = (select auth.uid())
  or (
    reviewee_id = (select auth.uid())
    and coalesce(moderation_status, 'visible') <> 'hidden'
    and (
      private.has_own_booking_review(booking_id)
      or exists (
        select 1
        from public.bookings b
        where b.id = booking_reviews.booking_id
          and now() > (coalesce(b.completed_at, b.updated_at, b.created_at) + interval '7 days')
      )
    )
  )
);

drop policy if exists "review participants insert own" on public.booking_reviews;
create policy "review participants insert own"
on public.booking_reviews
for insert
to authenticated
with check (
  reviewer_id = (select auth.uid())
  and exists (
    select 1
    from public.bookings b
    where b.id = booking_reviews.booking_id
      and (
        (booking_reviews.reviewer_role = 'renter' and b.renter_id = (select auth.uid()) and b.owner_id = booking_reviews.reviewee_id)
        or
        (booking_reviews.reviewer_role = 'owner' and b.owner_id = (select auth.uid()) and b.renter_id = booking_reviews.reviewee_id)
      )
      and b.status = 'completed'::public.booking_status
      and now() <= (coalesce(b.completed_at, b.updated_at, b.created_at) + interval '7 days')
  )
);
