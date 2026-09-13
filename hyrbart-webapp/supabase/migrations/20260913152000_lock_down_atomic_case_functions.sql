revoke execute on function public.open_booking_case_atomic(uuid,uuid,text,text,text,integer) from anon, authenticated;
revoke execute on function public.resolve_booking_case_atomic(uuid,uuid,text,text,text,integer,integer) from anon, authenticated;
grant execute on function public.open_booking_case_atomic(uuid,uuid,text,text,text,integer) to service_role;
grant execute on function public.resolve_booking_case_atomic(uuid,uuid,text,text,text,integer,integer) to service_role;
