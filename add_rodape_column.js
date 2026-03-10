const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
    const { error } = await supabase.rpc('exec_sql', {
        query: `ALTER TABLE contratos ADD COLUMN IF NOT EXISTS texto_rodape TEXT;`
    });

    if (error) {
        // Se rpc não funcionar, tenta via rest
        console.log('RPC falhou, tentando via SQL direto...');
        const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({ query: `ALTER TABLE contratos ADD COLUMN IF NOT EXISTS texto_rodape TEXT;` })
        });
        console.log('Status:', res.status);
    } else {
        console.log('Coluna texto_rodape adicionada com sucesso!');
    }
}

run().catch(console.error);
