create table public.jas_enquiries (
  id uuid primary key,
  created_at timestamptz not null default now(),
  category text not null check (category in ('flight','bus','train','domestic','international','contact')),
  details jsonb not null check (jsonb_typeof(details) = 'object')
);
create index jas_enquiries_created_idx on public.jas_enquiries (created_at desc, id desc);
alter table public.jas_enquiries enable row level security;
revoke all on public.jas_enquiries from anon, authenticated;
grant select, insert on public.jas_enquiries to service_role;
