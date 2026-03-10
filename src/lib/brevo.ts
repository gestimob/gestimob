export interface BrevoEmailPayload {
    to: { email: string; name?: string }[];
    subject: string;
    htmlContent: string;
}

const logToConsole = (msg: string) => {
    console.log(`[${new Date().toISOString()}] ${msg}`);
};

/**
 * Envia um e-mail através da API REST da Brevo (Sendinblue).
 * Compatível com Edge Runtime (Cloudflare Pages/Vercel Edge).
 */
export async function sendBrevoEmail(payload: BrevoEmailPayload) {
    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.SMTP_USER || 'contato@rrimobiliaria.com.br';
    const senderName = process.env.BREVO_SENDER_NAME || 'RR Imobiliária';

    if (!apiKey || apiKey === 'x') {
        // Abortamos graciosamente caso a chave da Brevo não esteja presente.
        const mockMsg = 'BREVO_API_KEY is not set or invalid. Skipping email send.';
        console.warn(mockMsg);
        logToConsole(mockMsg);
        return { messageId: 'mock-id-edge-bypass' };
    }

    const apiPayload = {
        sender: {
            name: senderName,
            email: senderEmail
        },
        to: payload.to.map(t => ({ email: t.email, name: t.name || t.email })),
        subject: payload.subject,
        htmlContent: payload.htmlContent
    };

    try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': apiKey
            },
            body: JSON.stringify(apiPayload)
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`Brevo HTTP API Error: ${response.status} - ${errBody}`);
        }

        const data = await response.json();
        const msgId = data.messageId || 'unknown-id';
        logToConsole(`Brevo HTTP Success: ${msgId}`);
        return { messageId: msgId };
    } catch (error: any) {
        console.error('Brevo HTTP API Error:', error);
        logToConsole(`Brevo HTTP Error: ${error.message}`);
        throw error;
    }
}
