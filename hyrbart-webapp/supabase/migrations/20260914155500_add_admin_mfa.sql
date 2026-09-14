alter table public.admin_accounts
  add column if not exists mfa_secret_encrypted text,
  add column if not exists mfa_enabled_at timestamptz;

create table if not exists public.admin_recovery_codes (
  id uuid primary key default gen_random_uuid(),
  admin_account_id uuid not null references public.admin_accounts(id) on delete cascade,
  code_hash text not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  unique(admin_account_id, code_hash)
);

create index if not exists admin_recovery_codes_account_unused_idx
  on public.admin_recovery_codes(admin_account_id, used_at);

alter table public.admin_recovery_codes enable row level security;
revoke all on table public.admin_recovery_codes from anon, authenticated;
revoke all on table public.admin_accounts from anon, authenticated;

alter table public.admin_sessions
  add column if not exists mfa_verified boolean not null default false;

create index if not exists admin_sessions_account_mfa_idx
  on public.admin_sessions(admin_account_id, mfa_verified, revoked_at, expires_at);

comment on table public.admin_recovery_codes is 'Server-only hashed one-time recovery codes for isolated admin MFA.';
