// Mock de Supabase para modo demo
// Este archivo simula la funcionalidad de Supabase sin conexión real

export type Priority = 'urgent' | 'high' | 'medium' | 'low';

export type Reminder = {
    id: string;
    title: string;
    description: string;
    due_date: string | null;
    created_at: string;
    updated_at: string;
    room_code: string;
    progress: number;
    priority: Priority;
    assigned_to: string | null;
};

export type Room = {
    id: string;
    name: string;
    code: string;
    created_at: string;
    is_locked: boolean;
    created_by: string | null;
};

export type RoomWithSecret = Room & {
    access_code: string | null;
};

export type ReminderTag = {
    id: string;
    room_code: string;
    name: string;
    color: string;
    created_at: string;
};

export type ReminderWithTags = Reminder & {
    tags?: ReminderTag[];
};

export type ReminderComment = {
    id: string;
    reminder_id: string;
    author: string;
    message: string;
    created_at: string;
};

// Datos de demo en memoria - VACÍO para que puedas crear tus propias salas
let demoRooms: Room[] = [];
let demoReminders: Reminder[] = [];

// Usuario demo
const demoUser = {
    id: 'demo-user',
    email: 'sistemas@migusto.com.ar',
    created_at: new Date().toISOString(),
};

// Callback para auth state changes
let authStateCallback: any = null;

// Mock del cliente de Supabase
export const supabase = {
    auth: {
        signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
            console.log('🎭 MODO DEMO: Login simulado con', email);

            if (email === 'sistemas@migusto.com.ar' && password === 'MiGusto123') {
                const session = {
                    access_token: 'demo-token',
                    refresh_token: 'demo-refresh',
                    user: demoUser,
                };

                console.log('✅ MODO DEMO: Credenciales correctas');

                // Disparar el evento de auth state change
                if (authStateCallback) {
                    console.log('🎭 MODO DEMO: Disparando evento SIGNED_IN');
                    setTimeout(() => authStateCallback('SIGNED_IN', session), 100);
                }

                return {
                    data: {
                        user: demoUser,
                        session,
                    },
                    error: null,
                };
            }

            console.log('❌ MODO DEMO: Credenciales incorrectas');
            return {
                data: { user: null, session: null },
                error: { message: 'Credenciales incorrectas' },
            };
        },

        signOut: async () => {
            console.log('🎭 MODO DEMO: Logout simulado');
            if (authStateCallback) {
                authStateCallback('SIGNED_OUT', null);
            }
            return { error: null };
        },

        getSession: async () => {
            console.log('🎭 MODO DEMO: Obteniendo sesión simulada');
            // No devolver sesión automáticamente - forzar login
            return {
                data: { session: null },
                error: null,
            };
        },

        onAuthStateChange: (callback: any) => {
            console.log('🎭 MODO DEMO: Auth state change listener registrado');
            authStateCallback = callback;
            return {
                data: { subscription: { unsubscribe: () => { authStateCallback = null; } } },
            };
        },
    },

    from: (table: string) => ({
        select: (columns?: string) => {
            // Crear un objeto que sea tanto Promise como tenga métodos
            const executeQuery = async () => {
                console.log(`🎭 MODO DEMO: SELECT ${columns || '*'} FROM ${table}`);

                await new Promise(resolve => setTimeout(resolve, 100)); // Simular delay de red

                if (table === 'rooms') {
                    return { data: demoRooms, error: null };
                } else if (table === 'reminders') {
                    return { data: demoReminders, error: null };
                }
                return { data: [], error: null };
            };

            const queryBuilder: any = {
                eq: (column: string, value: any) => {
                    const eqBuilder: any = {
                        single: async () => {
                            console.log(`🎭 MODO DEMO: SELECT ${columns} FROM ${table} WHERE ${column} = ${value}`);

                            if (table === 'rooms') {
                                const room = demoRooms.find((r: any) => r[column] === value);
                                return { data: room || null, error: room ? null : { message: 'Not found' } };
                            }

                            if (table === 'reminders') {
                                const reminder = demoReminders.find((r: any) => r[column] === value);
                                return { data: reminder || null, error: reminder ? null : { message: 'Not found' } };
                            }

                            return { data: null, error: { message: 'Table not found' } };
                        },
                        order: () => eqBuilder,
                    };
                    return eqBuilder;
                },
                order: () => queryBuilder,
                then: (resolve: any) => executeQuery().then(resolve),
                catch: (reject: any) => executeQuery().catch(reject),
            };

            return queryBuilder;
        },

        insert: (values: any) => ({
            select: () => ({
                single: async () => {
                    console.log(`🎭 MODO DEMO: INSERT INTO ${table}`, values);

                    if (table === 'rooms') {
                        const newRoom = {
                            ...values[0],
                            id: Math.random().toString(36).substr(2, 9),
                            created_at: new Date().toISOString(),
                        };
                        demoRooms.push(newRoom);
                        return { data: newRoom, error: null };
                    }

                    if (table === 'reminders') {
                        const newReminder = {
                            ...values[0],
                            id: Math.random().toString(36).substr(2, 9),
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                        };
                        demoReminders.push(newReminder);
                        return { data: newReminder, error: null };
                    }

                    return { data: null, error: { message: 'Table not found' } };
                },
            }),
        }),

        update: (values: any) => ({
            eq: (column: string, value: any) => ({
                select: () => ({
                    single: async () => {
                        console.log(`🎭 MODO DEMO: UPDATE ${table} SET ... WHERE ${column} = ${value}`);

                        if (table === 'reminders') {
                            const index = demoReminders.findIndex((r: any) => r[column] === value);
                            if (index !== -1) {
                                demoReminders[index] = { ...demoReminders[index], ...values, updated_at: new Date().toISOString() };
                                return { data: demoReminders[index], error: null };
                            }
                        }

                        return { data: null, error: { message: 'Not found' } };
                    },
                }),
            }),
        }),

        delete: () => ({
            eq: (column: string, value: any) => ({
                then: async (resolve: any) => {
                    console.log(`🎭 MODO DEMO: DELETE FROM ${table} WHERE ${column} = ${value}`);

                    if (table === 'reminders') {
                        demoReminders = demoReminders.filter((r: any) => r[column] !== value);
                    }
                    resolve({ error: null });
                },
            }),
        }),
    }),

    channel: () => ({
        on: () => ({ subscribe: () => ({}) }),
    }),

    removeChannel: () => { },
};

console.log('🎭 MODO DEMO ACTIVADO - Sin conexión a Supabase real');
console.log('📧 Usuario: sistemas@migusto.com.ar');
console.log('🔑 Contraseña: MiGusto123');
console.log('📝 Las salas están vacías - crea las tuyas!');
