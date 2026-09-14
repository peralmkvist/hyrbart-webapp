alter table public.profiles
  add column if not exists preferred_language text not null default 'sv'
  check (preferred_language in ('sv','en'));

create index if not exists profiles_preferred_language_idx
  on public.profiles(preferred_language);
