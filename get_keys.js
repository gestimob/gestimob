
const ref = 'swotzjtniqcpovidcnds';
const token = 'sbp_13403140309bc21ec864e25f24e26fa0e8dad0f4';

async function run() {
    const url = `https://api.supabase.com/v1/projects/${ref}/api-keys`;
    console.log(`Fetching keys from ${url}...`);
    try {
        const res = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await res.json();
        const serviceRoleKey = data.find(k => k.name === 'service_role')?.api_key;
        if (serviceRoleKey) {
            console.log(`SERVICE_ROLE_KEY: ${serviceRoleKey}`);
        } else {
            console.log('Service role key not found');
            console.log(JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.error(e);
    }
}

run();
