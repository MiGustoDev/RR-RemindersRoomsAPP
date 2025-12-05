import { useState } from 'react';
import { LogIn, Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LoginProps {
  onLoginSuccess: () => void;
}

export function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const emailTrimmed = email.trim().toLowerCase();

      // Autenticar con Supabase
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: emailTrimmed,
        password: password,
      });

      if (authError) {
        console.error('❌ Error de autenticación:', authError);

        // Mensajes de error más específicos
        if (authError.message.includes('Invalid login credentials')) {
          setError('Credenciales incorrectas. Verifica tu email y contraseña.');
        } else if (authError.message.includes('Email not confirmed')) {
          setError('Por favor, confirma tu email antes de iniciar sesión.');
        } else {
          setError(authError.message || 'Error al iniciar sesión. Intenta nuevamente.');
        }
        return;
      }

      if (data?.user) {
        console.log('✅ Login exitoso:', data.user.email);
        // Guardar en localStorage para compatibilidad
        localStorage.setItem('reminder:user', data.user.email || emailTrimmed);
        localStorage.setItem('reminder:logged-in', 'true');
        onLoginSuccess();
      }
    } catch (err: any) {
      console.error('❌ Error inesperado:', err);
      setError('Ocurrió un error inesperado. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4 w-full">
        <div className="w-full max-w-md animate-scaleIn">
          {/* Card principal */}
          <div className="bg-gray-800/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-700 p-8 space-y-6">
            {/* Header */}
            <div className="text-center space-y-3">
              <div className="flex justify-center mb-4">
                <img
                  src="/Logo Mi Gusto 2025.png"
                  alt="Logo Mi Gusto"
                  className="h-24 w-auto object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                  Reminders & Rooms
                </h1>
                <p className="text-sm text-gray-400 mt-1">
                  Inicia sesión para acceder a tus recordatorios
                </p>
              </div>
            </div>

            {/* Formulario */}
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email */}
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-semibold text-gray-300">
                  Correo electrónico
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail size={20} className="text-gray-500" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    required
                    disabled={isLoading}
                    autoComplete="email"
                    className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-700 bg-gray-900 text-gray-100 placeholder-gray-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-900 outline-none transition-all disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-semibold text-gray-300">
                  Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock size={20} className="text-gray-500" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={isLoading}
                    autoComplete="current-password"
                    className="w-full pl-12 pr-12 py-3 rounded-xl border-2 border-gray-700 bg-gray-900 text-gray-100 placeholder-gray-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-900 outline-none transition-all disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-gray-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div className="p-3 rounded-xl bg-red-900/20 border border-red-800 animate-shake">
                  <p className="text-sm text-red-400 text-center">{error}</p>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={isLoading || !email.trim() || !password}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    <span>Iniciando sesión...</span>
                  </>
                ) : (
                  <>
                    <LogIn size={20} />
                    <span>Iniciar sesión</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer Card */}
          <p className="text-center text-xs text-gray-400 mt-6">
            Contacta al administrador para obtener acceso
          </p>
        </div>
      </div>

      <footer className="w-full py-4 text-center text-xs text-gray-500 bg-gray-900/50 backdrop-blur-sm border-t border-gray-800">
        © Desarrollado por el <a href="https://waveframe.com.ar/" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-400 transition-colors">Departamento de Sistemas</a> de Mi Gusto | Todos los derechos reservados.
      </footer>
    </div >
  );
}
