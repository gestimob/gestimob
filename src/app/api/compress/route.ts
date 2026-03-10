
import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore
import initGhostscript from '@jspawn/ghostscript-wasm';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const profile = formData.get('profile') as string;

        if (!file) {
            return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
        }

        const buffer = await file.arrayBuffer();
        const inputData = new Uint8Array(buffer);

        // Caminho do WASM
        const wasmPath = path.join(process.cwd(), 'node_modules', '@jspawn', 'ghostscript-wasm', 'gs.wasm');

        // Inicializa o módulo Ghostscript com carregamento via instantiateWasm (mais robusto no Node)
        const module: any = await initGhostscript({
            instantiateWasm: (importObject: any, receiveInstance: any) => {
                const wasmBinary = fs.readFileSync(wasmPath);
                WebAssembly.instantiate(wasmBinary, importObject).then((result) => {
                    receiveInstance(result.instance, result.module);
                });
                return {};
            },
            print: (text: string) => console.log(`[GS] ${text}`),
            printErr: (text: string) => console.error(`[GS Error] ${text}`),
        });

        // Grava no sistema de arquivos virtual
        module.FS.writeFile('input.pdf', inputData);

        // No WASM do jspawn, o callMain já espera os argumentos do GS
        const gsArgs = [
            '-sDEVICE=pdfwrite',
            '-dCompatibilityLevel=1.4',
            '-dPDFSETTINGS=/ebook', // Base segura
            '-dNOPAUSE',
            '-dQUIET',
            '-dBATCH',
            '-dEmbedAllFonts=false',
            '-dSubsetFonts=true',
            '-dColorImageDownsampleType=/Bicubic',
            '-dColorImageResolution=150',
            '-dGrayImageDownsampleType=/Bicubic',
            '-dGrayImageResolution=150',
            '-dMonoImageDownsampleType=/Bicubic',
            '-dMonoImageResolution=150',
            '-sOutputFile=output.pdf',
        ];

        if (profile === 'mobile') {
            // Mais agressivo para mobile (scans de foto)
            gsArgs.push(
                '-dPDFSETTINGS=/screen',
                '-dDownsampleColorImages=true',
                '-dDownsampleGrayImages=true',
                '-dDownsampleMonoImages=true',
                '-dColorImageResolution=150',
                '-dGrayImageResolution=150',
                '-dMonoImageResolution=150'
            );
        }

        gsArgs.push('input.pdf');

        // Executa o Ghostscript
        module.callMain(gsArgs);

        // Lê o resultado
        const outputData = module.FS.readFile('output.pdf');

        return new Response(outputData, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="compressed_${file.name}"`,
            },
        });
    } catch (error: any) {
        console.error('Erro na compressão PDF:', error);
        return NextResponse.json({ error: `Erro na compressão: ${error.message}` }, { status: 500 });
    }
}
