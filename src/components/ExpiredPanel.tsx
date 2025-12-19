import { AlertCircle, X } from 'lucide-react';
import type { Reminder } from '../lib/supabase';
import { ReminderCard } from './ReminderCard';

interface ExpiredPanelProps {
  expiredReminders: Reminder[];
  onUpdate: (id: string, title: string, description: string, dueDate: string | null) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUpdateProgress: (id: string, progress: number) => Promise<void>;
  onOpenDetails: (reminder: Reminder) => void;
  onClose?: () => void;
}

export function ExpiredPanel({
  expiredReminders,
  onUpdate,
  onDelete,
  onUpdateProgress,
  onOpenDetails,
  onClose
}: ExpiredPanelProps) {
  return (
    <>
      <style>
        {`
          .no-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .no-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}
      </style>
      <div className="w-full lg:w-80 flex-shrink-0 bg-white dark:bg-gray-800 border-l-2 border-gray-200 dark:border-gray-700 h-full overflow-y-auto pb-24 no-scrollbar">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b-2 border-gray-200 dark:border-gray-700 p-4 z-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <AlertCircle size={24} className="text-red-600 dark:text-red-400" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Caducados</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center min-w-[3rem] h-10 rounded-lg bg-red-100 dark:bg-red-900/30 px-3">
              <span className="text-xl font-bold text-red-600 dark:text-red-400">
                {expiredReminders.length}
              </span>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                title="Cerrar panel"
              >
                <X size={24} />
              </button>
            )}
          </div>
        </div>

        <div className="p-4 space-y-4">
          {expiredReminders.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <AlertCircle size={48} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No hay recordatorios caducados</p>
            </div>
          ) : (
            expiredReminders.map((reminder) => (
              <div key={reminder.id} className="w-full">
                <ReminderCard
                  reminder={reminder}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  isExpired={true}
                  onOpenDetails={onOpenDetails}
                  onUpdateProgress={onUpdateProgress}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
