-- ============================================
-- REMINDER APP - CONFIGURACIÓN COMPLETA DE BASE DE DATOS
-- ============================================
-- Ejecuta este script completo en Supabase SQL Editor
-- Esto eliminará y recreará todas las tablas desde cero

-- ============================================
-- 1. LIMPIAR TABLAS EXISTENTES
-- ============================================

-- Eliminar tablas si existen (en orden correcto por dependencias)
DROP TABLE IF EXISTS reminders CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;

-- ============================================
-- 2. CREAR TABLA ROOMS (Salas)
-- ============================================

CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_locked BOOLEAN DEFAULT FALSE,
  access_code TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_rooms_code ON rooms(code);
CREATE INDEX idx_rooms_created_by ON rooms(created_by);
CREATE INDEX idx_rooms_created_at ON rooms(created_at DESC);

-- ============================================
-- 3. CREAR TABLA REMINDERS (Recordatorios)
-- ============================================

CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  room_code TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  assigned_to TEXT,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  CONSTRAINT fk_room_code FOREIGN KEY (room_code) REFERENCES rooms(code) ON DELETE CASCADE
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_reminders_room_code ON reminders(room_code);
CREATE INDEX idx_reminders_due_date ON reminders(due_date);
CREATE INDEX idx_reminders_created_at ON reminders(created_at DESC);
CREATE INDEX idx_reminders_priority ON reminders(priority);

-- ============================================
-- 4. CONFIGURAR ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS en ambas tablas
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. POLÍTICAS RLS PARA ROOMS
-- ============================================

-- Permitir a los usuarios ver sus propias salas
CREATE POLICY "Users can view own rooms" ON rooms
  FOR SELECT
  USING (auth.uid() = created_by);

-- Permitir a los usuarios crear salas
CREATE POLICY "Users can create rooms" ON rooms
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Permitir a los usuarios actualizar sus propias salas
CREATE POLICY "Users can update own rooms" ON rooms
  FOR UPDATE
  USING (auth.uid() = created_by);

-- Permitir a los usuarios eliminar sus propias salas
CREATE POLICY "Users can delete own rooms" ON rooms
  FOR DELETE
  USING (auth.uid() = created_by);

-- ============================================
-- 6. POLÍTICAS RLS PARA REMINDERS
-- ============================================

-- Permitir ver recordatorios de salas propias
CREATE POLICY "Users can view reminders from own rooms" ON reminders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rooms 
      WHERE rooms.code = reminders.room_code 
      AND rooms.created_by = auth.uid()
    )
  );

-- Permitir crear recordatorios en salas propias
CREATE POLICY "Users can create reminders in own rooms" ON reminders
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rooms 
      WHERE rooms.code = reminders.room_code 
      AND rooms.created_by = auth.uid()
    )
  );

-- Permitir actualizar recordatorios de salas propias
CREATE POLICY "Users can update reminders from own rooms" ON reminders
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM rooms 
      WHERE rooms.code = reminders.room_code 
      AND rooms.created_by = auth.uid()
    )
  );

-- Permitir eliminar recordatorios de salas propias
CREATE POLICY "Users can delete reminders from own rooms" ON reminders
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM rooms 
      WHERE rooms.code = reminders.room_code 
      AND rooms.created_by = auth.uid()
    )
  );

-- ============================================
-- 7. FUNCIONES AUXILIARES
-- ============================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para actualizar updated_at
CREATE TRIGGER update_rooms_updated_at
  BEFORE UPDATE ON rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reminders_updated_at
  BEFORE UPDATE ON reminders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 8. DATOS DE PRUEBA (OPCIONAL)
-- ============================================

-- Insertar una sala de ejemplo para el primer usuario
-- Descomenta estas líneas si quieres datos de prueba
/*
INSERT INTO rooms (name, code, created_by, is_locked)
VALUES (
  'Sala de Prueba',
  'TEST01',
  (SELECT id FROM auth.users ORDER BY created_at LIMIT 1),
  false
);

INSERT INTO reminders (title, description, room_code, priority)
VALUES (
  'Recordatorio de Prueba',
  'Este es un recordatorio de ejemplo',
  'TEST01',
  'medium'
);
*/

-- ============================================
-- 9. VERIFICACIÓN
-- ============================================

-- Verificar que las tablas se crearon correctamente
SELECT 
  'rooms' as table_name,
  COUNT(*) as row_count
FROM rooms
UNION ALL
SELECT 
  'reminders' as table_name,
  COUNT(*) as row_count
FROM reminders;

-- Verificar políticas RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('rooms', 'reminders')
ORDER BY tablename, policyname;

-- ============================================
-- ¡LISTO! 
-- ============================================
-- Ahora puedes usar la aplicación normalmente.
-- Todas las salas y recordatorios estarán filtrados por usuario.
