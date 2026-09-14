alter table public.bookings
  add column if not exists pickup_location_name text,
  add column if not exists pickup_location_address text,
  add column if not exists pickup_location_lat double precision,
  add column if not exists pickup_location_lng double precision;

update public.bookings as b
set (pickup_location_name, pickup_location_address, pickup_location_lat, pickup_location_lng) = (
  select h.name,
         coalesce(nullif(h.address, ''), nullif(h.label, ''), h.name),
         h.lat,
         h.lng
  from public.host_pickup_locations as h
  where h.user_id = b.owner_id
  order by h.sort_order asc, h.created_at asc
  limit 1
)
where b.pickup_location_lat is null
  and exists (
    select 1
    from public.host_pickup_locations as h
    where h.user_id = b.owner_id
  );
