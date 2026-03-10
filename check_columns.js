
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://swotzjtniqcpovidcnds.supabase.co';
const supabaseAnonKey = 'sb_publishable_ZAT4LzJeMQwAAbyr3XfnZQ_CL69HFLg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkColumns() {
    const { data, error } = await supabase.from('contratos').select('*').limit(1);
    if (error) {
        console.error(error);
    } else if (data && data.length > 0) {
        console.log(Object.keys(data[0]).join(', '));
    } else {
        console.log('No data to check columns');
    }
}

checkColumns();
