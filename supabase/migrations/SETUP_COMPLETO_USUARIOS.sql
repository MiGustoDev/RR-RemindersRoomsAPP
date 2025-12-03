-- ============================================
-- SCRIPT SQL COMPLETO PARA SISTEMA DE USUARIOS POR ÁREAS
-- Ejecuta este script completo en Supabase SQL Editor
-- Resuelve todos los problemas de RLS y configuración
-- ============================================

-- 1. Habilitar extensión para UUIDs (si no está habilitada)
create extension if not exists "pgcrypto";

-- 2. Crear tabla de áreas disponibles
create table if not exists public.areas (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text not null unique,
  description text,
  created_at timestamptz not null default now()
);

-- 3. Crear tabla de usuarios por área
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

-- 4. Insertar áreas predefinidas (ignorar si ya existen)
insert into public.areas (name, code, description) values
  ('Recursos Humanos', 'RRHH', 'Área de Recursos Humanos'),
  ('Calidad', 'CALIDAD', 'Área de Control de Calidad'),
  ('Logística', 'LOGISTICA', 'Área de Logística y Distribución'),
  ('Sistemas', 'SISTEMAS', 'Área de Sistemas e IT'),
  ('Marketing', 'MARKETING', 'Área de Marketing'),
  ('Atención al Cliente', 'ATENCION_CLIENTE', 'Área de Atención al Cliente'),
  ('Compras', 'COMPRAS', 'Área de Compras y Adquisiciones')
on conflict (code) do nothing;

-- 5. Crear índices para mejor rendimiento
create index if not exists user_areas_user_id_idx on public.user_areas (user_id);
create index if not exists user_areas_area_id_idx on public.user_areas (area_id);
create index if not exists user_areas_email_idx on public.user_areas (email);
create index if not exists user_areas_is_active_idx on public.user_areas (is_active);

-- 6. Función para updated_at automático
create or replace function public.handle_user_areas_updated_at()
returns trigger
language plpgsql
security definer
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 7. Trigger para updated_at
drop trigger if exists user_areas_updated_at on public.user_areas;
create trigger user_areas_updated_at
before update on public.user_areas
for each row
execute procedure public.handle_user_areas_updated_at();

-- 8. Habilitar RLS (Row Level Security)
alter table public.areas enable row level security;
alter table public.user_areas enable row level security;

-- 9. ELIMINAR todas las políticas existentes (para empezar limpio)
drop policy if exists "Áreas son públicas para lectura" on public.areas;
drop policy if exists "Usuarios pueden ver su propia información" on public.user_areas;
drop policy if exists "Usuarios autenticados pueden ver áreas activas" on public.user_areas;
drop policy if exists "Permitir lectura propia" on public.user_areas;
drop policy if exists "areas_select_policy" on public.areas;
drop policy if exists "user_areas_select_policy" on public.user_areas;

-- 10. Crear política RLS para áreas (todos pueden leer, incluso sin autenticación)
create policy "areas_select_policy"
  on public.areas
  for select
  using (true);

-- 11. Crear política RLS para user_areas (usuarios autenticados ven solo su propia información)
-- Esta es la política crítica que causa el error 406 si está mal configurada
create policy "user_areas_select_policy"
  on public.user_areas
  for select
  using (
    -- Verificar que el usuario esté autenticado
    auth.uid() IS NOT NULL
    -- Y que el user_id coincida con el usuario autenticado
    AND auth.uid() = user_id
  );

-- 12. Verificar que todo se creó correctamente
-- (Estas consultas son solo informativas, no afectan la funcionalidad)
do $$
begin
  raise notice '✅ Tablas creadas correctamente';
  raise notice '✅ Políticas RLS configuradas';
  raise notice '✅ Áreas predefinidas insertadas';
end $$;

-- ============================================
-- FIN DEL SCRIPT
-- ============================================
-- 
-- PRÓXIMOS PASOS:
-- 1. Crea usuarios en Authentication > Users en Supabase Dashboard
-- 2. Asocia usuarios con áreas usando el SQL de abajo
--
-- Ejemplo para asociar un usuario con un área:
--
-- INSERT INTO user_areas (user_id, area_id, email, is_active)
-- SELECT 
--   u.id,
--   a.id,
--   u.email,
--   true
-- FROM auth.users u
-- CROSS JOIN areas a
-- WHERE u.email = 'tu@email.com'
--   AND a.code = 'RRHH'
-- ON CONFLICT (user_id, area_id) DO NOTHING;
--
-- ============================================

