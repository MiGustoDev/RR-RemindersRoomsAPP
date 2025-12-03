import { useState, useEffect } from 'react';
import { Plus, Moon, Sun, Settings, Minimize2, Maximize2, BarChart3, Users, Copy, X, Lock, Unlock, DoorOpen, LogOut } from 'lucide-react';
import { supabase, type Reminder, type Room, type Priority } from './lib/supabase';
import { ReminderCard } from './components/ReminderCard';
import { ExpiredPanel } from './components/ExpiredPanel';
import { SettingsModal } from './components/SettingsModal';
import { SearchBar } from './components/SearchBar';
import { StatsPanel } from './components/StatsPanel';
import { useAuth } from './lib/auth';
import { useDarkMode } from './lib/theme';

const ROOM_STORAGE_KEY = 'reminder:room-code';

export function ReminderApp() {
  const { signOut, user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('medium');
  const [newAssignedTo, setNewAssignedTo] = useState('');
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [roomInfo, setRoomInfo] = useState<Room | null>(null);
  const [isDark, setIsDark] = useDarkMode();
  const [showExpiredPanel, setShowExpiredPanel] = useState(true);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState<'all' | 'active' | 'expired' | 'today' | 'week'>('all');
  const [sortBy, setSortBy] = useState<'created' | 'due_date' | 'title' | 'priority'>('created');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');
  const [assignedToFilter, setAssignedToFilter] = useState('');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isRoomsLoading, setIsRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState<string | null>(null);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomAccessCode, setNewRoomAccessCode] = useState('');
  const [roomActionMessage, setRoomActionMessage] = useState<string | null>(null);
  const [isRoomActionLoading, setIsRoomActionLoading] = useState(false);
  const [roomPendingAccess, setRoomPendingAccess] = useState<Room | null>(null);
  const [accessCodeInput, setAccessCodeInput] = useState('');
  const [showAccessPrompt, setShowAccessPrompt] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [lastRoomCode, setLastRoomCode] = useState<string | null>(null);
  const [expandedReminder, setExpandedReminder] = useState<Reminder | null>(null);

  useEffect(() => {
    const storedCode = localStorage.getItem(ROOM_STORAGE_KEY);
    if (storedCode) {
      setLastRoomCode(storedCode);
    }

    fetchRooms();

    const channel = supabase
      .channel('rooms-listener')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms' },
        () => fetchRooms(false)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    if (!roomCode) return;

    localStorage.setItem(ROOM_STORAGE_KEY, roomCode);
    fetchRoomInfo(roomCode);
    fetchReminders(roomCode);

    const channel = supabase
      .channel(`reminders-${roomCode}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reminders', filter: `room_code=eq.${roomCode}` },
        () => {
          fetchReminders(roomCode, false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomCode]);

  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'k':
            e.preventDefault();
            document.querySelector<HTMLInputElement>('input[placeholder="Buscar recordatorios..."]')?.focus();
            break;
          case 'n':
            e.preventDefault();
            setIsAddingNew(true);
            setTimeout(() => {
              const input = document.querySelector('input[placeholder="Título"]') as HTMLInputElement;
              if (input) {
                input.focus();
              }
            }, 100);
            break;
          case ',':
            e.preventDefault();
            setShowSettingsModal(true);
            break;
        }
      }
      if (e.key === 'Escape') {
        setShowSettingsModal(false);
        setIsAddingNew(false);
        setNewTitle('');
        setNewDescription('');
        setNewDueDate('');
        setNewPriority('medium');
        setNewAssignedTo('');
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, []);

  const fetchRooms = async (toggleLoading = true) => {
    if (toggleLoading) {
      setIsRoomsLoading(true);
    }

    try {
      console.log('🔍 Intentando cargar salas...');

      // Verificar variables de entorno primero
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
        throw new Error('Variables de entorno no configuradas. Crea un archivo .env');
      }

      console.log('📡 Construyendo query SIMPLE (sin filtro de usuario)...');

      // Verificar que el usuario esté autenticado
      if (!user) {
        console.log('⚠️ Usuario no autenticado - no se cargarán salas');
        setRooms([]);
        setRoomsError('Debes iniciar sesión para ver las salas');
        return;
      }

      console.log('✅ Usuario autenticado:', user.email);

      // Consulta simple - mostrar TODAS las salas (sin filtro por usuario)
      const { data, error } = await supabase
        .from('rooms')
        .select('id, name, code, created_at, is_locked, created_by')
        .order('created_at', { ascending: false });
      console.log('✔️ Query completada. Error:', error ? 'SÍ' : 'NO', 'Data:', data?.length || 0, 'salas');

      if (error) {
        console.error('❌ Error de Supabase:', error);
        console.error('📋 Código de error:', error.code);
        console.error('📋 Mensaje:', error.message);
        console.error('📋 Detalles:', error.details);
        console.error('📋 Hint:', error.hint);

        // Error específico para columna faltante (migración no aplicada)
        if (error.code === '42703') {
          setRoomsError('Error de base de datos: Falta la columna "created_by". Ejecuta el archivo SQL_MIGRATION_ADD_OWNER.sql en Supabase.');
          return;
        }

        // Si la tabla no existe
        if (error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('does not exist') || error.code === '42P01') {
          setRoomsError('La tabla "rooms" no existe. Ejecuta SQL_COPIAR_AQUI.sql en Supabase.');
        } else if (error.code === 'PGRST301' || error.message?.includes('permission') || error.message?.includes('RLS')) {
          setRoomsError('Error de permisos. Verifica las políticas RLS en Supabase.');
        } else {
          throw error;
        }
      } else {
        console.log(`✅ Salas cargadas: ${data?.length || 0} (Usuario: ${user?.email || 'Anónimo'})`);
        setRooms(data || []);
        setRoomsError(null);
      }
    } catch (error: any) {
      console.error('❌ Error al cargar salas:', error);

      // Mostrar el error real en lugar de timeout genérico
      if (error.message?.includes('Variables de entorno')) {
        setRoomsError('Variables de entorno no configuradas. Crea un archivo .env con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY');
      } else if (error.code === 'PGRST116' || error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        setRoomsError('La tabla "rooms" no existe. Ejecuta SQL_COPIAR_AQUI.sql en Supabase SQL Editor.');
      } else if (error.code === 'PGRST301' || error.code === '42501' || error.message?.includes('permission') || error.message?.includes('RLS')) {
        setRoomsError('Error de permisos. Ejecuta en Supabase: ALTER TABLE rooms DISABLE ROW LEVEL SECURITY;');
      } else {
        // Mostrar el error real de Supabase
        const errorMsg = error.message || error.toString() || 'Error desconocido';
        setRoomsError(`Error: ${errorMsg}. Revisa la consola (F12) para más detalles.`);
      }
    } finally {
      console.log('🏁 Finalizó carga de salas. Loading:', toggleLoading);
      if (toggleLoading) {
        setIsRoomsLoading(false);
      }
    }
  };

  const generateRoomCode = () => {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
  };

  const fetchRoomInfo = async (code: string) => {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('id, name, code, created_at, is_locked, created_by')
        .eq('code', code)
        .single();

      if (error) throw error;
      setRoomInfo(data);
    } catch (error) {
      console.error('Error al obtener la sala:', error);
      setRoomInfo(null);
    }
  };

  const enterRoom = (room: Room) => {
    setRoomCode(room.code);
    setRoomInfo(room);
    setReminders([]);
    localStorage.setItem(ROOM_STORAGE_KEY, room.code);
    setLastRoomCode(room.code);
  };

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) {
      setRoomActionMessage('El nombre de la sala es obligatorio.');
      return;
    }

    setIsRoomActionLoading(true);
    setRoomActionMessage(null);

    try {
      let attempts = 0;
      let createdRoom: Room | null = null;
      const trimmedCode = newRoomAccessCode.trim();

      while (attempts < 3 && !createdRoom) {
        const code = generateRoomCode();
        const { data, error } = await supabase
          .from('rooms')
          .insert([{
            name: newRoomName.trim(),
            code,
            is_locked: Boolean(trimmedCode),
            access_code: trimmedCode || null,
            created_by: user?.id || null,
          }])
          .select('id, name, code, created_at, is_locked, created_by')
          .single();

        if (error) {
          if ('code' in error && error.code === '23505') {
            attempts += 1;
            continue;
          }
          throw error;
        }

        createdRoom = data;
      }

      if (!createdRoom) {
        throw new Error('No se pudo generar un código único. Intenta de nuevo.');
      }

      setNewRoomName('');
      setNewRoomAccessCode('');
      setRoomActionMessage('Sala creada con éxito.');
      enterRoom(createdRoom);
      fetchRooms(false);
    } catch (error) {
      console.error('Error al crear la sala:', error);
      setRoomActionMessage('No se pudo crear la sala. Intenta nuevamente.');
    } finally {
      setIsRoomActionLoading(false);
    }
  };

  const handleRoomCardClick = (room: Room) => {
    if (room.is_locked) {
      setRoomPendingAccess(room);
      setAccessCodeInput('');
      setShowAccessPrompt(true);
      setAccessError(null);
      return;
    }

    enterRoom(room);
  };

  const handleVerifyAccessCode = async () => {
    if (!roomPendingAccess) return;

    if (!accessCodeInput.trim()) {
      setAccessError('Ingresa el código para acceder.');
      return;
    }

    setIsRoomActionLoading(true);
    setAccessError(null);

    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('id, name, code, created_at, is_locked, access_code')
        .eq('id', roomPendingAccess.id)
        .single();

      if (error) throw error;

      if (data.access_code && data.access_code === accessCodeInput.trim()) {
        const sanitizedRoom: Room = {
          id: data.id,
          name: data.name,
          code: data.code,
          created_at: data.created_at,
          is_locked: data.is_locked,
          created_by: null,
        };
        enterRoom(sanitizedRoom);
        setRoomPendingAccess(null);
        setShowAccessPrompt(false);
        setAccessCodeInput('');
      } else {
        setAccessError('Código incorrecto.');
      }
    } catch (error) {
      console.error('Error verificando acceso a la sala:', error);
      setAccessError('No pudimos verificar el código. Intenta nuevamente.');
    } finally {
      setIsRoomActionLoading(false);
    }
  };

  const handleCloseAccessPrompt = () => {
    setShowAccessPrompt(false);
    setRoomPendingAccess(null);
    setAccessCodeInput('');
    setAccessError(null);
  };

  const handleLeaveRoom = (forgetStored = false) => {
    if (forgetStored) {
      localStorage.removeItem(ROOM_STORAGE_KEY);
      setLastRoomCode(null);
    }
    setRoomCode(null);
    setRoomInfo(null);
    setReminders([]);
  };

  const handleResumeLastRoom = async () => {
    if (!lastRoomCode) return;

    const cachedRoom = rooms.find((room) => room.code === lastRoomCode);
    if (cachedRoom) {
      handleRoomCardClick(cachedRoom);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('id, name, code, created_at, is_locked')
        .eq('code', lastRoomCode)
        .single();

      if (error) throw error;
      handleRoomCardClick({ ...data, created_by: null });
    } catch (error) {
      console.error('No se pudo recuperar la sala guardada:', error);
      setRoomActionMessage('No encontramos la sala guardada. Selecciona otra de la lista.');
      localStorage.removeItem(ROOM_STORAGE_KEY);
      setLastRoomCode(null);
    }
  };

  const handleCloseExpandedReminder = () => {
    setExpandedReminder(null);
  };

  const fetchReminders = async (targetRoomCode: string | null = roomCode, toggleLoading = true) => {
    if (!targetRoomCode) return;
    if (toggleLoading) {
      setIsLoading(true);
    }
    try {
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('room_code', targetRoomCode)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const normalizedReminders = (data || []).map((reminder: any) => ({
        ...reminder,
        priority: reminder.priority || 'medium',
        assigned_to: reminder.assigned_to || null,
        progress: reminder.progress ?? 0,
      }));

      setReminders(normalizedReminders);
    } catch (error) {
      console.error('Error fetching reminders:', error);
    } finally {
      if (toggleLoading) {
        setIsLoading(false);
      }
    }
  };

  const handleAddReminder = async () => {
    if (!newTitle.trim() || !roomCode) return;

    try {
      const insertData: any = {
        title: newTitle.trim(),
        description: newDescription.trim(),
        due_date: newDueDate || null,
        room_code: roomCode,
        progress: 0,
      };

      try {
        insertData.priority = newPriority;
        insertData.assigned_to = newAssignedTo.trim() || null;
      } catch (e) {
        console.warn('Campos priority/assigned_to no disponibles:', e);
      }

      const { data, error } = await supabase
        .from('reminders')
        .insert([insertData])
        .select()
        .single();

      if (error) {
        console.error('Error de Supabase al crear:', error);
        throw error;
      }

      if (data) {
        const normalizedData = {
          ...data,
          priority: data.priority || 'medium',
          assigned_to: data.assigned_to || null,
          progress: data.progress ?? 0,
        };
        setReminders([normalizedData, ...reminders]);
        setNewTitle('');
        setNewDescription('');
        setNewDueDate('');
        setNewPriority('medium');
        setNewAssignedTo('');
        setIsAddingNew(false);
      }
    } catch (error) {
      console.error('Error adding reminder:', error);
      alert('Error al crear el recordatorio. Verifica que la base de datos tenga todas las columnas necesarias.');
    }
  };

  const handleUpdateReminder = async (id: string, title: string, description: string, dueDate: string | null, priority?: Priority, assignedTo?: string | null) => {
    try {
      const updateData: any = {
        title: title.trim(),
        description: description.trim(),
        due_date: dueDate || null,
      };

      if (priority !== undefined) {
        updateData.priority = priority;
      }

      if (assignedTo !== undefined) {
        updateData.assigned_to = assignedTo || null;
      }

      const { error, data } = await supabase
        .from('reminders')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error de Supabase:', error);
        throw error;
      }

      if (data) {
        setReminders(
          reminders.map((reminder) =>
            reminder.id === id ? data : reminder
          )
        );
      } else {
        setReminders(
          reminders.map((reminder) =>
            reminder.id === id
              ? {
                ...reminder,
                title: title.trim(),
                description: description.trim(),
                due_date: dueDate,
                priority: priority ?? reminder.priority ?? 'medium',
                assigned_to: assignedTo ?? reminder.assigned_to,
              }
              : reminder
          )
        );
      }
    } catch (error) {
      console.error('Error updating reminder:', error);
      throw error;
    }
  };

  const handleUpdateProgress = async (id: string, progress: number) => {
    try {
      const clampedProgress = Math.max(0, Math.min(100, progress));
      const { error } = await supabase
        .from('reminders')
        .update({
          progress: clampedProgress,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      setReminders(
        reminders.map((reminder) =>
          reminder.id === id
            ? {
              ...reminder,
              progress: clampedProgress,
              updated_at: new Date().toISOString(),
            }
            : reminder
        )
      );
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const handleDeleteReminder = async (id: string) => {
    try {
      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setReminders(reminders.filter((reminder) => reminder.id !== id));
    } catch (error) {
      console.error('Error deleting reminder:', error);
      throw error;
    }
  };

  const handleClearAll = async () => {
    if (!roomCode) return;
    try {
      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('room_code', roomCode);

      if (error) throw error;

      setReminders([]);
      setShowSettingsModal(false);
    } catch (error) {
      console.error('Error clearing reminders:', error);
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(reminders, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reminders-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (file: File) => {
    try {
      const text = await file.text();
      const importedReminders = JSON.parse(text);

      if (!Array.isArray(importedReminders)) {
        alert('Formato de archivo inválido');
        return;
      }

      if (!roomCode) return;

      const formattedReminders = importedReminders
        .filter((reminder) => reminder.title)
        .map((reminder) => ({
          title: reminder.title,
          description: reminder.description ?? '',
          due_date: reminder.due_date ?? null,
          room_code: roomCode,
          progress: Math.max(0, Math.min(100, Number(reminder.progress) || 0)),
        }));

      if (formattedReminders.length === 0) {
        alert('No se encontraron recordatorios válidos en el archivo');
        return;
      }

      const { error } = await supabase.from('reminders').insert(formattedReminders);
      if (error) throw error;

      await fetchReminders(roomCode);
      setShowSettingsModal(false);
    } catch (error) {
      console.error('Error importing reminders:', error);
      alert('Error al importar recordatorios');
    }
  };

  const filteredAndSortedReminders = () => {
    const priorityOrder: Record<Priority, number> = { urgent: 4, high: 3, medium: 2, low: 1 };

    let filtered = reminders.filter(reminder => {
      const matchesSearch =
        reminder.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reminder.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (reminder.assigned_to && reminder.assigned_to.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;

      if (priorityFilter !== 'all' && reminder.priority !== priorityFilter) {
        return false;
      }

      if (assignedToFilter && reminder.assigned_to !== assignedToFilter) {
        return false;
      }

      const now = new Date();
      const dueDate = reminder.due_date ? new Date(reminder.due_date) : null;

      switch (filterBy) {
        case 'active':
          return !dueDate || dueDate >= now;
        case 'expired':
          return dueDate && dueDate < now;
        case 'today':
          return dueDate?.toDateString() === now.toDateString();
        case 'week':
          const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          return dueDate && dueDate >= now && dueDate <= weekFromNow;
        default:
          return true;
      }
    });

    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'due_date':
          const aDate = a.due_date ? new Date(a.due_date).getTime() : 0;
          const bDate = b.due_date ? new Date(b.due_date).getTime() : 0;
          comparison = aDate - bDate;
          break;
        case 'priority':
          comparison = (priorityOrder[a.priority || 'medium'] || 0) - (priorityOrder[b.priority || 'medium'] || 0);
          break;
        case 'created':
        default:
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  };

  const availableAssignees = Array.from(new Set(reminders.map(r => r.assigned_to).filter(Boolean) as string[])).sort();

  const activeReminders = filteredAndSortedReminders().filter(
    (reminder) => !reminder.due_date || new Date(reminder.due_date) >= new Date()
  );

  const expiredReminders = reminders.filter(
    (reminder) => reminder.due_date && new Date(reminder.due_date) < new Date()
  );

  const lobbyHeader = (
    <div className="text-center space-y-3">
      <p className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">Salas disponibles</p>
      <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
        Selecciona una sala para tus recordatorios
      </h1>
      <p className="text-base md:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
        Haz clic en cualquier tarjeta para entrar. Si la sala está protegida te pediremos el código correspondiente.
      </p>
    </div>
  );

  if (!roomCode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 transition-all duration-300">
        <div className="max-w-5xl mx-auto py-12 px-6 space-y-10">
          {lobbyHeader}

          {lastRoomCode && (
            <div className="flex justify-center">
              <button
                onClick={handleResumeLastRoom}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 dark:bg-gray-800/80 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-300 font-semibold shadow hover:shadow-lg transition-all"
              >
                <Users size={18} />
                Reanudar mi sala guardada ({lastRoomCode})
              </button>
            </div>
          )}

          <div className="bg-white/80 dark:bg-gray-900/70 backdrop-blur rounded-3xl shadow-2xl border border-white/40 dark:border-gray-800 p-6 md:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Salas creadas</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Elige una sala pública o privada.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchRooms()}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  Actualizar lista
                </button>
              </div>
            </div>

            {roomsError && (
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400 text-center font-semibold mb-2">
                  ⚠️ {roomsError}
                </p>
                <p className="text-xs text-red-500 dark:text-red-400 text-center">
                  Solución: Ejecuta el archivo <code className="bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded">SQL_COPIAR_AQUI.sql</code> en Supabase SQL Editor
                </p>
              </div>
            )}

            {isRoomsLoading ? (
              <div className="flex justify-center py-16">
                <div className="relative">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 dark:border-blue-400"></div>
                  <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border-b-4 border-blue-400 dark:border-blue-600 opacity-20"></div>
                </div>
              </div>
            ) : rooms.length === 0 ? (
              <div className="text-center py-16 text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
                Aún no hay salas creadas. ¡Crea la primera!
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {rooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => handleRoomCardClick(room)}
                    className="text-left p-5 rounded-2xl border-2 border-transparent bg-white/80 dark:bg-gray-800/80 hover:border-blue-500 dark:hover:border-blue-400 hover:-translate-y-1 transition-all shadow-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white break-words">{room.name}</h3>
                      <span
                        className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${room.is_locked
                          ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300'
                          : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-300'
                          }`}
                      >
                        {room.is_locked ? <Lock size={14} /> : <Unlock size={14} />}
                        {room.is_locked ? 'Privada' : 'Pública'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      Creada el{' '}
                      {new Date(room.created_at).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                    {room.code === lastRoomCode && (
                      <p className="text-xs font-semibold text-blue-600 dark:text-blue-300 uppercase tracking-widest">
                        Mi última sala
                      </p>
                    )}
                    <div className="mt-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
                      <span className="font-semibold">Entrar a la sala</span>
                      <Plus size={16} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white/80 dark:bg-gray-900/70 backdrop-blur rounded-3xl shadow-2xl border border-white/40 dark:border-gray-800 p-6 md:p-8 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Crear una sala nueva</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Puedes protegerla con un código opcional.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <input
                type="text"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="Nombre de la sala"
                className="px-4 py-3 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 outline-none transition-all"
              />
              <input
                type="text"
                value={newRoomAccessCode}
                onChange={(e) => setNewRoomAccessCode(e.target.value)}
                placeholder="Código opcional"
                className="px-4 py-3 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-900 outline-none transition-all"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Deja el campo de código vacío para crear una sala pública.
            </p>
            {roomActionMessage && (
              <p className="text-sm text-center text-blue-600 dark:text-blue-300">{roomActionMessage}</p>
            )}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleCreateRoom}
                disabled={isRoomActionLoading}
                className="flex-1 min-w-[200px] px-4 py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Crear sala
              </button>
              <button
                onClick={() => {
                  setNewRoomName('');
                  setNewRoomAccessCode('');
                  setRoomActionMessage(null);
                }}
                className="px-4 py-3 rounded-2xl border-2 border-gray-300 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Limpiar formulario
              </button>
            </div>
          </div>
        </div>

        {showAccessPrompt && roomPendingAccess && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-blue-200 dark:border-blue-900 p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-blue-500 dark:text-blue-300">Sala privada</p>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {roomPendingAccess?.name}
                  </h3>
                </div>
                <button
                  onClick={handleCloseAccessPrompt}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <X size={20} className="text-gray-500 dark:text-gray-400" />
                </button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Ingresa el código de acceso para entrar a la sala.
              </p>
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <Lock size={20} className="text-gray-600 dark:text-gray-300" />
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400">Código requerido</p>
                  <p className="text-sm text-gray-800 dark:text-gray-200">
                    Introduce el código compartido por la persona que creó la sala.
                  </p>
                </div>
              </div>
              <input
                type="password"
                value={accessCodeInput}
                onChange={(e) => setAccessCodeInput(e.target.value)}
                placeholder="Código de acceso"
                className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 outline-none transition-all"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleVerifyAccessCode();
                  }
                }}
              />
              {accessError && (
                <p className="text-sm text-red-600 dark:text-red-400 text-center">{accessError}</p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={handleVerifyAccessCode}
                  disabled={isRoomActionLoading}
                  className="flex-1 px-4 py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-60"
                >
                  Entrar
                </button>
                <button
                  onClick={handleCloseAccessPrompt}
                  className="flex-1 px-4 py-3 rounded-2xl border-2 border-gray-300 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 transition-all duration-300">
      <div className="h-screen flex flex-col">
        <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-b-2 border-gray-200 dark:border-gray-700 px-6 py-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400 px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-700">
                {new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </div>
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-600"></div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                Reminder
              </h1>
              <div className="hidden sm:block w-px h-6 bg-gray-300 dark:bg-gray-600"></div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/70 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700">
                  {roomInfo?.is_locked ? (
                    <Lock size={18} className="text-red-500" />
                  ) : (
                    <Unlock size={18} className="text-green-500" />
                  )}
                  <div className="text-left">
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Sala actual</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {roomInfo?.name ?? 'Sala seleccionada'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleLeaveRoom(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <DoorOpen size={18} />
                  Cambiar sala
                </button>
                {roomCode && (
                  <button
                    onClick={() => navigator.clipboard?.writeText(roomCode)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 text-xs font-mono uppercase tracking-widest text-gray-600 dark:text-gray-300 hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
                    title="Copiar código de sala"
                  >
                    <Copy size={16} />
                    {roomCode}
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowStats(!showStats)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                title="Estadísticas"
              >
                <BarChart3 size={20} className="text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
              </button>

              <button
                onClick={() => setShowExpiredPanel(!showExpiredPanel)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                title={showExpiredPanel ? 'Ocultar panel' : 'Mostrar panel'}
              >
                {showExpiredPanel ? (
                  <Minimize2 size={20} className="text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                ) : (
                  <Maximize2 size={20} className="text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                )}
              </button>

              <button
                onClick={() => setIsDark(!isDark)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Cambiar tema"
              >
                {isDark ? (
                  <Sun size={20} className="text-yellow-500" />
                ) : (
                  <Moon size={20} className="text-gray-700" />
                )}
              </button>

              <button
                onClick={() => setShowSettingsModal(true)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                title="Configuración (Ctrl+,)"
              >
                <Settings size={20} className="text-gray-700 dark:text-gray-300 group-hover:rotate-90 transition-transform duration-300" />
              </button>
              <button
                onClick={signOut}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                title="Cerrar sesión"
              >
                <LogOut size={20} className="text-gray-700 dark:text-gray-300 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors" />
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <div className={`flex-1 overflow-hidden flex flex-col ${showExpiredPanel ? '' : 'mr-0'}`}>
            <div className="p-6 space-y-4">
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setIsAddingNew(true);
                    setTimeout(() => {
                      const input = document.querySelector('input[placeholder="Título"]') as HTMLInputElement;
                      if (input) {
                        input.focus();
                      }
                    }, 100);
                  }}
                  className="w-16 h-16 rounded-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-2 border-dashed border-gray-300 dark:border-gray-600
                    hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20
                    hover:scale-105 flex items-center justify-center transition-all duration-200 group cursor-pointer shadow-lg"
                  title="Nuevo recordatorio (Ctrl+N)"
                >
                  <Plus size={28} className="text-gray-400 dark:text-gray-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors" />
                </button>

                <div className="flex-1">
                  <SearchBar
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    filterBy={filterBy}
                    onFilterChange={setFilterBy}
                    sortBy={sortBy}
                    onSortChange={setSortBy}
                    sortOrder={sortOrder}
                    onSortOrderChange={setSortOrder}
                    priorityFilter={priorityFilter}
                    onPriorityFilterChange={setPriorityFilter}
                    assignedToFilter={assignedToFilter}
                    onAssignedToFilterChange={setAssignedToFilter}
                    availableAssignees={availableAssignees}
                  />
                </div>
              </div>

              {showStats && (
                <div className="animate-slideDown">
                  <StatsPanel reminders={reminders} />
                </div>
              )}
            </div>

            {isAddingNew && (
              <div className="px-6 pb-4 animate-scaleIn">
                <div className="w-72 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-2xl p-5 border-2 border-blue-500 dark:border-blue-400">
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Título"
                    className="w-full text-lg font-bold mb-2 px-3 py-2 border-2 border-blue-500 dark:border-blue-400 rounded-lg
                      focus:outline-none focus:border-blue-600 dark:focus:border-blue-300 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900
                      bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-all"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newTitle.trim()) {
                        handleAddReminder();
                      }
                      if (e.key === 'Escape') {
                        setIsAddingNew(false);
                        setNewTitle('');
                        setNewDescription('');
                        setNewDueDate('');
                      }
                    }}
                  />
                  <textarea
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Descripción"
                    className="w-full mb-2 px-3 py-2 border-2 border-blue-500 dark:border-blue-400 rounded-lg
                      focus:outline-none focus:border-blue-600 dark:focus:border-blue-300 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900
                      resize-none min-h-[80px]
                      bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-all"
                  />
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full mb-2 px-3 py-2 border-2 border-blue-500 dark:border-blue-400 rounded-lg
                      focus:outline-none focus:border-blue-600 dark:focus:border-blue-300 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900
                      bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-all"
                  />
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Prioridad</label>
                      <select
                        value={newPriority}
                        onChange={(e) => setNewPriority(e.target.value as Priority)}
                        className="w-full px-3 py-2 border-2 border-blue-500 dark:border-blue-400 rounded-lg
                          focus:outline-none focus:border-blue-600 dark:focus:border-blue-300
                          bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                      >
                        <option value="low">Baja</option>
                        <option value="medium">Media</option>
                        <option value="high">Alta</option>
                        <option value="urgent">Urgente</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Asignado a</label>
                      <input
                        type="text"
                        value={newAssignedTo}
                        onChange={(e) => setNewAssignedTo(e.target.value)}
                        placeholder="Responsable"
                        className="w-full px-3 py-2 border-2 border-blue-500 dark:border-blue-400 rounded-lg
                          focus:outline-none focus:border-blue-600 dark:focus:border-blue-300
                          bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddReminder}
                      disabled={!newTitle.trim()}
                      className="flex-1 px-3 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg
                        hover:from-green-600 hover:to-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed
                        text-sm font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      Agregar
                    </button>
                    <button
                      onClick={() => {
                        setIsAddingNew(false);
                        setNewTitle('');
                        setNewDescription('');
                        setNewDueDate('');
                        setNewPriority('medium');
                        setNewAssignedTo('');
                      }}
                      className="flex-1 px-3 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg
                        hover:from-gray-600 hover:to-gray-700 transition-all text-sm font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {isLoading ? (
              <div className="flex-1 flex justify-center items-center">
                <div className="relative">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 dark:border-blue-400"></div>
                  <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border-b-4 border-blue-400 dark:border-blue-600 opacity-20"></div>
                </div>
              </div>
            ) : activeReminders.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center animate-fadeIn">
                  <Plus size={64} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                  <p className="text-xl font-medium text-gray-500 dark:text-gray-400">No hay recordatorios activos</p>
                  <p className="text-gray-400 dark:text-gray-500 mt-2">Presiona Ctrl+N para crear uno</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-x-auto overflow-y-hidden px-6 pb-6">
                <div className="flex flex-wrap gap-4 content-start animate-fadeIn">
                  {activeReminders.map((reminder, index) => (
                    <div key={reminder.id} style={{ animationDelay: `${index * 0.05}s` }} className="animate-scaleIn">
                      <ReminderCard
                        reminder={reminder}
                        onUpdate={handleUpdateReminder}
                        onDelete={handleDeleteReminder}
                        onOpenDetails={setExpandedReminder}
                        onUpdateProgress={handleUpdateProgress}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {showExpiredPanel && (
            <div className="animate-slideDown">
              <ExpiredPanel
                expiredReminders={expiredReminders}
                onUpdate={handleUpdateReminder}
                onDelete={handleDeleteReminder}
                onUpdateProgress={handleUpdateProgress}
                onOpenDetails={setExpandedReminder}
              />
            </div>
          )}
        </div>
      </div>

      {expandedReminder && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <ReminderCard
            reminder={expandedReminder}
            onUpdate={handleUpdateReminder}
            onDelete={handleDeleteReminder}
            isExpanded
            onCloseDetails={handleCloseExpandedReminder}
            onUpdateProgress={handleUpdateProgress}
            isExpired={
              !!expandedReminder.due_date && new Date(expandedReminder.due_date) < new Date()
            }
          />
        </div>
      )}

      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        isDark={isDark}
        onToggleDark={() => setIsDark(!isDark)}
        onClearAll={handleClearAll}
        onExport={handleExport}
        onImport={handleImport}
      />
    </div>
  );
}

