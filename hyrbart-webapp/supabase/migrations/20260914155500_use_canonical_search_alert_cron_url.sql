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
      url := 'https://www.hyrbart.se/api/cron/search-alerts',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-hyrbart-search-alert-secret', (select cron_secret from public.search_alert_runtime where id = true limit 1)
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 30000
    );
  $job$
);
