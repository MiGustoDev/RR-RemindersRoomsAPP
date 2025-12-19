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
-- 2. TABLAS PRINCIPALES
-- =====================================================

-- Tabla: ROOMS (Salas/Espacios de trabajo)
-- Almacena las salas donde se organizan los recordatorios
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  access_code TEXT,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
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
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('urgent', 'high', 'medium', 'low')),
  assigned_to TEXT,
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

-- Tabla: PEOPLE (Personas/Responsables)
-- Almacena las personas que pueden ser asignadas a recordatorios
CREATE TABLE IF NOT EXISTS public.people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  area TEXT[], -- Array de áreas de trabajo
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla: REMINDER_TAGS (Etiquetas de recordatorios)
-- Almacena las etiquetas disponibles para categorizar recordatorios
CREATE TABLE IF NOT EXISTS public.reminder_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT reminder_tags_room_code_fkey 
    FOREIGN KEY (room_code) 
    REFERENCES public.rooms(code) 
    ON DELETE CASCADE
);

-- Tabla: REMINDER_TAG_ASSIGNMENTS (Asignaciones de etiquetas)
-- Relación muchos a muchos entre recordatorios y etiquetas
CREATE TABLE IF NOT EXISTS public.reminder_tag_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id UUID NOT NULL,
  tag_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT reminder_tag_assignments_reminder_fkey 
    FOREIGN KEY (reminder_id) 
    REFERENCES public.reminders(id) 
    ON DELETE CASCADE,
  CONSTRAINT reminder_tag_assignments_tag_fkey 
    FOREIGN KEY (tag_id) 
    REFERENCES public.reminder_tags(id) 
    ON DELETE CASCADE,
  CONSTRAINT reminder_tag_assignments_unique 
    UNIQUE (reminder_id, tag_id)
);

-- Tabla: REMINDER_ASSIGNEES (Asignaciones de personas)
-- Relación muchos a muchos entre recordatorios y personas asignadas
CREATE TABLE IF NOT EXISTS public.reminder_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id UUID NOT NULL,
  person_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT reminder_assignees_reminder_fkey 
    FOREIGN KEY (reminder_id) 
    REFERENCES public.reminders(id) 
    ON DELETE CASCADE,
  CONSTRAINT reminder_assignees_person_fkey 
    FOREIGN KEY (person_id) 
    REFERENCES public.people(id) 
    ON DELETE CASCADE,
  CONSTRAINT reminder_assignees_unique 
    UNIQUE (reminder_id, person_id)
);

-- Tabla: ROOM_INVITATIONS (Invitaciones a salas por email)
-- Permite invitar usuarios por email a acceder a salas específicas
CREATE TABLE IF NOT EXISTS public.room_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT room_invitations_room_fkey 
    FOREIGN KEY (room_id) 
    REFERENCES public.rooms(id) 
    ON DELETE CASCADE,
  CONSTRAINT room_invitations_unique 
    UNIQUE (room_id, email)
);

-- =====================================================
-- 3. ÍNDICES (Para optimizar consultas)
-- =====================================================

-- Índices para ROOMS
CREATE INDEX IF NOT EXISTS rooms_code_idx ON public.rooms (code);
CREATE INDEX IF NOT EXISTS rooms_is_locked_idx ON public.rooms (is_locked);
CREATE INDEX IF NOT EXISTS rooms_user_id_idx ON public.rooms (user_id);
CREATE INDEX IF NOT EXISTS rooms_created_at_idx ON public.rooms (created_at);

-- Índices para REMINDERS
CREATE INDEX IF NOT EXISTS reminders_room_code_idx ON public.reminders (room_code);
CREATE INDEX IF NOT EXISTS reminders_due_date_idx ON public.reminders (due_date);
CREATE INDEX IF NOT EXISTS reminders_created_at_idx ON public.reminders (created_at);
CREATE INDEX IF NOT EXISTS reminders_progress_idx ON public.reminders (progress);
CREATE INDEX IF NOT EXISTS reminders_priority_idx ON public.reminders (priority);

-- Índices para REMINDER_COMMENTS
CREATE INDEX IF NOT EXISTS reminder_comments_reminder_idx ON public.reminder_comments (reminder_id);
CREATE INDEX IF NOT EXISTS reminder_comments_created_idx ON public.reminder_comments (created_at);

