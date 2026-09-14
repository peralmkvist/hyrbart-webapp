create table if not exists public.search_alert_runtime (
  id boolean primary key default true check (id),
  cron_secret text not null default (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')),
  created_at timestamptz not null default now()
);

alter table public.search_alert_runtime enable row level security;
revoke all on table public.search_alert_runtime from anon;
revoke all on table public.search_alert_runtime from authenticated;

insert into public.search_alert_runtime (id) values (true) on conflict (id) do nothing;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'search-alert-evaluator') then
    perform cron.unschedule('search-alert-evaluator');
  end if;
end $$;

select cron.schedule(
  'search-alert-evaluator',
  '0 * * * *',
  $job$
    select net.http_post(
      url := 'https://hyrbart.se/api/cron/search-alerts',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-hyrbart-search-alert-secret', (select cron_secret from public.search_alert_runtime where id = true limit 1)
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 30000
    );
  $job$
);
