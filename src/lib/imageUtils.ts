/**
 * Comprime e converte uma imagem para WebP usando Canvas API.
 * @param file O arquivo de imagem original.
 * @param quality Qualidade da compressão (0 a 1).
 * @returns Um Blob da imagem convertida para WebP.
 */
export async function compressAndConvertToWebP(file: File, quality: number = 0.8): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");

                // Redimensionamento básico se for muito grande (opcional)
                const MAX_WIDTH = 1200;
                let width = img.width;
                let height = img.height;

                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }

                canvas.width = width;
                canvas.height = height;

                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    canvas.toBlob(
                        (blob) => {
                            if (blob) {
                                resolve(blob);
                            } else {
                                reject(new Error("Falha ao converter para WebP"));
                            }
                        },
                        "image/webp",
                        quality
                    );
                } else {
                    reject(new Error("Não foi possível obter o contexto do canvas"));
                }
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
}
