create or replace function public.enforce_owner_vacation_mode()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  p public.profiles%rowtype;
begin
  select * into p from public.profiles where id = new.owner_id;
  if coalesce(p.vacation_mode_enabled,false)
     and (p.vacation_mode_start is null or new.end_date >= p.vacation_mode_start)
     and (p.vacation_mode_end is null or new.start_date <= p.vacation_mode_end) then
    raise exception using errcode='P0001', message='OWNER_VACATION_MODE';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_owner_vacation_mode on public.bookings;
create trigger trg_enforce_owner_vacation_mode
before insert on public.bookings
for each row execute function public.enforce_owner_vacation_mode();
