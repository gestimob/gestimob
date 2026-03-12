import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const supabaseUrlStorage = process.env.NEXT_PUBLIC_SUPABASE_URL_STORAGE!;
const supabaseAnonKeyStorage = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_STORAGE!;

export const supabaseStorage = createClient(supabaseUrlStorage, supabaseAnonKeyStorage);
