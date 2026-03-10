
const BREVO_API_KEY = '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';
const SENDER_EMAIL = 'contato@gestimob.com.br';
const SENDER_NAME = 'GestImob | Inteligência Imobiliária';

async function testBrevo() {
    console.log('Testing Brevo with:');
    console.log('SENDER_EMAIL:', SENDER_EMAIL);

    try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': BREVO_API_KEY,
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                sender: {
                    name: SENDER_NAME,
                    email: SENDER_EMAIL
                },
                to: [{ email: 'MEUARC@GMAIL.COM', name: 'LUCAS MIRANDA SOUZA (TEST)' }],
                subject: 'Teste de Entrega - GestImob',
                htmlContent: '<p>Este é um teste manual de entrega de e-mail para verificar a conectividade com o Brevo.</p>'
            })
        });

        const data = await response.json();
        console.log('Response Status:', response.status);
        console.log('Response Data:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Fetch Error:', error);
    }
}

testBrevo();