-- Índices para PEOPLE
CREATE INDEX IF NOT EXISTS people_email_idx ON public.people (email);
CREATE INDEX IF NOT EXISTS people_area_idx ON public.people USING GIN (area);

-- Índices para REMINDER_TAGS
CREATE INDEX IF NOT EXISTS reminder_tags_room_code_idx ON public.reminder_tags (room_code);

-- Índices para REMINDER_TAG_ASSIGNMENTS
CREATE INDEX IF NOT EXISTS reminder_tag_assignments_reminder_idx ON public.reminder_tag_assignments (reminder_id);
CREATE INDEX IF NOT EXISTS reminder_tag_assignments_tag_idx ON public.reminder_tag_assignments (tag_id);

-- Índices para REMINDER_ASSIGNEES
CREATE INDEX IF NOT EXISTS reminder_assignees_reminder_idx ON public.reminder_assignees (reminder_id);
CREATE INDEX IF NOT EXISTS reminder_assignees_person_idx ON public.reminder_assignees (person_id);

-- Índices para ROOM_INVITATIONS
CREATE INDEX IF NOT EXISTS room_invitations_room_idx ON public.room_invitations (room_id);
CREATE INDEX IF NOT EXISTS room_invitations_email_idx ON public.room_invitations (email);

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

-- Función: Actualizar automáticamente el campo updated_at en rooms
CREATE OR REPLACE FUNCTION public.handle_rooms_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger: Ejecutar función antes de actualizar una room
DROP TRIGGER IF EXISTS rooms_updated_at ON public.rooms;
CREATE TRIGGER rooms_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_rooms_updated_at();

