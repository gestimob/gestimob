
/**
 * Utilitários de Processamento de Documentos - Sistema Imobiliário
 */

/**
 * Converte uma imagem para WebP com 70% de qualidade.
 */
export const convertToWebP = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0);
                canvas.toBlob((blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error('Conversion failed'));
                }, 'image/webp', 0.70);
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    });
};

/**
 * Prepara o PDF para processamento via Ghostscript no backend (API Interna).
 * Identifica se é mobile para aplicar downsampling de 150dpi ou /ebook para digital.
 */
export const processPDF = async (file: File): Promise<{ blob: Blob | File, gsCommand: string }> => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const profile = isMobile ? 'mobile' : 'ebook';

    console.log(`[DocumentProcessor] Solicitando compressão PDF (${profile}): ${file.name}`);

    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('profile', profile);

        const response = await fetch('/api/compress', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Erro na API de compressão: ${response.statusText}`);
        }

        const compressedBlob = await response.blob();

        // REGRA DE OURO: Se a compressão ficou maior que o original, usa o original
        if (compressedBlob.size >= file.size) {
            console.log(`[DocumentProcessor] Compressão descartada (${(compressedBlob.size / 1024).toFixed(0)}kb). O original (${(file.size / 1024).toFixed(0)}kb) é menor.`);
            return { blob: file, gsCommand: "original (menor que comprimido)" };
        }

        console.log(`[DocumentProcessor] PDF comprimido: ${(file.size / 1024).toFixed(0)}kb -> ${(compressedBlob.size / 1024).toFixed(0)}kb. Redução: ${((1 - compressedBlob.size / file.size) * 100).toFixed(2)}%`);

        return {
            blob: new File([compressedBlob], file.name, { type: 'application/pdf' }),
            gsCommand: `gs -dPDFSETTINGS=/${profile === 'mobile' ? 'screen' : 'ebook'}`
        };
    } catch (e) {
        console.error('[DocumentProcessor] Falha ao comprimir PDF, usando original:', e);
        return { blob: file, gsCommand: "original (falha na compressão)" };
    }
};
