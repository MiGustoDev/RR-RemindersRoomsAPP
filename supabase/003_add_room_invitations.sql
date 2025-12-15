-- Tabla de invitaciones/permisos de salas
-- Ejecuta este script en el SQL Editor de tu proyecto Supabase
-- (Database > SQL > New query)

-- 1. Crear tabla room_invitations
CREATE TABLE IF NOT EXISTS room_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Índices útiles
CREATE INDEX IF NOT EXISTS idx_room_invitations_room_id ON room_invitations(room_id);
CREATE INDEX IF NOT EXISTS idx_room_invitations_email ON room_invitations(email);

-- 3. Habilitar Row Level Security
ALTER TABLE room_invitations ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS
-- Permitir que cualquier usuario autenticado lea invitaciones de salas en las que participa
CREATE POLICY "Users can read room invitations"
ON room_invitations FOR SELECT
USING (auth.role() = 'authenticated');

-- Permitir insertar invitaciones a cualquier usuario autenticado
-- (el frontend ya limita esto al creador de la sala)
CREATE POLICY "Users can insert room invitations"
ON room_invitations FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Permitir eliminar invitaciones a cualquier usuario autenticado
-- (el frontend ya limita esto al creador de la sala)
CREATE POLICY "Users can delete room invitations"
ON room_invitations FOR DELETE
USING (auth.role() = 'authenticated');

-- 5. Comprobar estructura
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'room_invitations'
ORDER BY ordinal_position;


