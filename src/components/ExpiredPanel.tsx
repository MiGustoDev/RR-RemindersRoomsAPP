import { AlertCircle } from 'lucide-react';
import type { Reminder } from '../lib/supabase';
import { ReminderCard } from './ReminderCard';

interface ExpiredPanelProps {
  expiredReminders: Reminder[];
  onUpdate: (id: string, title: string, description: string, dueDate: string | null) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUpdateProgress: (id: string, progress: number) => Promise<void>;
  onOpenDetails: (reminder: Reminder) => void;
}

export function ExpiredPanel({
  expiredReminders,
  onUpdate,
  onDelete,
  onUpdateProgress,
  onOpenDetails
}: ExpiredPanelProps) {
  return (
    <div className="w-80 flex-shrink-0 bg-white dark:bg-gray-800 border-l-2 border-gray-200 dark:border-gray-700 h-full overflow-y-auto pb-24 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
      <div className="sticky top-0 bg-white dark:bg-gray-800 border-b-2 border-gray-200 dark:border-gray-700 p-4 z-10">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle size={24} className="text-red-600 dark:text-red-400" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Caducados</h2>
        </div>
        <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-red-100 dark:bg-red-900/30">
          <span className="text-2xl font-bold text-red-600 dark:text-red-400">
            {expiredReminders.length}
          </span>
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
  );
}
