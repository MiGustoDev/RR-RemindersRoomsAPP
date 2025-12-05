-- Migración: Agregar columna user_id a la tabla rooms
-- Ejecuta este script en el SQL Editor de Supabase

-- 1. Agregar columna user_id si no existe
ALTER TABLE rooms 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 2. Crear índice para mejorar el rendimiento de las consultas
CREATE INDEX IF NOT EXISTS idx_rooms_user_id ON rooms(user_id);

-- 3. IMPORTANTE: Asignar las salas existentes a un usuario específico
-- Si tienes salas existentes sin user_id, necesitas asignarlas manualmente
-- Ejemplo: Asignar todas las salas sin user_id al primer usuario (ajusta según necesites)
-- UPDATE rooms 
-- SET user_id = (SELECT id FROM auth.users LIMIT 1)
-- WHERE user_id IS NULL;

-- 4. Hacer la columna user_id obligatoria para nuevas salas (opcional, descomenta si quieres)
-- ALTER TABLE rooms 
-- ALTER COLUMN user_id SET NOT NULL;

-- 5. Habilitar Row Level Security (RLS)
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- 6. Eliminar políticas existentes si las hay (opcional, descomenta si quieres empezar desde cero)
-- DROP POLICY IF EXISTS "Users can view their own rooms" ON rooms;
-- DROP POLICY IF EXISTS "Users can create their own rooms" ON rooms;
-- DROP POLICY IF EXISTS "Users can update their own rooms" ON rooms;
-- DROP POLICY IF EXISTS "Users can delete their own rooms" ON rooms;

-- 7. Crear políticas RLS para que los usuarios solo vean sus propias salas
CREATE POLICY IF NOT EXISTS "Users can view their own rooms"
ON rooms FOR SELECT
USING (auth.uid() = user_id);

-- 8. Política para que los usuarios solo puedan crear salas para sí mismos
CREATE POLICY IF NOT EXISTS "Users can create their own rooms"
ON rooms FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 9. Política para que los usuarios solo puedan actualizar sus propias salas
CREATE POLICY IF NOT EXISTS "Users can update their own rooms"
ON rooms FOR UPDATE
USING (auth.uid() = user_id);

-- 10. Política para que los usuarios solo puedan eliminar sus propias salas
CREATE POLICY IF NOT EXISTS "Users can delete their own rooms"
ON rooms FOR DELETE
USING (auth.uid() = user_id);

-- Verificar que todo esté correcto
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'rooms' AND column_name = 'user_id';

