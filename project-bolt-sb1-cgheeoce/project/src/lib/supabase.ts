// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl      = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey  = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,    // store session in localStorage
    autoRefreshToken: true,  // auto-refresh JWT before expiry
  }
});
