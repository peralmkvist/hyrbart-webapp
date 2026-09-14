create table if not exists public.privacy_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  product_updates boolean not null default false,
  marketing_push boolean not null default false,
  product_research boolean not null default false,
  marketing_measurement boolean not null default false,
  personalization boolean not null default false,
  consent_version text not null default 'privacy-v1',
  source text not null default 'privacy_settings',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.privacy_consent_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  preference_key text not null check (preference_key in ('product_updates','marketing_push','product_research','marketing_measurement','personalization')),
  enabled boolean not null,
  consent_version text not null,
  source text not null,
  created_at timestamptz not null default now()
);

create index if not exists privacy_consent_events_user_created_idx on public.privacy_consent_events (user_id, created_at desc);

alter table public.privacy_preferences enable row level security;
alter table public.privacy_consent_events enable row level security;

revoke all on public.privacy_preferences from anon, authenticated;
revoke all on public.privacy_consent_events from anon, authenticated;
grant select, insert, update on public.privacy_preferences to authenticated;
grant select, insert on public.privacy_consent_events to authenticated;

create policy "users read own privacy preferences" on public.privacy_preferences for select to authenticated using ((select auth.uid()) = user_id);
create policy "users insert own privacy preferences" on public.privacy_preferences for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "users update own privacy preferences" on public.privacy_preferences for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "users read own privacy consent events" on public.privacy_consent_events for select to authenticated using ((select auth.uid()) = user_id);
create policy "users insert own privacy consent events" on public.privacy_consent_events for insert to authenticated with check ((select auth.uid()) = user_id);
