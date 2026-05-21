import { createClient } from '@supabase/supabase-js';

// Helper function to sanitize environment variables from wrapping quotes, spaces, newlines, and carriage returns
const sanitizeEnvVar = (val: string | undefined): string | undefined => {
  if (!val) return undefined;
  let cleaned = val.trim();
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.slice(1, -1);
  } else if (cleaned.startsWith("'") && cleaned.endsWith("'")) {
    cleaned = cleaned.slice(1, -1);
  }
  return cleaned.trim();
};

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const rawAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const sanitizedUrl = sanitizeEnvVar(rawUrl);
const sanitizedAnonKey = sanitizeEnvVar(rawAnonKey);

const supabaseUrl = sanitizedUrl || 'https://placeholder.supabase.co';
const supabaseAnonKey = sanitizedAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder';

if (!rawUrl || !rawAnonKey) {
  if (typeof window !== 'undefined') {
    console.warn(
      'AeroFlight Warning: Supabase environment variables are missing! Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local.'
    );
  }
}

// 1. Standard Client-side Client (for browser interaction)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

if (typeof window !== 'undefined') {
  console.log('--- AeroFlight Supabase Diagnostics ---');
  console.log('URL Value:', supabaseUrl);
  console.log('Key Length:', supabaseAnonKey ? supabaseAnonKey.length : 0);
  console.log('Key Start:', supabaseAnonKey ? supabaseAnonKey.substring(0, 15) : 'NONE');
  console.log('Key End:', supabaseAnonKey ? supabaseAnonKey.substring(supabaseAnonKey.length - 15) : 'NONE');
  console.log('Key Details:', {
    hasQuotes: supabaseAnonKey ? (supabaseAnonKey.includes('"') || supabaseAnonKey.includes("'")) : false,
    hasWhitespace: supabaseAnonKey ? /\s/.test(supabaseAnonKey) : false,
    hasCarriageReturn: supabaseAnonKey ? supabaseAnonKey.includes('\r') : false,
    hasNewline: supabaseAnonKey ? supabaseAnonKey.includes('\n') : false,
  });
  console.log('---------------------------------------');
}



// 2. Server-side Client Generator (for Server Components, Actions, and API Routes)
// We turn off persistent storage tracking in standard JS client to make it safe for server-side concurrent environments.
export const createSupabaseServerClient = () => {
  return createClient(
    sanitizedUrl || '',
    sanitizedAnonKey || '',
    {
      auth: {
        persistSession: false, // Crucial for Server-side clients to prevent cross-request session leakage
        autoRefreshToken: false,
      },
    }
  );
};

