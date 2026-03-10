
require('dotenv').config({ path: '.env.local' });
const nodemailer = require('nodemailer');

async function testGmail() {
    console.log('Testing Gmail SMTP with:', process.env.SMTP_USER);

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '465'),
        secure: true,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    try {
        const info = await transporter.sendMail({
            from: `"${process.env.BREVO_SENDER_NAME}" <${process.env.SMTP_USER}>`,
            to: 'MEUARC@GMAIL.COM',
            subject: 'Teste de Entrega - Gmail SMTP GestImob',
            html: '<p>Este é um teste para confirmar a configuração do Gmail SMTP no GestImob.</p>',
        });

        console.log('Success! Message ID:', info.messageId);
    } catch (error) {
        console.error('Error:', error);
    }
}

testGmail();
