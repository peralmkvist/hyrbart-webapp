create table if not exists public.listing_import_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source_platform text not null check (source_platform in ('hygglo','other','user_provided')),
  source_profile_url text,
  status text not null default 'draft' check (status in ('draft','processing','needs_review','ready','completed','cancelled','failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.listing_import_consents (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null unique references public.listing_import_batches(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  consent_version text not null,
  consent_text_hash text not null,
  scope text[] not null default array['listing_content','listing_images']::text[],
  accepted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.listing_import_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.listing_import_batches(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  source_reference text,
  source_url text,
  fingerprint text not null,
  status text not null default 'draft' check (status in ('draft','processing','needs_review','ready','rejected','failed')),
  source_payload jsonb not null default '{}'::jsonb,
  normalized_data jsonb not null default '{}'::jsonb,
  field_confidence jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, fingerprint)
);

create table if not exists public.listing_import_assets (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.listing_import_items(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  asset_kind text not null check (asset_kind in ('image','document','other')),
  source_filename text,
  storage_path text,
  checksum text,
  rights_confirmed boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (item_id, checksum)
);

create index if not exists listing_import_batches_user_created_idx on public.listing_import_batches(user_id, created_at desc);
create index if not exists listing_import_items_batch_idx on public.listing_import_items(batch_id, created_at);
create index if not exists listing_import_items_user_status_idx on public.listing_import_items(user_id, status);
create index if not exists listing_import_assets_item_idx on public.listing_import_assets(item_id, created_at);

alter table public.listing_import_batches enable row level security;
alter table public.listing_import_consents enable row level security;
alter table public.listing_import_items enable row level security;
alter table public.listing_import_assets enable row level security;

revoke all on public.listing_import_batches from anon;
revoke all on public.listing_import_consents from anon;
revoke all on public.listing_import_items from anon;
revoke all on public.listing_import_assets from anon;

grant select, insert, update, delete on public.listing_import_batches to authenticated;
grant select, insert on public.listing_import_consents to authenticated;
grant select, insert, update, delete on public.listing_import_items to authenticated;
grant select, insert, update, delete on public.listing_import_assets to authenticated;

create policy "users read own import batches" on public.listing_import_batches for select to authenticated using ((select auth.uid()) = user_id);
create policy "users insert own import batches" on public.listing_import_batches for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "users update own import batches" on public.listing_import_batches for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "users delete own import batches" on public.listing_import_batches for delete to authenticated using ((select auth.uid()) = user_id);

create policy "users read own import consents" on public.listing_import_consents for select to authenticated using ((select auth.uid()) = user_id);
create policy "users insert own import consents" on public.listing_import_consents for insert to authenticated with check (
  (select auth.uid()) = user_id and exists (
    select 1 from public.listing_import_batches b where b.id = batch_id and b.user_id = (select auth.uid())
  )
);

create policy "users read own import items" on public.listing_import_items for select to authenticated using ((select auth.uid()) = user_id);
create policy "users insert own import items" on public.listing_import_items for insert to authenticated with check (
  (select auth.uid()) = user_id and exists (
    select 1 from public.listing_import_batches b where b.id = batch_id and b.user_id = (select auth.uid())
  )
);
create policy "users update own import items" on public.listing_import_items for update to authenticated using ((select auth.uid()) = user_id) with check (
  (select auth.uid()) = user_id and exists (
    select 1 from public.listing_import_batches b where b.id = batch_id and b.user_id = (select auth.uid())
  )
);
create policy "users delete own import items" on public.listing_import_items for delete to authenticated using ((select auth.uid()) = user_id);

create policy "users read own import assets" on public.listing_import_assets for select to authenticated using ((select auth.uid()) = user_id);
create policy "users insert own import assets" on public.listing_import_assets for insert to authenticated with check (
  (select auth.uid()) = user_id and exists (
    select 1 from public.listing_import_items i where i.id = item_id and i.user_id = (select auth.uid())
  )
);
create policy "users update own import assets" on public.listing_import_assets for update to authenticated using ((select auth.uid()) = user_id) with check (
  (select auth.uid()) = user_id and exists (
    select 1 from public.listing_import_items i where i.id = item_id and i.user_id = (select auth.uid())
  )
);
create policy "users delete own import assets" on public.listing_import_assets for delete to authenticated using ((select auth.uid()) = user_id);