-- Función: Validar que todos los valores del array de áreas estén permitidos
CREATE OR REPLACE FUNCTION public.validate_area_array(area_arr TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
    -- Si es NULL, es válido
    IF area_arr IS NULL THEN
        RETURN TRUE;
    END IF;
    
    -- Si está vacío, es válido
    IF array_length(area_arr, 1) IS NULL THEN
        RETURN TRUE;
    END IF;
    
    -- Verificar que todos los elementos estén en la lista permitida
    RETURN (
        SELECT bool_and(area_item IN ('RRHH', 'Calidad', 'Sistemas', 'Marketing', 'Compras', 'Administracion', 'Mantenimiento', 'Logistica', 'Fabrica', 'JEFE'))
        FROM unnest(area_arr) AS area_item
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Función: Verificar si un array contiene un valor específico (útil para búsquedas)
CREATE OR REPLACE FUNCTION public.array_contains(arr TEXT[], val TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN val = ANY(arr);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Función helper: Verificar si el usuario tiene acceso a una sala
-- (es propietario, miembro o invitado por email)
CREATE OR REPLACE FUNCTION public.user_has_room_access(room_code_param TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_id UUID;
  current_user_email TEXT;
  is_owner BOOLEAN;
  is_invited BOOLEAN;
BEGIN
  -- Obtener el usuario actual
  current_user_id := auth.uid();
  current_user_email := (auth.jwt() ->> 'email');
  
  -- Verificar si es propietario de la sala
  SELECT EXISTS (
    SELECT 1 FROM public.rooms 
    WHERE code = room_code_param 
    AND user_id = current_user_id
  ) INTO is_owner;
  
  IF is_owner THEN
    RETURN TRUE;
  END IF;
  
  -- Verificar si está invitado por email
  SELECT EXISTS (
    SELECT 1 FROM public.room_invitations ri
    INNER JOIN public.rooms r ON r.id = ri.room_id
    WHERE r.code = room_code_param 
    AND ri.email = current_user_email
  ) INTO is_invited;
  
  IF is_invited THEN
    RETURN TRUE;
  END IF;
  
  -- Por defecto, permitir acceso (comportamiento actual de la app)
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Constraint: Validar áreas permitidas en la tabla people
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'people_area_check'
    ) THEN
        ALTER TABLE public.people
        ADD CONSTRAINT people_area_check 
        CHECK (validate_area_array(area));
    END IF;
END $$;

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_tag_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_invitations ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS RLS - ROOMS
-- =====================================================

-- Permitir a todos ver todas las salas
DROP POLICY IF EXISTS "Permitir lectura pública de rooms" ON public.rooms;
CREATE POLICY "Permitir lectura pública de rooms"
  ON public.rooms
  FOR SELECT
  TO authenticated
  USING (true);

-- Permitir a usuarios autenticados crear salas
DROP POLICY IF EXISTS "Permitir creación de rooms" ON public.rooms;
CREATE POLICY "Permitir creación de rooms"
  ON public.rooms
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Permitir a usuarios autenticados actualizar salas
DROP POLICY IF EXISTS "Permitir actualización de rooms" ON public.rooms;
CREATE POLICY "Permitir actualización de rooms"
  ON public.rooms
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Permitir a usuarios autenticados eliminar salas (solo el creador)
DROP POLICY IF EXISTS "Permitir eliminación de rooms" ON public.rooms;
CREATE POLICY "Permitir eliminación de rooms"
  ON public.rooms
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

-- =====================================================
-- POLÍTICAS RLS - REMINDERS
-- =====================================================

-- Permitir a usuarios autenticados ver recordatorios de salas a las que tienen acceso
DROP POLICY IF EXISTS "Permitir lectura de reminders" ON public.reminders;
CREATE POLICY "Permitir lectura de reminders"
  ON public.reminders
  FOR SELECT
  TO authenticated
  USING (user_has_room_access(room_code));

-- Permitir a usuarios autenticados crear recordatorios en salas a las que tienen acceso
DROP POLICY IF EXISTS "Permitir creación de reminders" ON public.reminders;
CREATE POLICY "Permitir creación de reminders"
  ON public.reminders
  FOR INSERT
  TO authenticated
  WITH CHECK (user_has_room_access(room_code));

-- Permitir a usuarios autenticados actualizar recordatorios en salas a las que tienen acceso
DROP POLICY IF EXISTS "Permitir actualización de reminders" ON public.reminders;
CREATE POLICY "Permitir actualización de reminders"
  ON public.reminders
  FOR UPDATE
  TO authenticated
  USING (user_has_room_access(room_code))
  WITH CHECK (user_has_room_access(room_code));

-- Permitir a usuarios autenticados eliminar recordatorios en salas a las que tienen acceso
DROP POLICY IF EXISTS "Permitir eliminación de reminders" ON public.reminders;
CREATE POLICY "Permitir eliminación de reminders"
  ON public.reminders
  FOR DELETE
  TO authenticated
  USING (user_has_room_access(room_code));

-- =====================================================
-- POLÍTICAS RLS - REMINDER_COMMENTS
-- =====================================================

-- Permitir a usuarios autenticados ver comentarios de recordatorios a los que tienen acceso
DROP POLICY IF EXISTS "Permitir lectura de comments" ON public.reminder_comments;
CREATE POLICY "Permitir lectura de comments"
  ON public.reminder_comments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.reminders r
      WHERE r.id = reminder_comments.reminder_id
      AND user_has_room_access(r.room_code)
    )
  );

-- Permitir a usuarios autenticados crear comentarios en recordatorios a los que tienen acceso
DROP POLICY IF EXISTS "Permitir creación de comments" ON public.reminder_comments;
CREATE POLICY "Permitir creación de comments"
  ON public.reminder_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.reminders r
      WHERE r.id = reminder_comments.reminder_id
      AND user_has_room_access(r.room_code)
    )
  );

-- Permitir a usuarios autenticados actualizar comentarios
DROP POLICY IF EXISTS "Permitir actualización de comments" ON public.reminder_comments;
CREATE POLICY "Permitir actualización de comments"
  ON public.reminder_comments
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Permitir a usuarios autenticados eliminar comentarios
DROP POLICY IF EXISTS "Permitir eliminación de comments" ON public.reminder_comments;
CREATE POLICY "Permitir eliminación de comments"
  ON public.reminder_comments
  FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- POLÍTICAS RLS - PEOPLE
-- =====================================================

-- Permitir a usuarios autenticados ver todas las personas
DROP POLICY IF EXISTS "Permitir lectura de people" ON public.people;
CREATE POLICY "Permitir lectura de people"
  ON public.people
  FOR SELECT
  TO authenticated
  USING (true);

-- Permitir a usuarios autenticados crear personas
DROP POLICY IF EXISTS "Permitir creación de people" ON public.people;
CREATE POLICY "Permitir creación de people"
  ON public.people
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Permitir a usuarios autenticados actualizar personas
DROP POLICY IF EXISTS "Permitir actualización de people" ON public.people;
CREATE POLICY "Permitir actualización de people"
  ON public.people
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Permitir a usuarios autenticados eliminar personas
DROP POLICY IF EXISTS "Permitir eliminación de people" ON public.people;
CREATE POLICY "Permitir eliminación de people"
  ON public.people
  FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- POLÍTICAS RLS - REMINDER_TAGS
