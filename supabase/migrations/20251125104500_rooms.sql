create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  created_at timestamptz not null default now()
);

alter table if exists public.reminders
  add column if not exists room_code text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_name = 'reminders' and column_name = 'client_id'
  ) then
    update public.reminders
    set room_code = client_id
    where room_code is null and client_id is not null;
  end if;
end $$;

update public.reminders
set room_code = coalesce(room_code, gen_random_uuid()::text)
where room_code is null;

insert into public.rooms (name, code)
select concat('Sala ', left(room_code, 6)), room_code
from public.reminders r
left join public.rooms existing on existing.code = r.room_code
where r.room_code is not null and existing.id is null
group by room_code;

alter table if exists public.reminders
  alter column room_code set not null;

create index if not exists reminders_room_code_idx on public.reminders (room_code);

alter table if exists public.reminders
  add constraint reminders_room_code_fkey
  foreign key (room_code)
  references public.rooms(code)
  on delete cascade;

alter table if exists public.reminders
  drop column if exists client_id;

