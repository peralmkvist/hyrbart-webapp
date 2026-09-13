create or replace function public.resolve_booking_case_atomic(
  p_case_id uuid,
  p_admin_user_id uuid,
  p_status text,
  p_decision text,
  p_resolution_type text,
  p_refund_amount integer default 0,
  p_payout_amount integer default 0
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case public.booking_cases%rowtype;
  v_booking public.bookings%rowtype;
  v_payment public.booking_payments%rowtype;
  v_payout public.booking_payouts%rowtype;
  v_total integer;
  v_rental integer;
  v_refund integer := 0;
  v_payout_amount integer := 0;
  v_final_status text;
  v_now timestamptz := now();
begin
  if p_status not in ('resolved','rejected') then raise exception 'INVALID_STATUS'; end if;
  if p_resolution_type not in ('full_refund','full_payout','split','no_financial_action') then raise exception 'RESOLUTION_REQUIRED'; end if;
  if length(trim(coalesce(p_decision,''))) < 10 then raise exception 'DECISION_REQUIRED'; end if;

  select * into v_case from public.booking_cases where id=p_case_id for update;
  if not found then raise exception 'CASE_NOT_FOUND'; end if;
  if v_case.resolved_at is not null then raise exception 'ALREADY_RESOLVED'; end if;

  select * into v_booking from public.bookings where id=v_case.booking_id for update;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;

  v_total := coalesce(v_booking.total_price, coalesce(v_booking.rental_price,0)+coalesce(v_booking.service_fee,0));
  v_rental := coalesce(v_booking.rental_price,0);
  if p_resolution_type='full_refund' then v_refund:=v_total;
  elsif p_resolution_type='full_payout' then v_payout_amount:=v_rental;
  elsif p_resolution_type='split' then
    v_refund:=greatest(0,coalesce(p_refund_amount,0));
    v_payout_amount:=greatest(0,coalesce(p_payout_amount,0));
  end if;

  if v_refund>v_total then raise exception 'REFUND_EXCEEDS_TOTAL'; end if;
  if v_payout_amount>v_rental then raise exception 'PAYOUT_EXCEEDS_RENTAL'; end if;
  if v_refund+v_payout_amount>v_total then raise exception 'SETTLEMENT_EXCEEDS_TOTAL'; end if;

  select * into v_payout from public.booking_payouts where booking_id=v_booking.id for update;
  if found and v_payout.status='paid' and (v_refund>0 or v_payout_amount<>v_payout.amount) then raise exception 'PAYOUT_ALREADY_PAID'; end if;

  if v_refund>0 then
    select * into v_payment from public.booking_payments
      where booking_id=v_booking.id and status in ('captured','partially_refunded','refunded')
      order by created_at desc limit 1 for update;
    if found then
      update public.booking_payments set
        refund_amount=least(v_refund,amount),
        status=case when least(v_refund,amount)>=amount then 'refunded' else 'partially_refunded' end,
        refunded_at=v_now,
        updated_at=v_now
      where id=v_payment.id returning * into v_payment;
    end if;
  end if;

  if v_payout_amount>0 and (v_payout.id is null or v_payout.status<>'paid') then
    insert into public.booking_payouts(booking_id,owner_id,provider,status,amount,currency,due_at,updated_at)
    values(v_booking.id,v_booking.owner_id,coalesce(v_payout.provider,'simulation'),'scheduled',v_payout_amount,coalesce(v_booking.currency,'SEK'),v_now,v_now)
    on conflict(booking_id) do update set status='scheduled',amount=excluded.amount,currency=excluded.currency,due_at=excluded.due_at,updated_at=excluded.updated_at
    returning * into v_payout;
  elsif v_payout_amount=0 and v_payout.id is not null and v_payout.status in ('pending','scheduled') then
    update public.booking_payouts set status='cancelled',updated_at=v_now where id=v_payout.id returning * into v_payout;
  end if;

  v_final_status:=v_booking.status;
  if v_booking.status='disputed' then
    v_final_status:=case when p_resolution_type='full_refund' then 'refunded' else 'completed' end;
    update public.bookings set status=v_final_status,refund_amount=v_refund,completed_at=case when v_final_status='completed' then coalesce(completed_at,v_now) else completed_at end,updated_at=v_now
      where id=v_booking.id;
  end if;

  update public.booking_cases set
    status=p_status,
    resolution=trim(p_decision),
    resolution_note=trim(p_decision),
    resolution_type=p_resolution_type,
    refund_amount=v_refund,
    payout_amount=v_payout_amount,
    resolved_at=v_now,
    resolved_by=p_admin_user_id,
    updated_at=v_now
  where id=v_case.id returning * into v_case;

  return jsonb_build_object(
    'case',to_jsonb(v_case),
    'booking',to_jsonb(v_booking),
    'resolutionType',p_resolution_type,
    'refundAmount',v_refund,
    'payoutAmount',v_payout_amount,
    'paymentId',v_payment.id,
    'payoutId',v_payout.id,
    'finalStatus',v_final_status
  );
end;
$$;

revoke all on function public.resolve_booking_case_atomic(uuid,uuid,text,text,text,integer,integer) from public;
grant execute on function public.resolve_booking_case_atomic(uuid,uuid,text,text,text,integer,integer) to service_role;
