// ============================================
// MODO DEMO DESACTIVADO
// ============================================
// Para volver al modo demo, descomenta la línea de abajo
// y comenta el bloque de código real

// MODO DEMO (comentado)
// export * from './supabase-demo';

// MODO REAL (activo)
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Verificar variables de entorno
if (!supabaseUrl || !supabaseAnonKey) {
<<<<<<< HEAD
  console.error('❌ Error: Faltan variables de entorno de Supabase');
  console.error('Verifica que tu archivo .env tenga:');
  console.error('- VITE_SUPABASE_URL');
  console.error('- VITE_SUPABASE_ANON_KEY');
  throw new Error('Missing Supabase environment variables');
=======
  console.error('❌ ERROR: Faltan variables de entorno de Supabase');
  console.error('Crea un archivo .env en la raíz del proyecto con:');
  console.error('VITE_SUPABASE_URL=https://tu-proyecto.supabase.co');
  console.error('VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui');
  console.error('');
  console.error('Luego reinicia el servidor con: npm run dev');
} else {
  console.log('✅ Variables de entorno encontradas');
  console.log('URL:', supabaseUrl.substring(0, 30) + '...');
>>>>>>> 0ff6dc08f46330f8804656403bab9a1ebbf122e3
}

// Crear cliente
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

export type Priority = 'urgent' | 'high' | 'medium' | 'low';

export type Reminder = {
  id: string;
  title: string;
  description: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  room_code: string;
  progress: number;
  priority: Priority;
  assigned_to: string | null;
};

export type ReminderTag = {
  id: string;
  room_code: string;
  name: string;
  color: string;
  created_at: string;
};

export type ReminderWithTags = Reminder & {
  tags?: ReminderTag[];
};

export type Room = {
  id: string;
  name: string;
  code: string;
  created_at: string;
  is_locked: boolean;
  created_by: string | null;
};

export type RoomWithSecret = Room & {
  access_code: string | null;
};

export type ReminderComment = {
  id: string;
  reminder_id: string;
  author: string;
  message: string;
  created_at: string;
};
