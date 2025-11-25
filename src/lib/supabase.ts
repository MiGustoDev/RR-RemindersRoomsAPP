import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Reminder = {
  id: string;
  title: string;
  description: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  room_code: string;
  progress: number;
};

export type Room = {
  id: string;
  name: string;
  code: string;
  created_at: string;
  is_locked: boolean;
};

export type RoomWithSecret = Room & {
  access_code: string | null;
};

export type ReminderComment = {
  id: string;
  reminder_id: string;
  author: string;
  message: string;
  created_at: string;
};
