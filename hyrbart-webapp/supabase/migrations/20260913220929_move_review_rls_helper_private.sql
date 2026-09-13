create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.has_own_booking_review(p_booking_id uuid)
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

revoke all on function private.has_own_booking_review(uuid) from public, anon;
grant execute on function private.has_own_booking_review(uuid) to authenticated;

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

drop function if exists public.has_own_booking_review(uuid);
