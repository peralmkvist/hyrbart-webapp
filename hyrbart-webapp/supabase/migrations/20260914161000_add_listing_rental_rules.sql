create table if not exists public.listing_rental_rules (
  product_id text primary key,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  min_rental_minutes integer not null default 0,
  max_rental_minutes integer,
  buffer_minutes integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint listing_rental_rules_min_check check (min_rental_minutes between 0 and 525600),
  constraint listing_rental_rules_max_check check (max_rental_minutes is null or max_rental_minutes between 1 and 525600),
  constraint listing_rental_rules_order_check check (max_rental_minutes is null or max_rental_minutes >= min_rental_minutes),
  constraint listing_rental_rules_buffer_check check (buffer_minutes between 0 and 10080)
);

create index if not exists listing_rental_rules_owner_idx on public.listing_rental_rules(owner_id);

alter table public.listing_rental_rules enable row level security;
revoke all on table public.listing_rental_rules from anon;
grant select, insert, update, delete on table public.listing_rental_rules to authenticated;
grant all on table public.listing_rental_rules to service_role;

create policy "rental rules select own" on public.listing_rental_rules
for select to authenticated
using ((select auth.uid()) = owner_id);

create policy "rental rules insert own" on public.listing_rental_rules
for insert to authenticated
with check ((select auth.uid()) = owner_id);

create policy "rental rules update own" on public.listing_rental_rules
for update to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy "rental rules delete own" on public.listing_rental_rules
for delete to authenticated
using ((select auth.uid()) = owner_id);

create or replace function public.enforce_booking_rental_rules()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_min integer := 0;
  v_max integer;
  v_buffer integer := 0;
  v_start timestamptz;
  v_end timestamptz;
  v_duration_minutes numeric;
  v_conflict uuid;
  v_blocking public.booking_status[] := array['requested','reserved','accepted','paid','active','returned']::public.booking_status[];
begin
  if not (new.status = any(v_blocking)) then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.status = any(v_blocking)
       and new.product_id is not distinct from old.product_id
       and new.start_date is not distinct from old.start_date
       and new.end_date is not distinct from old.end_date
       and new.rental_start_at is not distinct from old.rental_start_at
       and new.return_due_at is not distinct from old.return_due_at then
      return new;
    end if;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.product_id, 0));

  select r.min_rental_minutes, r.max_rental_minutes, r.buffer_minutes
    into v_min, v_max, v_buffer
  from public.listing_rental_rules r
  where r.product_id = new.product_id;

  if not found then
    v_min := 0;
    v_max := null;
    v_buffer := 0;
  end if;

  v_start := coalesce(new.rental_start_at, (new.start_date::timestamp at time zone 'Europe/Stockholm'));
  v_end := coalesce(new.return_due_at, ((new.end_date + 1)::timestamp at time zone 'Europe/Stockholm'));

  if v_end <= v_start then
    raise exception using errcode = 'P0001', message = 'RENTAL_RULE_INVALID_PERIOD';
  end if;

  v_duration_minutes := extract(epoch from (v_end - v_start)) / 60.0;
  if v_min > 0 and v_duration_minutes < v_min then
    raise exception using errcode = 'P0001', message = 'RENTAL_RULE_MIN_DURATION';
  end if;
  if v_max is not null and v_duration_minutes > v_max then
    raise exception using errcode = 'P0001', message = 'RENTAL_RULE_MAX_DURATION';
  end if;

  if v_buffer > 0 then
    select b.id into v_conflict
    from public.bookings b
    where b.product_id = new.product_id
      and b.status = any(v_blocking)
      and b.id is distinct from new.id
      and v_start < coalesce(b.return_due_at, ((b.end_date + 1)::timestamp at time zone 'Europe/Stockholm')) + make_interval(mins => v_buffer)
      and v_end > coalesce(b.rental_start_at, (b.start_date::timestamp at time zone 'Europe/Stockholm')) - make_interval(mins => v_buffer)
    order by b.start_date
    limit 1;

    if v_conflict is not null then
      raise exception using errcode = 'P0001', message = 'RENTAL_RULE_BUFFER_CONFLICT';
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function public.enforce_booking_rental_rules() from public, anon, authenticated;
grant execute on function public.enforce_booking_rental_rules() to service_role;

drop trigger if exists bookings_enforce_rental_rules on public.bookings;
create trigger bookings_enforce_rental_rules
before insert or update of product_id, start_date, end_date, rental_start_at, return_due_at, status
on public.bookings
for each row execute function public.enforce_booking_rental_rules();
