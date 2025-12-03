-- ============================================
-- MIGRACIÓN: Sistema de Usuarios por Áreas
-- Crea tabla para asociar usuarios de Supabase Auth con áreas
-- ============================================

-- 1. Crear tabla de áreas disponibles
create table if not exists public.areas (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text not null unique,
  description text,
  created_at timestamptz not null default now()
);

-- 2. Crear tabla de usuarios por área
create table if not exists public.user_areas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  area_id uuid not null references public.areas(id) on delete cascade,
  email text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, area_id)
);

-- 3. Insertar áreas predefinidas
insert into public.areas (name, code, description) values
  ('Recursos Humanos', 'RRHH', 'Área de Recursos Humanos'),
  ('Calidad', 'CALIDAD', 'Área de Control de Calidad'),
  ('Logística', 'LOGISTICA', 'Área de Logística y Distribución'),
  ('Sistemas', 'SISTEMAS', 'Área de Sistemas e IT'),
  ('Marketing', 'MARKETING', 'Área de Marketing'),
  ('Atención al Cliente', 'ATENCION_CLIENTE', 'Área de Atención al Cliente'),
  ('Compras', 'COMPRAS', 'Área de Compras y Adquisiciones')
on conflict (code) do nothing;

-- 4. Crear índices
create index if not exists user_areas_user_id_idx on public.user_areas (user_id);
create index if not exists user_areas_area_id_idx on public.user_areas (area_id);
create index if not exists user_areas_email_idx on public.user_areas (email);
create index if not exists user_areas_is_active_idx on public.user_areas (is_active);

-- 5. Función para updated_at automático
create or replace function public.handle_user_areas_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 6. Trigger para updated_at
drop trigger if exists user_areas_updated_at on public.user_areas;
create trigger user_areas_updated_at
before update on public.user_areas
for each row
execute procedure public.handle_user_areas_updated_at();

-- 7. Habilitar RLS (Row Level Security)
alter table public.areas enable row level security;
alter table public.user_areas enable row level security;

-- 8. Políticas RLS para áreas (todos pueden leer, incluso sin autenticación)
drop policy if exists "Áreas son públicas para lectura" on public.areas;
create policy "Áreas son públicas para lectura"
  on public.areas
  for select
  using (true);

-- 9. Políticas RLS para user_areas
-- Eliminar políticas existentes si existen
drop policy if exists "Usuarios pueden ver su propia información" on public.user_areas;
drop policy if exists "Usuarios autenticados pueden ver áreas activas" on public.user_areas;
drop policy if exists "Permitir lectura propia" on public.user_areas;

-- Los usuarios autenticados pueden ver su propia información
-- Usar auth.uid() IS NOT NULL para asegurar que el usuario esté autenticado
create policy "Permitir lectura propia"
  on public.user_areas
  for select
  using (
    auth.uid() IS NOT NULL 
    AND auth.uid() = user_id
  );

-- ============================================
-- FIN DE LA MIGRACIÓN
-- ============================================

