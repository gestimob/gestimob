
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendBrevoEmail } from '@/lib/brevo';
import fs from 'fs';
import path from 'path';

const logToFile = (msg: string) => {
    const logPath = path.join(process.cwd(), 'debug_email.log');
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`);
};

export async function GET(request: Request) {
    try {
        logToFile('--- Starting send-reminders check ---');

        // Fetch Branding Settings
        const { data: config } = await supabase
            .from('configuracoes')
            .select('logo_url, rodape_texto, rodape_url')
            .single();

        const logoUrl = config?.logo_url || '';
        const footerText = config?.rodape_texto || '';
        const footerUrl = config?.rodape_url || '';
        const companyName = "RR Imobiliária Ltda.";

        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + 5);
        const dateString = targetDate.toISOString().split('T')[0];

        logToFile(`Checking for dates between ${todayStr} and ${dateString}`);

        const results: { aluguel: string[] } = {
            aluguel: []
        };

        // Helper to extract nested object from potentially array-like Supabase join result
        const extract = (obj: any) => Array.isArray(obj) ? obj[0] : obj;

        // 1. Process Rent Reminders (Tenants/Clients)
        logToFile('1. Processing Rent Reminders...');
        const { data: parcelas, error: parcelasError } = await supabase
            .from('parcelas')
            .select(`
                id,
                numero_parcela,
                valor,
                data_vencimento,
                transacoes (
                    id,
                    contratos (
                        id,
                        clientes (
                            id,
                            nome_completo,
                            email
                        ),
                        imoveis (
                            id,
                            logradouro,
                            numero
                        )
                    )
                )
            `)
            .gte('data_vencimento', todayStr)
            .lte('data_vencimento', dateString)
            .eq('status', 'A Vencer');

        if (parcelasError) {
            logToFile(`Rent/Parcelas Fetch Error: ${JSON.stringify(parcelasError)}`);
            throw parcelasError;
        }

        logToFile(`Found ${parcelas?.length || 0} parcelas near expiration.`);

        for (const parcela of (parcelas || [])) {
            // Check if reminder already sent for this specific installment
            const { data: alreadySent } = await supabase
                .from('historico_comunicacoes')
                .select('id')
                .eq('parcela_id', parcela.id)
                .single();

            if (alreadySent) {
                logToFile(`Skipping Rent for parcela ${parcela.id} - already sent.`);
                continue;
            }

            const transacao = extract(parcela.transacoes);
            const contrato = extract(transacao?.contratos);
            const cliente = extract(contrato?.clientes);
            const imovel = extract(contrato?.imoveis);

            if (cliente?.email) {
                const subject = `Lembrete de Vencimento: Aluguel - Parcela ${parcela.numero_parcela}`;
                const htmlContent = `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                        ${logoUrl ? `<div style="text-align: center; margin-bottom: 20px;"><img src="${logoUrl}" alt="${companyName}" style="max-width: 120px;"></div>` : ''}
                        <h2 style="color: #333;">Olá, ${cliente.nome_completo}!</h2>
                        <p>Este é um lembrete automático da <strong>${companyName}</strong>.</p>
                        <p>Sua parcela de aluguel (Nº ${parcela.numero_parcela}) do imóvel <strong>${imovel?.logradouro}, nº ${imovel?.numero || 'S/N'}</strong> vencerá em breve (${new Date(parcela.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}).</p>
                        <p><strong>Valor:</strong> R$ ${parcela.valor?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        <p>Certifique-se de realizar o pagamento até a data de vencimento.</p>
                        
                        <p><br></p>
                        <p style="text-align: center; font-size: 11px; color: #999;">***** E-mail automático, favor não responder. *****</p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                        ${footerUrl ? `<div style="text-align: center; margin-bottom: 10px;"><img src="${footerUrl}" alt="Rodapé" style="max-width: 100%;"></div>` : ''}
                        <p style="font-size: 12px; color: #777; text-align: center;">${companyName}</p>
                    </div>
                `;

                logToFile(`Sending Rent email to: ${cliente.email} (${cliente.nome_completo})`);
                try {
                    const brevoRes = await sendBrevoEmail({
                        to: [{ email: cliente.email, name: cliente.nome_completo }],
                        subject,
                        htmlContent
                    });
                    logToFile(`Brevo Response: ${JSON.stringify(brevoRes)}`);

                    await supabase.from('historico_comunicacoes').insert({
                        locatario_id: cliente.id,
                        parcela_id: parcela.id,
                        assunto: subject,
                        conteudo: htmlContent,
                        tipo_evento: 'vencimento_aluguel'
                    });

                    results.aluguel.push(cliente.email);
                } catch (err: any) {
                    logToFile(`Failed to send Rent email: ${err.message}`);
                }
            } else {
                logToFile(`Skipping rent reminder for parcela ${parcela.id}: No customer email found.`);
                console.log(`Skipping rent reminder for parcela ${parcela.id}: No customer email found.`);
            }
        }

        logToFile(`--- send-reminders finished. Success: ${JSON.stringify(results)} ---`);
        return NextResponse.json({ success: true, processed: results });
    } catch (error: any) {
        logToFile(`!!! FATAL ERROR !!!: ${error.message}`);
        console.error('Error in send-reminders:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
