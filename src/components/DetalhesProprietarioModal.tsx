"use client";

import { X, ArrowLeft, Printer, MapPin, User, FileText, ExternalLink, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface ModalProps {
    isOpen: boolean;
    proprietario: any | null;
    onClose: () => void;
}

export function DetalhesProprietarioModal({ isOpen, proprietario, onClose }: ModalProps) {
    if (!isOpen || !proprietario) return null;

    const handlePrint = () => {
        window.print();
    };

    const formatId = (val: string) => {
        if (!val) return "-";
        const c = val.replace(/\D/g, "");
        if (c.length === 11) return c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
        if (c.length === 14) return c.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
        return val;
    };

    const formatPhone = (val: string) => {
        if (!val) return "-";
        const c = val.replace(/\D/g, "");
        if (c.length === 11) return c.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
        if (c.length === 10) return c.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
        return val;
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-8">
                    <style dangerouslySetInnerHTML={{
                        __html: `
                            @media print {
                                @page { size: A4 portrait; margin: 10mm; }
                                body * { visibility: hidden; }
                                .print-container, .print-container * { visibility: visible; overflow: visible !important; }
                                .print-container {
                                    position: absolute; left: 0; top: 0; width: 100%; max-width: 100%;
                                    box-shadow: none !important; border: none !important;
                                    color: #000 !important; font-family: 'Inter', sans-serif !important;
                                    background: white !important;
                                    height: auto !important; max-height: none !important;
                                }
                                
                                /* Compaction for Print */
                                .print-container .p-10 { padding: 4mm 0 !important; }
                                .print-container .p-8 { padding: 4mm !important; }
                                .print-container .gap-10 { gap: 4mm !important; }
                                .print-container .gap-8 { gap: 4mm !important; }
                                .print-container .gap-4 { gap: 2mm !important; }
                                .print-container .gap-y-8 { row-gap: 4mm !important; }
                                .print-container .space-y-10 > :not([hidden]) ~ :not([hidden]) { margin-top: 4mm !important; }
                                .print-container .space-y-8 > :not([hidden]) ~ :not([hidden]) { margin-top: 4mm !important; }
                                .print-container .py-6 { padding-top: 4mm !important; padding-bottom: 4mm !important; }
                                .print-container .mb-6 { margin-bottom: 3mm !important; }
                                .print-container .py-4 { padding-top: 2mm !important; padding-bottom: 2mm !important; }
                                
                                .print-container [class*="bg-black"], .print-container [class*="bg-white"], .print-container [class*="bg-panel"] {
                                    background-color: transparent !important;
                                }
                                .print-container .grid { display: grid !important; }
                                .no-print { display: none !important; visibility: hidden !important; }
                                * { color: black !important; border-color: #ddd !important; }
                                ::-webkit-scrollbar { display: none !important; }
                            }
                    `}} />

                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
                        className="absolute inset-0 bg-background/90 backdrop-blur-xl no-print" />

                    <motion.div initial={{ opacity: 0, scale: 0.98, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98, y: 10 }}
                        className="bg-panel glass-elite w-full max-w-5xl max-h-[90vh] rounded-[32px] overflow-hidden relative z-10 border border-panel-border flex flex-col font-sans print-container shadow-2xl">

                        {/* Header */}
                        <div className="px-8 py-6 border-b border-panel-border flex items-center justify-between bg-panel/30 dark:bg-white/5 backdrop-blur-md z-20">
                            <div className="flex items-center gap-6">
                                <button onClick={onClose} className="px-4 py-2 bg-background border border-panel-border rounded-xl flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 transition-all no-print">
                                    <ArrowLeft className="w-4 h-4 text-foreground" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-foreground">Voltar</span>
                                </button>
                                <div>
                                    <h1 className="text-3xl font-serif-premium font-bold tracking-tight text-foreground leading-none lowercase first-letter:uppercase">
                                        {proprietario.nome_completo}
                                    </h1>
                                    <p className="text-[10px] text-accent font-black uppercase tracking-[0.3em] mt-2">
                                        Ficha do Proprietário • #{proprietario.codigo_interno || '-----'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex flex-col items-center mr-4">
                                    <span className={cn("text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full border",
                                        proprietario.tipo === 'PF' ? 'bg-white/10 text-white border-white/30' : 'bg-orange-500/10 text-orange-500 border-orange-500/30'
                                    )}>
                                        {proprietario.tipo === 'PF' ? 'PESSOA FÍSICA' : 'PESSOA JURÍDICA'}
                                    </span>
                                </div>
                                <button onClick={handlePrint} className="flex items-center gap-2 bg-background border border-panel-border text-foreground hover:bg-black/5 dark:hover:bg-white/5 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all no-print shadow-sm">
                                    <Printer className="w-4 h-4" /> Imprimir
                                </button>
                                <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-xl bg-background border border-panel-border text-accent hover:text-foreground no-print shadow-sm">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-10">
                            <div className="grid grid-cols-12 gap-10">

                                {/* Coluna 1: Documentos e Resumo */}
                                <div className="col-span-12 flex flex-col gap-8">
                                    {/* Capa Selfie Opcional */}
                                    {proprietario.documento_selfie_url && (
                                        <div className="aspect-[4/4] max-w-[280px] mx-auto bg-black/5 dark:bg-white/5 border border-panel-border rounded-[32px] overflow-hidden relative shadow-sm no-print">
                                            <img src={proprietario.documento_selfie_url} alt="Selfie" className="w-full h-full object-cover" />
                                            <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-panel-border flex items-center gap-2 shadow-sm">
                                                <User className="w-3.5 h-3.5 text-foreground" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-foreground">Selfie Autenticada</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Resumo */}
                                    <div className="bg-black/[0.02] dark:bg-white/[0.02] border border-panel-border rounded-[32px] p-8">
                                        <h3 className="text-[10px] font-black text-accent uppercase tracking-[0.2em] mb-6 flex items-center gap-3"><ShieldCheck className="w-4 h-4 text-primary" /> IDENTIFICAÇÃO OFICIAL</h3>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="bg-background border border-panel-border rounded-2xl py-4 px-6 shadow-sm flex items-center justify-between">
                                                <span className="text-[10px] font-black text-accent uppercase tracking-widest">Documento (CPF/CNPJ)</span>
                                                <span className="text-sm font-bold text-foreground">{formatId(proprietario.documento)}</span>
                                            </div>
                                            <div className="bg-background border border-panel-border rounded-2xl py-4 px-6 shadow-sm flex flex-col items-start gap-1">
                                                <span className="text-[10px] font-black text-accent uppercase tracking-widest">Email</span>
                                                <span className="text-sm font-bold text-foreground truncate w-full">{proprietario.email || 'Não informado'}</span>
                                            </div>
                                            <div className="bg-background border border-panel-border rounded-2xl py-4 px-6 shadow-sm flex items-center justify-between">
                                                <span className="text-[10px] font-black text-accent uppercase tracking-widest">Contato</span>
                                                <span className="text-sm font-bold text-accent">{proprietario.telefone ? formatPhone(proprietario.telefone) : 'Não informado'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Documento Anexado */}
                                    {proprietario.documento_identidade_url && (
                                        <div className="bg-black/[0.02] dark:bg-white/[0.02] border border-panel-border rounded-[32px] p-8 mt-auto">
                                            <h3 className="text-[10px] font-black text-accent uppercase tracking-[0.2em] mb-6 flex items-center gap-3"><FileText className="w-4 h-4 text-primary" /> DOCS EM ANEXO</h3>
                                            <a href={proprietario.documento_identidade_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 bg-background border border-panel-border rounded-2xl hover:border-primary transition-all group no-print">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 group-hover:bg-primary group-hover:text-primary-foreground text-primary transition-all">
                                                        <FileText className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[13px] font-bold text-foreground">Visualizar Arquivo</p>
                                                        <p className="text-[9px] font-black uppercase text-accent tracking-widest mt-0.5">{proprietario.tipo === 'PF' ? 'Identidade / CNH' : 'Contrato Social'}</p>
                                                    </div>
                                                </div>
                                                <ExternalLink className="w-4 h-4 text-accent group-hover:text-primary transition-colors" />
                                            </a>
                                            <div className="hidden print-container:block text-xs font-bold border border-gray-300 p-4 rounded-lg bg-gray-50 uppercase tracking-widest text-center">
                                                * Documento Físico Anexado Digitalmente *
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Coluna 2: Detalhamentos Endereço */}
                                <div className="col-span-12 space-y-8">
                                    <div className="bg-black/[0.02] dark:bg-white/[0.02] border border-panel-border rounded-[32px] p-8">
                                        <h3 className="text-[10px] font-black text-accent uppercase tracking-[0.2em] mb-6 flex items-center gap-3"><MapPin className="w-4 h-4 text-primary" /> ENDEREÇO / ORIGEM</h3>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
                                            <div className="space-y-1 col-span-2">
                                                <p className="text-[10px] font-black text-accent uppercase tracking-widest border-b border-panel-border pb-1 mb-2">Logradouro Completo</p>
                                                <p className="text-[15px] font-bold text-foreground tracking-tight">{proprietario.logradouro || '-'} {proprietario.numero ? `, Nº ${proprietario.numero}` : ''} {proprietario.complemento ? `(${proprietario.complemento})` : ''}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black text-accent uppercase tracking-widest border-b border-panel-border pb-1 mb-2">Bairro</p>
                                                <p className="text-[13px] font-bold text-foreground">{proprietario.bairro || '-'}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black text-accent uppercase tracking-widest border-b border-panel-border pb-1 mb-2">CEP</p>
                                                <p className="text-[13px] font-bold text-foreground">{proprietario.cep || '-'}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black text-accent uppercase tracking-widest border-b border-panel-border pb-1 mb-2">Cidade</p>
                                                <p className="text-[13px] font-bold text-foreground">{proprietario.cidade || '-'}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black text-accent uppercase tracking-widest border-b border-panel-border pb-1 mb-2">UF</p>
                                                <p className="text-[13px] font-bold text-foreground border border-panel-border w-fit px-3 py-1 rounded bg-background inline-block">{proprietario.estado || '-'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>

                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
