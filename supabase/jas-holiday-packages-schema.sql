create table public.jas_holiday_packages (
  id uuid primary key,
  type text not null check (type in ('domestic', 'international')),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  destination text not null default '' check (char_length(destination) <= 120),
  duration text not null default '' check (char_length(duration) <= 60),
  price_inr integer check (price_inr between 1 and 99999999),
  description text not null default '' check (char_length(description) <= 2000),
  image_url text not null default '' check (image_url = '' or (char_length(image_url) <= 2000 and image_url like 'https://%')),
  created_at timestamptz not null default now()
);

create index jas_holiday_packages_order_idx
  on public.jas_holiday_packages (created_at, id);

alter table public.jas_holiday_packages enable row level security;
revoke all on public.jas_holiday_packages from public, anon, authenticated;
grant select, insert, update on public.jas_holiday_packages to service_role;
