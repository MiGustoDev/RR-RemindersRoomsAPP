-- Tabla para asignar múltiples responsables a un recordatorio
-- Ejecuta este script en el SQL Editor de Supabase (Database > SQL)

-- 1. Crear tabla reminder_assignees
CREATE TABLE IF NOT EXISTS reminder_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id UUID NOT NULL REFERENCES reminders(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(reminder_id, person_id)
);

-- 2. Índices
CREATE INDEX IF NOT EXISTS idx_reminder_assignees_reminder_id ON reminder_assignees(reminder_id);
CREATE INDEX IF NOT EXISTS idx_reminder_assignees_person_id ON reminder_assignees(person_id);

-- 3. Habilitar RLS
ALTER TABLE reminder_assignees ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS usando la función user_has_room_access(room_code)
-- (definida en create_tags_tables.sql)

-- Primero, eliminar políticas antiguas si existen
DROP POLICY IF EXISTS "Users can view reminder assignees" ON reminder_assignees;
DROP POLICY IF EXISTS "Users can insert reminder assignees" ON reminder_assignees;
DROP POLICY IF EXISTS "Users can delete reminder assignees" ON reminder_assignees;

-- Ver y listar responsables de un recordatorio si tiene acceso a la sala
CREATE POLICY "Users can view reminder assignees"
ON reminder_assignees FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM reminders
    WHERE reminders.id = reminder_assignees.reminder_id
    AND user_has_room_access(reminders.room_code)
  )
);

-- Insertar responsables si tiene acceso a la sala
CREATE POLICY "Users can insert reminder assignees"
ON reminder_assignees FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM reminders
    WHERE reminders.id = reminder_assignees.reminder_id
    AND user_has_room_access(reminders.room_code)
  )
);

-- Eliminar responsables si tiene acceso a la sala
CREATE POLICY "Users can delete reminder assignees"
ON reminder_assignees FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM reminders
    WHERE reminders.id = reminder_assignees.reminder_id
    AND user_has_room_access(reminders.room_code)
  )
);


