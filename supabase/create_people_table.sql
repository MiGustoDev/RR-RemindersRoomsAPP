-- Crear tabla de personas para el selector de responsables
-- Ejecuta este script en el SQL Editor de Supabase

-- 1. Crear la tabla people
CREATE TABLE IF NOT EXISTS people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_people_name ON people(name);
CREATE INDEX IF NOT EXISTS idx_people_email ON people(email);

-- 3. Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Crear trigger para actualizar updated_at
DROP TRIGGER IF EXISTS update_people_updated_at ON people;
CREATE TRIGGER update_people_updated_at
  BEFORE UPDATE ON people
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5. Habilitar Row Level Security (opcional)
ALTER TABLE people ENABLE ROW LEVEL SECURITY;

-- 6. Política para que todos los usuarios autenticados puedan leer personas
CREATE POLICY "Users can view people"
ON people FOR SELECT
USING (auth.role() = 'authenticated');

-- 7. Política para que todos los usuarios autenticados puedan insertar personas
CREATE POLICY "Users can insert people"
ON people FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- 8. Política para que todos los usuarios autenticados puedan actualizar personas
CREATE POLICY "Users can update people"
ON people FOR UPDATE
USING (auth.role() = 'authenticated');

-- 9. Política para que todos los usuarios autenticados puedan eliminar personas
CREATE POLICY "Users can delete people"
ON people FOR DELETE
USING (auth.role() = 'authenticated');

-- 10. Insertar personas
 INSERT INTO people (name, email) VALUES
   ('Camila Leguizamon', 'camilaleguizamon@migusto.com.ar'),
   ('Camila Lezcano', 'camilalescano@migusto.com.ar'),
   ('Rocio Rodriguez', 'rociorodriguez@migusto.com.ar'),
   ('Elizabeth Colman', 'ana.martinez@migusto.com.ar');
   ('Yoselin', 'yoselinpinero@migusto.com.ar');
   ('Sasha Alfini', 'sashaalfini@migusto.com.ar');
   ('Rocio Portillo', 'rocioportillo@migusto.com.ar');
   ('Elizabeth Colman', 'elizabethcolman@migusto.com.ar');
  ('Cami Ferro', 'camilaferro@migusto.com.ar');

-- Verificar que la tabla se creó correctamente
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'people'
ORDER BY ordinal_position;

