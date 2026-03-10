
const ref = 'swotzjtniqcpovidcnds';
const token = 'sbp_13403140309bc21ec864e25f24e26fa0e8dad0f4';

async function checkEmails() {
    const url = `https://api.supabase.com/v1/projects/${ref}/query`;
    const sql = `
        SELECT 
            h.*,
            p.nome_completo as proprietario_nome,
            p.email as proprietario_email,
            c.nome_completo as cliente_nome,
            c.email as cliente_email
        FROM historico_comunicacoes h
        LEFT JOIN proprietarios p ON h.proprietario_id = p.id
        LEFT JOIN clientes c ON h.locatario_id = c.id
        ORDER BY h.created_at DESC
        LIMIT 5;
    `;

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: sql })
        });
        const data = await res.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(e);
    }
}

checkEmails();
