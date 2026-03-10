
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

const logToFile = (msg: string) => {
    const logPath = path.join(process.cwd(), 'debug_email.log');
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`);
};

export interface BrevoEmailPayload {
    to: { email: string; name?: string }[];
    subject: string;
    htmlContent: string;
}

/**
 * Envia um e-mail através do servidor SMTP configurado (Gmail).
 * Mantém o nome 'sendBrevoEmail' para compatibilidade com o restante do sistema.
 */
export async function sendBrevoEmail(payload: BrevoEmailPayload) {
    const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
    const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465');
    const SMTP_USER = process.env.SMTP_USER;
    const SMTP_PASS = process.env.SMTP_PASS;

    if (!SMTP_USER || !SMTP_PASS) {
        throw new Error('SMTP_USER or SMTP_PASS is not defined in environment variables');
    }

    const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465, // true para porta 465 (SSL)
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS,
        },
    });

    const senderEmail = process.env.BREVO_SENDER_EMAIL || SMTP_USER;
    const senderName = process.env.BREVO_SENDER_NAME || 'RR Imobiliária';

    const mailOptions = {
        from: `"${senderName}" <${senderEmail}>`,
        to: payload.to.map(t => t.email).join(', '),
        subject: payload.subject,
        html: payload.htmlContent,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Gmail SMTP Success: ' + info.messageId);
        logToFile(`Gmail SMTP Success: ${info.messageId}`);
        return { messageId: info.messageId };
    } catch (error: any) {
        console.error('Gmail SMTP Error:', error);
        logToFile(`Gmail SMTP Error: ${error.message}`);
        throw error;
    }
}
