import { useState, useEffect } from 'react';
import { User, Plus, Edit2, Trash2, X, Save, Search, Mail } from 'lucide-react';
import { supabase, type Person } from '../lib/supabase';

interface PeopleManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PeopleManager({ isOpen, onClose }: PeopleManagerProps) {
  const [people, setPeople] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [areaFilter, setAreaFilter] = useState<string>('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', areas: [] as string[] });
  const [error, setError] = useState<string | null>(null);

  const workAreas: Array<{ value: string; label: string }> = [
    { value: '', label: 'Todas las áreas' },
    { value: 'RRHH', label: 'RRHH' },
    { value: 'Calidad', label: 'Calidad' },
    { value: 'Sistemas', label: 'Sistemas' },
    { value: 'Marketing', label: 'Marketing' },
    { value: 'Compras', label: 'Compras' },
    { value: 'Administracion', label: 'Administración' },
    { value: 'Mantenimiento', label: 'Mantenimiento' },
    { value: 'Logistica', label: 'Logística' },
    { value: 'Fabrica', label: 'Fábrica' },
    { value: 'JEFE', label: 'JEFE' },
  ];

  useEffect(() => {
    if (isOpen) {
      fetchPeople();
    }
  }, [isOpen]);

  const fetchPeople = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('people')
        .select('id, name, email, area, created_at')
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;
      setPeople(data || []);
    } catch (err: any) {
      console.error('Error al cargar personas:', err);
      setError('No se pudieron cargar las personas.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    setFormData({ name: '', email: '', areas: [] });
    setError(null);
  };

  const handleEdit = (person: Person) => {
    setEditingId(person.id);
    setIsAdding(false);
    setFormData({ name: person.name, email: person.email || '', areas: person.area || [] });
    setError(null);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: '', email: '', areas: [] });
    setError(null);
  };

  const handleToggleArea = (areaValue: string) => {
    setFormData(prev => {
      const currentAreas = prev.areas;
      if (currentAreas.includes(areaValue)) {
        return { ...prev, areas: currentAreas.filter(a => a !== areaValue) };
      } else {
        return { ...prev, areas: [...currentAreas, areaValue] };
      }
    });
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }

    setError(null);
    try {
      const areaValue = formData.areas.length > 0 ? formData.areas : null;
      
      if (isAdding) {
        const { error: insertError } = await supabase
          .from('people')
          .insert([{
            name: formData.name.trim(),
            email: formData.email.trim() || null,
            area: areaValue,
          }]);

        if (insertError) throw insertError;
      } else if (editingId) {
        const { error: updateError } = await supabase
          .from('people')
          .update({
            name: formData.name.trim(),
            email: formData.email.trim() || null,
            area: areaValue,
          })
          .eq('id', editingId);

        if (updateError) throw updateError;
      }

      await fetchPeople();
      handleCancel();
    } catch (err: any) {
      console.error('Error al guardar persona:', err);
      setError(err.message || 'No se pudo guardar la persona.');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar a "${name}"?`)) {
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('people')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      await fetchPeople();
    } catch (err: any) {
      console.error('Error al eliminar persona:', err);
      alert('No se pudo eliminar la persona. Puede que esté asignada a algún recordatorio.');
    }
  };

  const filteredPeople = people.filter((person) => {
    // Filtro por búsqueda de texto
    const matchesSearch = searchTerm === '' ||
      person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (person.email && person.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (person.area && person.area.some(a => a.toLowerCase().includes(searchTerm.toLowerCase())));
    
    // Filtro por área
    const matchesArea = areaFilter === '' || 
      (person.area && person.area.includes(areaFilter));
    
    return matchesSearch && matchesArea;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-slideUp">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <User size={24} className="text-blue-600 dark:text-blue-400" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Gestión de Personas</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={24} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col p-6">
          {/* Barra de búsqueda y botón agregar */}
          <div className="flex gap-3 mb-3">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar personas..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 
                  focus:outline-none focus:border-blue-500 dark:focus:border-blue-400"
              />
            </div>
            <button
              onClick={handleAdd}
              disabled={isAdding || editingId !== null}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white 
                hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              <Plus size={18} />
              Agregar
            </button>
          </div>

          {/* Filtro por área */}
          <div className="mb-4">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 block">
              Filtrar por área
            </label>
            <div className="flex flex-wrap gap-2">
              {workAreas.map((area) => (
                <button
                  key={area.value}
                  onClick={() => setAreaFilter(area.value)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200
                    ${
                      areaFilter === area.value
                        ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30 scale-105'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
                    }`}
                >
                  {area.label}
                </button>
              ))}
            </div>
          </div>

          {/* Formulario de agregar/editar */}
          {(isAdding || editingId) && (
            <div className="mb-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                {isAdding ? 'Nueva Persona' : 'Editar Persona'}
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nombre completo"
                    className="w-full px-3 py-2 rounded-lg border-2 border-blue-500 dark:border-blue-400 
                      bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 
                      focus:outline-none focus:border-blue-600 dark:focus:border-blue-300"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@ejemplo.com"
                    className="w-full px-3 py-2 rounded-lg border-2 border-blue-500 dark:border-blue-400 
                      bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 
                      focus:outline-none focus:border-blue-600 dark:focus:border-blue-300"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 block">
                    Áreas de trabajo
                  </label>
                  <div className="flex flex-wrap gap-2 p-3 rounded-lg border-2 border-blue-500 dark:border-blue-400 bg-white dark:bg-gray-700">
                    {workAreas.filter(area => area.value !== '').map((area) => (
                      <button
                        key={area.value}
                        type="button"
                        onClick={() => handleToggleArea(area.value)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
                          ${
                            formData.areas.includes(area.value)
                              ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30'
                              : 'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-500 border border-gray-200 dark:border-gray-500'
                          }`}
                      >
                        {formData.areas.includes(area.value) && (
                          <span className="text-xs">✓</span>
                        )}
                        {area.label}
                      </button>
                    ))}
                  </div>
                  {formData.areas.length > 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      {formData.areas.length} área{formData.areas.length !== 1 ? 's' : ''} seleccionada{formData.areas.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
                {error && (
                  <div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-500 text-white 
                      hover:bg-green-600 transition-colors font-medium"
                  >
                    <Save size={16} />
                    Guardar
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gray-500 text-white 
                      hover:bg-gray-600 transition-colors font-medium"
                  >
                    <X size={16} />
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Lista de personas */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
              </div>
            ) : filteredPeople.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                {searchTerm ? 'No se encontraron personas' : 'No hay personas registradas'}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredPeople.map((person) => (
                  <div
                    key={person.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 
                      border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                        <User size={20} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {person.name}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap mt-1">
                          {person.email && (
                            <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 truncate">
                              <Mail size={12} />
                              {person.email}
                            </div>
                          )}
                          {person.area && person.area.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap">
                              {person.area.map((area, idx) => (
                                <span 
                                  key={idx}
                                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                                >
                                  {area}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleEdit(person)}
                        disabled={isAdding || editingId !== null}
                        className="p-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 
                          transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(person.id, person.name)}
                        disabled={isAdding || editingId !== null}
                        className="p-2 rounded-lg bg-red-500 text-white hover:bg-red-600 
                          transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}




