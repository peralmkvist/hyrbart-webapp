create table if not exists public.profile_follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followed_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  constraint profile_follows_not_self check (follower_id <> followed_id)
);

alter table public.profile_follows enable row level security;
revoke all on table public.profile_follows from anon;
revoke all on table public.profile_follows from authenticated;
grant select, insert, delete on table public.profile_follows to authenticated;

create policy "profile_follows_select_participant"
on public.profile_follows for select
to authenticated
using ((select auth.uid()) = follower_id or (select auth.uid()) = followed_id);

create policy "profile_follows_insert_own"
on public.profile_follows for insert
to authenticated
with check ((select auth.uid()) = follower_id and follower_id <> followed_id);

create policy "profile_follows_delete_own"
on public.profile_follows for delete
to authenticated
using ((select auth.uid()) = follower_id);

create index if not exists profile_follows_followed_created_idx on public.profile_follows(followed_id, created_at desc);
create index if not exists profile_follows_follower_created_idx on public.profile_follows(follower_id, created_at desc);
