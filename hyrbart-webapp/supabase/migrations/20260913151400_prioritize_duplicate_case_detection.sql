create or replace function public.open_booking_case_atomic(
  p_booking_id uuid,
  p_opened_by uuid,
  p_case_type text,
  p_reason text,
  p_description text default null,
  p_amount_claimed integer default null
) returns public.booking_cases
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
  v_case public.booking_cases%rowtype;
  v_allowed boolean := false;
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
  if p_opened_by is distinct from v_booking.owner_id and p_opened_by is distinct from v_booking.renter_id then raise exception 'NOT_PARTICIPANT'; end if;

  if exists(
    select 1 from public.booking_cases
    where booking_id=p_booking_id and case_type=p_case_type
      and status in ('open','awaiting_other_party','under_review')
  ) then raise exception 'CASE_ALREADY_OPEN'; end if;

  v_allowed := case p_case_type
    when 'problem' then v_booking.status::text = any(array['accepted','paid','active','returned','completed'])
    when 'damage' then v_booking.status::text = any(array['active','returned','completed'])
    when 'dispute' then v_booking.status::text = any(array['paid','active','returned','completed'])
    else false end;
  if not v_allowed then raise exception 'CASE_NOT_ALLOWED_FOR_STATUS:%', v_booking.status; end if;

  insert into public.booking_cases(booking_id,opened_by,case_type,reason,description,amount_claimed,status)
  values (p_booking_id,p_opened_by,p_case_type,left(trim(p_reason),120),nullif(trim(coalesce(p_description,'')),''),p_amount_claimed,case when p_case_type='dispute' then 'under_review' else 'open' end)
  returning * into v_case;

  if v_booking.status::text = any(array['paid','active','returned']) then
    update public.bookings set status='disputed',updated_at=now(),auto_complete_at=null where id=p_booking_id and status=v_booking.status;
  elsif v_booking.status='completed' then
    update public.booking_payouts set status='pending',updated_at=now() where booking_id=p_booking_id and status='scheduled';
  end if;
  return v_case;
exception when unique_violation then raise exception 'CASE_ALREADY_OPEN';
end;
$$;
revoke all on function public.open_booking_case_atomic(uuid,uuid,text,text,text,integer) from public;
grant execute on function public.open_booking_case_atomic(uuid,uuid,text,text,text,integer) to service_role;
