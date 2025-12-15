-- Agregar columna de área de trabajo a la tabla people
-- Ejecuta este script en el SQL Editor de Supabase

-- 1. Agregar columna area a la tabla people
ALTER TABLE people
ADD COLUMN IF NOT EXISTS area TEXT;

-- 2. Crear constraint para validar los valores de area
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'people_area_check'
  ) THEN
    ALTER TABLE people
    ADD CONSTRAINT people_area_check 
    CHECK (area IS NULL OR area IN ('RRHH', 'Calidad', 'Sistemas', 'Marketing', 'Compras', 'Administracion'));
  END IF;
END $$;

-- 3. Crear índice para búsquedas por área
CREATE INDEX IF NOT EXISTS idx_people_area ON people(area);

-- 4. Verificar que la columna se agregó correctamente
SELECT 
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'people' 
  AND column_name = 'area';

