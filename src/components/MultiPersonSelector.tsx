import { useState, useEffect, useRef } from 'react';
import { User, Search, X, ChevronDown } from 'lucide-react';
import { supabase, type Person } from '../lib/supabase';

interface MultiPersonSelectorProps {
  values: string[];
  onChange: (personIds: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function MultiPersonSelector({
  values,
  onChange,
  placeholder = 'Seleccionar responsables...',
  disabled = false,
  className = '',
}: MultiPersonSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [people, setPeople] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cargar personas desde la base de datos
  useEffect(() => {
    const fetchPeople = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data, error: fetchError } = await supabase
          .from('people')
          .select('id, name, email, area, created_at')
          .order('name', { ascending: true });

        if (fetchError) {
          if (fetchError.code === 'PGRST116' || fetchError.code === '42P01') {
            setPeople([]);
            setError('La tabla de personas no existe. Créala en Supabase.');
          } else {
            throw fetchError;
          }
        } else {
          setPeople(data || []);
        }
      } catch (err: any) {
        console.error('Error al cargar personas:', err);
        setError('No se pudieron cargar las personas.');
        setPeople([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPeople();
  }, []);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const filteredPeople = people.filter((person) =>
    person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (person.email && person.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const selectedPeople = people.filter((p) => values.includes(p.id));

  const handleTogglePerson = (personId: string) => {
    if (values.includes(personId)) {
      onChange(values.filter((id) => id !== personId));
    } else {
      onChange([...values, personId]);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
    setIsOpen(false);
    setSearchTerm('');
  };

  const count = values.length;
  const primaryPerson = selectedPeople[0];

  let label = placeholder;
  if (count === 1 && primaryPerson) {
    label = primaryPerson.name;
  } else if (count > 1) {
    label = `${count} persona${count > 1 ? 's' : ''}`;
  }

  const tooltip =
    count > 0
      ? selectedPeople.map((p) => p.name).join(', ')
      : placeholder;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-3 py-2 rounded-lg border-2 border-blue-500 dark:border-blue-400 
          bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 
          focus:outline-none focus:border-blue-600 dark:focus:border-blue-300 
          disabled:opacity-50 disabled:cursor-not-allowed
          flex items-center justify-between gap-2 text-sm transition-all ${className}`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <User size={16} className="text-gray-500 dark:text-gray-400 flex-shrink-0" />
          <span
            className={`font-medium text-sm text-left ${
              count === 0 ? 'text-gray-500 dark:text-gray-400 italic' : ''
            } ${count > 1 ? 'whitespace-nowrap' : 'truncate'}`}
            title={tooltip}
          >
            {label}
          </span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <ChevronDown
            size={16}
            className={`text-gray-500 dark:text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-[320px] max-w-[80vw] mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border-2 border-gray-200 dark:border-gray-700 max-h-64 overflow-hidden flex flex-col">
          {/* Barra de búsqueda */}
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar persona..."
                className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 
                  focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-sm"
                autoFocus
              />
            </div>
          </div>

          {/* Lista de personas */}
          <div className="overflow-y-auto max-h-48">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                Cargando personas...
              </div>
            ) : error ? (
              <div className="p-4 text-center text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            ) : filteredPeople.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                {searchTerm ? 'No se encontraron personas' : 'No hay personas disponibles'}
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className={`w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm ${
                    count === 0 ? 'bg-blue-50 dark:bg-blue-900/20 font-semibold' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-gray-400 dark:text-gray-500" />
                    <span className="text-gray-500 dark:text-gray-400 italic">Sin responsables</span>
                  </div>
                </button>
                {filteredPeople.map((person) => {
                  const isSelected = values.includes(person.id);
                  return (
                    <button
                      key={person.id}
                      type="button"
                      onClick={() => handleTogglePerson(person.id)}
                      className={`w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm ${
                        isSelected ? 'bg-blue-50 dark:bg-blue-900/20 font-semibold' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-blue-500 dark:text-blue-400" />
                        <div className="flex-1 min-w-0">
                          <div
                            className="font-medium text-gray-900 dark:text-gray-100 text-sm leading-snug break-words"
                            title={person.name}
                          >
                            {person.name}
                          </div>
                          {person.email && (
                            <div
                              className="text-xs text-gray-500 dark:text-gray-400 break-words"
                              title={person.email}
                            >
                              {person.email}
                            </div>
                          )}
                        </div>
                        {isSelected && (
                          <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
                            ✓
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


