import { useEffect, useState } from 'react';
import { Pencil, Trash2, Save, X, Calendar, Clock, Send, Loader2, AlertTriangle, User, Flag } from 'lucide-react';
import { supabase, type Reminder, type ReminderComment, type Priority, type Person } from '../lib/supabase';
import { MultiPersonSelector } from './MultiPersonSelector';
import { TagSelector } from './TagSelector';

interface ReminderCardProps {
  reminder: Reminder;
  onUpdate: (id: string, title: string, description: string, dueDate: string | null, priority?: Priority, assignedTo?: string | null) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  isExpired?: boolean;
  isExpanded?: boolean;
  onOpenDetails?: (reminder: Reminder) => void;
  onCloseDetails?: () => void;
  onUpdateProgress: (id: string, progress: number) => Promise<void>;
}

export function ReminderCard({
  reminder,
  onUpdate,
  onDelete,
  isExpired = false,
  isExpanded = false,
  onOpenDetails,
  onCloseDetails,
  onUpdateProgress,
}: ReminderCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(reminder.title);
  const [description, setDescription] = useState(reminder.description);
  const [dueDate, setDueDate] = useState(reminder.due_date ? reminder.due_date.split('T')[0] : '');
  const [priority, setPriority] = useState<Priority>(reminder.priority || 'medium');
  const [assignedTo, setAssignedTo] = useState<string | null>(reminder.assigned_to || null);
  const [assignedPerson, setAssignedPerson] = useState<Person | null>(null);
  const [assignedPeopleIds, setAssignedPeopleIds] = useState<string[]>(() => {
    if (reminder.assignees && reminder.assignees.length > 0) {
      return reminder.assignees.map((p) => p.id);
    }
    if (reminder.assigned_to) {
      return [reminder.assigned_to];
    }
    return [];
  });
  const [selectedTags, setSelectedTags] = useState<string[]>(reminder.tags?.map(t => t.id) || []);
  const [isLoading, setIsLoading] = useState(false);
  const [comments, setComments] = useState<ReminderComment[]>([]);
  const [areCommentsLoading, setAreCommentsLoading] = useState(false);
  const [commentAuthor, setCommentAuthor] = useState('');
  const [commentMessage, setCommentMessage] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [hasLoadedComments, setHasLoadedComments] = useState(false);
  const [progressDraft, setProgressDraft] = useState(reminder.progress ?? 0);
  const [savedProgress, setSavedProgress] = useState(reminder.progress ?? 0);
  const [isProgressUpdating, setIsProgressUpdating] = useState(false);

  // Cargar información de la persona asignada y actualizar IDs cuando cambia el reminder
  useEffect(() => {
    const loadAssignedPerson = async () => {
      if (reminder.assigned_to) {
        try {
          const { data, error } = await supabase
            .from('people')
            .select('id, name, email, area, created_at')
            .eq('id', reminder.assigned_to)
            .single();

          if (!error && data) {
            setAssignedPerson(data);
          }
        } catch (err) {
          // Si no existe la tabla o la persona, simplemente no mostrar nada
          setAssignedPerson(null);
        }
      } else {
        setAssignedPerson(null);
      }
    };

    loadAssignedPerson();

    // Actualizar assignedPeopleIds cuando cambia el reminder
    if (reminder.assignees && reminder.assignees.length > 0) {
      setAssignedPeopleIds(reminder.assignees.map((p) => p.id));
    } else if (reminder.assigned_to) {
      setAssignedPeopleIds([reminder.assigned_to]);
    } else {
      setAssignedPeopleIds([]);
    }
  }, [reminder.assigned_to, reminder.assignees]);

  const handleSave = async () => {
    if (!title.trim()) return;

    setIsLoading(true);
    try {
      const primaryAssignee = assignedPeopleIds[0] || null;
      await onUpdate(reminder.id, title, description, dueDate || null, priority, primaryAssignee);
      
      // Actualizar etiquetas
      if (reminder.room_code) {
        try {
          // Obtener etiquetas actuales
          const { data: currentAssignments } = await supabase
            .from('reminder_tag_assignments')
            .select('tag_id')
            .eq('reminder_id', reminder.id);

          const currentTagIds = (currentAssignments || []).map(a => a.tag_id);
          const tagsToAdd = selectedTags.filter(id => !currentTagIds.includes(id));
          const tagsToRemove = currentTagIds.filter(id => !selectedTags.includes(id));

          // Agregar nuevas etiquetas
          if (tagsToAdd.length > 0) {
            await supabase
              .from('reminder_tag_assignments')
              .insert(tagsToAdd.map(tagId => ({
                reminder_id: reminder.id,
                tag_id: tagId,
              })));
          }

          // Eliminar etiquetas removidas
          if (tagsToRemove.length > 0) {
            await supabase
              .from('reminder_tag_assignments')
              .delete()
              .eq('reminder_id', reminder.id)
              .in('tag_id', tagsToRemove);
          }
        } catch (err) {
          console.warn('No se pudieron actualizar las etiquetas:', err);
        }
      }

      // Actualizar responsables múltiples
      try {
        const { data: currentAssignees } = await supabase
          .from('reminder_assignees')
          .select('person_id')
          .eq('reminder_id', reminder.id);

        const currentIds = (currentAssignees || []).map((a: any) => a.person_id);
        const idsToAdd = assignedPeopleIds.filter((id) => !currentIds.includes(id));
        const idsToRemove = currentIds.filter((id: string) => !assignedPeopleIds.includes(id));

        if (idsToAdd.length > 0) {
          await supabase
            .from('reminder_assignees')
            .insert(
              idsToAdd.map((personId) => ({
                reminder_id: reminder.id,
                person_id: personId,
              }))
            );
        }

        if (idsToRemove.length > 0) {
          await supabase
            .from('reminder_assignees')
            .delete()
            .eq('reminder_id', reminder.id)
            .in('person_id', idsToRemove);
        }
      } catch (err) {
        console.warn('No se pudieron actualizar los responsables múltiples:', err);
      }

      setIsEditing(false);
    } catch (error) {
      console.error('Error updating reminder:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setTitle(reminder.title);
    setDescription(reminder.description);
    setDueDate(reminder.due_date ? reminder.due_date.split('T')[0] : '');
    setPriority(reminder.priority || 'medium');
    setAssignedTo(reminder.assigned_to || null);
    setAssignedPeopleIds(reminder.assignees?.map((p) => p.id) || (reminder.assigned_to ? [reminder.assigned_to] : []));
    setSelectedTags(reminder.tags?.map(t => t.id) || []);
    setIsEditing(false);
  };

  const getPriorityColor = (p: Priority) => {
    switch (p) {
      case 'urgent': return 'bg-red-500 border-red-600 text-white';
      case 'high': return 'bg-orange-500 border-orange-600 text-white';
      case 'medium': return 'bg-yellow-500 border-yellow-600 text-white';
      case 'low': return 'bg-blue-500 border-blue-600 text-white';
      default: return 'bg-gray-500 border-gray-600 text-white';
    }
  };

  const getPriorityLabel = (p: Priority) => {
    switch (p) {
      case 'urgent': return 'Urgente';
      case 'high': return 'Alta';
      case 'medium': return 'Media';
      case 'low': return 'Baja';
      default: return 'Media';
    }
  };

  const handleDelete = async () => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este recordatorio?')) {
      setIsLoading(true);
      try {
        await onDelete(reminder.id);
      } catch (error) {
        console.error('Error deleting reminder:', error);
        setIsLoading(false);
      }
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const isOverdue = reminder.due_date && new Date(reminder.due_date) < new Date();

  const loadComments = async () => {
    setAreCommentsLoading(true);
    setCommentsError(null);
    try {
      const { data, error } = await supabase
        .from('reminder_comments')
        .select('*')
        .eq('reminder_id', reminder.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
      setHasLoadedComments(true);
    } catch (error) {
      console.error('Error fetching comments:', error);
      setCommentsError('No pudimos cargar los comentarios.');
    } finally {
      setAreCommentsLoading(false);
    }
  };

  useEffect(() => {
    if (isExpanded && !hasLoadedComments) {
      loadComments();
    }
}, [isExpanded, hasLoadedComments]);

useEffect(() => {
  const normalized = Math.max(0, Math.min(100, reminder.progress ?? 0));
  setProgressDraft(normalized);
  setSavedProgress(normalized);
}, [reminder.id, reminder.progress]);

  const handleAddComment = async () => {
    if (!commentAuthor.trim() || !commentMessage.trim()) {
      setCommentsError('Completa tu nombre y el mensaje.');
      return;
    }

    setIsSubmittingComment(true);
    setCommentsError(null);

    try {
      const { data, error } = await supabase
        .from('reminder_comments')
        .insert([{
          reminder_id: reminder.id,
          author: commentAuthor.trim(),
          message: commentMessage.trim(),
        }])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setComments([...comments, data]);
        setCommentAuthor('');
        setCommentMessage('');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      setCommentsError('No pudimos guardar tu comentario.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const formatCommentDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleProgressChange = (value: number) => {
    setProgressDraft(Math.max(0, Math.min(100, value)));
  };

  const commitProgressChange = async () => {
    const normalized = Math.round(Math.max(0, Math.min(100, progressDraft)));
    if (normalized === savedProgress || isProgressUpdating) return;

    setIsProgressUpdating(true);
    try {
      await onUpdateProgress(reminder.id, normalized);
      setSavedProgress(normalized);
      setProgressDraft(normalized);
    } catch (error) {
      console.error('Error updating progress:', error);
      setProgressDraft(savedProgress);
    } finally {
      setIsProgressUpdating(false);
    }
  };

  const handleProgressInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation();
    handleProgressChange(Number(event.target.value));
  };

  const handleProgressPointerUp = (
    event: React.PointerEvent<HTMLInputElement> | React.MouseEvent<HTMLInputElement>
  ) => {
    event.stopPropagation();
    commitProgressChange();
  };

  const handleProgressTouchEnd = (event: React.TouchEvent<HTMLInputElement>) => {
    event.stopPropagation();
    commitProgressChange();
  };

  const handleCardClick = (event: React.MouseEvent) => {
    if (isExpanded || isEditing) return;
    const target = event.target as HTMLElement;
    if (target.closest('button, input, textarea')) {
      return;
    }
    onOpenDetails?.(reminder);
  };

  const getPriorityBorderColor = (p: Priority) => {
    switch (p) {
      case 'urgent': return 'border-red-500 dark:border-red-600';
      case 'high': return 'border-orange-500 dark:border-orange-600';
      case 'medium': return 'border-yellow-500 dark:border-yellow-600';
      case 'low': return 'border-blue-500 dark:border-blue-600';
      default: return 'border-gray-300 dark:border-gray-600';
    }
  };

  const currentPriority = reminder.priority || 'medium';
  const borderColor = isExpired || isOverdue 
    ? 'border-red-500 dark:border-red-600' 
    : getPriorityBorderColor(currentPriority);

  return (
    <div
      className={`flex-shrink-0 ${isExpanded ? 'w-full max-w-3xl max-h-[90vh]' : 'w-72'} rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border-2 ${borderColor}
      ${isExpired || isOverdue
        ? 'bg-red-50 dark:bg-red-900/20'
        : 'bg-white dark:bg-gray-800'
      } cursor-pointer ${isExpanded ? 'overflow-hidden flex flex-col' : ''}`}
      onClick={handleCardClick}
    >
      <div className={`p-5 h-full flex flex-col ${isExpanded ? 'min-h-0 overflow-y-auto' : 'min-h-[240px]'}`}>
        {isEditing ? (
          <>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título"
              className="text-lg font-bold mb-2 px-3 py-2 border-2 border-blue-500 dark:border-blue-400 rounded-lg
                focus:outline-none focus:border-blue-600 dark:focus:border-blue-300
                bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              disabled={isLoading}
              autoFocus
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción"
              className="flex-1 mb-2 px-3 py-2 border-2 border-blue-500 dark:border-blue-400 rounded-lg
                focus:outline-none focus:border-blue-600 dark:focus:border-blue-300
                resize-none min-h-[80px]
                bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              disabled={isLoading}
            />
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mb-2 px-3 py-2 border-2 border-blue-500 dark:border-blue-400 rounded-lg
                focus:outline-none focus:border-blue-600 dark:focus:border-blue-300
                bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              disabled={isLoading}
            />
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Prioridad</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  className="w-full px-3 py-2 border-2 border-blue-500 dark:border-blue-400 rounded-lg
                    focus:outline-none focus:border-blue-600 dark:focus:border-blue-300
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  disabled={isLoading}
                >
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">
                  Asignado a
                </label>
                <MultiPersonSelector
                  values={assignedPeopleIds}
                  onChange={(ids) => {
                    setAssignedPeopleIds(ids);
                    setAssignedTo(ids[0] || null);
                  }}
                  placeholder="Seleccionar responsables..."
                  disabled={isLoading}
                />
              </div>
            </div>
            {reminder.room_code && (
              <div className="mb-2">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Etiquetas</label>
                <TagSelector
                  roomCode={reminder.room_code}
                  selectedTags={selectedTags}
                  onChange={setSelectedTags}
                  className="text-sm"
                />
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={isLoading || !title.trim()}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-500 text-white rounded-lg
                  hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                <Save size={16} />
                Guardar
              </button>
              <button
                onClick={handleCancel}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-500 text-white rounded-lg
                  hover:bg-gray-600 transition-colors disabled:opacity-50 text-sm font-medium"
              >
                <X size={16} />
                Cancelar
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="border-b-2 border-gray-200 dark:border-gray-600 pb-3 mb-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 break-words line-clamp-2 flex-1">
                  {reminder.title}
                </h3>
                <span className={`px-2 py-1 rounded-lg text-xs font-semibold border-2 flex-shrink-0 ${getPriorityColor(reminder.priority || 'medium')}`}>
                  <Flag size={12} className="inline mr-1" />
                  {getPriorityLabel(reminder.priority || 'medium')}
                </span>
              </div>
              <div className={`flex items-center gap-2 text-sm mt-2 px-2 py-1 rounded-lg ${
                (reminder.assignees && reminder.assignees.length > 0) || assignedPerson
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                  : 'text-gray-400 dark:text-gray-500'
              }`}>
                <User size={14} />
                <span className={(reminder.assignees && reminder.assignees.length > 0) || assignedPerson ? 'font-semibold' : 'italic'}>
                  {reminder.assignees && reminder.assignees.length > 1
                    ? `Asignado a ${reminder.assignees.length} personas`
                    : reminder.assignees && reminder.assignees.length === 1
                      ? reminder.assignees[0].name
                      : assignedPerson
                        ? assignedPerson.name
                        : 'Sin responsable asignado'}
                </span>
              </div>
              {reminder.tags && reminder.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {reminder.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: tag.color }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="border-b-2 border-gray-200 dark:border-gray-600 pb-3 mb-3 flex-1">
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words line-clamp-3">
                {reminder.description || 'Sin descripción'}
              </p>
            </div>

            <div className="border-b-2 border-gray-200 dark:border-gray-600 pb-3 mb-3">
              {reminder.due_date ? (
                <div className={`flex items-center gap-2 text-sm font-medium
                  ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
                  <Calendar size={16} />
                  <span>{formatDate(reminder.due_date)}</span>
                  {isOverdue && <Clock size={16} className="text-red-600 dark:text-red-400" />}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
                  <Calendar size={16} />
                  <span>Sin fecha</span>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-gray-400">
                  <span>Progreso</span>
                  <span className="text-sm text-gray-900 dark:text-gray-100">{progressDraft}%</span>
                </div>
                <div className="relative h-4 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
                    style={{
                      width: `${progressDraft}%`,
                      background: `linear-gradient(90deg, #38bdf8, #6366f1)`
                    }}
                  ></div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={progressDraft}
                    onChange={handleProgressInput}
                    onMouseUp={handleProgressPointerUp}
                    onPointerUp={handleProgressPointerUp as any}
                    onTouchEnd={handleProgressTouchEnd}
                    className="absolute inset-0 w-full opacity-0 cursor-ew-resize"
                  />
                </div>
                <div className="flex justify-between text-[11px] uppercase tracking-widest text-gray-400 dark:text-gray-500">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
                {isProgressUpdating && (
                  <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                    <Loader2 size={14} className="animate-spin" />
                    <span>Guardando progreso...</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setIsEditing(true)}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-500 text-white rounded-lg
                    hover:bg-blue-600 transition-colors text-sm font-medium"
                >
                  <Pencil size={16} />
                  Editar
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isLoading}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-500 text-white rounded-lg
                    hover:bg-red-600 transition-colors disabled:opacity-50 text-sm font-medium"
                >
                  <Trash2 size={16} />
                  Eliminar
                </button>
                {!isExpanded && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenDetails?.(reminder);
                    }}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200 text-sm font-medium transition-colors"
                  >
                    Ver detalles
                  </button>
                )}
                {isExpanded && onCloseDetails && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseDetails();
                    }}
                    className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cerrar
                  </button>
                )}
              </div>
            </div>
            {isExpanded && (
              <div className="mt-6 border-t border-dashed border-gray-300 dark:border-gray-700 pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Colaboración</p>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Comentarios</h4>
                  </div>
                  <button
                    onClick={loadComments}
                    disabled={areCommentsLoading}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 disabled:opacity-50 transition-colors"
                  >
                    <Loader2 size={14} className={`animate-spin ${areCommentsLoading ? 'opacity-100' : 'opacity-0'}`} />
                    Actualizar
                  </button>
                </div>
                {commentsError && (
                  <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50/80 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2 rounded-xl">
                    <AlertTriangle size={14} />
                    {commentsError}
                  </div>
                )}
                {areCommentsLoading ? (
                  <div className="flex items-center justify-center py-6 text-sm text-gray-500 dark:text-gray-400">
                    <Loader2 size={18} className="animate-spin mr-2" />
                    Cargando comentarios...
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-6 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/30 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                    Sé el primero en comentar este recordatorio.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                    {comments.map((comment) => (
                      <div
                        key={comment.id}
                        className="p-4 rounded-2xl bg-white/90 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 shadow-sm"
                      >
                        <div className="flex items-center justify-between text-[11px] uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">
                          <span className="text-xs font-semibold text-blue-600 dark:text-blue-300">{comment.author}</span>
                          <span>{formatCommentDate(comment.created_at)}</span>
                        </div>
                        <p className="text-sm text-gray-800 dark:text-gray-100 whitespace-pre-wrap break-words">
                          {comment.message}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <input
                      type="text"
                      value={commentAuthor}
                      onChange={(e) => setCommentAuthor(e.target.value)}
                      placeholder="Nombre o alias"
                      onMouseDown={(e) => e.stopPropagation()}
                      className="px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 outline-none transition-all text-sm"
                    />
                    <p className="text-xs text-gray-400 dark:text-gray-500 self-center text-right hidden md:block">
                      Añade contexto, anotaciones o feedback rápido.
                    </p>
                  </div>
                  <textarea
                    value={commentMessage}
                    onChange={(e) => setCommentMessage(e.target.value)}
                    placeholder="Escribe tu comentario..."
                    onMouseDown={(e) => e.stopPropagation()}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 outline-none transition-all text-sm resize-none min-h-[100px]"
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={isSubmittingComment}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-60"
                  >
                    {isSubmittingComment ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        Agregar comentario
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
