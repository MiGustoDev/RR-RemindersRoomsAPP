import { useState, useEffect, useRef } from 'react';
import { Tag, X, Plus, Search } from 'lucide-react';
import { supabase, type ReminderTag } from '../lib/supabase';

interface TagSelectorProps {
  roomCode: string;
  selectedTags: string[];
  onChange: (tagIds: string[]) => void;
  className?: string;
}

export function TagSelector({ roomCode, selectedTags, onChange, className = '' }: TagSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tags, setTags] = useState<ReminderTag[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');
  const [isCreating, setIsCreating] = useState(false);
  const [deletingTagId, setDeletingTagId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && roomCode) {
      fetchTags();
    }
  }, [isOpen, roomCode]);

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

  const fetchTags = async () => {
    try {
      const { data, error } = await supabase
        .from('reminder_tags')
        .select('*')
        .eq('room_code', roomCode)
        .order('name', { ascending: true });

      if (error) throw error;
      setTags(data || []);
    } catch (err) {
      console.error('Error al cargar etiquetas:', err);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from('reminder_tags')
        .insert([{
          room_code: roomCode,
          name: newTagName.trim(),
          color: newTagColor,
        }])
        .select()
        .single();

      if (error) {
        console.error('Error detallado al crear etiqueta:', error);
        
        // Mensajes más específicos según el tipo de error
        if (error.code === 'PGRST116' || error.code === '42P01') {
          alert('La tabla reminder_tags no existe. Ejecuta el script SQL en Supabase para crearla.');
        } else if (error.code === 'PGRST301' || error.code === '42501') {
          alert('Error de permisos. Verifica las políticas RLS (Row Level Security) en Supabase.');
        } else if (error.code === '23505') {
          alert('Ya existe una etiqueta con ese nombre en esta sala.');
        } else if (error.message?.includes('room_code')) {
          alert('Error: El código de sala no es válido.');
        } else {
          alert(`No se pudo crear la etiqueta: ${error.message || 'Error desconocido'}`);
        }
        return;
      }

      if (data) {
        setTags([...tags, data]);
        setNewTagName('');
        setNewTagColor('#3B82F6');
      }
    } catch (err: any) {
      console.error('Error inesperado al crear etiqueta:', err);
      alert(`Error inesperado: ${err.message || 'No se pudo crear la etiqueta. Intenta nuevamente.'}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleTag = (tagId: string) => {
    if (selectedTags.includes(tagId)) {
      onChange(selectedTags.filter(id => id !== tagId));
    } else {
      onChange([...selectedTags, tagId]);
    }
  };

  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedTagsData = tags.filter(tag => selectedTags.includes(tag.id));
  const availableColors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
  ];

  const handleDeleteTag = async (tagId: string) => {
    const tagToDelete = tags.find((t) => t.id === tagId);
    if (!tagToDelete) return;

    const confirmed = window.confirm(
      `¿Seguro que quieres eliminar la etiqueta "${tagToDelete.name}"? Esta acción no se puede deshacer.`
    );

    if (!confirmed) return;

    setDeletingTagId(tagId);
    try {
      const { error } = await supabase
        .from('reminder_tags')
        .delete()
        .eq('id', tagId);

      if (error) throw error;

      // Quitarla de la lista local
      setTags((prev) => prev.filter((t) => t.id !== tagId));
      // Y de las seleccionadas si estaba marcada
      if (selectedTags.includes(tagId)) {
        onChange(selectedTags.filter((id) => id !== tagId));
      }
    } catch (err) {
      console.error('Error al eliminar etiqueta:', err);
      alert('No se pudo eliminar la etiqueta. Intenta nuevamente.');
    } finally {
      setDeletingTagId(null);
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 rounded-lg border-2 border-blue-500 dark:border-blue-400 
          bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 
          focus:outline-none focus:border-blue-600 dark:focus:border-blue-300 
          flex items-center gap-2 text-sm transition-all"
      >
        <Tag size={16} className="text-gray-500 dark:text-gray-400" />
        <span className="flex-1 text-left">
          {selectedTagsData.length > 0 
            ? `${selectedTagsData.length} etiqueta${selectedTagsData.length > 1 ? 's' : ''}`
            : 'Seleccionar etiquetas...'}
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-[320px] max-w-[80vw] mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl 
          border-2 border-gray-200 dark:border-gray-700 max-h-96 overflow-hidden flex flex-col">
          {/* Barra de búsqueda */}
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar etiquetas..."
                className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 
                  focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-sm"
                autoFocus
              />
            </div>
          </div>

          {/* Crear nueva etiqueta */}
          <div className="p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Nueva etiqueta..."
                className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateTag();
                  }
                }}
              />
              <input
                type="color"
                value={newTagColor}
                onChange={(e) => setNewTagColor(e.target.value)}
                className="w-10 h-8 rounded cursor-pointer"
                title="Color de la etiqueta"
              />
              <button
                onClick={handleCreateTag}
                disabled={isCreating || !newTagName.trim()}
                className="px-3 py-1.5 rounded-lg bg-blue-500 text-white hover:bg-blue-600 
                  transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                <Plus size={16} />
              </button>
            </div>
            <div className="flex gap-1 flex-wrap">
              {availableColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewTagColor(color)}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${
                    newTagColor === color ? 'border-gray-900 dark:border-white scale-110' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>

          {/* Lista de etiquetas */}
          <div className="overflow-y-auto max-h-48 p-2">
            {filteredTags.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                {searchTerm ? 'No se encontraron etiquetas' : 'No hay etiquetas. Crea una nueva arriba.'}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredTags.map((tag) => (
                  <div key={tag.id} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleTag(tag.id)}
                      className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                        selectedTags.includes(tag.id)
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500 dark:border-blue-400'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700 border-2 border-transparent'
                      }`}
                    >
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span
                        className="flex-1 text-left font-medium text-gray-900 dark:text-gray-100 text-sm leading-snug break-words"
                        title={tag.name}
                      >
                        {tag.name}
                      </span>
                      {selectedTags.includes(tag.id) && (
                        <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
                          ✓
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTag(tag.id);
                      }}
                      disabled={deletingTagId === tag.id}
                      className="p-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-red-600 dark:hover:text-red-400 transition-colors text-xs disabled:opacity-50"
                      title="Eliminar etiqueta"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mostrar etiquetas seleccionadas */}
      {selectedTagsData.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {selectedTagsData.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: tag.color }}
            >
              {tag.name}
              <button
                type="button"
                onClick={() => handleToggleTag(tag.id)}
                className="hover:bg-black/20 rounded-full p-0.5"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}




