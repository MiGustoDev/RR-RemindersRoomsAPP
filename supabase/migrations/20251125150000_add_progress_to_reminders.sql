alter table if exists public.reminders
  add column if not exists progress integer not null default 0 check (progress between 0 and 100);

