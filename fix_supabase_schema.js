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
-- TABELAS PRINCIPAIS DO SISTEMA

CREATE TABLE IF NOT EXISTS empresas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo TEXT UNIQUE,
    nome_fantasia TEXT NOT NULL,
    razao_social TEXT NOT NULL,
    cnpj TEXT UNIQUE,
    cep TEXT,
    logradouro TEXT,
    numero TEXT,
    bairro TEXT,
    complemento TEXT,
    cidade TEXT,
    estado TEXT,
    contrato_social_url TEXT,
    cadastrado_por TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS empresa_responsaveis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    documento_url TEXT,
    selfie_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_interno TEXT UNIQUE,
    tipo TEXT,
    is_fiador BOOLEAN DEFAULT false,
    nome_completo TEXT NOT NULL,
    documento TEXT,
    email TEXT,
    telefone TEXT,
    cep TEXT,
    endereco TEXT,
    numero TEXT,
    bairro TEXT,
    complemento TEXT,
    cidade TEXT,
    estado TEXT,
    estado_civil TEXT,
    renda_mensal NUMERIC,
    profissao TEXT,
    empresa_trabalho TEXT,
    documento_identidade_url TEXT,
    comprovante_residencia_url TEXT,
    comprovante_renda_url TEXT,
    selfie_url TEXT,
    certidao_estado_civil_url TEXT,
    predio_empresa TEXT,
    bens_veiculos TEXT,
    bens_imoveis TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS cliente_representantes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    documento_url TEXT,
    selfie_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS proprietarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_interno TEXT UNIQUE,
    nome_completo TEXT NOT NULL,
    documento TEXT,
    email TEXT,
    telefone TEXT,
    cep TEXT,
    endereco TEXT,
    numero TEXT,
    bairro TEXT,
    complemento TEXT,
    cidade TEXT,
    estado TEXT,
    renda_mensal NUMERIC,
    documento_identidade_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS imoveis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proprietario_id UUID REFERENCES proprietarios(id) ON DELETE SET NULL,
    tipo TEXT,
    endereco TEXT NOT NULL,
    valor_aluguel NUMERIC,
    valor_venda NUMERIC,
    status TEXT,
    area NUMERIC,
    quartos INTEGER,
    banheiros INTEGER,
    vagas_garagem INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS contratos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
    imovel_id UUID REFERENCES imoveis(id) ON DELETE CASCADE,
    data_inicio DATE NOT NULL,
    duracao_meses INTEGER DEFAULT 12,
    valor_aluguel NUMERIC NOT NULL,
    status TEXT DEFAULT 'Aguardando Assinatura',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS integracoes_pixels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider TEXT NOT NULL,
    pixel_id TEXT NOT NULL,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ADIÇÃO DE COLUNAS FALTANTES EM TABELAS EXISTENTES (Idempotente)
DO $$
BEGIN
    BEGIN
        ALTER TABLE empresas ADD COLUMN contrato_social_url TEXT;
    EXCEPTION WHEN duplicate_column THEN END;
    
    BEGIN
        ALTER TABLE empresas ADD COLUMN cadastrado_por TEXT;
    EXCEPTION WHEN duplicate_column THEN END;
    
    BEGIN
        ALTER TABLE empresas ADD COLUMN codigo TEXT;
    EXCEPTION WHEN duplicate_column THEN END;

    BEGIN
        ALTER TABLE empresa_responsaveis ADD COLUMN selfie_url TEXT;
    EXCEPTION WHEN duplicate_column THEN END;

    BEGIN
        ALTER TABLE clientes ADD COLUMN selfie_url TEXT;
    EXCEPTION WHEN duplicate_column THEN END;

    BEGIN
        ALTER TABLE clientes ADD COLUMN predio_empresa TEXT;
    EXCEPTION WHEN duplicate_column THEN END;

    BEGIN
        ALTER TABLE clientes ADD COLUMN bens_veiculos TEXT;
    EXCEPTION WHEN duplicate_column THEN END;

    BEGIN
        ALTER TABLE clientes ADD COLUMN bens_imoveis TEXT;
    EXCEPTION WHEN duplicate_column THEN END;

    BEGIN
        ALTER TABLE proprietarios ADD COLUMN codigo_interno TEXT;
    EXCEPTION WHEN duplicate_column THEN END;

    BEGIN
        ALTER TABLE imoveis ADD COLUMN proprietario_id UUID;
    EXCEPTION WHEN duplicate_column THEN END;
END $$;

NOTIFY pgrst, 'reload schema';
    `;
    await runSQL(sql);
}

main();
