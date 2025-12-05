-- =====================================================
-- REMINDERS & ROOMS APP - CONFIGURACIÓN COMPLETA SUPABASE
-- =====================================================
-- Este script configura toda la base de datos para la aplicación
-- de Reminders y Rooms. Incluye tablas, índices, triggers, 
-- funciones y políticas RLS.
--
-- INSTRUCCIONES:
-- 1. Abre tu proyecto en Supabase Dashboard
-- 2. Ve a SQL Editor
-- 3. Crea una nueva query
-- 4. Pega todo este contenido
-- 5. Ejecuta el script
-- =====================================================

-- =====================================================
-- 1. EXTENSIONES
-- =====================================================

-- Habilitar extensión para generar UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 2. TABLAS
-- =====================================================

-- Tabla: ROOMS (Salas/Espacios de trabajo)
-- Almacena las salas donde se organizan los recordatorios
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  access_code TEXT,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla: REMINDERS (Recordatorios/Tareas)
-- Almacena los recordatorios asociados a cada sala
CREATE TABLE IF NOT EXISTS public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  due_date TIMESTAMPTZ,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT reminders_room_code_fkey 
    FOREIGN KEY (room_code) 
    REFERENCES public.rooms(code) 
    ON DELETE CASCADE
);

-- Tabla: REMINDER_COMMENTS (Comentarios en recordatorios)
-- Permite agregar comentarios/notas a los recordatorios
CREATE TABLE IF NOT EXISTS public.reminder_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id UUID NOT NULL,
  author TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT reminder_comments_reminder_fkey 
    FOREIGN KEY (reminder_id) 
    REFERENCES public.reminders(id) 
    ON DELETE CASCADE
);

-- =====================================================
-- 3. ÍNDICES (Para optimizar consultas)
-- =====================================================

-- Índices para ROOMS
CREATE INDEX IF NOT EXISTS rooms_code_idx ON public.rooms (code);
CREATE INDEX IF NOT EXISTS rooms_is_locked_idx ON public.rooms (is_locked);
CREATE INDEX IF NOT EXISTS rooms_created_at_idx ON public.rooms (created_at);

-- Índices para REMINDERS
CREATE INDEX IF NOT EXISTS reminders_room_code_idx ON public.reminders (room_code);
CREATE INDEX IF NOT EXISTS reminders_due_date_idx ON public.reminders (due_date);
CREATE INDEX IF NOT EXISTS reminders_created_at_idx ON public.reminders (created_at);
CREATE INDEX IF NOT EXISTS reminders_progress_idx ON public.reminders (progress);

-- Índices para REMINDER_COMMENTS
CREATE INDEX IF NOT EXISTS reminder_comments_reminder_idx ON public.reminder_comments (reminder_id);
CREATE INDEX IF NOT EXISTS reminder_comments_created_idx ON public.reminder_comments (created_at);

-- =====================================================
-- 4. FUNCIONES Y TRIGGERS
-- =====================================================

-- Función: Actualizar automáticamente el campo updated_at
CREATE OR REPLACE FUNCTION public.handle_reminders_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger: Ejecutar función antes de actualizar un reminder
DROP TRIGGER IF EXISTS reminders_updated_at ON public.reminders;
CREATE TRIGGER reminders_updated_at
  BEFORE UPDATE ON public.reminders
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_reminders_updated_at();

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_comments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS RLS - ROOMS
-- =====================================================

-- Permitir a todos (anon y authenticated) ver todas las salas
DROP POLICY IF EXISTS "Permitir lectura pública de rooms" ON public.rooms;
CREATE POLICY "Permitir lectura pública de rooms"
  ON public.rooms
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Permitir a todos crear salas
DROP POLICY IF EXISTS "Permitir creación pública de rooms" ON public.rooms;
CREATE POLICY "Permitir creación pública de rooms"
  ON public.rooms
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Permitir a todos actualizar salas
DROP POLICY IF EXISTS "Permitir actualización pública de rooms" ON public.rooms;
CREATE POLICY "Permitir actualización pública de rooms"
  ON public.rooms
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Permitir a todos eliminar salas
DROP POLICY IF EXISTS "Permitir eliminación pública de rooms" ON public.rooms;
CREATE POLICY "Permitir eliminación pública de rooms"
  ON public.rooms
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- =====================================================
-- POLÍTICAS RLS - REMINDERS
-- =====================================================

