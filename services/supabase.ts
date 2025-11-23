import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabase: SupabaseClient | null = null;

try {
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('[SUPABASE] Initialized successfully');
  } else {
    console.warn('[SUPABASE] Config missing. Running in Local Mode.');
  }
} catch (e) {
  console.error('[SUPABASE] Initialization failed:', e);
}

export { supabase };
