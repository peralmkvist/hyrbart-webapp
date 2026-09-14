create table if not exists public.admin_memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('super_admin','support','trust_safety','finance','operations','read_only')),
  active boolean not null default true,
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_memberships enable row level security;
revoke all on table public.admin_memberships from anon, authenticated, public;
grant select, insert, update, delete on table public.admin_memberships to service_role;

create index if not exists admin_memberships_active_role_idx on public.admin_memberships(active, role);

alter table public.admin_audit_log add column if not exists admin_role text;
alter table public.admin_audit_log add column if not exists request_id text;

alter table public.admin_audit_log enable row level security;
revoke all on table public.admin_audit_log from anon, authenticated, public;
revoke update, delete, truncate on table public.admin_audit_log from service_role;
grant select, insert on table public.admin_audit_log to service_role;

create index if not exists admin_audit_log_admin_created_idx on public.admin_audit_log(admin_user_id, created_at desc);
create index if not exists admin_audit_log_entity_created_idx on public.admin_audit_log(entity_type, entity_id, created_at desc);

create or replace function public.prevent_admin_audit_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'admin_audit_log is append-only';
end;
$$;

revoke all on function public.prevent_admin_audit_mutation() from public, anon, authenticated;

drop trigger if exists admin_audit_log_immutable on public.admin_audit_log;
create trigger admin_audit_log_immutable
before update or delete on public.admin_audit_log
for each row execute function public.prevent_admin_audit_mutation();
