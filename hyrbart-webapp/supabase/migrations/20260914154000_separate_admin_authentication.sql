create extension if not exists pgcrypto;

create table if not exists public.admin_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  username text not null,
  password_hash text not null,
  active boolean not null default true,
  failed_attempts integer not null default 0,
  locked_until timestamptz null,
  password_changed_at timestamptz not null default now(),
  mfa_enabled boolean not null default false,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_accounts_username_normalized check (username = lower(username)),
  constraint admin_accounts_username_format check (username ~ '^[a-z0-9._-]{3,64}$')
);
create unique index if not exists admin_accounts_username_lower_uidx on public.admin_accounts ((lower(username)));
create index if not exists admin_accounts_active_idx on public.admin_accounts(active);
create index if not exists admin_accounts_created_by_idx on public.admin_accounts(created_by);
alter table public.admin_accounts enable row level security;
revoke all on public.admin_accounts from anon, authenticated;

create table if not exists public.admin_sessions (
  id uuid primary key default gen_random_uuid(),
  admin_account_id uuid not null references public.admin_accounts(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz null,
  revoke_reason text null,
  ip_hash text null,
  user_agent text null
);
create index if not exists admin_sessions_account_idx on public.admin_sessions(admin_account_id, created_at desc);
create index if not exists admin_sessions_active_idx on public.admin_sessions(expires_at) where revoked_at is null;
alter table public.admin_sessions enable row level security;
revoke all on public.admin_sessions from anon, authenticated;

create table if not exists public.admin_login_events (
  id uuid primary key default gen_random_uuid(),
  admin_account_id uuid null references public.admin_accounts(id) on delete set null,
  username text not null,
  success boolean not null,
  reason text not null,
  ip_hash text null,
  user_agent text null,
  created_at timestamptz not null default now()
);
create index if not exists admin_login_events_username_created_idx on public.admin_login_events(username, created_at desc);
create index if not exists admin_login_events_ip_created_idx on public.admin_login_events(ip_hash, created_at desc);
create index if not exists admin_login_events_account_created_idx on public.admin_login_events(admin_account_id, created_at desc);
alter table public.admin_login_events enable row level security;
revoke all on public.admin_login_events from anon, authenticated;

create or replace function public.admin_verify_password(p_username text, p_password text)
returns table(account_id uuid, user_id uuid, active boolean, locked_until timestamptz, password_ok boolean, mfa_enabled boolean)
language sql stable security invoker set search_path = public, extensions
as $$
  select a.id, a.user_id, a.active, a.locked_until,
         (a.password_hash = crypt(p_password, a.password_hash)) as password_ok,
         a.mfa_enabled
  from public.admin_accounts a
  where a.username = lower(trim(p_username))
  limit 1;
$$;
revoke all on function public.admin_verify_password(text,text) from public, anon, authenticated;
grant execute on function public.admin_verify_password(text,text) to service_role;

create or replace function public.admin_create_account(p_user_id uuid, p_username text, p_password text, p_created_by uuid)
returns uuid language plpgsql security invoker set search_path = public, extensions
as $$
declare v_id uuid;
begin
  if length(p_password) < 12 then raise exception 'PASSWORD_TOO_SHORT'; end if;
  if lower(trim(p_username)) !~ '^[a-z0-9._-]{3,64}$' then raise exception 'INVALID_USERNAME'; end if;
  insert into public.admin_accounts(user_id, username, password_hash, created_by)
  values (p_user_id, lower(trim(p_username)), crypt(p_password, gen_salt('bf', 12)), p_created_by)
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.admin_create_account(uuid,text,text,uuid) from public, anon, authenticated;
grant execute on function public.admin_create_account(uuid,text,text,uuid) to service_role;

create or replace function public.admin_set_password(p_account_id uuid, p_password text)
returns void language plpgsql security invoker set search_path = public, extensions
as $$
begin
  if length(p_password) < 12 then raise exception 'PASSWORD_TOO_SHORT'; end if;
  update public.admin_accounts
     set password_hash = crypt(p_password, gen_salt('bf', 12)),
         password_changed_at = now(), failed_attempts = 0, locked_until = null, updated_at = now()
   where id = p_account_id;
end;
$$;
revoke all on function public.admin_set_password(uuid,text) from public, anon, authenticated;
grant execute on function public.admin_set_password(uuid,text) to service_role;
