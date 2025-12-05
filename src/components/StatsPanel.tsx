import { CheckCircle2, Clock, AlertCircle, TrendingUp, Flag, User, Target, Percent } from 'lucide-react';
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

  // Estadísticas de prioridades
  const urgent = reminders.filter(r => r.priority === 'urgent').length;
  const high = reminders.filter(r => r.priority === 'high').length;
  const medium = reminders.filter(r => r.priority === 'medium').length;
  const low = reminders.filter(r => r.priority === 'low').length;
  
  // Estadísticas de asignación
  const assigned = reminders.filter(r => r.assigned_to).length;
  const unassigned = reminders.filter(r => !r.assigned_to).length;

  // Estadísticas de progreso
  const completed = reminders.filter(r => r.progress === 100).length;
  const inProgress = reminders.filter(r => r.progress > 0 && r.progress < 100).length;
  const notStarted = reminders.filter(r => r.progress === 0).length;
  const averageProgress = reminders.length > 0
    ? Math.round(reminders.reduce((sum, r) => sum + (r.progress || 0), 0) / reminders.length)
    : 0;

  // Estadísticas de etiquetas
  const remindersWithTags = reminders.filter(r => r.tags && r.tags.length > 0).length;
  const remindersWithoutTags = reminders.filter(r => !r.tags || r.tags.length === 0).length;

  // Calcular porcentajes para gráficos
  const activePercentage = total > 0 ? Math.round((active / total) * 100) : 0;
  const expiredPercentage = total > 0 ? Math.round((expired / total) * 100) : 0;
  const completedPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

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

      {/* Gráfico de barras - Estado general */}
      <div className="mt-4 bg-white dark:bg-gray-800 p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={18} className="text-blue-500" />
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Distribución General</h4>
        </div>
        <div className="space-y-2">
          <div>
            <div className="flex justify-between text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              <span>Activos</span>
              <span>{activePercentage}%</span>
            </div>
            <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-500"
                style={{ width: `${activePercentage}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              <span>Caducados</span>
              <span>{expiredPercentage}%</span>
            </div>
            <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500 transition-all duration-500"
                style={{ width: `${expiredPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Estadísticas de progreso */}
      <div className="mt-4 bg-white dark:bg-gray-800 p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-3">
          <Target size={18} className="text-green-500" />
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Progreso</h4>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Completados</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{completed}</div>
          </div>
          <div>
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">En progreso</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{inProgress}</div>
          </div>
          <div>
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Sin iniciar</div>
            <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">{notStarted}</div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-gray-600 dark:text-gray-400">
            <span>Progreso promedio</span>
            <span className="flex items-center gap-1">
              <Percent size={14} />
              {averageProgress}%
            </span>
          </div>
          <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-500"
              style={{ width: `${averageProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Estadísticas de etiquetas */}
      <div className="mt-4 bg-white dark:bg-gray-800 p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-3">
          <Flag size={18} className="text-purple-500" />
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Etiquetas</h4>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Con etiquetas</div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{remindersWithTags}</div>
          </div>
          <div>
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Sin etiquetas</div>
            <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">{remindersWithoutTags}</div>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Flag size={20} className="text-purple-500" />
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Por Prioridad</h4>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
            <div className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">Urgente</div>
            <div className="text-xl font-bold text-red-700 dark:text-red-300">{urgent}</div>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
            <div className="text-xs font-medium text-orange-600 dark:text-orange-400 mb-1">Alta</div>
            <div className="text-xl font-bold text-orange-700 dark:text-orange-300">{high}</div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="text-xs font-medium text-yellow-600 dark:text-yellow-400 mb-1">Media</div>
            <div className="text-xl font-bold text-yellow-700 dark:text-yellow-300">{medium}</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">Baja</div>
            <div className="text-xl font-bold text-blue-700 dark:text-blue-300">{low}</div>
          </div>
        </div>
      </div>

      <div className="mt-4 bg-white dark:bg-gray-800 p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-3">
          <User size={18} className="text-indigo-500" />
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Asignación</h4>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Asignados</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{assigned}</div>
          </div>
          <div>
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Sin asignar</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{unassigned}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
