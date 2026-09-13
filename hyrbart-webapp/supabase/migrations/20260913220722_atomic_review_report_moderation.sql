create or replace function public.moderate_review_reports_atomic(
  p_review_id uuid,
  p_status text,
  p_reason text default null,
  p_report_resolution text default null,
  p_admin_user_id uuid default null
)
returns table(review_id uuid, moderation_status text, resolved_reports integer)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  if p_status not in ('visible','hidden') then
    raise exception 'invalid review moderation status';
  end if;
  if p_status = 'hidden' and length(trim(coalesce(p_reason,''))) < 5 then
    raise exception 'moderation reason required';
  end if;
  if p_report_resolution is not null and p_report_resolution not in ('resolved','dismissed') then
    raise exception 'invalid report resolution';
  end if;

  update public.booking_reviews
  set moderation_status = p_status,
      moderation_reason = case when p_status='hidden' then trim(p_reason) else null end,
      moderated_at = now(),
      moderated_by = p_admin_user_id
  where id = p_review_id;

  if not found then
    raise exception 'review not found';
  end if;

  if p_status='hidden' or p_report_resolution is not null then
    update public.review_reports
    set status = case when p_status='hidden' then 'resolved' else p_report_resolution end,
        resolved_at = now(),
        resolved_by = p_admin_user_id,
        resolution_note = case when p_status='hidden' then trim(p_reason) else 'Review kept visible by moderator' end
    where review_reports.review_id = p_review_id and review_reports.status = 'open';
    get diagnostics v_count = row_count;
  end if;

  return query select p_review_id, p_status, v_count;
end;
$$;

revoke all on function public.moderate_review_reports_atomic(uuid,text,text,text,uuid) from public, anon, authenticated;
grant execute on function public.moderate_review_reports_atomic(uuid,text,text,text,uuid) to service_role;
