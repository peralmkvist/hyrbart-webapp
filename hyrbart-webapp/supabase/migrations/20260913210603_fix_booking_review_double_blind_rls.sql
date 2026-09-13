create or replace function public.has_own_booking_review(p_booking_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.booking_reviews r
    where r.booking_id = p_booking_id
      and r.reviewer_id = auth.uid()
  );
$$;

revoke all on function public.has_own_booking_review(uuid) from public;
grant execute on function public.has_own_booking_review(uuid) to authenticated;

drop policy if exists "review participants read after reveal" on public.booking_reviews;
create policy "review participants read after reveal"
on public.booking_reviews
for select
to authenticated
using (
  reviewer_id = auth.uid()
  or (
    reviewee_id = auth.uid()
    and coalesce(moderation_status, 'visible') <> 'hidden'
    and (
      public.has_own_booking_review(booking_id)
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
  reviewer_id = auth.uid()
  and exists (
    select 1
    from public.bookings b
    where b.id = booking_reviews.booking_id
      and (
        (booking_reviews.reviewer_role = 'renter' and b.renter_id = auth.uid() and b.owner_id = booking_reviews.reviewee_id)
        or
        (booking_reviews.reviewer_role = 'owner' and b.owner_id = auth.uid() and b.renter_id = booking_reviews.reviewee_id)
      )
      and b.status = 'completed'::public.booking_status
      and now() <= (coalesce(b.completed_at, b.updated_at, b.created_at) + interval '7 days')
  )
);
