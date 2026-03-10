const ref = 'swotzjtniqcpovidcnds';
const token = 'sbp_13403140309bc21ec864e25f24e26fa0e8dad0f4';

async function runSQL(sql) {
    const url = `https://api.supabase.com/v1/projects/${ref}/query`;
    console.log(`Executing SQL...`);
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: sql,
            })
        });
        const data = await res.json();
        console.log("Status:", res.status);
        console.log("Response:", JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Fetch Error:", e);
    }
}

async function main() {
    const sql = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public';
    `;
    await runSQL(sql);
}

main();
