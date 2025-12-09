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
  const errorMsg = '❌ ERROR: Faltan variables de entorno de Supabase';
  console.error(errorMsg);
  console.error('Para desarrollo local: Crea un archivo .env en la raíz del proyecto con:');
  console.error('VITE_SUPABASE_URL=https://tu-proyecto.supabase.co');
  console.error('VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui');
  console.error('');
  console.error('Para producción (Netlify): Configura las variables en:');
  console.error('Site settings > Build & deploy > Environment variables');
  console.error('');
  console.error('⚠️ IMPORTANTE: Después de agregar las variables, debes hacer un nuevo deploy!');
  console.error('');
  
  // Mostrar error en la UI si estamos en producción
  if (import.meta.env.PROD) {
    document.body.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: system-ui; padding: 20px; text-align: center; background: #0f172a;">
        <div style="max-width: 600px; background: #1e293b; padding: 32px; border-radius: 16px; border: 1px solid #334155;">
          <h1 style="color: #ef4444; margin-bottom: 16px; font-size: 24px;">⚠️ Error de Configuración</h1>
          <p style="color: #cbd5e1; margin-bottom: 24px; line-height: 1.6;">
            Las variables de entorno de Supabase no están configuradas en Netlify.
          </p>
          <div style="background: #0f172a; padding: 20px; border-radius: 8px; text-align: left; margin-bottom: 24px; border: 1px solid #334155;">
            <p style="margin: 0 0 12px 0; font-weight: 600; color: #e2e8f0;">Configura estas variables en Netlify:</p>
            <ul style="margin: 0 0 16px 0; padding-left: 20px; color: #cbd5e1;">
              <li style="margin-bottom: 8px;"><code style="background: #1e293b; padding: 4px 8px; border-radius: 4px; color: #60a5fa;">VITE_SUPABASE_URL</code></li>
              <li><code style="background: #1e293b; padding: 4px 8px; border-radius: 4px; color: #60a5fa;">VITE_SUPABASE_ANON_KEY</code></li>
            </ul>
            <p style="margin: 12px 0 0 0; font-size: 14px; color: #94a3b8;">
              Ve a: <strong>Site settings</strong> > <strong>Build & deploy</strong> > <strong>Environment variables</strong>
            </p>
            <p style="margin: 16px 0 0 0; font-size: 14px; color: #fbbf24; font-weight: 600;">
              ⚠️ IMPORTANTE: Después de agregar las variables, haz un nuevo deploy!
            </p>
          </div>
        </div>
      </div>
    `;
  }
  
  throw new Error('Variables de entorno de Supabase no configuradas');
} else {
  console.log('✅ Variables de entorno encontradas');
  console.log('URL:', supabaseUrl);
  console.log('Key:', supabaseAnonKey.substring(0, 20) + '...');
  
  // Verificar que la URL sea válida
  if (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co')) {
    console.warn('⚠️ La URL de Supabase no parece válida:', supabaseUrl);
  }
}

// Crear cliente
export const supabase = createClient(
  supabaseUrl!,
  supabaseAnonKey!,
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
  tags?: ReminderTag[];
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
  user_id: string | null;
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

export type Person = {
  id: string;
  name: string;
  email: string | null;
  created_at: string;
};
