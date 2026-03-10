/**
 * Utilitários de Storage — Limpeza de arquivos no Supabase Storage
 */
import { supabaseStorage } from "@/lib/supabaseStorage";

const BUCKET = 'documentos';

/**
 * Extrai o path do storage a partir de uma URL pública do Supabase.
 * Exemplo: https://xxx.supabase.co/storage/v1/object/public/documentos/clientes/abc/doc.webp
 * Retorna: clientes/abc/doc.webp
 */
export function extractStoragePath(publicUrl: string): string | null {
    if (!publicUrl) return null;
    const marker = `/storage/v1/object/public/${BUCKET}/`;
    const idx = publicUrl.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(publicUrl.substring(idx + marker.length));
}

/**
 * Deleta um ou mais arquivos do storage a partir de suas URLs públicas.
 * Ignora URLs vazias ou inválidas silenciosamente.
 */
export async function deleteStorageByUrls(urls: (string | null | undefined)[]) {
    const paths = urls
        .filter(Boolean)
        .map(u => extractStoragePath(u!))
        .filter(Boolean) as string[];

    if (paths.length === 0) return;

    console.log('[StorageUtils] Removendo arquivos:', paths);
    const { error } = await supabaseStorage.storage.from(BUCKET).remove(paths);
    if (error) {
        console.error('[StorageUtils] Erro ao remover arquivos:', error.message);
    }
}

/**
 * Deleta todos os arquivos de uma pasta (prefixo) do storage.
 * Útil quando os arquivos estão organizados em pastas por entidade.
 * Ex: deleteStorageFolder('imoveis/0001') → remove tudo dentro dessa pasta.
 */
export async function deleteStorageFolder(prefix: string) {
    if (!prefix) return;

    try {
        const { data: files, error: listError } = await supabaseStorage.storage
            .from(BUCKET)
            .list(prefix, { limit: 200 });

        if (listError || !files || files.length === 0) return;

        const paths = files.map(f => `${prefix}/${f.name}`);
        console.log(`[StorageUtils] Removendo pasta "${prefix}" (${paths.length} arquivo(s)):`, paths);

        const { error } = await supabaseStorage.storage.from(BUCKET).remove(paths);
        if (error) {
            console.error('[StorageUtils] Erro ao remover pasta:', error.message);
        }
    } catch (e: any) {
        console.error('[StorageUtils] Erro ao listar pasta:', e.message);
    }
}
