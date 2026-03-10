"use client";

import { X, ArrowLeft, Printer, Building2, MapPin, FileText, FileBox, Camera, User, ExternalLink, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface ModalProps {
    isOpen: boolean;
    imovel: any | null;
    onClose: () => void;
}

export function DetalhesImovelModal({ isOpen, imovel, onClose }: ModalProps) {
    if (!isOpen || !imovel) return null;

    const handlePrint = () => {
        window.print();
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
                                <button onClick={onClose} className="px-4 py-2 bg-black/5 dark:bg-white/5 border border-panel-border rounded-xl flex items-center gap-2 hover:bg-black/10 dark:hover:bg-white/10 transition-all no-print">
                                    <ArrowLeft className="w-4 h-4 text-foreground" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-foreground">Voltar</span>
                                </button>
                                <div>
                                    <h1 className="text-3xl font-serif-premium font-bold tracking-tight text-foreground leading-none lowercase first-letter:uppercase">
                                        {imovel.nome_identificacao || imovel.tipo}
                                    </h1>
                                    <p className="text-[10px] text-accent font-black uppercase tracking-[0.3em] mt-2">
                                        Ficha Cadastral Física • {imovel.codigo_interno || '-----'} {imovel.nome_identificacao && `• ${imovel.tipo}`}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex flex-col items-center mr-4">
                                    <span className="text-[9px] font-black text-accent uppercase tracking-widest mb-1.5">STATUS DO IMÓVEL</span>
                                    <span className={cn("text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full border",
                                        imovel.status === 'Disponível' ? 'bg-accent/10 text-accent border-accent/30' :
                                            imovel.status === 'Alugado' ? 'bg-white/10 text-white border-white/30' :
                                                'bg-rose-500/10 text-rose-500 border-rose-500/30')}>
                                        {imovel.status || 'Disponível'}
                                    </span>
                                </div>
                                <button onClick={handlePrint} className="flex items-center gap-2 bg-black/5 dark:bg-white/5 border border-panel-border text-foreground hover:bg-black/10 dark:hover:bg-white/10 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all no-print shadow-sm">
                                    <Printer className="w-4 h-4" /> Imprimir
                                </button>
                                <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-xl bg-black/5 dark:bg-white/5 border border-panel-border text-accent hover:text-foreground no-print shadow-sm">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-10">
                            <div className="grid grid-cols-12 gap-10">

                                {/* Coluna Esquerda: Overview (Pills) e Endereço */}
                                <div className="col-span-12 lg:col-span-5 flex flex-col gap-8">

                                    {/* Capa Foto Opcional */}
                                    {imovel.fotos_urls && imovel.fotos_urls.length > 0 && (
                                        <div className="aspect-[4/3] bg-black/5 dark:bg-white/5 border border-panel-border rounded-[32px] overflow-hidden relative shadow-sm no-print">
                                            <img src={imovel.fotos_urls[0]} alt="Capa" className="w-full h-full object-cover" />
                                            <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-panel-border flex items-center gap-2 shadow-sm">
                                                <Camera className="w-3.5 h-3.5 text-foreground" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-foreground">{imovel.fotos_urls.length} Fotos</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Componente "Pills" Conforme o Print */}
                                    <div className="bg-black/5 dark:bg-white/5 border border-panel-border rounded-[32px] p-8">
                                        <h3 className="text-[10px] font-black text-accent uppercase tracking-[0.2em] mb-6 flex items-center gap-3"><Building2 className="w-4 h-4 text-primary" /> CARACTERÍSTICAS</h3>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-background border border-panel-border rounded-2xl py-4 px-6 shadow-sm flex items-center justify-center text-center">
                                                <span className="text-xs font-black text-accent uppercase tracking-wider mr-2">Área:</span>
                                                <span className="text-sm font-black text-foreground">{Number(imovel.area_m2 || 0)} m²</span>
                                            </div>
                                            <div className="bg-background border border-panel-border rounded-2xl py-4 px-6 shadow-sm flex items-center justify-center text-center">
                                                <span className="text-xs font-black text-accent uppercase tracking-wider mr-2">Quartos:</span>
                                                <span className="text-sm font-black text-foreground">{imovel.quartos || 0}</span>
                                            </div>
                                            <div className="bg-background border border-panel-border rounded-2xl py-4 px-6 shadow-sm flex items-center justify-center text-center">
                                                <span className="text-xs font-black text-accent uppercase tracking-wider mr-2">Suítes:</span>
                                                <span className="text-sm font-black text-foreground">{imovel.suites || 0}</span>
                                            </div>
                                            <div className="bg-background border border-panel-border rounded-2xl py-4 px-6 shadow-sm flex items-center justify-center text-center">
                                                <span className="text-xs font-black text-accent uppercase tracking-wider mr-2">Banheiros:</span>
                                                <span className="text-sm font-black text-foreground">{imovel.banheiros || 0}</span>
                                            </div>
                                            <div className="bg-background border border-panel-border rounded-2xl py-4 px-6 shadow-sm flex items-center justify-center text-center">
                                                <span className="text-xs font-black text-accent uppercase tracking-wider mr-2">Vagas:</span>
                                                <span className="text-sm font-black text-foreground">{imovel.vagas || 0}</span>
                                            </div>
                                            {imovel.andar_imovel && (
                                                <div className="bg-background border border-panel-border rounded-2xl py-4 px-6 shadow-sm flex items-center justify-center text-center">
                                                    <span className="text-xs font-black text-accent uppercase tracking-wider mr-2">Andar:</span>
                                                    <span className="text-sm font-black text-foreground">{imovel.andar_imovel}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                </div>

                                {/* Coluna Direita: Detalhamentos */}
                                <div className="col-span-12 lg:col-span-7 space-y-8">

                                    {/* Precificação e Tipo */}
                                    <div className="bg-black/5 dark:bg-white/5 border border-panel-border rounded-[32px] p-8">
                                        <div className="grid grid-cols-2 gap-8">
                                            <div className="space-y-4">
                                                <div className="space-y-1 text-center">
                                                    <p className="text-[10px] font-black text-accent uppercase tracking-widest">Valor Aluguel R$</p>
                                                    <p className="text-3xl font-serif-premium font-bold text-white">R$ {Number(imovel.valor_aluguel || 0).toLocaleString('pt-br', { minimumFractionDigits: 2 })}</p>
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <div className="space-y-1 text-center">
                                                    <p className="text-[10px] font-black text-accent uppercase tracking-widest">Valor Condomínio R$</p>
                                                    <p className="text-2xl font-serif-premium font-bold text-foreground">R$ {Number(imovel.valor_condominio || 0).toLocaleString('pt-br', { minimumFractionDigits: 2 })}</p>
                                                </div>
                                            </div>
                                            <div className="col-span-2 flex justify-center mt-2">
                                                <div className="inline-flex items-center gap-2 px-6 py-2 bg-background border border-panel-border rounded-xl shadow-sm">
                                                    <span className="text-[10px] font-black uppercase text-accent tracking-widest">Tipo Local:</span>
                                                    <span className="text-sm font-black text-foreground">{imovel.tipo_aluguel || 'Residencial'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Endereço */}
                                    <div className="bg-black/5 dark:bg-white/5 border border-panel-border rounded-[32px] p-8">
                                        <h3 className="text-[10px] font-black text-accent uppercase tracking-[0.2em] mb-6 flex items-center gap-3"><MapPin className="w-4 h-4 text-primary" /> LOCALIZAÇÃO</h3>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
                                            <div className="space-y-1 col-span-2">
                                                <p className="text-[10px] font-black text-accent uppercase tracking-widest">Logradouro Completo</p>
                                                <p className="text-sm font-bold text-foreground">{imovel.logradouro || '-'} {imovel.numero ? `, Nº ${imovel.numero}` : ''} {imovel.complemento ? `(${imovel.complemento})` : ''}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black text-accent uppercase tracking-widest">Bairro</p>
                                                <p className="text-sm font-bold text-foreground">{imovel.bairro || '-'}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black text-accent uppercase tracking-widest">CEP</p>
                                                <p className="text-sm font-bold text-foreground">{imovel.cep || '-'}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black text-accent uppercase tracking-widest">Cidade</p>
                                                <p className="text-sm font-bold text-foreground">{imovel.cidade || '-'}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black text-accent uppercase tracking-widest">UF</p>
                                                <p className="text-sm font-bold text-foreground">{imovel.estado || '-'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Matrícula e Numerações */}
                                    <div className="bg-black/5 dark:bg-white/5 border border-panel-border rounded-[32px] p-8">
                                        <h3 className="text-[10px] font-black text-accent uppercase tracking-[0.2em] mb-6 flex items-center gap-3"><FileBox className="w-4 h-4 text-primary" /> REGISTROS OFICIAIS</h3>

                                        <div className="grid grid-cols-2 gap-y-8 gap-x-12">
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black text-accent uppercase tracking-widest">Inscrição IPTU</p>
                                                <p className="text-[13px] font-bold text-foreground">
                                                    {imovel.inscricao_iptu || 'N/A'}
                                                    {imovel.iptu_vencimento ? ` (Venc: ${new Date(imovel.iptu_vencimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })})` : ''}
                                                </p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black text-accent uppercase tracking-widest">Matrícula (Cartório)</p>
                                                <p className="text-[13px] font-bold text-foreground">{imovel.num_matricula || 'N/A'}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black text-accent uppercase tracking-widest">Nº Energisa</p>
                                                <p className="text-[13px] font-bold text-foreground">{imovel.num_energisa || 'N/A'}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black text-accent uppercase tracking-widest">Nº CAGEPA</p>
                                                <p className="text-[13px] font-bold text-foreground">{imovel.num_cagepa || 'N/A'}</p>
                                            </div>

                                            {imovel.arquivo_matricula_url && (
                                                <div className="col-span-2 pt-4 border-t border-panel-border">
                                                    <a href={imovel.arquivo_matricula_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 bg-background border border-panel-border rounded-2xl hover:border-primary transition-all group no-print">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/20 group-hover:bg-white group-hover:text-white text-white transition-all">
                                                                <FileText className="w-5 h-5" />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-foreground">Visualizar Arquivo de Matrícula</p>
                                                                <p className="text-[10px] font-black uppercase text-accent tracking-widest mt-0.5">Versão Anexada no Disco Virtual</p>
                                                            </div>
                                                        </div>
                                                        <ExternalLink className="w-4 h-4 text-accent group-hover:text-primary transition-colors" />
                                                    </a>
                                                </div>
                                            )}

                                            {imovel.iptu_pdf_url && (
                                                <div className="col-span-2 pt-4 border-t border-panel-border">
                                                    <a href={imovel.iptu_pdf_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 bg-background border border-panel-border rounded-2xl hover:border-primary transition-all group no-print">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/20 group-hover:bg-white group-hover:text-white text-white transition-all">
                                                                <FileBox className="w-5 h-5" />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-foreground">Visualizar Boleto IPTU</p>
                                                                <p className="text-[10px] font-black uppercase text-accent tracking-widest mt-0.5">Documento de Arrecadação Salvo</p>
                                                            </div>
                                                        </div>
                                                        <ExternalLink className="w-4 h-4 text-accent group-hover:text-primary transition-colors" />
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Prop and Empresa */}
                                    <div className="bg-black/5 dark:bg-white/5 border border-panel-border rounded-[32px] p-8">
                                        <h3 className="text-[10px] font-black text-accent uppercase tracking-[0.2em] mb-6 flex items-center gap-3"><User className="w-4 h-4 text-primary" /> RESPONSÁVEIS VINCULADOS</h3>

                                        <div className="grid grid-cols-2 gap-y-8 gap-x-12">
                                            <div className="space-y-2">
                                                <p className="text-[10px] font-black text-accent uppercase tracking-widest">Empresa Administradora</p>
                                                <div className="bg-background border border-panel-border rounded-xl px-5 py-3 shadow-sm flex items-center gap-3">
                                                    <Building2 className="w-5 h-5 text-accent" />
                                                    <p className="text-sm font-bold text-foreground">{imovel.empresas?.nome_fantasia || 'Nenhuma Envolvida'}</p>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <p className="text-[10px] font-black text-accent uppercase tracking-widest">Proprietário</p>
                                                <div className="bg-background border border-panel-border rounded-xl px-5 py-3 shadow-sm flex items-center gap-3">
                                                    <User className="w-5 h-5 text-accent" />
                                                    <p className="text-sm font-bold text-foreground">{imovel.proprietarios?.nome_completo || 'Nenhum'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </div>

                            {/* Galeria de Fotos Completa (Opcional - Escondida na Impressão se mt Grande) */}
                            {imovel.fotos_urls && imovel.fotos_urls.length > 1 && (
                                <div className="mt-8 pt-8 border-t border-panel-border no-print">
                                    <h3 className="text-[10px] font-black text-accent uppercase tracking-[0.2em] mb-6 flex items-center gap-3"><Camera className="w-4 h-4 text-primary" /> GALERIA DE FOTOS</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                        {imovel.fotos_urls.map((url: string, idx: number) => (
                                            <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="aspect-[4/3] bg-black/5 dark:bg-white/5 rounded-2xl overflow-hidden border border-panel-border group hover:border-primary transition-all shadow-sm">
                                                <img src={url} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

                        </div>

                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

