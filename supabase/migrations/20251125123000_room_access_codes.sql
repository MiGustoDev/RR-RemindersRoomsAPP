alter table if exists public.rooms
  add column if not exists access_code text,
  add column if not exists is_locked boolean not null default false;

update public.rooms
set is_locked = coalesce(access_code, '') <> ''
where true;

create index if not exists rooms_is_locked_idx on public.rooms (is_locked);

