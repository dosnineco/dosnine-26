// lib/supabase.js
import { createClient } from '@supabase/supabase-js';

// Get the environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if environment variables are available
if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or Key is missing');
}

// Create a Supabase client instance
export const supabase = createClient(supabaseUrl, supabaseKey);

