create table public.jas_page_content (
  page text primary key check (page in ('index','about','flight','train','bus','domestic','international','contact')),
  fields jsonb not null default '{}'::jsonb check (jsonb_typeof(fields) = 'object'),
  updated_at timestamptz not null default now()
);
alter table public.jas_page_content enable row level security;
revoke all on public.jas_page_content from anon, authenticated;
grant select, insert, update on public.jas_page_content to service_role;

create function public.jas_publish_page(page_name text, field_patch jsonb)
returns void language sql security invoker set search_path = ''
as $$
  insert into public.jas_page_content (page, fields)
  values (page_name, jsonb_strip_nulls(field_patch))
  on conflict (page) do update set
    fields = jsonb_strip_nulls(jas_page_content.fields || field_patch),
    updated_at = now();
$$;
revoke all on function public.jas_publish_page(text,jsonb) from public, anon, authenticated;
grant execute on function public.jas_publish_page(text,jsonb) to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('jas-website-images','jas-website-images',true,8388608,
  array['image/jpeg','image/png','image/webp','image/gif','image/avif']);

create function public.jas_publish_page(page_name text, field_patch jsonb, initial_fields jsonb)
returns void language sql security invoker set search_path = ''
as $$
  insert into public.jas_page_content (page, fields)
  values (page_name, jsonb_strip_nulls(initial_fields || field_patch))
  on conflict (page) do update set
    fields = jsonb_strip_nulls(jas_page_content.fields || field_patch),
    updated_at = now();
$$;
revoke all on function public.jas_publish_page(text,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.jas_publish_page(text,jsonb,jsonb) to service_role;
