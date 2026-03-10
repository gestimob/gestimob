
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://swotzjtniqcpovidcnds.supabase.co';
const supabaseAnonKey = 'sb_publishable_ZAT4LzJeMQwAAbyr3XfnZQ_CL69HFLg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
    const { data: comms, error: err1 } = await supabase
        .from('historico_comunicacoes')
        .select(`
            *,
            proprietarios(nome_completo, email),
            clientes(nome_completo, email)
        `)
        .order('created_at', { ascending: false });

    if (err1) console.error(err1);
    console.log('--- Last Communications ---');
    console.log(JSON.stringify(comms, null, 2));
}

check();
