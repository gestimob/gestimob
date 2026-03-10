
const ref = 'swotzjtniqcpovidcnds';
const token = 'sbp_13403140309bc21ec864e25f24e26fa0e8dad0f4';

async function setup() {
    // 1. Get Service Role Key
    const keysUrl = `https://api.supabase.com/v1/projects/${ref}/api-keys`;
    const keysRes = await fetch(keysUrl, { headers: { 'Authorization': `Bearer ${token}` } });
    const keysData = await keysRes.json();
    const serviceRoleKey = keysData.find(k => k.name === 'service_role')?.api_key;

    if (!serviceRoleKey) {
        console.error('Could not find service_role key');
        return;
    }

    const supabaseUrl = `https://${ref}.supabase.co`;

    // 2. Create Bucket via Storage API
    console.log('Creating bucket "documentos"...');
    const bucketRes = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            id: 'documentos',
            name: 'documentos',
            public: true,
            file_size_limit: 3145728, // 3MB
            allowed_mime_types: ['image/jpeg', 'image/png', 'application/pdf', 'image/webp']
        })
    });
    const bucketData = await bucketRes.json();
    console.log('Bucket Status:', bucketRes.status, bucketData);

    // 3. Create Tables and Policies via SQL (if we had an endpoint)
    // Since Management API /query seems to be 404ing or tricky, 
    // we will rely on the fact that if the bucket is created, the user can upload.
    // However, I still want to try the /query endpoint with the correct format.

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

    console.log('Attempting to run SQL via Management API...');
    const sqlRes = await fetch(`https://api.supabase.com/v1/projects/${ref}/query`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: sql })
    });
    console.log('SQL Status:', sqlRes.status);
    try {
        const sqlData = await sqlRes.json();
        console.log('SQL Result:', JSON.stringify(sqlData, null, 2));
    } catch (e) {
        console.log('No JSON response from SQL endpoint');
    }
}

setup();
