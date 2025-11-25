create table if not exists public.reminder_comments (
  id uuid primary key default gen_random_uuid(),
  reminder_id uuid not null references public.reminders(id) on delete cascade,
  author text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists reminder_comments_reminder_idx on public.reminder_comments (reminder_id);
create index if not exists reminder_comments_created_idx on public.reminder_comments (created_at);

