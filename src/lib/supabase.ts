import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  if (typeof window !== 'undefined') {
    console.error(
      'AeroFlight Error: Supabase environment variables are missing! Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local.'
    );
  }
}

// 1. Standard Client-side Client (for browser interaction)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 2. Server-side Client Generator (for Server Components, Actions, and API Routes)
// We turn off persistent storage tracking in standard JS client to make it safe for server-side concurrent environments.
export const createSupabaseServerClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      auth: {
        persistSession: false, // Crucial for Server-side clients to prevent cross-request session leakage
        autoRefreshToken: false,
      },
    }
  );
};
