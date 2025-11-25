import { CheckCircle2, Clock, AlertCircle, TrendingUp } from 'lucide-react';
import type { Reminder } from '../lib/supabase';

interface StatsPanelProps {
  reminders: Reminder[];
}

export function StatsPanel({ reminders }: StatsPanelProps) {
  const total = reminders.length;
  const active = reminders.filter(r => !r.due_date || new Date(r.due_date) >= new Date()).length;
  const expired = reminders.filter(r => r.due_date && new Date(r.due_date) < new Date()).length;
  const today = reminders.filter(r => {
    if (!r.due_date) return false;
    const dueDate = new Date(r.due_date);
    const now = new Date();
    return dueDate.toDateString() === now.toDateString();
  }).length;
  const thisWeek = reminders.filter(r => {
    if (!r.due_date) return false;
    const dueDate = new Date(r.due_date);
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return dueDate >= now && dueDate <= weekFromNow;
  }).length;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 p-6 rounded-2xl border-2 border-blue-100 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={24} className="text-blue-600 dark:text-blue-400" />
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Estadísticas</h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={20} className="text-green-500" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{total}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={20} className="text-blue-500" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Activos</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{active}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={20} className="text-red-500" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Caducados</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{expired}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={20} className="text-orange-500" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Hoy</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{today}</p>
        </div>
      </div>

      <div className="mt-4 bg-white dark:bg-gray-800 p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Esta semana</span>
          <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{thisWeek}</span>
        </div>
      </div>
    </div>
  );
}
