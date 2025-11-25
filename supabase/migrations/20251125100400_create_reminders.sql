create extension if not exists "pgcrypto";

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  room_code text not null,
  title text not null,
  description text not null default '',
  due_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reminders_room_code_idx on public.reminders (room_code);
create index if not exists reminders_due_date_idx on public.reminders (due_date);

create or replace function public.handle_reminders_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists reminders_updated_at on public.reminders;

create trigger reminders_updated_at
before update on public.reminders
for each row
execute procedure public.handle_reminders_updated_at();

