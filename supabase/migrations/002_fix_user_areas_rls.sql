-- ============================================
-- FIX: Corregir políticas RLS para user_areas
-- Ejecuta este script si ya ejecutaste 001_add_user_areas.sql
-- y sigues teniendo errores 406
-- ============================================

-- Eliminar políticas existentes
drop policy if exists "Usuarios pueden ver su propia información" on public.user_areas;
drop policy if exists "Usuarios autenticados pueden ver áreas activas" on public.user_areas;
drop policy if exists "Permitir lectura propia" on public.user_areas;

-- Crear política corregida
-- Los usuarios autenticados pueden ver su propia información
create policy "Permitir lectura propia"
  on public.user_areas
  for select
  using (
    auth.uid() IS NOT NULL 
    AND auth.uid() = user_id
  );

-- Verificar que la política se creó correctamente
-- Puedes ejecutar esto para verificar:
-- SELECT * FROM pg_policies WHERE tablename = 'user_areas';

-- ============================================
-- FIN DEL FIX
-- ============================================

