import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

async function run() {
    const { data, error } = await supabase.from('clientes').select('*').limit(1);
    console.log(JSON.stringify(data?.[0], null, 2));
}

run();
