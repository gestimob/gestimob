import { createWorker } from 'tesseract.js';

/**
 * OCR Processor Utility for System
 * Uses tesseract.js for client-side text extraction.
 */

export interface OCRResult {
    rawText: string;
    extractedData: {
        cpf?: string;
        cnpj?: string;
        name?: string;
        dates?: string[];
        rg?: string;
    };
}

/**
 * Extracts text from an image file and attempts to parse common patterns.
 */
export const performOCR = async (file: File): Promise<OCRResult> => {
    const worker = await createWorker('por'); // Portuguese language

    try {
        const imageUrl = URL.createObjectURL(file);
        const { data: { text } } = await worker.recognize(imageUrl);
        URL.revokeObjectURL(imageUrl);

        const extracted = parseExtractedText(text);

        return {
            rawText: text,
            extractedData: extracted
        };
    } catch (error) {
        console.error('[OCRProcessor] Error recognizing text:', error);
        throw error;
    } finally {
        await worker.terminate();
    }
};

/**
 * Parses raw text to find CPF, CNPJ, Dates, and Names.
 */
const parseExtractedText = (text: string) => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const cleanedText = text.replace(/[\n\r]/g, ' ');

    // Patterns - more flexible (optional punctuation)
    // Matches with punctuation or just raw digits
    const cpfPattern = /(\d{3}[.\s]?\d{3}[.\s]?\d{3}[-\s]?\d{2})|(\d{11})/g;
    const cnpjPattern = /(\d{2}[.\s]?\d{3}[.\s]?\d{3}[\/\s]?\d{4}[-\s]?\d{2})|(\d{14})/g;
    const datePattern = /\d{2}\/\d{2}\/\d{4}/g;
    const rgPattern = /(\d{1,2}[.\s]?\d{3}[.\s]?\d{3}[-\s]?\d{1,2})|(\d{7,9})/g;

    const cpfs = cleanedText.match(cpfPattern) || [];
    const cnpjs = cleanedText.match(cnpjPattern) || [];
    const dates = cleanedText.match(datePattern) || [];
    const rgs = cleanedText.match(rgPattern) || [];

    // Helper to clean numeric results
    const cleanNumeric = (val?: string) => val ? val.replace(/\D/g, '') : undefined;

    // Heuristic for name: look for longer uppercase lines, excludes common document headers
    const stopwords = [
        'CPF', 'CNPJ', 'REPÚBLICA', 'FEDERATIVA', 'IDENTIDADE', 'CARTEIRA', 'NACIONAL',
        'ESTADO', 'GOVERNO', 'SECRETARIA', 'SEGURANÇA', 'MINISTÉRIO', 'DETRAN', 'HABILITAÇÃO',
        'REGISTRO', 'GERAL', 'ÓRGÃO', 'EXPEDIDOR', 'VALIDADE', 'ASSINATURA', 'BRASIL', 'DEPARTAMENTO'
    ];

    let nameCandidates = lines.filter(line => {
        const upper = line.toUpperCase();
        return (
            line.length > 8 &&
            /^[A-ZÀ-Ú\s.\-,]+$/i.test(line) && // Includes some punctuation that OCR might add
            !stopwords.some(sw => upper.includes(sw)) &&
            !/\d/.test(line) // Name shouldn't have numbers
        );
    });

    // If multiple candidates, usually the name is in the first few lines of an ID or at the top of a contract
    let bestName = nameCandidates[0];

    // Attempt to normalize the name (if it's all uppercase, just leave it, or title case if preferred)
    // Here we'll just return the raw string and let the component handle it.

    return {
        cpf: cleanNumeric(cpfs[0]),
        cnpj: cleanNumeric(cnpjs[0]),
        name: bestName?.trim(),
        dates: dates,
        rg: cleanNumeric(rgs[0])
    };
};
