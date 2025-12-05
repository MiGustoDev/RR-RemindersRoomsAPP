-- Agregar columna assigned_to a la tabla reminders
-- Ejecuta este script en el SQL Editor de Supabase

-- IMPORTANTE: Ejecuta primero create_people_table.sql si quieres que assigned_to
-- haga referencia a la tabla people. Si no, esta versión funcionará sin la referencia.

-- 1. Agregar la columna assigned_to como UUID (sin referencia primero)
ALTER TABLE reminders
ADD COLUMN IF NOT EXISTS assigned_to UUID;

-- 2. Si la tabla people existe, agregar la referencia (opcional)
-- Descomenta las siguientes líneas si ya ejecutaste create_people_table.sql:
-- ALTER TABLE reminders
-- DROP CONSTRAINT IF EXISTS reminders_assigned_to_fkey;
-- ALTER TABLE reminders
-- ADD CONSTRAINT reminders_assigned_to_fkey 
-- FOREIGN KEY (assigned_to) REFERENCES people(id) ON DELETE SET NULL;

-- 3. Crear índice para mejorar el rendimiento de las consultas
CREATE INDEX IF NOT EXISTS idx_reminders_assigned_to ON reminders(assigned_to);

-- 4. Verificar que la columna se agregó correctamente
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'reminders' 
  AND column_name = 'assigned_to';