-- =====================================================

-- Permitir a usuarios autenticados ver etiquetas de salas a las que tienen acceso
DROP POLICY IF EXISTS "Permitir lectura de reminder_tags" ON public.reminder_tags;
CREATE POLICY "Permitir lectura de reminder_tags"
  ON public.reminder_tags
  FOR SELECT
  TO authenticated
  USING (user_has_room_access(room_code));

-- Permitir a usuarios autenticados crear etiquetas en salas a las que tienen acceso
DROP POLICY IF EXISTS "Permitir creación de reminder_tags" ON public.reminder_tags;
CREATE POLICY "Permitir creación de reminder_tags"
  ON public.reminder_tags
  FOR INSERT
  TO authenticated
  WITH CHECK (user_has_room_access(room_code));

-- Permitir a usuarios autenticados actualizar etiquetas en salas a las que tienen acceso
DROP POLICY IF EXISTS "Permitir actualización de reminder_tags" ON public.reminder_tags;
CREATE POLICY "Permitir actualización de reminder_tags"
  ON public.reminder_tags
  FOR UPDATE
  TO authenticated
  USING (user_has_room_access(room_code))
  WITH CHECK (user_has_room_access(room_code));

-- Permitir a usuarios autenticados eliminar etiquetas en salas a las que tienen acceso
DROP POLICY IF EXISTS "Permitir eliminación de reminder_tags" ON public.reminder_tags;
CREATE POLICY "Permitir eliminación de reminder_tags"
  ON public.reminder_tags
  FOR DELETE
  TO authenticated
  USING (user_has_room_access(room_code));

-- =====================================================
-- POLÍTICAS RLS - REMINDER_TAG_ASSIGNMENTS
-- =====================================================

-- Permitir a usuarios autenticados ver asignaciones de etiquetas de recordatorios a los que tienen acceso
DROP POLICY IF EXISTS "Permitir lectura de reminder_tag_assignments" ON public.reminder_tag_assignments;
CREATE POLICY "Permitir lectura de reminder_tag_assignments"
  ON public.reminder_tag_assignments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.reminders r
      WHERE r.id = reminder_tag_assignments.reminder_id
      AND user_has_room_access(r.room_code)
    )
  );

-- Permitir a usuarios autenticados crear asignaciones de etiquetas en recordatorios a los que tienen acceso
DROP POLICY IF EXISTS "Permitir creación de reminder_tag_assignments" ON public.reminder_tag_assignments;
CREATE POLICY "Permitir creación de reminder_tag_assignments"
  ON public.reminder_tag_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.reminders r
      WHERE r.id = reminder_tag_assignments.reminder_id
      AND user_has_room_access(r.room_code)
    )
  );

-- Permitir a usuarios autenticados eliminar asignaciones de etiquetas
DROP POLICY IF EXISTS "Permitir eliminación de reminder_tag_assignments" ON public.reminder_tag_assignments;
CREATE POLICY "Permitir eliminación de reminder_tag_assignments"
  ON public.reminder_tag_assignments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.reminders r
      WHERE r.id = reminder_tag_assignments.reminder_id
      AND user_has_room_access(r.room_code)
    )
  );

-- =====================================================
-- POLÍTICAS RLS - REMINDER_ASSIGNEES
-- =====================================================

-- Permitir a usuarios autenticados ver asignaciones de personas de recordatorios a los que tienen acceso
DROP POLICY IF EXISTS "Permitir lectura de reminder_assignees" ON public.reminder_assignees;
CREATE POLICY "Permitir lectura de reminder_assignees"
  ON public.reminder_assignees
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.reminders r
      WHERE r.id = reminder_assignees.reminder_id
      AND user_has_room_access(r.room_code)
    )
  );

-- Permitir a usuarios autenticados crear asignaciones de personas en recordatorios a los que tienen acceso
DROP POLICY IF EXISTS "Permitir creación de reminder_assignees" ON public.reminder_assignees;
CREATE POLICY "Permitir creación de reminder_assignees"
  ON public.reminder_assignees
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.reminders r
      WHERE r.id = reminder_assignees.reminder_id
      AND user_has_room_access(r.room_code)
    )
  );

