import { X, Moon, Sun, Bell, Trash2, Download, Upload, Users, Lock, Unlock } from 'lucide-react';
import type { Room } from '../lib/supabase';

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
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-slideUp">
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
              </div>
            </div>
          )}

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
                <button
                  onClick={() => {
                    onOpenPeopleManager();
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20
                    hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-all text-purple-600 dark:text-purple-400"
                >
                  <Users size={20} />
                  <span className="font-medium">Gestionar personas</span>
                </button>
              )}
              <button
                onClick={onExport}
                className="w-full flex items-center gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20
                  hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all text-blue-600 dark:text-blue-400"
              >
                <Download size={20} />
                <span className="font-medium">Exportar recordatorios</span>
              </button>
              <button
                onClick={handleImportClick}
                className="w-full flex items-center gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-900/20
                  hover:bg-green-100 dark:hover:bg-green-900/30 transition-all text-green-600 dark:text-green-400"
              >
                <Upload size={20} />
                <span className="font-medium">Importar recordatorios</span>
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Reminder App v1.0
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
