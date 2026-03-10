"use client";

import { useState, useEffect } from "react";
import { X, ArrowLeft, Printer, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";

interface ModalProps {
    isOpen: boolean;
    contrato: any | null;
    onClose: () => void;
}

export function DetalhesContratoModal({ isOpen, contrato, onClose }: ModalProps) {
    const [config, setConfig] = useState<any>(null);

    useEffect(() => {
        if (isOpen) {
            fetchConfig();
        }
    }, [isOpen]);

    const fetchConfig = async () => {
        const { data } = await supabase
            .from('configuracoes')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
        if (data) setConfig(data);
    };

    if (!isOpen || !contrato) return null;

    const handlePrint = () => {
        const printContent = document.querySelector('.print-a4-surface');
        if (!printContent) return;

        const printWindow = window.open('', '_blank', 'width=800,height=600');
        if (!printWindow) return;

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Contrato - {contrato.codigo_contrato || '-----'}</title>

                <style>
                    @page {
                        size: A4 portrait;
                        margin: 8mm 15mm 6mm 15mm;
                        @bottom-right {
                            content: "Pág. " counter(page) "/" counter(pages);
                            font-size: 8pt;
                            color: #333;
                            font-family: Arial, Helvetica, sans-serif;
                        }
                    }
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body {
                        font-family: Arial, Helvetica, sans-serif;
                        font-size: 10pt;
                        line-height: 1.5;
                        color: black;
                        background: white;
                        width: 100%;
                    }
                    p, div, span, li, td, th {
                        text-align: justify;
                        max-width: 100%;
                        overflow-wrap: break-word;
                        word-wrap: break-word;
                    }

                    /* Tabela principal para layout */
                    .print-table {
                        width: 100%;
                        border-collapse: collapse;
                    }
                    .print-table td {
                        padding: 0;
                        vertical-align: top;
                        border: none;
                    }

                    /* Espaçador no tfoot - reserva espaço para o rodapé fixo */
                    .footer-spacer td {
                        height: 30mm;
                    }

                    /* Rodapé FIXO - position:fixed garante mesma posição em TODAS as páginas */
                    .fixed-footer-wrapper {
                        position: fixed;
                        bottom: 0;
                        left: 0;
                        width: 100%;
                        text-align: center;
                        z-index: 10000;
                    }
                    .contract-footer-text {
                        font-size: 8pt;
                        line-height: 1.3;
                        color: #333;
                        text-align: center;
                        padding: 1mm 0;
                    }
                    .contract-footer-text div,
                    .contract-footer-text p,
                    .contract-footer-text span {
                        text-align: center;
                    }
                    .contract-footer-image {
                        display: block;
                        width: 100%;
                        max-height: 18mm;
                        object-fit: contain;
                    }


                    /* Cabeçalho e conteúdo */
                    .contract-header {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        width: 100%;
                        min-height: 100px;
                        margin-bottom: 15px;
                        position: relative;
                        overflow: visible;
                    }
                    .contract-logo-container {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .contract-logo-img {
                        max-width: 30mm;
                        max-height: 22mm;
                        object-fit: contain;
                    }
                    .contract-title-box {
                        position: absolute;
                        right: 0;
                        top: 50%;
                        transform: translateY(-50%);
                        width: 55mm;
                        font-weight: bold;
                        font-size: 9.5pt;
                        text-transform: uppercase;
                        text-align: justify;
                        line-height: 1.2;
                        letter-spacing: 0.03em;
                        overflow: visible;
                    }
                    .contract-body-text {
                        width: 100%;
                    }
                    .contract-body-text > div {
                        margin-bottom: 12px;
                    }
                    .signature-section,
                    .signature-section div,
                    .signature-section p {
                        text-align: center;
                    }
                    img {
                        max-width: 100%;
                    }
                    strong, b {
                        font-weight: bold;
                    }
                    table table {
                        width: 100%;
                        border-collapse: collapse;
                    }
                    .space-y-6 > * + * {
                        margin-top: 12px;
                    }
                    .mb-8 {
                        margin-bottom: 16px;
                    }
                    .mt-12 {
                        margin-top: 32px;
                    }
                    .no-print {
                        display: none;
                    }
                </style>
            </head>
            <body>
                <table class="print-table">
                    <thead>
                        <tr>
                            <td>
                                <div class="contract-header">
                                    <div class="contract-logo-container">
                                        ${config?.logo_url ? `<img src="${config.logo_url}" alt="Logo" class="contract-logo-img" />` : ''}
                                    </div>
                                    <div class="contract-title-box">
                                        ${instrumentoTexto || 'INSTRUMENTO PARTICULAR DE CONTRATO DE LOCAÇÃO'}
                                    </div>
                                </div>
                            </td>
                        </tr>
                    </thead>
                    <tfoot>
                        <tr class="footer-spacer">
                            <td>&nbsp;</td>
                        </tr>
                    </tfoot>
                    <tbody>
                        <tr>
                            <td>${printContent.innerHTML}</td>
                        </tr>
                    </tbody>
                </table>

                <!-- Rodapé FIXO - aparece na mesma posição em TODAS as páginas -->
                <div class="fixed-footer-wrapper">
                    ${contrato.texto_rodape ? `<div class="contract-footer-text">${contrato.texto_rodape}</div>` : ''}
                    ${config?.rodape_url ? `<img src="${config.rodape_url}" alt="Rodapé" class="contract-footer-image" />` : ''}
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();

        // Remover o cabeçalho duplicado que veio do printContent.innerHTML (já está no thead)
        const headerInBody = printWindow.document.querySelector('tbody .contract-header');
        if (headerInBody) headerInBody.remove();

        // Detectar mobile
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        const triggerPrint = () => {
            printWindow.focus();
            printWindow.print();
            // No mobile não fecha a janela para permitir salvar como PDF
            if (!isMobile) {
                printWindow.close();
            }
        };

        // Aguardar imagens carregarem antes de imprimir
        const images = printWindow.document.querySelectorAll('img');
        let loaded = 0;
        const total = images.length;

        if (total === 0) {
            triggerPrint();
            return;
        }

        images.forEach((img: HTMLImageElement) => {
            if (img.complete) {
                loaded++;
                if (loaded >= total) {
                    triggerPrint();
                }
            } else {
                img.onload = img.onerror = () => {
                    loaded++;
                    if (loaded >= total) {
                        triggerPrint();
                    }
                };
            }
        });
    };

    const locatarioNome = contrato.clientes?.nome_completo || 'Locatário não identificado';

    const getInstrumentoTexto = () => {
        if (!contrato.cabecalho_contrato) return null;
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = contrato.cabecalho_contrato;
        const cleanText = (tempDiv.innerText || tempDiv.textContent || "").trim();

        const match = cleanText.match(/DECLARA/i);
        if (match && match.index !== undefined) {
            return cleanText.substring(0, match.index + 7).toUpperCase() + ".";
        }
        return cleanText.toUpperCase();
    };

    const getIntroTexto = () => {
        if (!contrato.cabecalho_contrato) return null;
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = contrato.cabecalho_contrato;
        const cleanText = (tempDiv.innerText || tempDiv.textContent || "").trim();

        const match = cleanText.match(/DECLARA/i);
        if (match && match.index !== undefined) {
            let resto = cleanText.substring(match.index + 8).trim();
            // Remove pontos ou separadores iniciais
            resto = resto.replace(/^[.\s:]+/, '');
            return resto;
        }
        return null;
    };

    const instrumentoTexto = getInstrumentoTexto();
    const introTexto = getIntroTexto();

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 md:p-8 modal-outer">

                    <style dangerouslySetInnerHTML={{
                        __html: `
                             @media print {
                                @page { 
                                    size: A4 portrait; 
                                    margin: 15mm 30mm 15mm 30mm !important; 
                                }
                                
                                * {
                                    box-shadow: none !important;
                                    overflow-wrap: break-word !important;
                                    word-wrap: break-word !important;
                                }

                                html, body, #__next, [data-framer-portal-id], .modal-outer { 
                                    margin: 0 !important;
                                    padding: 0 !important;
                                    height: auto !important;
                                    width: auto !important;
                                    max-width: 100% !important;
                                    background: white !important;
                                    visibility: hidden !important;
                                    overflow: visible !important;
                                    position: static !important;
                                    display: block !important;
                                    inset: auto !important;
                                    z-index: auto !important;
                                }
                                
                                .print-container, .print-container * { 
                                    visibility: visible !important; 
                                }
                                
                                .no-print { 
                                    display: none !important; 
                                }
                                
                                .print-container {
                                    position: static !important;
                                    display: block !important;
                                    width: auto !important;
                                    max-width: 100% !important;
                                    max-height: none !important;
                                    margin: 0 !important;
                                    padding: 0 !important;
                                    overflow: visible !important;
                                    float: none !important;
                                    border: none !important;
                                    border-radius: 0 !important;
                                    background: white !important;
                                    flex-direction: unset !important;
                                }

                                .content-body-wrapper {
                                    display: block !important;
                                    width: auto !important;
                                    max-width: 100% !important;
                                    padding: 0 !important;
                                    margin: 0 !important;
                                    overflow: visible !important;
                                    background: white !important;
                                    flex: unset !important;
                                    align-items: unset !important;
                                }

                                .contract-text {
                                    width: auto !important;
                                    max-width: 100% !important;
                                    min-height: 0 !important;
                                    padding: 0 !important;
                                    margin: 0 !important;
                                    background: white !important;
                                    flex-shrink: unset !important;
                                }

                                .contract-body-text, .contract-body-text p, .contract-body-text div { 
                                    font-family: Arial, Helvetica, sans-serif !important;
                                    font-size: 11pt !important; 
                                    line-height: 1.5 !important; 
                                    text-align: justify !important;
                                    color: black !important;
                                    max-width: 100% !important;
                                    overflow-wrap: break-word !important;
                                }
                                
                                .signature-section, .signature-section div, .signature-section p {
                                    text-align: center !important;
                                    display: flex !important;
                                    flex-direction: column !important;
                                    align-items: center !important;
                                    justify-content: center !important;
                                    width: 100% !important;
                                }

                                .signature-section div[style*="border-top"], .signature-section hr {
                                    margin: 0 auto !important;
                                    width: 250px !important;
                                }

                                .print-a4-surface {
                                    margin: 0 !important;
                                    width: 100% !important;
                                    max-width: 100% !important;
                                    padding: 0 !important;
                                    padding-bottom: 30mm !important; 
                                    min-height: 0 !important;
                                    position: static !important;
                                    border: none !important;
                                    overflow: hidden !important;
                                }

                                .contract-header {
                                    display: flex !important;
                                    align-items: center !important;
                                    justify-content: center !important;
                                    width: 100% !important;
                                    max-width: 100% !important;
                                    min-height: 25mm !important;
                                    margin-bottom: 5mm !important;
                                    position: relative !important;
                                    overflow: hidden !important;
                                }

                                .contract-logo-container {
                                    display: flex !important;
                                    align-items: center !important;
                                    justify-content: center !important;
                                }

                                .contract-logo-img {
                                    max-width: 40mm !important;
                                    max-height: 30mm !important;
                                    object-fit: contain !important;
                                }

                                .contract-title-box {
                                    position: absolute !important;
                                    right: 0 !important;
                                    top: 50% !important;
                                    transform: translateY(-50%) !important;
                                    width: 55mm !important;
                                    border: none !important;
                                    padding: 0 !important;
                                    font-weight: bold !important;
                                    font-size: 9.5pt !important;
                                    text-transform: uppercase !important;
                                    text-align: justify !important;
                                    line-height: 1.2 !important;
                                    letter-spacing: 0.03em !important;
                                    color: black !important;
                                }

                                @media (max-width: 640px) {
                                    .contract-header {
                                        flex-direction: column !important;
                                        align-items: center !important;
                                        min-height: auto !important;
                                        gap: 15px !important;
                                        padding-top: 10px !important;
                                    }
                                    .contract-logo-container {
                                        width: 100% !important;
                                        justify-content: center !important;
                                    }
                                    .contract-logo-img {
                                        max-width: 50mm !important;
                                        max-height: 25mm !important;
                                    }
                                    .contract-title-box {
                                        position: static !important;
                                        transform: none !important;
                                        width: 100% !important;
                                        text-align: center !important;
                                        font-size: 9pt !important;
                                        padding: 0 5mm !important;
                                    }
                                    .print-a4-surface {
                                        padding: 5mm !important;
                                    }
                                }

                                .contract-footer-image {
                                    display: block !important;
                                    position: fixed !important;
                                    bottom: 0 !important;
                                    left: 0 !important;
                                    width: 100% !important;
                                    max-height: 20mm !important;
                                    object-fit: contain !important;
                                    z-index: 10000 !important;
                                }
                            }

                            /* Estilos para visualização no modal (Preview) */
                                .contract-header {
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    width: 100%;
                                    min-height: 120px;
                                    margin-bottom: 2rem;
                                    position: relative;
                                }
                                .contract-logo-container {
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    width: 200px;
                                }
                                .contract-logo-img {
                                    max-width: 100%;
                                    max-height: 120px;
                                    object-fit: contain;
                                }
                                .contract-title-box {
                                    position: absolute;
                                    right: 0;
                                    top: 50%;
                                    transform: translateY(-50%);
                                    width: 280px;
                                    border: none;
                                    padding: 0.5rem;
                                    font-weight: 800;
                                    font-size: 14px;
                                    text-transform: uppercase;
                                    color: black;
                                    line-height: 1.3;
                                    letter-spacing: 0.05em;
                                    text-align: justify;
                                }

                                @media (max-width: 640px) {
                                    .contract-header {
                                        flex-direction: column !important;
                                        min-height: auto !important;
                                        gap: 1rem;
                                        margin-bottom: 1.5rem;
                                    }
                                    .contract-logo-container {
                                        width: 100% !important;
                                    }
                                    .contract-logo-img {
                                        max-height: 80px !important;
                                    }
                                    .contract-title-box {
                                        position: static !important;
                                        transform: none !important;
                                        width: 100% !important;
                                        text-align: center !important;
                                        font-size: 11px !important;
                                    }
                                }
                        `
                    }} />

                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
                        className="absolute inset-0 bg-background/90 backdrop-blur-xl no-print" />

                    <motion.div initial={{ opacity: 0, scale: 0.98, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98, y: 10 }}
                        className="bg-panel glass-elite w-full max-w-5xl h-full sm:h-auto sm:max-h-[90vh] rounded-none sm:rounded-[32px] overflow-hidden relative z-10 border-0 sm:border border-panel-border flex flex-col font-sans print-container shadow-2xl">


                        {/* Header UI */}
                        <div className="px-4 sm:px-8 py-4 sm:py-6 border-b border-panel-border flex flex-col sm:flex-row items-center sm:items-center justify-between gap-4 bg-panel/30 dark:bg-white/5 backdrop-blur-md z-20 no-print">
                            <div className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto">
                                <button onClick={onClose} className="p-2 sm:px-4 sm:py-2 bg-background border border-panel-border rounded-xl flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 transition-all shadow-sm">
                                    <ArrowLeft className="w-4 h-4 text-foreground" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-foreground hidden sm:inline">Voltar</span>
                                </button>
                                <div className="min-w-0 flex-1 sm:flex-none">
                                    <h1 className="text-base sm:text-2xl font-serif-premium font-bold tracking-tight text-foreground leading-tight truncate">
                                        Contrato - {contrato.codigo_contrato || '-----'}
                                    </h1>
                                    <p className="text-[7px] sm:text-[10px] text-accent font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] mt-0.5 sm:mt-1 truncate opacity-80">
                                        LOCATÁRIO: {locatarioNome}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-end">
                                {contrato.status === 'Finalizado' && contrato.contrato_assinado_url && (
                                    <a
                                        href={contrato.contrato_assinado_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn-elite h-10 sm:h-auto px-3 sm:px-6 py-2 sm:py-2.5 flex items-center gap-2 bg-white/10 border-white/30 text-blue-400 text-[9px] sm:text-xs"
                                    >
                                        <ExternalLink className="w-4 h-4 shrink-0" /> <span className="hidden sm:inline">Ver Contrato Assinado</span>
                                    </a>
                                )}
                                <button onClick={handlePrint} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-background border border-panel-border text-foreground hover:bg-black/5 dark:hover:bg-white/5 px-4 sm:px-6 py-2.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all shadow-sm">
                                    <Printer className="w-4 h-4" /> PDF
                                </button>
                                <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-xl bg-background border border-panel-border text-accent hover:text-foreground shadow-sm shrink-0">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>


                        {/* Content Body */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-10 flex flex-col items-center bg-black/5 dark:bg-white/5 custom-scrollbar content-body-wrapper">
                            <div className="w-full max-w-[210mm] min-h-[0 sm:min-h-[297mm]] bg-white text-black p-[10mm] sm:p-[20mm] shadow-md shrink-0 contract-text print-a4-surface">


                                {/* Cabeçalho: Logo (Centro) + Título (Direita Absoluta) */}
                                <div className="contract-header">
                                    <div className="contract-logo-container">
                                        {config?.logo_url ? (
                                            <img src={config.logo_url} alt="Logo" className="contract-logo-img" />
                                        ) : (
                                            <div className="w-full h-12 border border-dashed border-gray-300 flex items-center justify-center text-[10px] text-gray-400 no-print">
                                                Logo
                                            </div>
                                        )}
                                    </div>

                                    <div className="contract-title-box">
                                        {instrumentoTexto || "INSTRUMENTO PARTICULAR DE CONTRATO DE LOCAÇÃO"}
                                    </div>
                                </div>

                                {/* Conteúdo do Contrato */}
                                <div className="space-y-6 contract-body-text">
                                    {introTexto && (
                                        <div className="mb-8 text-justify leading-relaxed whitespace-pre-wrap">
                                            {/* Destacamos CONTRATO DE LOCAÇÃO se presente */}
                                            {introTexto.split(/(CONTRATO DE LOCAÇÃO[^,]*)/i).map((part, i) =>
                                                /CONTRATO DE LOCAÇÃO/i.test(part) ? <strong key={i} className="font-bold">{part.toUpperCase()}</strong> : part
                                            )}
                                        </div>
                                    )}

                                    {contrato.texto_partes && (
                                        <div dangerouslySetInnerHTML={{ __html: contrato.texto_partes }} className="leading-relaxed" />
                                    )}

                                    {contrato.negocio_juridico && (
                                        <div dangerouslySetInnerHTML={{ __html: contrato.negocio_juridico }} className="leading-relaxed" />
                                    )}

                                    {contrato.objeto_locacao && (
                                        <div dangerouslySetInnerHTML={{ __html: contrato.objeto_locacao }} className="leading-relaxed" />
                                    )}

                                    {contrato.objetivo_finalidade && (
                                        <div dangerouslySetInnerHTML={{ __html: contrato.objetivo_finalidade }} className="leading-relaxed" />
                                    )}

                                    {contrato.prazo_locacao && (
                                        <div dangerouslySetInnerHTML={{ __html: contrato.prazo_locacao }} className="leading-relaxed" />
                                    )}

                                    {contrato.preco_locacao && (
                                        <div dangerouslySetInnerHTML={{ __html: contrato.preco_locacao }} className="leading-relaxed" />
                                    )}

                                    {contrato.clausulas_gerais && (
                                        <div dangerouslySetInnerHTML={{ __html: contrato.clausulas_gerais }} className="leading-relaxed" />
                                    )}

                                    {contrato.texto_assinaturas && (
                                        <div
                                            dangerouslySetInnerHTML={{ __html: contrato.texto_assinaturas }}
                                            className="leading-relaxed mt-12 signature-section"
                                        />
                                    )}
                                </div>


                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
