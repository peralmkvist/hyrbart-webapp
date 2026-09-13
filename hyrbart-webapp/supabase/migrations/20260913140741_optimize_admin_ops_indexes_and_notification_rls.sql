drop policy if exists user_notifications_deny_client_writes on public.user_notifications;

create index if not exists admin_support_notes_admin_user_id_idx on public.admin_support_notes(admin_user_id);
create index if not exists admin_support_notes_booking_id_idx on public.admin_support_notes(booking_id);
create index if not exists admin_support_notes_case_id_idx on public.admin_support_notes(case_id);
create index if not exists booking_cases_resolved_by_idx on public.booking_cases(resolved_by);
create index if not exists listing_moderation_changed_by_idx on public.listing_moderation(changed_by);
create index if not exists risk_flags_created_by_idx on public.risk_flags(created_by);
create index if not exists risk_flags_resolved_by_idx on public.risk_flags(resolved_by);
