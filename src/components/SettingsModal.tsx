import { useEffect, useState } from 'react';
import { X, Moon, Sun, Bell, Trash2, Download, Upload, Users, Lock, Unlock, Mail, UserPlus } from 'lucide-react';
import { supabase, type Room } from '../lib/supabase';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  onToggleDark: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onOpenPeopleManager?: () => void;
  roomInfo?: Room | null;
  currentUserId?: string | null;
  onToggleRoomPrivacy?: () => void;
  onDeleteRoom?: () => void;
}

interface RoomPermission {
  id: string;
  room_id: string;
  email: string;
  created_at: string;
}

export function SettingsModal({
  isOpen,
  onClose,
  isDark,
  onToggleDark,
  onExport,
  onImport,
  onOpenPeopleManager,
  roomInfo,
  currentUserId,
  onToggleRoomPrivacy,
  onDeleteRoom
}: SettingsModalProps) {
  const [permissions, setPermissions] = useState<RoomPermission[]>([]);
  const [permissionsEmail, setPermissionsEmail] = useState('');
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(false);
  const [isAddingPermission, setIsAddingPermission] = useState(false);
  const [permissionsError, setPermissionsError] = useState<string | null>(null);

  const canManageRoom =
    !!roomInfo && !!currentUserId && roomInfo.user_id === currentUserId;

  const fetchPermissions = async (roomId: string) => {
    setIsLoadingPermissions(true);
    setPermissionsError(null);
    try {
      const { data, error } = await supabase
        .from('room_invitations')
        .select('id, room_id, email, created_at')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (error) {
        if (
          error.code === 'PGRST116' ||
          error.code === '42P01' ||
          error.message?.includes('relation') ||
          error.message?.includes('does not exist')
        ) {
          console.warn(
            'Tabla room_invitations no encontrada. Crea la tabla de permisos en Supabase.'
          );
          setPermissionsError(
            'La tabla de permisos no existe aún en Supabase. Revisa la configuración SQL.'
          );
          setPermissions([]);
        } else {
          throw error;
        }
      } else {
        setPermissions(data || []);
      }
    } catch (error) {
      console.error('Error al cargar permisos de la sala:', error);
      setPermissionsError('No pudimos cargar los permisos de esta sala.');
      setPermissions([]);
    } finally {
      setIsLoadingPermissions(false);
    }
  };

  useEffect(() => {
    if (isOpen && roomInfo) {
      fetchPermissions(roomInfo.id);
    } else {
      setPermissions([]);
      setPermissionsEmail('');
      setPermissionsError(null);
    }
  }, [isOpen, roomInfo?.id]);

  const handleAddPermission = async () => {
    if (!roomInfo || !canManageRoom) return;

    const email = permissionsEmail.trim().toLowerCase();
    if (!email) {
      setPermissionsError('Ingresa un correo electrónico.');
      return;
    }

    // Validación muy básica de email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setPermissionsError('Ingresa un correo electrónico válido.');
      return;
    }

    if (permissions.some((p) => p.email.toLowerCase() === email)) {
      setPermissionsError('Ese correo ya tiene acceso a esta sala.');
      return;
    }

    setIsAddingPermission(true);
    setPermissionsError(null);
    try {
      const { data, error } = await supabase
        .from('room_invitations')
        .insert({
          room_id: roomInfo.id,
          email,
        })
        .select('id, room_id, email, created_at')
        .single();

      if (error) throw error;

      if (data) {
        setPermissions((prev) => [...prev, data]);
        setPermissionsEmail('');
      }
    } catch (error) {
      console.error('Error al agregar permiso:', error);
      setPermissionsError('No pudimos agregar ese correo. Intenta nuevamente.');
    } finally {
      setIsAddingPermission(false);
    }
  };

  const handleRemovePermission = async (permission: RoomPermission) => {
    if (!roomInfo || !canManageRoom) return;

    const confirmed = window.confirm(
      `¿Quitar acceso de la sala para "${permission.email}"?`
    );
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('room_invitations')
        .delete()
        .eq('id', permission.id);

      if (error) throw error;

      setPermissions((prev) => prev.filter((p) => p.id !== permission.id));
    } catch (error) {
      console.error('Error al quitar permiso:', error);
      setPermissionsError('No pudimos quitar ese permiso. Intenta nuevamente.');
    }
  };

  if (!isOpen) return null;

  const handleImportClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) onImport(file);
    };
    input.click();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl mx-4 animate-slideUp">
        <div className="flex items-center justify-between p-6 border-b-2 border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Configuración</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={24} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Columna izquierda: apariencia + notificaciones + gestión */}
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Apariencia</h3>
                <button
                  onClick={onToggleDark}
                  className="w-full flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50
                    hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                >
                  <div className="flex items-center gap-3">
                    {isDark ? <Moon size={20} /> : <Sun size={20} />}
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      Modo {isDark ? 'Oscuro' : 'Claro'}
                    </span>
                  </div>
                  <div className={`w-12 h-6 rounded-full transition-colors ${isDark ? 'bg-blue-500' : 'bg-gray-300'} relative`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${isDark ? 'translate-x-7' : 'translate-x-1'}`}></div>
                  </div>
                </button>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Notificaciones</h3>
                <button
                  className="w-full flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50
                    hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Bell size={20} className="text-gray-700 dark:text-gray-300" />
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      Notificaciones de vencimiento
                    </span>
                  </div>
                  <div className="w-12 h-6 rounded-full bg-gray-300 relative">
                    <div className="absolute top-1 w-4 h-4 rounded-full bg-white transition-transform translate-x-1"></div>
                  </div>
                </button>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Gestión</h3>
                <div className="space-y-2">
                  {onOpenPeopleManager && (
                    <div className="flex justify-center">
                      <button
                        onClick={() => {
                          onOpenPeopleManager();
                          onClose();
                        }}
                        className="w-full max-w-xs flex items-center justify-center gap-3 p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20
                          hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-all text-purple-600 dark:text-purple-400"
                      >
                        <Users size={20} />
                        <span className="font-medium">Gestionar personas</span>
                      </button>
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <button
                        onClick={onExport}
                        className="flex-1 flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20
                          hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all text-blue-600 dark:text-blue-400"
                        title="Exportar recordatorios a un archivo JSON"
                      >
                        <Download size={20} />
                        <span className="font-medium text-sm">Exportar</span>
                        <span className="text-xs opacity-75">recordatorios</span>
                      </button>
                      <button
                        onClick={handleImportClick}
                        className="flex-1 flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-green-50 dark:bg-green-900/20
                          hover:bg-green-100 dark:hover:bg-green-900/30 transition-all text-green-600 dark:text-green-400"
                        title="Importar recordatorios desde un archivo JSON"
                      >
                        <Upload size={20} />
                        <span className="font-medium text-sm">Importar</span>
                        <span className="text-xs opacity-75">recordatorios</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Columna derecha: sala + permisos */}
            <div className="space-y-6">
              {roomInfo && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Configuración de la Sala</h3>
                  <div className="space-y-2">
                    {onToggleRoomPrivacy && (
                      <button
                        onClick={() => {
                          if (currentUserId && roomInfo.user_id === currentUserId) {
                            onToggleRoomPrivacy();
                            onClose();
                          }
                        }}
                        disabled={!currentUserId || roomInfo.user_id !== currentUserId}
                        className="w-full flex items-center gap-3 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20
                          hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-all text-indigo-600 dark:text-indigo-400
                          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-indigo-50 dark:disabled:hover:bg-indigo-900/20"
                      >
                        {roomInfo.is_locked ? <Unlock size={20} /> : <Lock size={20} />}
                        <span className="font-medium">
                          {roomInfo.is_locked ? 'Hacer sala pública' : 'Hacer sala privada'}
                        </span>
                      </button>
                    )}
                    {onDeleteRoom && (
                      <button
                        onClick={() => {
                          if (currentUserId && roomInfo.user_id === currentUserId) {
                            onDeleteRoom();
                            onClose();
                          }
                        }}
                        disabled={!currentUserId || roomInfo.user_id !== currentUserId}
                        className="w-full flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20
                          hover:bg-red-100 dark:hover:bg-red-900/30 transition-all text-red-600 dark:text-red-400
                          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-50 dark:disabled:hover:bg-red-900/20"
                      >
                        <Trash2 size={20} />
                        <span className="font-medium">Eliminar sala</span>
                      </button>
                    )}

                    {/* Permisos de la sala */}
                    <div className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          <Mail size={18} className="text-slate-500 dark:text-slate-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            Permisos
                          </p>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            Invitar cuentas por correo
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Las cuentas invitadas verán esta sala cuando inicien sesión con ese correo.
                          </p>
                          {!canManageRoom && (
                            <p className="mt-2 text-xs text-red-500 dark:text-red-400">
                              Solo el creador de la sala puede gestionar permisos.
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="email"
                            value={permissionsEmail}
                            onChange={(e) => setPermissionsEmail(e.target.value)}
                            placeholder="correo@empresa.com"
                            className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                              bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm
                              focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={!canManageRoom || isAddingPermission}
                          />
                          <button
                            type="button"
                            onClick={handleAddPermission}
                            disabled={!canManageRoom || isAddingPermission}
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium
                              hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <UserPlus size={16} />
                            Agregar
                          </button>
                        </div>
                        {permissionsError && (
                          <p className="text-xs text-red-500 dark:text-red-400">{permissionsError}</p>
                        )}
                        <div className="max-h-32 overflow-y-auto mt-1 space-y-1 custom-scrollbar">
                          {isLoadingPermissions ? (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Cargando permisos...
                            </p>
                          ) : permissions.length === 0 ? (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Aún no hay correos con acceso a esta sala.
                            </p>
                          ) : (
                            permissions.map((permission) => (
                              <div
                                key={permission.id}
                                className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-white/60 dark:bg-slate-800 text-xs border border-slate-200 dark:border-slate-700"
                              >
                                <span className="text-slate-800 dark:text-slate-100 truncate">
                                  {permission.email}
                                </span>
                                {canManageRoom && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemovePermission(permission)}
                                    className="ml-2 p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 
                                      dark:hover:text-red-400 dark:hover:bg-red-900/30 transition-colors"
                                  >
                                    <X size={14} />
                                  </button>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Reminder App v1.4
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
