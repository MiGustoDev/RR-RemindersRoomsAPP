-- Agregar todas las columnas necesarias a la tabla reminders
-- Ejecuta este script en el SQL Editor de Supabase

-- 1. Agregar columna priority (TEXT con valores: 'low', 'medium', 'high', 'urgent')
ALTER TABLE reminders
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';

-- 2. Agregar constraint para validar los valores de priority
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'reminders_priority_check'
  ) THEN
    ALTER TABLE reminders
    ADD CONSTRAINT reminders_priority_check 
    CHECK (priority IN ('low', 'medium', 'high', 'urgent'));
  END IF;
END $$;

-- 3. Agregar columna assigned_to (UUID, referencia opcional a people)
ALTER TABLE reminders
ADD COLUMN IF NOT EXISTS assigned_to UUID;

-- 4. Si la tabla people existe, agregar la referencia (opcional)
-- Descomenta las siguientes líneas si ya ejecutaste create_people_table.sql:
-- DO $$ 
-- BEGIN
--   IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'people') THEN
--     ALTER TABLE reminders
--     DROP CONSTRAINT IF EXISTS reminders_assigned_to_fkey;
--     ALTER TABLE reminders
--     ADD CONSTRAINT reminders_assigned_to_fkey 
--     FOREIGN KEY (assigned_to) REFERENCES people(id) ON DELETE SET NULL;
--   END IF;
-- END $$;

-- 5. Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_reminders_priority ON reminders(priority);
CREATE INDEX IF NOT EXISTS idx_reminders_assigned_to ON reminders(assigned_to);

-- 6. Actualizar registros existentes que no tengan priority
UPDATE reminders 
SET priority = 'medium' 
WHERE priority IS NULL;

-- 7. Verificar que las columnas se agregaron correctamente
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'reminders' 
  AND column_name IN ('priority', 'assigned_to')
ORDER BY column_name;




