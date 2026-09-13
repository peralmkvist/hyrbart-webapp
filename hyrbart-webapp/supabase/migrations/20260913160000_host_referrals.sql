create table if not exists public.host_referrals (
  id uuid primary key default gen_random_uuid(),
  inviter_user_id uuid not null references auth.users(id) on delete cascade,
  invitee_email text not null,
  referral_code text not null unique,
  referred_user_id uuid references auth.users(id) on delete set null,
  reward_sek integer not null default 10 check (reward_sek > 0),
  signed_up_at timestamptz,
  qualified_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists host_referrals_active_email_idx
  on public.host_referrals (lower(invitee_email))
  where qualified_at is null;

create table if not exists public.referral_rewards (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null references public.host_referrals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount_sek integer not null check (amount_sek > 0),
  reason text not null default 'host_referral_first_rental',
  created_at timestamptz not null default now(),
  unique (referral_id, user_id)
);

alter table public.host_referrals enable row level security;
alter table public.referral_rewards enable row level security;

create policy "Users can create their own host referrals"
  on public.host_referrals for insert to authenticated
  with check (auth.uid() = inviter_user_id);

create policy "Users can read referrals they are part of"
  on public.host_referrals for select to authenticated
  using (auth.uid() = inviter_user_id or auth.uid() = referred_user_id);

create policy "Users can read their own referral rewards"
  on public.referral_rewards for select to authenticated
  using (auth.uid() = user_id);

create or replace function public.attach_host_referral_on_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.host_referrals
     set referred_user_id = new.id,
         signed_up_at = coalesce(signed_up_at, now())
   where lower(invitee_email) = lower(new.email)
     and referred_user_id is null
     and qualified_at is null;
  return new;
end;
$$;

drop trigger if exists attach_host_referral_on_signup on auth.users;
create trigger attach_host_referral_on_signup
after insert on auth.users
for each row execute function public.attach_host_referral_on_signup();

create or replace function public.qualify_host_referral_after_first_rental()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  referral public.host_referrals%rowtype;
begin
  if new.status not in ('returned','completed') then
    return new;
  end if;

  select * into referral
    from public.host_referrals
   where referred_user_id = new.owner_id
     and qualified_at is null
   order by created_at asc
   limit 1
   for update skip locked;

  if referral.id is null then
    return new;
  end if;

  if exists (
    select 1 from public.bookings b
     where b.owner_id = new.owner_id
       and b.id <> new.id
       and b.status in ('returned','completed')
  ) then
    return new;
  end if;

  update public.host_referrals set qualified_at = now() where id = referral.id;

  insert into public.referral_rewards (referral_id,user_id,amount_sek)
  values
    (referral.id, referral.inviter_user_id, referral.reward_sek),
    (referral.id, referral.referred_user_id, referral.reward_sek)
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists qualify_host_referral_after_first_rental on public.bookings;
create trigger qualify_host_referral_after_first_rental
after insert or update of status on public.bookings
for each row execute function public.qualify_host_referral_after_first_rental();
