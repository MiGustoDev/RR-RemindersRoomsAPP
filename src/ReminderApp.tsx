import { useState, useEffect } from 'react';
import { Plus, Moon, Sun, Settings, Minimize2, Maximize2, BarChart3, Users, Copy, X, Lock, Unlock, DoorOpen, LogOut, Calendar, Grid, Loader2 } from 'lucide-react';
import { supabase, type Reminder, type Room, type Priority } from './lib/supabase';
import { ReminderCard } from './components/ReminderCard';
import { ExpiredPanel } from './components/ExpiredPanel';
import { SettingsModal } from './components/SettingsModal';
import { SearchBar } from './components/SearchBar';
import { StatsPanel } from './components/StatsPanel';
import { PersonSelector } from './components/PersonSelector';
import { PeopleManager } from './components/PeopleManager';
import { TagSelector } from './components/TagSelector';
import { CalendarView } from './components/CalendarView';
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
  const [newAssignedTo, setNewAssignedTo] = useState<string | null>(null);
  const [newTags, setNewTags] = useState<string[]>([]);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [roomInfo, setRoomInfo] = useState<Room | null>(null);
  const [isDark, setIsDark] = useDarkMode();
  const [showExpiredPanel, setShowExpiredPanel] = useState(true);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showPeopleManager, setShowPeopleManager] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'calendar'>('cards');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState<'all' | 'active' | 'expired' | 'today' | 'week'>('all');
  const [sortBy, setSortBy] = useState<'created' | 'due_date' | 'title' | 'priority'>('created');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');
  const [assignedToFilter, setAssignedToFilter] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('');
  const [availableTags, setAvailableTags] = useState<Array<{ id: string; name: string; color: string }>>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isRoomsLoading, setIsRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState<string | null>(null);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomAccessCode, setNewRoomAccessCode] = useState('');
  const [roomActionMessage, setRoomActionMessage] = useState<string | null>(null);
  const [copyConfirmMessage, setCopyConfirmMessage] = useState<string | null>(null);
  const [isRoomActionLoading, setIsRoomActionLoading] = useState(false);
  const [roomPendingAccess, setRoomPendingAccess] = useState<Room | null>(null);
  const [accessCodeInput, setAccessCodeInput] = useState('');
  const [showAccessPrompt, setShowAccessPrompt] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [lastRoomCode, setLastRoomCode] = useState<string | null>(null);
  const [expandedReminder, setExpandedReminder] = useState<Reminder | null>(null);
  const [showPrivacyChangePrompt, setShowPrivacyChangePrompt] = useState(false);
  const [roomPendingPrivacyChange, setRoomPendingPrivacyChange] = useState<Room | null>(null);
  const [privacyAccessCodeInput, setPrivacyAccessCodeInput] = useState('');
  const [privacyAccessError, setPrivacyAccessError] = useState<string | null>(null);
  const [showMakePublicPrompt, setShowMakePublicPrompt] = useState(false);
  const [roomPendingMakePublic, setRoomPendingMakePublic] = useState<Room | null>(null);
  const [makePublicCodeInput, setMakePublicCodeInput] = useState('');
  const [makePublicError, setMakePublicError] = useState<string | null>(null);
  const [showDeleteRoomPrompt, setShowDeleteRoomPrompt] = useState(false);
  const [roomPendingDelete, setRoomPendingDelete] = useState<Room | null>(null);
  const [deleteRoomCodeInput, setDeleteRoomCodeInput] = useState('');
  const [deleteRoomError, setDeleteRoomError] = useState<string | null>(null);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [roomCodeError, setRoomCodeError] = useState<string | null>(null);

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

  // Debug: Ver cuando cambia el estado del modal
  useEffect(() => {
    console.log('🔍 Estado del modal de privacidad:', {
      showPrivacyChangePrompt,
      roomPendingPrivacyChange: roomPendingPrivacyChange?.name,
      roomCode
    });
  }, [showPrivacyChangePrompt, roomPendingPrivacyChange, roomCode]);

  const fetchAvailableTags = async (targetRoomCode: string) => {
    try {
      const { data, error } = await supabase
        .from('reminder_tags')
        .select('id, name, color')
        .eq('room_code', targetRoomCode)
        .order('name', { ascending: true });

      if (error) {
        // Si no existe la tabla, simplemente no cargar tags
        // No mostrar error en consola para evitar ruido
        setAvailableTags([]);
        return;
      }
      setAvailableTags(data || []);
    } catch (err) {
      // Si no existe la tabla, simplemente no cargar tags
      // Silenciar el error para evitar problemas de renderizado
      setAvailableTags([]);
    }
  };

  useEffect(() => {
    if (!roomCode) return;

    localStorage.setItem(ROOM_STORAGE_KEY, roomCode);
    fetchRoomInfo(roomCode);
    fetchReminders(roomCode);
    fetchAvailableTags(roomCode);

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
                        setNewAssignedTo(null);
                        setNewTags([]);
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
      // Verificar que el usuario esté autenticado
      if (!user) {
        setRooms([]);
        setRoomsError('Debes iniciar sesión para ver las salas');
        return;
      }

      // Obtener el usuario actual de Supabase para asegurar que tenemos el ID
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        setRooms([]);
        setRoomsError('No se pudo obtener la información del usuario.');
        return;
      }

      // Obtener salas creadas por el usuario, salas donde es miembro
      // y salas a las que fue invitado por correo
      // 1) Salas creadas por el usuario
      const { data: ownedRooms, error: ownedError } = await supabase
        .from('rooms')
        .select('id, name, code, created_at, is_locked, user_id')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (ownedError && ownedError.code !== 'PGRST116' && ownedError.code !== '42P01') {
        throw ownedError;
      }

      // 2) Salas donde el usuario es miembro (room_members)
      const { data: memberRooms, error: memberError } = await supabase
        .from('room_members')
        .select(`
          room_id,
          rooms!inner(id, name, code, created_at, is_locked, user_id)
        `)
        .eq('user_id', currentUser.id);

      if (memberError && memberError.code !== 'PGRST116' && memberError.code !== '42P01') {
        // Si la tabla room_members no existe, solo usar las salas propias
        console.warn('Tabla room_members no encontrada. Ejecuta la migración 003_add_room_members.sql');
      }

      // 3) Salas donde el correo del usuario fue invitado (room_invitations)
      let invitedRooms: any[] | null = null;
      let invitedError: any = null;

      if (currentUser.email) {
        const { data, error } = await supabase
          .from('room_invitations')
          .select(`
            room_id,
            rooms!inner(id, name, code, created_at, is_locked, user_id)
          `)
          .eq('email', currentUser.email.toLowerCase());

        invitedRooms = data || null;
        invitedError = error;

        if (invitedError && invitedError.code !== 'PGRST116' && invitedError.code !== '42P01') {
          console.warn('Error al obtener invitaciones de salas:', invitedError);
        }
      }

      // Combinar ambas listas, evitando duplicados
      const ownedRoomsList = ownedRooms || [];
      const memberRoomsList = (memberRooms || []).map((member: any) => member.rooms).filter(Boolean);
      const invitedRoomsList = (invitedRooms || []).map((invited: any) => invited.rooms).filter(Boolean);
      
      // Crear un Set con los IDs de salas ya incluidas para evitar duplicados
      const roomIds = new Set(ownedRoomsList.map((r: any) => r.id));
      const allRooms = [...ownedRoomsList];
      
      // Agregar salas donde es miembro que no sean propias
      memberRoomsList.forEach((room: any) => {
        if (!roomIds.has(room.id)) {
          allRooms.push(room);
          roomIds.add(room.id);
        }
      });

      // Agregar salas donde fue invitado por correo que aún no estén
      invitedRoomsList.forEach((room: any) => {
        if (!roomIds.has(room.id)) {
          allRooms.push(room);
          roomIds.add(room.id);
        }
      });

      // Ordenar por fecha de creación (más recientes primero)
      allRooms.sort((a: any, b: any) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA;
      });

      const data = allRooms;
      const error = ownedError || memberError || invitedError;

      if (error) {
        // Error específico para columna faltante
        if (error.code === '42703') {
          if (error.message?.includes('user_id')) {
            setRoomsError('Error de base de datos: Falta la columna "user_id". Ejecuta la migración SQL en Supabase.');
          } else {
            setRoomsError('Error de base de datos. Verifica la estructura de la tabla rooms.');
          }
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
        setRooms(data || []);
        setRoomsError(null);
      }
    } catch (error: any) {
      // Mostrar el error real
      if (error.message?.includes('Variables de entorno')) {
        setRoomsError('Variables de entorno no configuradas. Crea un archivo .env con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY');
      } else if (error.code === 'PGRST116' || error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        setRoomsError('La tabla "rooms" no existe. Ejecuta SQL_COPIAR_AQUI.sql en Supabase SQL Editor.');
      } else if (error.code === 'PGRST301' || error.code === '42501' || error.message?.includes('permission') || error.message?.includes('RLS')) {
        setRoomsError('Error de permisos. Verifica las políticas RLS en Supabase.');
      } else {
        setRoomsError('No pudimos cargar las salas. Intenta nuevamente.');
      }
    } finally {
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
      // Buscar la sala por código sin filtrar por user_id (puede ser de cualquier usuario)
      const { data, error } = await supabase
        .from('rooms')
        .select('id, name, code, created_at, is_locked, user_id')
        .eq('code', code)
        .single();

      if (error) {
        console.error('Error al obtener la sala:', error);
        setRoomInfo(null);
        return;
      }
      setRoomInfo(data);
    } catch (error) {
      console.error('Error al obtener la sala:', error);
      setRoomInfo(null);
    }
  };

  const enterRoom = (room: Room) => {
    // Primero limpiar todos los estados relacionados con el lobby
    setRoomCodeInput('');
    setRoomCodeError(null);
    setIsRoomActionLoading(false);
    
    // Luego cambiar la vista (esto causa el re-render)
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
            user_id: user?.id || null,
          }])
          .select('id, name, code, created_at, is_locked, user_id')
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
        .select('id, name, code, created_at, is_locked, access_code, user_id')
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
          user_id: data.user_id || null,
        };

        // Agregar al usuario como miembro de la sala (si no es el creador)
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser && data.user_id !== currentUser.id) {
          try {
            // Intentar agregar como miembro (ignorar error si ya es miembro)
            await supabase
              .from('room_members')
              .insert({
                user_id: currentUser.id,
                room_id: data.id,
              })
              .select()
              .single();
          } catch (memberError: any) {
            // Si ya es miembro o la tabla no existe, continuar sin error
            if (memberError.code !== '23505' && memberError.code !== 'PGRST116' && memberError.code !== '42P01') {
              console.warn('No se pudo agregar como miembro de la sala:', memberError);
            }
          }
        }

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

  const handleToggleRoomPrivacy = async (room: Room, e?: React.MouseEvent) => {
    // Prevenir que el click se propague al botón de la tarjeta
    if (e) {
      e.stopPropagation();
    }

    console.log('🔒 handleToggleRoomPrivacy llamado', {
      roomCode,
      roomCodeMatch: room.code,
      user: user?.id,
      roomUserId: room.user_id,
      isLocked: room.is_locked,
      codesMatch: roomCode === room.code
    });

    // IMPORTANTE: Solo permitir cambiar privacidad desde dentro de la sala
    // Verificamos que estemos en una sala (roomCode existe) y que sea la misma sala
    if (!roomCode) {
      console.warn('❌ No hay roomCode');
      setRoomActionMessage('Debes estar dentro de una sala para cambiar su privacidad.');
      return;
    }

    if (roomCode !== room.code) {
      console.warn('❌ Los códigos no coinciden', { roomCode, roomCodeMatch: room.code });
      setRoomActionMessage('Solo puedes cambiar la privacidad desde dentro de la sala.');
      return;
    }

    if (!user) {
      console.warn('❌ No hay usuario');
      setRoomActionMessage('Debes iniciar sesión para cambiar la privacidad de la sala.');
      return;
    }

    // Verificar que el usuario sea el creador de la sala
    if (room.user_id !== user.id) {
      console.warn('❌ El usuario no es el creador', { roomUserId: room.user_id, userId: user.id });
      setRoomActionMessage('Solo el creador de la sala puede cambiar su privacidad.');
      return;
    }

    // Si está cambiando de pública a privada, SIEMPRE pedir código
    if (!room.is_locked) {
      console.log('✅ Abriendo modal para cambiar a privada');
      setRoomPendingPrivacyChange(room);
      setShowPrivacyChangePrompt(true);
      setPrivacyAccessCodeInput('');
      setPrivacyAccessError(null);
      console.log('✅ Estados actualizados', {
        showPrivacyChangePrompt: true,
        roomPendingPrivacyChange: room.name
      });
      return;
    }

    // Si está cambiando de privada a pública, pedir código de acceso
    if (room.is_locked) {
      console.log('✅ Abriendo modal para cambiar a pública');
      setRoomPendingMakePublic(room);
      setShowMakePublicPrompt(true);
      setMakePublicCodeInput('');
      setMakePublicError(null);
      return;
    }
  };

  const confirmPrivacyChange = async (room: Room, accessCode: string | null) => {
    setIsRoomActionLoading(true);
    setRoomActionMessage(null);
    setPrivacyAccessError(null);

    try {
      const newPrivacyStatus = !room.is_locked;
      const updateData: { is_locked: boolean; access_code?: string | null } = {
        is_locked: newPrivacyStatus,
      };

      // Si se está haciendo privada, SIEMPRE debe tener un código de acceso
      if (newPrivacyStatus) {
        if (!accessCode || !accessCode.trim()) {
          setPrivacyAccessError('El código de acceso es obligatorio para hacer la sala privada.');
          setIsRoomActionLoading(false);
          return;
        }
        updateData.access_code = accessCode.trim();
      } else {
        // Si se está haciendo pública, eliminar el código de acceso
        updateData.access_code = null;
      }

      const { data, error } = await supabase
        .from('rooms')
        .update(updateData)
        .eq('id', room.id)
        .select('id, name, code, created_at, is_locked, user_id')
        .single();

      if (error) {
        console.error('Error al cambiar privacidad:', error);
        setRoomActionMessage('No se pudo cambiar la privacidad de la sala. Intenta nuevamente.');
        setPrivacyAccessError('No se pudo cambiar la privacidad. Intenta nuevamente.');
        return;
      }

      // Actualizar el estado local
      setRooms((prevRooms) =>
        prevRooms.map((r) => (r.id === room.id ? { ...r, is_locked: newPrivacyStatus } : r))
      );

      // Si es la sala actual, actualizar también roomInfo
      if (roomCode === room.code && data) {
        setRoomInfo(data);
      }

      setRoomActionMessage(
        newPrivacyStatus
          ? 'La sala ahora es privada. Los usuarios necesitarán el código de acceso.'
          : 'La sala ahora es pública. Cualquiera puede acceder con el código de la sala.'
      );

      // Cerrar el modal
      setShowPrivacyChangePrompt(false);
      setRoomPendingPrivacyChange(null);
      setPrivacyAccessCodeInput('');

      // Limpiar el mensaje después de 3 segundos
      setTimeout(() => {
        setRoomActionMessage(null);
      }, 3000);
    } catch (err) {
      console.error('Error inesperado al cambiar privacidad:', err);
      setRoomActionMessage('Ocurrió un error inesperado. Intenta nuevamente.');
      setPrivacyAccessError('Ocurrió un error inesperado. Intenta nuevamente.');
    } finally {
      setIsRoomActionLoading(false);
    }
  };

  const handlePrivacyChangeSubmit = async () => {
    if (!roomPendingPrivacyChange) return;

    if (!privacyAccessCodeInput.trim()) {
      setPrivacyAccessError('El código de acceso es obligatorio para hacer la sala privada.');
      return;
    }

    await confirmPrivacyChange(roomPendingPrivacyChange, privacyAccessCodeInput);
  };

  const handleClosePrivacyChangePrompt = () => {
    setShowPrivacyChangePrompt(false);
    setRoomPendingPrivacyChange(null);
    setPrivacyAccessCodeInput('');
    setPrivacyAccessError(null);
  };

  const handleMakePublicSubmit = async () => {
    if (!roomPendingMakePublic) return;

    if (!makePublicCodeInput.trim()) {
      setMakePublicError('El código de acceso es obligatorio.');
      return;
    }

    setIsRoomActionLoading(true);
    setMakePublicError(null);

    try {
      // Verificar el código de acceso
      const { data, error } = await supabase
        .from('rooms')
        .select('id, name, code, created_at, is_locked, access_code, user_id')
        .eq('id', roomPendingMakePublic.id)
        .single();

      if (error) throw error;

      if (data.access_code && data.access_code === makePublicCodeInput.trim()) {
        // Código correcto, cambiar a pública
        await confirmPrivacyChange(roomPendingMakePublic, null);
        setShowMakePublicPrompt(false);
        setRoomPendingMakePublic(null);
        setMakePublicCodeInput('');
      } else {
        setMakePublicError('Código incorrecto. Verifica el código de acceso de la sala.');
      }
    } catch (err) {
      console.error('Error verificando código:', err);
      setMakePublicError('No pudimos verificar el código. Intenta nuevamente.');
    } finally {
      setIsRoomActionLoading(false);
    }
  };

  const handleCloseMakePublicPrompt = () => {
    setShowMakePublicPrompt(false);
    setRoomPendingMakePublic(null);
    setMakePublicCodeInput('');
    setMakePublicError(null);
  };

  const handleDeleteRoom = async (room: Room) => {
    // IMPORTANTE: Solo permitir eliminar desde dentro de la sala
    if (!roomCode || roomCode !== room.code) {
      setRoomActionMessage('Solo puedes eliminar la sala desde dentro de ella.');
      return;
    }

    if (!user) {
      setRoomActionMessage('Debes iniciar sesión para eliminar la sala.');
      return;
    }

    // Verificar que el usuario sea el creador de la sala
    if (room.user_id !== user.id) {
      setRoomActionMessage('Solo el creador de la sala puede eliminarla.');
      return;
    }

    // Siempre mostrar el modal, pero solo pedir código si es privada
    setRoomPendingDelete(room);
    setShowDeleteRoomPrompt(true);
    setDeleteRoomCodeInput('');
    setDeleteRoomError(null);
  };

  const confirmDeleteRoom = async (room: Room, accessCode: string | null) => {
    setIsRoomActionLoading(true);
    setDeleteRoomError(null);

    try {
      // Si la sala es privada, verificar el código
      if (room.is_locked && accessCode) {
        const { data, error } = await supabase
          .from('rooms')
          .select('id, name, code, created_at, is_locked, access_code, user_id')
          .eq('id', room.id)
          .single();

        if (error) throw error;

        if (!data.access_code || data.access_code !== accessCode.trim()) {
          setDeleteRoomError('Código incorrecto. Verifica el código de acceso de la sala.');
          setIsRoomActionLoading(false);
          return;
        }
      }

      // Eliminar la sala (esto debería eliminar en cascada los recordatorios si está configurado en la BD)
      const { error } = await supabase
        .from('rooms')
        .delete()
        .eq('id', room.id);

      if (error) {
        console.error('Error al eliminar sala:', error);
        setDeleteRoomError('No se pudo eliminar la sala. Intenta nuevamente.');
        setIsRoomActionLoading(false);
        return;
      }

      // Si es la sala actual, salir de ella
      if (roomCode === room.code) {
        handleLeaveRoom(true);
      }

      // Actualizar la lista de salas
      await fetchRooms(false);

      setRoomActionMessage('Sala eliminada correctamente.');
      setShowDeleteRoomPrompt(false);
      setRoomPendingDelete(null);
      setDeleteRoomCodeInput('');

      // Limpiar el mensaje después de 3 segundos
      setTimeout(() => {
        setRoomActionMessage(null);
      }, 3000);
    } catch (err) {
      console.error('Error inesperado al eliminar sala:', err);
      setDeleteRoomError('Ocurrió un error inesperado. Intenta nuevamente.');
    } finally {
      setIsRoomActionLoading(false);
    }
  };

  const handleDeleteRoomSubmit = async () => {
    if (!roomPendingDelete) return;

    // Si la sala es privada, verificar que se haya ingresado el código
    if (roomPendingDelete.is_locked) {
      if (!deleteRoomCodeInput.trim()) {
        setDeleteRoomError('El código de acceso es obligatorio para eliminar una sala privada.');
        return;
      }
    }

    // Confirmar antes de eliminar
    if (window.confirm(`¿Estás seguro de eliminar la sala "${roomPendingDelete.name}"? Esta acción eliminará todos los recordatorios de la sala y no se puede deshacer.`)) {
      await confirmDeleteRoom(roomPendingDelete, roomPendingDelete.is_locked ? deleteRoomCodeInput : null);
    }
  };

  const handleCloseDeleteRoomPrompt = () => {
    setShowDeleteRoomPrompt(false);
    setRoomPendingDelete(null);
    setDeleteRoomCodeInput('');
    setDeleteRoomError(null);
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

  const handleEnterRoomByCode = async () => {
    if (!roomCodeInput.trim()) {
      setRoomCodeError('Ingresa el código de la sala.');
      return;
    }

    setIsRoomActionLoading(true);
    setRoomCodeError(null);

    try {
      // Buscar la sala por código (sin filtrar por user_id, puede ser de cualquier usuario)
      const { data, error } = await supabase
        .from('rooms')
        .select('id, name, code, created_at, is_locked, access_code, user_id')
        .eq('code', roomCodeInput.trim().toUpperCase())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setRoomCodeError('No se encontró una sala con ese código.');
        } else {
          throw error;
        }
        setIsRoomActionLoading(false);
        return;
      }

      // Si la sala es privada, pedir el código de acceso
      if (data.is_locked) {
        setRoomPendingAccess({
          id: data.id,
          name: data.name,
          code: data.code,
          created_at: data.created_at,
          is_locked: data.is_locked,
          user_id: data.user_id || null,
        });
        setAccessCodeInput('');
        setShowAccessPrompt(true);
        setAccessError(null);
        setRoomCodeInput('');
        setIsRoomActionLoading(false);
        return;
      }

      // Si es pública, agregar al usuario como miembro y entrar
      const sanitizedRoom: Room = {
        id: data.id,
        name: data.name,
        code: data.code,
        created_at: data.created_at,
        is_locked: data.is_locked,
        user_id: data.user_id || null,
      };

      // Agregar al usuario como miembro de la sala (si no es el creador)
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser && data.user_id !== currentUser.id) {
        try {
          // Intentar agregar como miembro (ignorar error si ya es miembro)
          await supabase
            .from('room_members')
            .insert({
              user_id: currentUser.id,
              room_id: data.id,
            })
            .select()
            .single();
        } catch (memberError: any) {
          // Si ya es miembro o la tabla no existe, continuar sin error
          if (memberError.code !== '23505' && memberError.code !== 'PGRST116' && memberError.code !== '42P01') {
            console.warn('No se pudo agregar como miembro de la sala:', memberError);
          }
        }
      }
      
      // Limpiar el input y errores primero
      const roomToEnter = sanitizedRoom;
      setRoomCodeInput('');
      setRoomCodeError(null);
      
      // Limpiar el loading ANTES de cambiar de vista
      setIsRoomActionLoading(false);
      
      // Usar requestIdleCallback o setTimeout para asegurar que React termine de renderizar
      // antes de cambiar de vista, evitando el error de insertBefore
      if (window.requestIdleCallback) {
        requestIdleCallback(() => {
          enterRoom(roomToEnter);
        }, { timeout: 100 });
      } else {
        setTimeout(() => {
          enterRoom(roomToEnter);
        }, 100);
      }
    } catch (error) {
      console.error('Error al entrar a la sala:', error);
      setRoomCodeError('No se pudo acceder a la sala. Verifica el código e intenta nuevamente.');
      setIsRoomActionLoading(false);
    }
  };

  const handleResumeLastRoom = async () => {
    if (!lastRoomCode) return;

    const cachedRoom = rooms.find((room) => room.code === lastRoomCode);
    if (cachedRoom) {
      handleRoomCardClick(cachedRoom);
      return;
    }

    try {
      // Obtener el usuario actual para verificar que la sala le pertenece
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        throw new Error('Usuario no autenticado');
      }

      const { data, error } = await supabase
        .from('rooms')
        .select('id, name, code, created_at, is_locked, user_id')
        .eq('code', lastRoomCode)
        .eq('user_id', currentUser.id)
        .single();

      if (error) throw error;
      handleRoomCardClick(data);
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

      // Cargar etiquetas para cada recordatorio (con manejo de errores robusto)
      // Usar Promise.allSettled para que un error en un recordatorio no rompa todos
      const remindersWithTags = await Promise.allSettled(
        (data || []).map(async (reminder: any) => {
          let tags: any[] = [];
          try {
            const { data: tagAssignments, error: tagError } = await supabase
              .from('reminder_tag_assignments')
              .select('tag_id')
              .eq('reminder_id', reminder.id);

            // Si hay error o no hay asignaciones, continuar sin tags
            if (!tagError && tagAssignments && tagAssignments.length > 0) {
              const tagIds = tagAssignments.map(ta => ta.tag_id);
              const { data: tagsData, error: tagsError } = await supabase
                .from('reminder_tags')
                .select('*')
                .in('id', tagIds);
              
              if (!tagsError && tagsData) {
                tags = tagsData;
              }
            }
          } catch (err) {
            // Si no existen las tablas de tags, simplemente no cargar tags
            // Silenciar el error
          }

          return {
            ...reminder,
            priority: reminder.priority || 'medium',
            assigned_to: reminder.assigned_to || null,
            progress: reminder.progress ?? 0,
            tags: tags,
          };
        })
      );

      // Extraer los valores exitosos y manejar los rechazados
      const successfulReminders = remindersWithTags
        .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
        .map(result => result.value);
      
      // Si hay algunos que fallaron, al menos mostrar los que funcionaron
      if (successfulReminders.length === 0 && (data || []).length > 0) {
        // Si todos fallaron, usar los datos sin tags
        const normalizedReminders = (data || []).map((reminder: any) => ({
          ...reminder,
          priority: reminder.priority || 'medium',
          assigned_to: reminder.assigned_to || null,
          progress: reminder.progress ?? 0,
          tags: [],
        }));
        setReminders(normalizedReminders);
        return;
      }

      setReminders(successfulReminders);
    } catch (error) {
      console.error('Error fetching reminders:', error);
      // Asegurar que siempre se establezcan los recordatorios, incluso si hay error
      setReminders([]);
    } finally {
      if (toggleLoading) {
        setIsLoading(false);
      }
    }
  };

  const handleAddReminder = async () => {
    if (!newTitle.trim() || !roomCode) return;

    try {
      // Crear objeto de inserción básico primero
      const insertData: any = {
        title: newTitle.trim(),
        description: newDescription.trim() || '',
        due_date: newDueDate || null,
        room_code: roomCode,
        progress: 0,
      };

      // Intentar agregar priority solo si la columna existe
      // Si no existe, se intentará sin ella y luego se actualizará
      try {
        insertData.priority = newPriority || 'medium';
      } catch (e) {
        console.warn('No se pudo agregar priority:', e);
      }

      // Intentar insertar primero
      let { data, error } = await supabase
        .from('reminders')
        .insert([insertData])
        .select()
        .single();

      // Si hay error relacionado con priority, intentar sin ella
      if (error && error.message && error.message.includes('priority')) {
        console.warn('La columna priority no existe, intentando sin ella...');
        delete insertData.priority;
        const retryResult = await supabase
          .from('reminders')
          .insert([insertData])
          .select()
          .single();
        data = retryResult.data;
        error = retryResult.error;
      }

      // Si hay error, lanzarlo
      if (error) {
        console.error('Error de Supabase al crear:', error);
        console.error('Datos que se intentaron insertar:', insertData);
        throw error;
      }

      // Si la inserción fue exitosa, intentar actualizar priority y assigned_to si es necesario
      if (data) {
        const updates: any = {};
        let needsUpdate = false;

        // Intentar actualizar priority si no se pudo insertar
        if (insertData.priority && (!data.priority || data.priority !== insertData.priority)) {
          updates.priority = insertData.priority;
          needsUpdate = true;
        }

        // Intentar actualizar assigned_to si hay uno
        if (newAssignedTo && (!data.assigned_to || data.assigned_to !== newAssignedTo)) {
          updates.assigned_to = newAssignedTo;
          needsUpdate = true;
        }

        // Si hay actualizaciones pendientes, intentarlas
        if (needsUpdate) {
          try {
            const { error: updateError } = await supabase
              .from('reminders')
              .update(updates)
              .eq('id', data.id);

            if (updateError) {
              // Si la columna no existe, simplemente continuar sin ella
              if (updateError.message && (
                updateError.message.includes('priority') || 
                updateError.message.includes('assigned_to')
              )) {
                console.warn('Algunas columnas no existen en la base de datos:', updateError.message);
              } else {
                console.warn('No se pudieron aplicar las actualizaciones:', updateError);
              }
            } else {
              // Recargar el recordatorio con las actualizaciones
              const { data: updatedData } = await supabase
                .from('reminders')
                .select('*')
                .eq('id', data.id)
                .single();
              if (updatedData) {
                data = updatedData;
              }
            }
          } catch (updateErr: any) {
            console.warn('Error al actualizar campos adicionales:', updateErr);
            // No es crítico, el recordatorio ya se creó
          }
        }

        // Normalizar los datos del recordatorio
        const normalizedData = {
          ...data,
          priority: data.priority || 'medium',
          assigned_to: data.assigned_to || null,
          progress: data.progress ?? 0,
          tags: [],
        };

        // Asignar etiquetas si hay alguna seleccionada
        if (newTags.length > 0 && roomCode) {
          try {
            const tagAssignments = newTags.map(tagId => ({
              reminder_id: data.id,
              tag_id: tagId,
            }));

            await supabase
              .from('reminder_tag_assignments')
              .insert(tagAssignments);

            // Cargar las etiquetas para mostrarlas
            const { data: tags } = await supabase
              .from('reminder_tags')
              .select('*')
              .in('id', newTags);

            normalizedData.tags = tags || [];
          } catch (err) {
            console.warn('No se pudieron asignar las etiquetas:', err);
          }
        }

        setReminders([normalizedData, ...reminders]);
        setNewTitle('');
        setNewDescription('');
        setNewDueDate('');
        setNewPriority('medium');
        setNewAssignedTo(null);
        setNewTags([]);
        setIsAddingNew(false);
      }
    } catch (error: any) {
      console.error('Error adding reminder:', error);
      const errorMessage = error?.message || 'Error desconocido';
      const errorDetails = error?.details || '';
      const errorHint = error?.hint || '';
      
      alert(`Error al crear el recordatorio:\n\n${errorMessage}${errorDetails ? `\n\nDetalles: ${errorDetails}` : ''}${errorHint ? `\n\nSugerencia: ${errorHint}` : ''}\n\nVerifica que la base de datos tenga todas las columnas necesarias.`);
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

      // Filtro por etiquetas
      if (selectedTagFilter) {
        const hasTag = reminder.tags?.some(tag => tag.id === selectedTagFilter);
        if (!hasTag) return false;
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 transition-all duration-300 flex flex-col">
        {/* Toast de confirmación de copia */}
        {copyConfirmMessage && (
          <div className="fixed top-4 right-4 z-[10000] animate-slideDown">
            <div className="bg-green-500 dark:bg-green-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-green-400 dark:border-green-500">
              <div className="flex-shrink-0">
                {copyConfirmMessage.startsWith('✓') ? (
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                    <span className="text-lg">✓</span>
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
                    <span className="text-lg">✗</span>
                  </div>
                )}
              </div>
              <p className="font-semibold text-sm">{copyConfirmMessage}</p>
            </div>
          </div>
        )}
        {/* Header con Logo y Logout - Full Width */}
        <div className="flex justify-between items-center px-6 py-6">
          <img
            src="/Logo Mi Gusto 2025.png"
            alt="Logo Mi Gusto"
            className="h-16 w-auto object-contain drop-shadow-md"
          />
          <button
            onClick={() => signOut()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors bg-white/50 dark:bg-black/20 backdrop-blur-sm shadow-sm"
            title="Cerrar sesión"
          >
            <LogOut size={18} />
            Cerrar sesión
          </button>
        </div>

        <div className="max-w-5xl mx-auto px-6 space-y-10 pb-12 flex-1 w-full">
          {lobbyHeader}

          <div className="flex justify-center">
            <div className="w-full max-w-md bg-white/80 dark:bg-gray-900/70 backdrop-blur rounded-3xl shadow-2xl border border-white/40 dark:border-gray-800 p-6 space-y-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Ingresar a una sala por código</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Ingresa el código de la sala para acceder directamente.
                </p>
              </div>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={roomCodeInput}
                  onChange={(e) => {
                    setRoomCodeInput(e.target.value.toUpperCase());
                    setRoomCodeError(null);
                  }}
                  placeholder="Ej: E5JXZZE"
                  className="flex-1 px-4 py-3 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 outline-none transition-all font-mono uppercase tracking-widest text-center"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleEnterRoomByCode();
                    }
                  }}
                  maxLength={10}
                />
                <button
                  onClick={handleEnterRoomByCode}
                  disabled={isRoomActionLoading || !roomCodeInput.trim()}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[120px]"
                >
                  {isRoomActionLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 size={18} className="animate-spin" />
                      <span>Entrando...</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <DoorOpen size={18} />
                      <span>Entrar</span>
                    </span>
                  )}
                </button>
              </div>
              {roomCodeError && (
                <p className="text-sm text-red-600 dark:text-red-400 text-center">{roomCodeError}</p>
              )}
              {lastRoomCode && (
                <button
                  onClick={handleResumeLastRoom}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-300 font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all text-sm"
                >
                  <Users size={16} />
                  Reanudar mi sala guardada ({lastRoomCode})
                </button>
              )}
            </div>
          </div>

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
                  <div
                    key={room.id}
                    className="relative p-5 rounded-2xl border-2 border-transparent bg-white/80 dark:bg-gray-800/80 hover:border-blue-500 dark:hover:border-blue-400 hover:-translate-y-1 transition-all shadow-lg"
                  >
                    <button
                      onClick={() => handleRoomCardClick(room)}
                      className="text-left w-full"
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
                  </div>
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

        <footer className="w-full py-4 text-center text-[10px] md:text-xs text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-black/20 backdrop-blur-sm mt-auto">
          © Desarrollado por el <a href="https://waveframe.com.ar/" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Departamento de Sistemas</a> de Mi Gusto | Todos los derechos reservados.
        </footer>

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
      {/* Toast de confirmación de copia */}
      {copyConfirmMessage && (
        <div className="fixed top-4 right-4 z-[10000] animate-slideDown">
          <div className="bg-green-500 dark:bg-green-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-green-400 dark:border-green-500">
            <div className="flex-shrink-0">
              {copyConfirmMessage.startsWith('✓') ? (
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="text-lg">✓</span>
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
                  <span className="text-lg">✗</span>
                </div>
              )}
            </div>
            <p className="font-semibold text-sm">{copyConfirmMessage}</p>
          </div>
        </div>
      )}

      <div className="h-screen flex flex-col">
        <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-b-2 border-gray-200 dark:border-gray-700 px-6 py-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <img
                src="/Logo Mi Gusto 2025.png"
                alt="Logo Mi Gusto"
                className="h-10 w-auto object-contain"
              />
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-600"></div>
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400 px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-700">
                {new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </div>
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
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      try {
                        if (navigator.clipboard && navigator.clipboard.writeText) {
                          await navigator.clipboard.writeText(roomCode);
                          setCopyConfirmMessage('✓ Código copiado al portapapeles');
                          setTimeout(() => {
                            setCopyConfirmMessage(null);
                          }, 3000);
                        } else {
                          // Fallback para navegadores que no soportan clipboard API
                          const textArea = document.createElement('textarea');
                          textArea.value = roomCode;
                          textArea.style.position = 'fixed';
                          textArea.style.opacity = '0';
                          document.body.appendChild(textArea);
                          textArea.select();
                          try {
                            document.execCommand('copy');
                            setCopyConfirmMessage('✓ Código copiado al portapapeles');
                            setTimeout(() => {
                              setCopyConfirmMessage(null);
                            }, 3000);
                          } catch (err) {
                            setCopyConfirmMessage('✗ No se pudo copiar el código');
                            setTimeout(() => {
                              setCopyConfirmMessage(null);
                            }, 3000);
                          }
                          document.body.removeChild(textArea);
                        }
                      } catch (err) {
                        console.error('Error al copiar:', err);
                        setCopyConfirmMessage('✗ Error al copiar el código');
                        setTimeout(() => {
                          setCopyConfirmMessage(null);
                        }, 3000);
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 text-xs font-mono uppercase tracking-widest text-gray-600 dark:text-gray-300 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all cursor-pointer"
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
                onClick={() => setViewMode(viewMode === 'cards' ? 'calendar' : 'cards')}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                title={viewMode === 'cards' ? 'Vista calendario' : 'Vista tarjetas'}
              >
                {viewMode === 'cards' ? (
                  <Calendar size={20} className="text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                ) : (
                  <Grid size={20} className="text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                )}
              </button>

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
                    tagFilter={selectedTagFilter}
                    onTagFilterChange={setSelectedTagFilter}
                    availableTags={availableTags}
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
                      <PersonSelector
                        value={newAssignedTo}
                        onChange={setNewAssignedTo}
                        placeholder="Seleccionar responsable..."
                      />
                    </div>
                  </div>
                  {roomCode && (
                    <div className="mb-3">
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Etiquetas</label>
                      <TagSelector
                        roomCode={roomCode}
                        selectedTags={newTags}
                        onChange={setNewTags}
                      />
                    </div>
                  )}
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
                        setNewAssignedTo(null);
                        setNewTags([]);
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
            ) : viewMode === 'calendar' ? (
              <div className="flex-1 overflow-y-auto px-6 pb-6">
                <CalendarView
                  reminders={activeReminders}
                  onReminderClick={setExpandedReminder}
                />
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

        <footer className="w-full py-4 text-center text-[10px] md:text-xs text-gray-500 dark:text-gray-400 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-t border-gray-200 dark:border-gray-700">
          © Desarrollado por el <a href="https://waveframe.com.ar/" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Departamento de Sistemas</a> de Mi Gusto | Todos los derechos reservados.
        </footer>
      </div>

      {/* Modal para hacer pública (pedir código) - Fuera del contenedor principal */}
      {showMakePublicPrompt && roomPendingMakePublic && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
          onClick={(e) => {
            // Cerrar modal al hacer click fuera
            if (e.target === e.currentTarget) {
              handleCloseMakePublicPrompt();
            }
          }}
        >
          <div 
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-orange-200 dark:border-orange-900 p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-orange-500 dark:text-orange-300">Cambiar privacidad</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {roomPendingMakePublic?.name}
                </h3>
              </div>
              <button
                onClick={handleCloseMakePublicPrompt}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X size={20} className="text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Para hacer esta sala pública, necesitas ingresar el código de acceso actual de la sala privada.
            </p>
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
              <Lock size={20} className="text-orange-600 dark:text-orange-400" />
              <div>
                <p className="text-xs uppercase tracking-widest text-orange-600 dark:text-orange-400">Código de acceso requerido</p>
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  Ingresa el código de acceso de la sala para confirmar.
                </p>
              </div>
            </div>
            <input
              type="text"
              value={makePublicCodeInput}
              onChange={(e) => {
                setMakePublicCodeInput(e.target.value);
                setMakePublicError(null);
              }}
              placeholder="Ingresa el código de acceso"
              className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-900 outline-none transition-all"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleMakePublicSubmit();
                }
              }}
              autoFocus
            />
            {makePublicError && (
              <p className="text-sm text-red-600 dark:text-red-400 text-center">{makePublicError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleMakePublicSubmit}
                disabled={isRoomActionLoading || !makePublicCodeInput.trim()}
                className="flex-1 px-4 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isRoomActionLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={18} className="animate-spin" />
                    Verificando...
                  </span>
                ) : (
                  'Hacer pública'
                )}
              </button>
              <button
                onClick={handleCloseMakePublicPrompt}
                className="px-4 py-3 rounded-2xl border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para cambiar privacidad de pública a privada - Fuera del contenedor principal */}
      {showPrivacyChangePrompt && roomPendingPrivacyChange && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
          onClick={(e) => {
            // Cerrar modal al hacer click fuera
            if (e.target === e.currentTarget) {
              handleClosePrivacyChangePrompt();
            }
          }}
        >
          <div 
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-purple-200 dark:border-purple-900 p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-purple-500 dark:text-purple-300">Cambiar privacidad</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {roomPendingPrivacyChange?.name}
                </h3>
              </div>
              <button
                onClick={handleClosePrivacyChangePrompt}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X size={20} className="text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Para hacer esta sala privada, necesitas establecer un código de acceso. Los usuarios necesitarán este código para entrar.
            </p>
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
              <Lock size={20} className="text-purple-600 dark:text-purple-400" />
              <div>
                <p className="text-xs uppercase tracking-widest text-purple-600 dark:text-purple-400">Código de acceso</p>
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  Este código será requerido para acceder a la sala.
                </p>
              </div>
            </div>
            <input
              type="text"
              value={privacyAccessCodeInput}
              onChange={(e) => {
                setPrivacyAccessCodeInput(e.target.value);
                setPrivacyAccessError(null);
              }}
              placeholder="Ingresa el código de acceso"
              className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-900 outline-none transition-all"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handlePrivacyChangeSubmit();
                }
              }}
              autoFocus
            />
            {privacyAccessError && (
              <p className="text-sm text-red-600 dark:text-red-400 text-center">{privacyAccessError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={handlePrivacyChangeSubmit}
                disabled={isRoomActionLoading || !privacyAccessCodeInput.trim()}
                className="flex-1 px-4 py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isRoomActionLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={18} className="animate-spin" />
                    Cambiando...
                  </span>
                ) : (
                  'Hacer privada'
                )}
              </button>
              <button
                onClick={handleClosePrivacyChangePrompt}
                className="px-4 py-3 rounded-2xl border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Modal para eliminar sala */}
      {showDeleteRoomPrompt && roomPendingDelete && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseDeleteRoomPrompt();
            }
          }}
        >
          <div 
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-red-200 dark:border-red-900 p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-red-500 dark:text-red-300">Eliminar sala</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {roomPendingDelete?.name}
                </h3>
              </div>
              <button
                onClick={handleCloseDeleteRoomPrompt}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X size={20} className="text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-sm font-semibold text-red-800 dark:text-red-200 mb-2">
                ⚠️ Esta acción no se puede deshacer
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Se eliminarán todos los recordatorios, etiquetas y datos asociados a esta sala.
              </p>
            </div>
            {roomPendingDelete.is_locked && (
              <>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Para eliminar esta sala privada, necesitas ingresar el código de acceso.
                </p>
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                  <Lock size={20} className="text-orange-600 dark:text-orange-400" />
                  <div>
                    <p className="text-xs uppercase tracking-widest text-orange-600 dark:text-orange-400">Código de acceso requerido</p>
                    <p className="text-sm text-gray-800 dark:text-gray-200">
                      Ingresa el código de acceso de la sala para confirmar.
                    </p>
                  </div>
                </div>
                <input
                  type="text"
                  value={deleteRoomCodeInput}
                  onChange={(e) => {
                    setDeleteRoomCodeInput(e.target.value);
                    setDeleteRoomError(null);
                  }}
                  placeholder="Ingresa el código de acceso"
                  className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-900 outline-none transition-all"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleDeleteRoomSubmit();
                    }
                  }}
                  autoFocus
                />
                {deleteRoomError && (
                  <p className="text-sm text-red-600 dark:text-red-400 text-center">{deleteRoomError}</p>
                )}
              </>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleDeleteRoomSubmit}
                disabled={isRoomActionLoading || (roomPendingDelete.is_locked && !deleteRoomCodeInput.trim())}
                className="flex-1 px-4 py-3 rounded-2xl bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isRoomActionLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={18} className="animate-spin" />
                    Eliminando...
                  </span>
                ) : (
                  'Eliminar sala'
                )}
              </button>
              <button
                onClick={handleCloseDeleteRoomPrompt}
                className="px-4 py-3 rounded-2xl border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        isDark={isDark}
        onToggleDark={() => setIsDark(!isDark)}
        onExport={handleExport}
        onImport={handleImport}
        onOpenPeopleManager={() => setShowPeopleManager(true)}
        roomInfo={roomInfo}
        currentUserId={user?.id || null}
        onToggleRoomPrivacy={() => roomInfo && handleToggleRoomPrivacy(roomInfo)}
        onDeleteRoom={() => roomInfo && handleDeleteRoom(roomInfo)}
      />

      <PeopleManager
        isOpen={showPeopleManager}
        onClose={() => setShowPeopleManager(false)}
      />
    </div>
  );
}