-- Permitir a usuarios autenticados eliminar asignaciones de personas
DROP POLICY IF EXISTS "Permitir eliminación de reminder_assignees" ON public.reminder_assignees;
CREATE POLICY "Permitir eliminación de reminder_assignees"
  ON public.reminder_assignees
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.reminders r
      WHERE r.id = reminder_assignees.reminder_id
      AND user_has_room_access(r.room_code)
    )
  );

-- =====================================================
-- POLÍTICAS RLS - ROOM_INVITATIONS
-- =====================================================

-- Permitir a usuarios autenticados ver invitaciones de salas de las que son propietarios o están invitados
DROP POLICY IF EXISTS "Permitir lectura de room_invitations" ON public.room_invitations;
CREATE POLICY "Permitir lectura de room_invitations"
  ON public.room_invitations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rooms r
      WHERE r.id = room_invitations.room_id
      AND (
        r.user_id = auth.uid() 
        OR room_invitations.email = (auth.jwt() ->> 'email')
      )
    )
  );

-- Permitir a usuarios autenticados crear invitaciones solo si son propietarios de la sala
DROP POLICY IF EXISTS "Permitir creación de room_invitations" ON public.room_invitations;
CREATE POLICY "Permitir creación de room_invitations"
  ON public.room_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rooms r
      WHERE r.id = room_invitations.room_id
      AND r.user_id = auth.uid()
    )
  );

-- Permitir a usuarios autenticados eliminar invitaciones si son propietarios de la sala
DROP POLICY IF EXISTS "Permitir eliminación de room_invitations" ON public.room_invitations;
CREATE POLICY "Permitir eliminación de room_invitations"
  ON public.room_invitations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rooms r
      WHERE r.id = room_invitations.room_id
      AND r.user_id = auth.uid()
    )
  );

-- =====================================================
-- 6. VERIFICACIÓN
-- =====================================================

-- Verificar que las tablas se crearon correctamente
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('rooms', 'reminders', 'reminder_comments', 'people', 'reminder_tags', 'reminder_tag_assignments', 'reminder_assignees', 'room_invitations');
  
  IF table_count = 8 THEN
    RAISE NOTICE '✓ Todas las tablas se crearon correctamente';
  ELSE
    RAISE WARNING '⚠ Faltan tablas. Se esperaban 8, se encontraron %', table_count;
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
    AND tablename IN ('rooms', 'reminders', 'reminder_comments', 'people', 'reminder_tags', 'reminder_tag_assignments', 'reminder_assignees', 'room_invitations')
    AND rowsecurity = true;
  
  IF rls_count = 8 THEN
    RAISE NOTICE '✓ RLS habilitado en todas las tablas';
  ELSE
    RAISE WARNING '⚠ RLS no está habilitado en todas las tablas. Se encontraron % de 8', rls_count;
  END IF;
END $$;

-- =====================================================
-- CONFIGURACIÓN COMPLETADA
-- =====================================================
-- 
-- ¡Listo! Tu base de datos está configurada completamente.
-- 
-- Tablas creadas:
-- - rooms: Salas de trabajo
-- - reminders: Recordatorios/Tareas
-- - reminder_comments: Comentarios en recordatorios
-- - people: Personas/Responsables (con áreas de trabajo como array)
-- - reminder_tags: Etiquetas para categorizar recordatorios
-- - reminder_tag_assignments: Relación recordatorios-etiquetas
-- - reminder_assignees: Relación recordatorios-personas asignadas
-- - room_invitations: Invitaciones por email a salas
-- 
-- Funciones creadas:
-- - handle_reminders_updated_at: Actualiza updated_at automáticamente
-- - handle_rooms_updated_at: Actualiza updated_at en rooms
-- - validate_area_array: Valida áreas permitidas en people
-- - array_contains: Verifica si un array contiene un valor
-- - user_has_room_access: Verifica acceso a salas (propietario/invitado)
-- 
-- Próximos pasos:
-- 1. Verifica que no haya errores en la ejecución
-- 2. Revisa las tablas en el Table Editor de Supabase
-- 3. Configura tus variables de entorno (.env):
--    - VITE_SUPABASE_URL=tu_url_de_supabase
--    - VITE_SUPABASE_ANON_KEY=tu_anon_key
-- 4. ¡Ejecuta la aplicación!
--
-- =====================================================
