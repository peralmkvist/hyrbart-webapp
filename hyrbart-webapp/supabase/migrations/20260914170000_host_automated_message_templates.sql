create table if not exists public.automated_message_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  body text not null check (char_length(body) between 1 and 2000),
  trigger_event text not null check (trigger_event in ('booking_requested','booking_accepted','booking_paid','pickup_due','return_due','booking_completed')),
  offset_minutes integer not null default 0 check (offset_minutes between -10080 and 10080),
  enabled boolean not null default true,
  all_listings boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.automated_message_template_listings (
  template_id uuid not null references public.automated_message_templates(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  product_id text not null,
  primary key (template_id, product_id)
);
create table if not exists public.automated_message_template_assets (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.automated_message_templates(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  content_type text not null,
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 8388608),
  position smallint not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists public.automated_message_deliveries (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.automated_message_templates(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  event_key text not null unique,
  sent_at timestamptz not null default now()
);
create index if not exists automated_message_templates_owner_idx on public.automated_message_templates(owner_id, enabled);
create index if not exists automated_message_template_listings_owner_idx on public.automated_message_template_listings(owner_id, product_id);
create index if not exists automated_message_template_assets_template_idx on public.automated_message_template_assets(template_id, position);
create index if not exists automated_message_deliveries_booking_idx on public.automated_message_deliveries(booking_id, sent_at);
alter table public.automated_message_templates enable row level security;
alter table public.automated_message_template_listings enable row level security;
alter table public.automated_message_template_assets enable row level security;
alter table public.automated_message_deliveries enable row level security;
revoke all on public.automated_message_templates from anon, authenticated;
revoke all on public.automated_message_template_listings from anon, authenticated;
revoke all on public.automated_message_template_assets from anon, authenticated;
revoke all on public.automated_message_deliveries from anon, authenticated;
grant select, insert, update, delete on public.automated_message_templates to authenticated;
grant select, insert, update, delete on public.automated_message_template_listings to authenticated;
grant select, insert, update, delete on public.automated_message_template_assets to authenticated;
create policy "owners manage automated templates" on public.automated_message_templates for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "owners manage automated template listings" on public.automated_message_template_listings for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "owners manage automated template assets" on public.automated_message_template_assets for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('automated-message-assets','automated-message-assets',false,8388608,array['image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do update set public=false,file_size_limit=8388608,allowed_mime_types=array['image/jpeg','image/png','image/webp','image/heic'];
