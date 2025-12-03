import { Search, X, SlidersHorizontal, ArrowUpDown, Filter } from 'lucide-react';
import type { Priority } from '../lib/supabase';

interface SearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filterBy: 'all' | 'active' | 'expired' | 'today' | 'week';
  onFilterChange: (filter: 'all' | 'active' | 'expired' | 'today' | 'week') => void;
  sortBy: 'created' | 'due_date' | 'title' | 'priority';
  onSortChange: (sort: 'created' | 'due_date' | 'title' | 'priority') => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderChange: (order: 'asc' | 'desc') => void;
  priorityFilter?: Priority | 'all';
  onPriorityFilterChange?: (priority: Priority | 'all') => void;
  assignedToFilter?: string;
  onAssignedToFilterChange?: (assignedTo: string) => void;
  availableAssignees?: string[];
}

export function SearchBar({
  searchTerm,
  onSearchChange,
  filterBy,
  onFilterChange,
  sortBy,
  onSortChange,
  sortOrder,
  onSortOrderChange,
  priorityFilter = 'all',
  onPriorityFilterChange,
  assignedToFilter = '',
  onAssignedToFilterChange,
  availableAssignees = []
}: SearchBarProps) {
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar recordatorios..."
          className="w-full pl-12 pr-12 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700
            bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
            focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
        />
        {searchTerm && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X size={18} className="text-gray-400" />
          </button>
        )}
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <SlidersHorizontal size={18} className="text-gray-500 dark:text-gray-400" />
          <select
            value={filterBy}
            onChange={(e) => onFilterChange(e.target.value as any)}
            className="flex-1 px-3 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-700
              bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm font-medium
              focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
          >
            <option value="all">Todos</option>
            <option value="active">Activos</option>
            <option value="expired">Caducados</option>
            <option value="today">Hoy</option>
            <option value="week">Esta semana</option>
          </select>
        </div>

        {onPriorityFilterChange && (
          <div className="flex items-center gap-2 flex-1 min-w-[180px]">
            <Filter size={18} className="text-gray-500 dark:text-gray-400" />
            <select
              value={priorityFilter}
              onChange={(e) => onPriorityFilterChange(e.target.value as Priority | 'all')}
              className="flex-1 px-3 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-700
                bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm font-medium
                focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
            >
              <option value="all">Todas las prioridades</option>
              <option value="urgent">Urgente</option>
              <option value="high">Alta</option>
              <option value="medium">Media</option>
              <option value="low">Baja</option>
            </select>
          </div>
        )}

        {onAssignedToFilterChange && (
          <div className="flex items-center gap-2 flex-1 min-w-[180px]">
            <Filter size={18} className="text-gray-500 dark:text-gray-400" />
            <select
              value={assignedToFilter}
              onChange={(e) => onAssignedToFilterChange(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-700
                bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm font-medium
                focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
            >
              <option value="">Todos los responsables</option>
              {availableAssignees.map((assignee) => (
                <option key={assignee} value={assignee}>{assignee}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <ArrowUpDown size={18} className="text-gray-500 dark:text-gray-400" />
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as any)}
            className="flex-1 px-3 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-700
              bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm font-medium
              focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
          >
            <option value="created">Fecha de creación</option>
            <option value="due_date">Fecha de vencimiento</option>
            <option value="title">Título</option>
            <option value="priority">Prioridad</option>
          </select>
          <button
            onClick={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="p-2 rounded-lg border-2 border-gray-200 dark:border-gray-700
              bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <ArrowUpDown size={18} className={`text-gray-600 dark:text-gray-400 ${sortOrder === 'desc' ? 'rotate-180' : ''} transition-transform`} />
          </button>
        </div>
      </div>
    </div>
  );
}
