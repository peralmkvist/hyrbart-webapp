create unique index if not exists booking_cases_one_open_type_per_booking_idx
on public.booking_cases (booking_id, case_type)
where status in ('open','awaiting_other_party','under_review');
