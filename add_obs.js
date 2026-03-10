const ref = 'swotzjtniqcpovidcnds';
const token = 'sbp_13403140309bc21ec864e25f24e26fa0e8dad0f4';

async function runSQL(sql) {
    const url = `https://api.supabase.com/v1/projects/${ref}/query`;
    console.log(`Executing Schema Validation...`);
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: sql,
                parameters: [],
                read_only: false
            })
        });
        const data = await res.json();
        if (res.status !== 200 && res.status !== 201) {
            console.error('SQL Execution Error:', data);
        } else {
            console.log('Schema Validation Completed Successfully!');
        }
    } catch (e) {
        console.error(e);
    }
}

async function main() {
    const sql = `
DO $$
BEGIN
    BEGIN
        ALTER TABLE empresas ADD COLUMN observacoes TEXT;
    EXCEPTION WHEN duplicate_column THEN END;
END $$;

NOTIFY pgrst, 'reload schema';
    `;
    await runSQL(sql);
}

main();
