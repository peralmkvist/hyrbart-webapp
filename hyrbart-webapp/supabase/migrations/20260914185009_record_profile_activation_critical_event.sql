create or replace function public.record_profile_activation_critical_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.critical_product_events (
    event_name,
    actor_id,
    idempotency_key,
    properties
  ) values (
    'activation_completed',
    new.id,
    'activation_completed:' || new.id::text,
    jsonb_build_object('account_status', coalesce(new.account_status, 'active'))
  )
  on conflict (idempotency_key) where idempotency_key is not null do nothing;
  return new;
end;
$$;

revoke all on function public.record_profile_activation_critical_event() from public, anon, authenticated;
grant execute on function public.record_profile_activation_critical_event() to service_role;

drop trigger if exists profiles_record_activation_event on public.profiles;
create trigger profiles_record_activation_event
after insert on public.profiles
for each row execute function public.record_profile_activation_critical_event();
