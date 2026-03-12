import { NextResponse } from 'next/server';
import { supabase, supabaseStorage } from '@/lib/supabase';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';

export async function GET() {
    try {
        const zip = new JSZip();

        // 1. Definir as entidades e tabelas
        const entities = [
            { name: 'Clientes', table: 'clientes', folder: 'Clientes' },
            { name: 'Alugueis', table: 'alugueis', folder: 'Alugueis' },
            { name: 'Imoveis', table: 'imoveis', folder: 'Imoveis' },
            { name: 'Proprietarios', table: 'proprietarios', folder: 'Proprietarios' },
            { name: 'Empresas', table: 'empresas', folder: 'Empresas' },
            { name: 'Contratos', table: 'contratos', folder: 'Contratos' },
            { name: 'Financeiro', table: 'parcelas', folder: 'Financeiro' },
        ];

        // 2. Processar Dados do Banco e Gerar Planilhas
        for (const entity of entities) {
            const { data, error } = await supabase.from(entity.table).select('*');
            
            if (!error && data && data.length > 0) {
                // Criar Worksheet
                const ws = XLSX.utils.json_to_sheet(data);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, entity.name);
                
                // Gerar Buffer
                const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
                
                // Adicionar ao ZIP
                zip.file(`${entity.folder}/${entity.name.toLowerCase()}_dados.xlsx`, excelBuffer);
            }
        }

        // 3. Processar Arquivos do Storage (Recursivo para subpastas de IDs)
        const storageBuckets = ['documentos']; // Bucket principal de anexos

        for (const bucket of storageBuckets) {
            const { data: rootItems, error: listError } = await supabaseStorage.storage.from(bucket).list();

            if (!listError && rootItems) {
                for (const item of rootItems) {
                    // Identificar para qual pasta de entidade este item pertence
                    let entityFolder = item.name.charAt(0).toUpperCase() + item.name.slice(1);
                    if (item.name === 'alugueis') entityFolder = 'Alugueis';
                    if (item.name === 'proprietarios') entityFolder = 'Proprietarios';
                    if (item.name === 'transacoes') entityFolder = 'Financeiro';

                    // Se for uma "pasta" (tem metadados nulos ou é identificada como tal)
                    // Vamos listar o conteúdo dela (ex: clientes/ID_X/)
                    const { data: subItems, error: subError } = await supabaseStorage.storage.from(bucket).list(item.name);
                    
                    if (!subError && subItems) {
                        for (const subItem of subItems) {
                            // Se o subItem for um arquivo (tem id ou metadata)
                            if (subItem.id) {
                                try {
                                    const { data: fileData } = await supabaseStorage.storage
                                        .from(bucket)
                                        .download(`${item.name}/${subItem.name}`);
                                    
                                    if (fileData) {
                                        const buffer = await fileData.arrayBuffer();
                                        zip.file(`${entityFolder}/${subItem.name}`, buffer);
                                    }
                                } catch (e) {
                                    console.error(`Erro ao baixar ${item.name}/${subItem.name}`, e);
                                }
                            } else {
                                // Se for outra subpasta (ex: /clientes/123/)
                                // Listamos os arquivos dentro dela
                                const { data: deepFiles, error: deepError } = await supabaseStorage.storage
                                    .from(bucket)
                                    .list(`${item.name}/${subItem.name}`);
                                
                                if (!deepError && deepFiles) {
                                    for (const deepFile of deepFiles) {
                                        try {
                                            const { data: fileData } = await supabaseStorage.storage
                                                .from(bucket)
                                                .download(`${item.name}/${subItem.name}/${deepFile.name}`);
                                            
                                            if (fileData) {
                                                const buffer = await fileData.arrayBuffer();
                                                zip.file(`${entityFolder}/${subItem.name}/${deepFile.name}`, buffer);
                                            }
                                        } catch (e) {
                                            console.error(`Erro ao baixar ${item.name}/${subItem.name}/${deepFile.name}`, e);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // 4. Gerar o ZIP final
        const zipContent = await zip.generateAsync({ type: 'blob' });
        
        // 5. Retornar o arquivo para download
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `Backup_Gestimob_${timestamp}.zip`;

        return new NextResponse(zipContent, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });

    } catch (error: any) {
        console.error('Erro ao gerar backup:', error);
        return NextResponse.json({ error: 'Falha ao gerar backup: ' + error.message }, { status: 500 });
    }
}
