alter table public.profiles
  add column if not exists vacation_mode_enabled boolean not null default false,
  add column if not exists vacation_mode_start date,
  add column if not exists vacation_mode_end date;

alter table public.profiles
  add constraint profiles_vacation_mode_dates_valid
  check (vacation_mode_start is null or vacation_mode_end is null or vacation_mode_end >= vacation_mode_start) not valid;

alter table public.profiles validate constraint profiles_vacation_mode_dates_valid;
