
const ref = 'swotzjtniqcpovidcnds';
const token = 'sbp_13403140309bc21ec864e25f24e26fa0e8dad0f4';

async function checkClient() {
    const url = `https://api.supabase.com/v1/projects/${ref}/query`;
    const sql = `
        SELECT nome_completo, email FROM clientes WHERE nome_completo ILIKE '%Lucas Miranda Souza%';
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

checkClient();
