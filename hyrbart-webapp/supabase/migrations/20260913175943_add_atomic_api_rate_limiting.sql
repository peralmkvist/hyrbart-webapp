create table if not exists public.api_rate_limits (
  bucket_key text primary key,
  window_start timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.api_rate_limits enable row level security;
revoke all on table public.api_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.api_rate_limits to service_role;

create or replace function public.consume_api_rate_limit(
  p_bucket_key text,
  p_limit integer,
  p_window_seconds integer
) returns table(allowed boolean, remaining integer, reset_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_window_start timestamptz;
  v_count integer;
begin
  if p_bucket_key is null or length(p_bucket_key) < 3 or p_limit < 1 or p_window_seconds < 1 then
    raise exception 'INVALID_RATE_LIMIT_ARGUMENTS';
  end if;

  insert into public.api_rate_limits(bucket_key, window_start, request_count, updated_at)
  values (p_bucket_key, v_now, 1, v_now)
  on conflict (bucket_key) do update
  set
    window_start = case
      when public.api_rate_limits.window_start <= v_now - make_interval(secs => p_window_seconds) then v_now
      else public.api_rate_limits.window_start
    end,
    request_count = case
      when public.api_rate_limits.window_start <= v_now - make_interval(secs => p_window_seconds) then 1
      else public.api_rate_limits.request_count + 1
    end,
    updated_at = v_now
  returning public.api_rate_limits.window_start, public.api_rate_limits.request_count
  into v_window_start, v_count;

  return query select
    v_count <= p_limit,
    greatest(p_limit - v_count, 0),
    v_window_start + make_interval(secs => p_window_seconds);
end;
$$;

revoke all on function public.consume_api_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text, integer, integer) to service_role;
