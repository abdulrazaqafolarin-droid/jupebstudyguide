alter table public.profiles
add column if not exists achievements jsonb not null default '[]'::jsonb;
