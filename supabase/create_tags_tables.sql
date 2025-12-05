-- Crear tablas para el sistema de etiquetas
-- Ejecuta este script en el SQL Editor de Supabase

-- 1. Crear tabla de etiquetas (tags por sala)
CREATE TABLE IF NOT EXISTS reminder_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT NOT NULL REFERENCES rooms(code) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_code, name)
);

-- 2. Crear tabla de asignación de etiquetas a recordatorios
CREATE TABLE IF NOT EXISTS reminder_tag_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id UUID NOT NULL REFERENCES reminders(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES reminder_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(reminder_id, tag_id)
);

-- 3. Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_reminder_tags_room_code ON reminder_tags(room_code);
CREATE INDEX IF NOT EXISTS idx_reminder_tag_assignments_reminder_id ON reminder_tag_assignments(reminder_id);
CREATE INDEX IF NOT EXISTS idx_reminder_tag_assignments_tag_id ON reminder_tag_assignments(tag_id);

-- 4. Habilitar Row Level Security
ALTER TABLE reminder_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_tag_assignments ENABLE ROW LEVEL SECURITY;

-- 5. Políticas para reminder_tags
CREATE POLICY "Users can view tags in their rooms"
ON reminder_tags FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM rooms 
    WHERE rooms.code = reminder_tags.room_code 
    AND rooms.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create tags in their rooms"
ON reminder_tags FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM rooms 
    WHERE rooms.code = reminder_tags.room_code 
    AND rooms.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update tags in their rooms"
ON reminder_tags FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM rooms 
    WHERE rooms.code = reminder_tags.room_code 
    AND rooms.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete tags in their rooms"
ON reminder_tags FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM rooms 
    WHERE rooms.code = reminder_tags.room_code 
    AND rooms.user_id = auth.uid()
  )
);

-- 6. Políticas para reminder_tag_assignments
CREATE POLICY "Users can view tag assignments in their rooms"
ON reminder_tag_assignments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM reminders
    JOIN rooms ON rooms.code = reminders.room_code
    WHERE reminders.id = reminder_tag_assignments.reminder_id
    AND rooms.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create tag assignments in their rooms"
ON reminder_tag_assignments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM reminders
    JOIN rooms ON rooms.code = reminders.room_code
    WHERE reminders.id = reminder_tag_assignments.reminder_id
    AND rooms.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete tag assignments in their rooms"
ON reminder_tag_assignments FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM reminders
    JOIN rooms ON rooms.code = reminders.room_code
    WHERE reminders.id = reminder_tag_assignments.reminder_id
    AND rooms.user_id = auth.uid()
  )
);

-- Verificar que las tablas se crearon correctamente
SELECT 
  table_name,
  column_name, 
  data_type
FROM information_schema.columns
WHERE table_name IN ('reminder_tags', 'reminder_tag_assignments')
ORDER BY table_name, ordinal_position;