-- Permitir a todos ver todos los recordatorios
DROP POLICY IF EXISTS "Permitir lectura pública de reminders" ON public.reminders;
CREATE POLICY "Permitir lectura pública de reminders"
  ON public.reminders
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Permitir a todos crear recordatorios
DROP POLICY IF EXISTS "Permitir creación pública de reminders" ON public.reminders;
CREATE POLICY "Permitir creación pública de reminders"
  ON public.reminders
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Permitir a todos actualizar recordatorios
DROP POLICY IF EXISTS "Permitir actualización pública de reminders" ON public.reminders;
CREATE POLICY "Permitir actualización pública de reminders"
  ON public.reminders
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Permitir a todos eliminar recordatorios
DROP POLICY IF EXISTS "Permitir eliminación pública de reminders" ON public.reminders;
CREATE POLICY "Permitir eliminación pública de reminders"
  ON public.reminders
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- =====================================================
-- POLÍTICAS RLS - REMINDER_COMMENTS
-- =====================================================

-- Permitir a todos ver todos los comentarios
DROP POLICY IF EXISTS "Permitir lectura pública de comments" ON public.reminder_comments;
CREATE POLICY "Permitir lectura pública de comments"
  ON public.reminder_comments
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Permitir a todos crear comentarios
DROP POLICY IF EXISTS "Permitir creación pública de comments" ON public.reminder_comments;
CREATE POLICY "Permitir creación pública de comments"
  ON public.reminder_comments
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Permitir a todos actualizar comentarios
DROP POLICY IF EXISTS "Permitir actualización pública de comments" ON public.reminder_comments;
CREATE POLICY "Permitir actualización pública de comments"
  ON public.reminder_comments
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Permitir a todos eliminar comentarios
DROP POLICY IF EXISTS "Permitir eliminación pública de comments" ON public.reminder_comments;
CREATE POLICY "Permitir eliminación pública de comments"
  ON public.reminder_comments
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- =====================================================
-- 6. DATOS DE EJEMPLO (OPCIONAL)
-- =====================================================

-- Insertar una sala de ejemplo
INSERT INTO public.rooms (name, code, is_locked, access_code)
VALUES 
  ('Sala de Ejemplo', 'DEMO2024', false, null),
  ('Sala Privada', 'PRIVATE01', true, 'secreto123')
ON CONFLICT (code) DO NOTHING;

-- Insertar recordatorios de ejemplo
INSERT INTO public.reminders (room_code, title, description, due_date, progress)
VALUES 
  ('DEMO2024', 'Bienvenido a Reminders & Rooms', 'Esta es una tarea de ejemplo para que veas cómo funciona la aplicación.', now() + interval '7 days', 0),
  ('DEMO2024', 'Configurar Supabase', 'Asegúrate de haber ejecutado este script SQL en tu proyecto de Supabase.', now() + interval '1 day', 50),
  ('DEMO2024', 'Probar la aplicación', 'Crea salas, agrega recordatorios y prueba todas las funcionalidades.', now() + interval '3 days', 25)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 7. VERIFICACIÓN
-- =====================================================

-- Verificar que las tablas se crearon correctamente
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('rooms', 'reminders', 'reminder_comments');
  
  IF table_count = 3 THEN
    RAISE NOTICE '✓ Todas las tablas se crearon correctamente';
  ELSE
    RAISE WARNING '⚠ Faltan tablas. Se esperaban 3, se encontraron %', table_count;
  END IF;
END $$;

-- Verificar que RLS está habilitado
DO $$
DECLARE
  rls_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO rls_count
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN ('rooms', 'reminders', 'reminder_comments')
    AND rowsecurity = true;
  
  IF rls_count = 3 THEN
    RAISE NOTICE '✓ RLS habilitado en todas las tablas';
  ELSE
    RAISE WARNING '⚠ RLS no está habilitado en todas las tablas';
  END IF;
END $$;

-- =====================================================
-- CONFIGURACIÓN COMPLETADA
-- =====================================================
-- 
-- ¡Listo! Tu base de datos está configurada.
-- 
-- Próximos pasos:
-- 1. Verifica que no haya errores en la ejecución
-- 2. Revisa las tablas en el Table Editor de Supabase
-- 3. Configura tus variables de entorno (.env):
--    - VITE_SUPABASE_URL=tu_url_de_supabase
--    - VITE_SUPABASE_ANON_KEY=tu_anon_key
-- 4. ¡Ejecuta tu aplicación!
--
-- =====================================================
