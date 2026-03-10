export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
        }

        const buffer = await file.arrayBuffer();
        const outputData = new Uint8Array(buffer);

        // Retorna o arquivo original por enquanto.
        // O ambiente Edge (Cloudflare Pages) não suporta binários WASM complexos que
        // dependem de sistema de arquivos local ('fs') como o Ghostscript atual usava.
        return new Response(outputData, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="compressed_${file.name}"`,
            },
        });
    } catch (error: any) {
        console.error('Erro na manipulação do PDF:', error);
        return NextResponse.json({ error: `Erro na api: ${error.message}` }, { status: 500 });
    }
}
