import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL_STORAGE;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_STORAGE;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Variáveis de ambiente do Supabase (Storage) não definidas. O storage_imobi não funcionará corretamente.');
}

/**
 * Cliente Secundário do Supabase exclusivo para o projeto "storage_imobi".
 * Utilizado apenas para interações de Upload/Exclusão do Storage (Buckets).
 */
export const supabaseStorage = createClient(
    supabaseUrl || 'https://jkgkwzyxtmqmhaypobba.supabase.co',
    supabaseAnonKey || 'default-key'
);
