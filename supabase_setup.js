
const ref = 'swotzjtniqcpovidcnds';
const token = 'sbp_13403140309bc21ec864e25f24e26fa0e8dad0f4';

async function runSQL(sql) {
    const url = `https://api.supabase.com/v1/projects/${ref}/query`;
    console.log(`Executing SQL on ${url}...`);
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
        console.log(`Status: ${res.status}`);
        console.log(JSON.stringify(data, null, 2));
        return data;
    } catch (e) {
        console.error(e);
    }
}

async function createBucket(name) {
    // Bucket creation is done via the Storage API, not Management API
    // But wait, maybe the Management API has an endpoint?
    // Actually, I can use SQL to create a bucket!
    const sql = `
        INSERT INTO storage.buckets (id, name, public)
        SELECT '${name}', '${name}', true
        WHERE NOT EXISTS (
            SELECT 1 FROM storage.buckets WHERE id = '${name}'
        );

        -- Add policies
        DO $$ 
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Permitir Upload Documentos') THEN
                CREATE POLICY "Permitir Upload Documentos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = '${name}');
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Permitir Select Documentos') THEN
                CREATE POLICY "Permitir Select Documentos" ON storage.objects FOR SELECT USING (bucket_id = '${name}');
            END IF;
        END $$;
    `;
    return runSQL(sql);
}

async function main() {
    const sql = `
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS contrato_social_url TEXT;

CREATE TABLE IF NOT EXISTS empresa_responsaveis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    documento_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE empresa_responsaveis ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'empresa_responsaveis' AND policyname = 'Public Access') THEN
        CREATE POLICY "Public Access" ON empresa_responsaveis FOR ALL USING (true);
    END IF;
END $$;
`;

    await runSQL(sql);
    await createBucket('documentos');
}

main();
