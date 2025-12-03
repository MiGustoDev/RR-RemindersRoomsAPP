import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    // Verificar si hay una sesión guardada en localStorage para ajustar el timeout
    const hasStoredSession = Object.keys(localStorage).some((key) =>
      key.startsWith('sb-') && key.endsWith('-auth-token')
    );

    // Si parece haber sesión, damos un tiempo razonable (2s). Si no, fallamos casi de inmediato (0.5s).
    const timeoutDuration = hasStoredSession ? 2000 : 500;

    console.log(`🕒 Iniciando verificación de sesión (Timeout: ${timeoutDuration}ms, Storage: ${hasStoredSession ? 'Sí' : 'No'})`);

    // Timeout de seguridad
    timeoutId = setTimeout(() => {
      if (mounted) {
        console.warn('⚠️ Timeout al obtener sesión. Continuando sin autenticación...');
        setLoading(false);
      }
    }, timeoutDuration);

    // Obtener sesión inicial
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (!mounted) return;

        clearTimeout(timeoutId);

        if (error) {
          console.error('❌ Error obteniendo sesión:', error);
        } else {
          console.log('✅ Sesión obtenida:', session ? 'Usuario autenticado' : 'Sin sesión');
        }

        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      })
      .catch((error) => {
        console.error('❌ Error crítico en getSession:', error);
        if (mounted) {
          clearTimeout(timeoutId);
          setLoading(false);
        }
      });

    // Escuchar cambios de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;

      console.log('🔄 Cambio de estado de autenticación:', _event);
      // Solo actualizamos si el timeout no ha expirado ya (para evitar parpadeos)
      // o si es un evento explícito de inicio/cierre de sesión
      if (_event === 'SIGNED_IN' || _event === 'SIGNED_OUT') {
        clearTimeout(timeoutId);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

