"use client";

import { X, Building2, MapPin, Printer, ArrowLeft, Mail, Phone, MapPinned, Hash, UserCircle2, Calendar, ClipboardCheck, Globe, UserCheck, Share2, Eye, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface DetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    empresa: any;
}

export function DetalhesEmpresaModal({ isOpen, onClose, empresa }: DetailsModalProps) {
    const [responsaveis, setResponsaveis] = useState<any[]>([]);

    useEffect(() => {
        if (isOpen && empresa?.id) {
            fetchResponsaveis();
        }
    }, [isOpen, empresa?.id]);

    async function fetchResponsaveis() {
        const { data } = await supabase
            .from('empresa_responsaveis')
            .select('*')
            .eq('empresa_id', empresa.id);
        if (data) setResponsaveis(data);
    }

    if (!empresa) return null;

    const formatCNPJ = (cnpj: string) => {
        const cleaned = (cnpj || "").replace(/\D/g, "");
        if (cleaned.length !== 14) return cleaned;
        return cleaned.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <style dangerouslySetInnerHTML={{
                        __html: `
                            @media print {
                                @page { 
                                    size: portrait; 
                                    margin: 10mm;
                                }

                                *, *::before, *::after {
                                    -webkit-print-color-adjust: exact !important;
                                    print-color-adjust: exact !important;
                                }

                                /* 1. Esconde tudo na página com segurança e tira o fundo escuro */
                                body * {
                                    visibility: hidden !important;
                                }

                                /* 2. Garante que o container pai não corte o topo do modal ao tentar centralizar verticalmente na folha */
                                .fixed.inset-0, #modal-root > div {
                                    align-items: flex-start !important;
                                    padding: 0 !important;
                                    position: absolute !important;
                                }

                                /* 3. Revela apenas a ficha de impressão */
                                .print-container, .print-container * {
                                    visibility: visible !important;
                                }

                                /* 4. Garante fundo da folha branco */
                                html, body { 
                                    background: white !important; 
                                    width: 100% !important;
                                    height: auto !important;
                                    overflow: visible !important;
                                }

                                /* 5. Estrutura base foca no papel, removendo limites roláveis */
                                .print-container {
                                    position: absolute !important;
                                    left: 0 !important;
                                    top: 0 !important;
                                    width: 100% !important;
                                    max-width: 100% !important;
                                    display: block !important; /* Desabilita o flexbox para evitar encolhimento interno do header */
                                    background: white !important;
                                    margin: 0 !important;
                                    padding: 0 !important;
                                    border: none !important;
                                    box-shadow: none !important;
                                    height: auto !important;
                                    max-height: none !important;
                                    overflow: visible !important;
                                }

                                .print-container .custom-scrollbar,
                                .print-container .flex-1,
                                .print-container [class*="max-h-"] {
                                    overflow: visible !important;
                                    height: auto !important;
                                    max-height: none !important;
                                }

                                /* ============================================================= */
                                /* CLONE EXATO DA TELA (MAS EM FUNDO BRANCO E LETRAS PRETAS)     */
                                /* ============================================================= */

                                /* Caixas com contorno igual à tela */
                                .print-container [class*="bg-[#16212B]"],
                                .print-container [class*="bg-[#1A252F]"],
                                .print-container [class*="bg-[#101921]"] {
                                    background-color: #ffffff !important;  
                                    border: 1px solid #d1d5db !important; 
                                }

                                /* FAZ OS CARDS CRESCEREM LATERALMENTE 100% DA FOLHA (Substitui o layout lado-a-lado) */
                                .print-container [class*="grid-cols-12"] {
                                    display: flex !important;
                                    flex-direction: column !important;
                                    gap: 1.5rem !important;
                                }
                                .print-container [class*="lg:col-span-3"], 
                                .print-container [class*="lg:col-span-9"] {
                                    width: 100% !important;
                                    max-width: 100% !important;
                                }
                                
                                /* FORÇAR GRIDS INTERNOS PARA ORGANIZAR AS INFORMAÇÕES (Ex: CEP, Logradouro, etc) */
                                .print-container [class*="md:grid-cols-3"] {
                                    display: grid !important;
                                    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
                                    gap: 1.5rem !important;
                                }
                                .print-container [class*="md:grid-cols-4"] {
                                    display: grid !important;
                                    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
                                    gap: 1.5rem !important;
                                }
                                /* PRESERVAR AS DIVISÕES DE TAMANHO DOS CAMPOS NA GRID */
                                .print-container [class*="md:col-span-1"] { grid-column: span 1 / span 1 !important; }
                                .print-container [class*="md:col-span-2"] { grid-column: span 2 / span 2 !important; }
                                .print-container [class*="md:col-span-3"] { grid-column: span 3 / span 3 !important; }
                                .print-container [class*="md:col-span-4"] { grid-column: span 4 / span 4 !important; }

                                /* COMPACTAÇÃO MASTER PARA CABER EM 1 FOLHA A4 */
                                .print-container .p-8 { padding: 0.4rem 1rem !important; } /* Bordas verticais do card ultra finas */
                                .print-container > div.border-b { padding: 0.6rem 1rem !important; overflow: visible !important; height: auto !important; } /* Cabeçalho mais fino */
                                .print-container .mb-8 { margin-bottom: 0.3rem !important; } /* Título do card estourado nos dados */
                                .print-container .space-y-8 > * + * { margin-top: 0.3rem !important; } /* Cola os cards verticalmente */
                                .print-container .gap-8, .print-container .gap-6, .print-container .gap-4, .print-container .gap-10 { gap: 0.3rem !important; }
                                .print-container .gap-y-8, .print-container .gap-y-10 { row-gap: 0.3rem !important; }
                                .print-container .gap-x-10, .print-container .gap-x-12 { column-gap: 0.5rem !important; }
                                .print-container .space-y-1 > * + * { margin-top: 0 !important; } /* Rótulo bem colado ao Valor */
                                .print-container .space-y-4 > * + * { margin-top: 0.2rem !important; }
                                .print-container .p-4, .print-container .p-6, .print-container .px-6, .print-container .py-4 { padding: 0.3rem 0.5rem !important; } /* Diminui paddings genericos */
                                .print-container .text-sm { font-size: 0.75rem !important; line-height: 1.1 !important; }
                                .print-container .text-xs { font-size: 0.65rem !important; line-height: 1 !important; }
                                .print-container .text-[11px] { font-size: 0.6rem !important; line-height: 1 !important; }
                                .print-container .text-lg { font-size: 0.9rem !important; line-height: 1.1 !important; }
                                .print-container .text-2xl { font-size: 1.2rem !important; line-height: 1 !important; }
                                .print-container [class*="mt-"] { margin-top: 0.2rem !important; } /* Quebra margens de top forçadas */
                                .print-container [class*="mb-"] { margin-bottom: 0.2rem !important; }
                                .print-container [class*="pt-"] { padding-top: 0.2rem !important; }
                                .print-container [class*="w-12"] { height: 1.5rem !important; width: 1.5rem !important; } /* Reduz icones grandes */
                                .print-container [class*="h-12"] { height: 1.5rem !important; width: 1.5rem !important; }
                                .print-container [class*="w-6"] { height: 1rem !important; width: 1rem !important; }
                                .print-container [class*="h-6"] { height: 1rem !important; width: 1rem !important; }

                                /* EVITA FATIAMENTOS: Se a folha quebrar, joga o card inteiro pra baixo, não corta no meio! */
                                .print-container [class*="bg-black"],
                                .print-container [class*="bg-white"],
                                .print-container [class*="bg-panel"] {
                                    page-break-inside: avoid !important;
                                    break-inside: avoid !important;
                                }

                                /* Forçar tamanho de imagem de avatar */
                                .print-container .aspect-square {
                                    aspect-ratio: 1 / 1 !important;
                                }

                                /* Textos Principais Importantes viram Pretos Fortes */
                                .print-container [class*="text-white"],
                                .print-container h1, 
                                .print-container h3,
                                .print-container span {
                                    color: #000000 !important;
                                }

                                /* Labels/Descrições em cinza legível */
                                .print-container [class*="text-gray-400"],
                                .print-container [class*="text-gray-500"] {
                                    color: #4b5563 !important; 
                                }

                                /* Divisórias da tela convertidas em traços visíveis na folha branca */
                                .print-container [class*="border-[#1E2D3D]"],
                                .print-container [class*="border-[#2D3D4D]"] {
                                    border-color: #d1d5db !important;
                                }

                                /* Ícones limpos e cinzas */
                                .print-container svg {
                                    color: #4b5563 !important;
                                }

                                /* Retira cores fortes de crachás/tags pra não sujar a impressão */
                                .print-container [class*="text-blue-"],
                                .print-container [class*="text-emerald-"],
                                .print-container [class*="text-rose-"] {
                                    color: #000000 !important;
                                }

                                .print-container [class*="bg-blue-"],
                                .print-container [class*="bg-emerald-"],
                                .print-container [class*="bg-rose-"] {
                                    background-color: #ffffff !important;
                                    border: 1px solid #d1d5db !important;
                                    color: #000000 !important;
                                }

                                /* Oculta Botões Interativos */
                                .no-print { display: none !important; visibility: hidden !important; }

                                /* CUSTOM FOR EMPRESA MODAL CSS variables to black/white */
                                .print-container [class*="bg-black"], .print-container [class*="bg-white"], .print-container [class*="bg-panel"] {
                                    background-color: #ffffff !important;
                                }
                                .print-container [class*="text-foreground"], .print-container [class*="text-accent"], .print-container [class*="text-text-dim"] {
                                    color: #000000 !important;
                                }
                                .print-container [class*="border-panel-border"] {
                                    border-color: #d1d5db !important;
                                }
                                .print-container [class*="bg-badge-bg"] {
                                    background-color: #ffffff !important;
                                    border: 1px solid #d1d5db !important;
                                }

                            }
                    `}} />

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-background/90 backdrop-blur-xl no-print"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.98, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: 10 }}
                        className="bg-panel glass-elite w-full max-w-4xl h-full sm:h-auto sm:max-h-[90vh] rounded-none sm:rounded-[32px] shadow-2xl overflow-hidden relative z-10 border-0 sm:border border-panel-border flex flex-col font-sans print-container"
                    >

                        {/* Static Header (Always Visible) */}
                        <div className="p-5 sm:p-8 border-b border-panel-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-panel/30 dark:bg-white/5 backdrop-blur-md z-20">
                            <div className="flex items-center gap-3 sm:gap-8 min-w-0">
                                <button
                                    onClick={onClose}
                                    className="p-2 sm:px-4 sm:py-2 bg-panel border border-panel-border rounded-lg flex items-center gap-3 text-foreground hover:text-foreground transition-all group no-print shrink-0"
                                >
                                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                                    <span className="text-sm font-bold uppercase tracking-widest hidden sm:inline">Voltar</span>
                                </button>
                                <div className="min-w-0 flex-1">
                                    <h1 className="text-base sm:text-2xl font-serif-premium font-bold text-foreground tracking-tight leading-tight uppercase italic truncate">{empresa.nome_fantasia || empresa.razao_social}</h1>
                                    <p className="text-[8px] sm:text-[10px] text-text-dim font-bold uppercase tracking-[0.15em] sm:tracking-[0.3em] mt-0.5 sm:mt-2">
                                        Ficha Cadastral da Empresa • {empresa.codigo_interno || '---'}
                                    </p>
                                </div>
                                <button onClick={onClose} className="p-2 text-text-dim hover:text-foreground ml-2 sm:hidden no-print shrink-0">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 pt-4 sm:pt-0 border-t sm:border-0 border-panel-border">
                                <div className="flex flex-col items-start sm:items-center">
                                    <span className="text-[8px] sm:text-[10px] font-bold text-text-dim uppercase tracking-tighter mb-0.5 sm:mb-1">STATUS</span>
                                    <span className={cn(
                                        "text-[10px] sm:text-[11px] font-bold px-4 sm:px-6 py-1 sm:py-1.5 rounded-full shadow-sm",
                                        (empresa.status || 'Ativo') === 'Ativo' ? "bg-badge-bg text-badge-text" : "bg-rose-500/10 text-rose-500"
                                    )}>
                                        {empresa.status || 'Ativo'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={handlePrint} className="flex items-center gap-2 bg-panel border border-panel-border text-foreground hover:text-foreground px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all no-print shadow-sm">
                                        <Printer className="w-4 h-4" />
                                        <span className="hidden sm:inline">Imprimir</span>
                                    </button>
                                    <button onClick={onClose} className="hidden sm:block p-2 text-text-dim hover:text-foreground no-print">
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>
                        </div>


                        {/* Scrollable Content Area */}
                        <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar space-y-6 sm:space-y-8">


                            {/* Content Grid Area */}
                            <div className="grid grid-cols-12 gap-8">

                                {/* Left Box: DADOS JURÍDICOS */}
                                <div className="col-span-12 lg:col-span-8 bg-black/5 dark:bg-white/5 border border-panel-border rounded-xl p-8">
                                    <h3 className="text-xs font-bold text-accent uppercase tracking-wider flex items-center gap-3 mb-8">
                                        <Building2 className="w-4 h-4 text-primary" />
                                        DADOS JURÍDICOS
                                    </h3>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-8 sm:gap-y-10 gap-x-6 sm:gap-x-12">
                                        <div className="space-y-1">
                                            <p className="text-xs font-medium text-text-dim">Razão Social</p>
                                            <div className="flex items-center gap-3">
                                                <Building2 className="w-4 h-4 text-[#4392F1]" />
                                                <p className="text-sm font-bold text-foreground tracking-tight">{empresa.razao_social}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <p className="text-xs font-medium text-text-dim">Responsáveis Registrados</p>
                                            <div className="flex flex-col gap-3">
                                                {responsaveis.length > 0 ? (
                                                    responsaveis.map((resp: any, idx: number) => (
                                                        <div key={idx} className="flex items-center gap-3">
                                                            <UserCircle2 className="w-4 h-4 text-[#4392F1] shrink-0" />
                                                            <p className="text-sm font-bold text-foreground tracking-tight">{resp.nome}</p>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="flex items-center gap-3">
                                                        <UserCircle2 className="w-4 h-4 text-[#4392F1] shrink-0" />
                                                        <p className="text-sm font-bold text-foreground tracking-tight">{empresa.responsavel_legal || "Não informado"}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Localização Separada */}
                                        <div className="col-span-2 space-y-6">
                                            <div className="flex items-center gap-3 mb-2">
                                                <MapPinned className="w-4 h-4 text-primary" />
                                                <span className="text-xs font-bold text-accent uppercase tracking-widest">Endereço de Operação</span>
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-6 gap-4 sm:gap-6">
                                                <div className="col-span-2 sm:col-span-4 space-y-1">
                                                    <p className="text-xs font-medium text-text-dim">Logradouro</p>
                                                    <p className="text-sm font-bold text-foreground tracking-tight">{empresa.logradouro}</p>
                                                </div>
                                                <div className="col-span-1 sm:col-span-2 space-y-1">
                                                    <p className="text-xs font-medium text-text-dim">Número</p>
                                                    <p className="text-sm font-bold text-foreground tracking-tight">{empresa.numero}</p>
                                                </div>
                                                <div className="col-span-1 sm:col-span-2 space-y-1">
                                                    <p className="text-xs font-medium text-text-dim">Bairro</p>
                                                    <p className="text-sm font-bold text-foreground tracking-tight">{empresa.bairro}</p>
                                                </div>
                                                <div className="col-span-1 sm:col-span-3 space-y-1">
                                                    <p className="text-xs font-medium text-text-dim">Cidade</p>
                                                    <p className="text-sm font-bold text-foreground tracking-tight">{empresa.cidade}/{empresa.estado}</p>
                                                </div>
                                                <div className="col-span-1 space-y-1">
                                                    <p className="text-xs font-medium text-text-dim">CEP</p>
                                                    <p className="text-sm font-bold text-foreground tracking-tight">{empresa.cep}</p>
                                                </div>
                                            </div>

                                        </div>

                                        <div className="space-y-1">
                                            <p className="text-xs font-medium text-text-dim">CNPJ Oficial</p>
                                            <p className="text-lg font-bold text-foreground tracking-tighter">{formatCNPJ(empresa.cnpj)}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs font-medium text-text-dim">Código Unidade</p>
                                            <p className="text-lg font-bold text-foreground tracking-tighter">{empresa.codigo}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Box: DETALHES DO CADASTRO */}
                                <div className="col-span-12 lg:col-span-4 bg-black/5 dark:bg-white/5 border border-panel-border rounded-xl p-8 flex flex-col justify-between">
                                    <div>
                                        <h3 className="text-xs font-bold text-accent uppercase tracking-wider flex items-center gap-3 mb-8">
                                            <Calendar className="w-4 h-4 text-primary" />
                                            DETALHES DO CADASTRO
                                        </h3>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center bg-panel p-4 rounded-lg border border-panel-border">
                                                <span className="text-[11px] text-accent font-medium">Data de Registro</span>
                                                <span className="text-sm font-bold text-foreground tracking-tight">{new Date(empresa.created_at).toLocaleDateString('pt-BR')}</span>
                                            </div>
                                            <div className="flex justify-between items-center bg-panel p-4 rounded-lg border border-panel-border">
                                                <span className="text-[11px] text-accent font-medium">Cadastrado por</span>
                                                <span className="text-sm font-bold text-foreground tracking-tight">
                                                    {empresa.cadastrado_por || "Sistema"}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center bg-panel p-4 rounded-lg border border-panel-border">
                                                <span className="text-[11px] text-accent font-medium">Origem</span>
                                                <span className="text-sm font-bold text-foreground tracking-tight">Painel Gestor</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Bottom Area: INFORMAÇÕES PROFISSIONAIS E INTERNAS */}
                            <div className="bg-black/5 dark:bg-white/5 border border-panel-border rounded-xl p-8">
                                <h3 className="text-xs font-bold text-accent uppercase tracking-wider flex items-center gap-3 mb-8">
                                    <ClipboardCheck className="w-4 h-4 text-primary" />
                                    DOCUMENTOS
                                </h3>

                                <div className="space-y-4">
                                    <div className="bg-panel border border-panel-border rounded-xl p-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-6">
                                        <div className="flex items-center gap-4 sm:gap-6">
                                            <div className="w-12 h-12 bg-[#4392F1]/10 rounded-xl flex items-center justify-center border border-[#4392F1]/20 shrink-0">
                                                <ClipboardCheck className="w-6 h-6 text-[#4392F1]" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-foreground font-bold tracking-tight truncate">Contrato Social</p>
                                                <p className="text-xs text-text-dim font-medium mt-1">
                                                    {empresa.contrato_social_url ? "Documento verificado" : "Nenhum anexo"}
                                                </p>
                                            </div>
                                        </div>
                                        {empresa.contrato_social_url && (
                                            <a
                                                href={empresa.contrato_social_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="bg-panel border border-panel-border text-foreground px-6 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-[#2D3D4D] transition-all flex items-center justify-center gap-2 shadow-sm"
                                            >
                                                Visualizar
                                            </a>
                                        )}
                                    </div>


                                    {responsaveis.length > 0 && (
                                        <div className="pt-4 space-y-4">
                                            <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] ml-2">DOCUMENTAÇÃO DOS RESPONSÁVEIS</p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {responsaveis.map((resp) => (
                                                    <div key={resp.id} className="bg-panel border border-panel-border p-6 rounded-2xl flex flex-col gap-5 group hover:border-white/30 transition-all shadow-sm">
                                                        <div className="flex items-center gap-4 border-b border-panel-border pb-4">
                                                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold overflow-hidden border border-primary/30 shrink-0">
                                                                {resp.selfie_url ? (
                                                                    <img src={resp.selfie_url} alt="Selfie" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    resp.nome.charAt(0).toUpperCase()
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-bold text-foreground text-sm truncate">{resp.nome}</p>
                                                                <p className="text-[10px] text-text-dim uppercase tracking-widest">{resp.nacionalidade || 'Nacionalidade N/I'} • {resp.estado_civil || 'Estado Civil N/I'}</p>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <p className="text-[9px] text-text-dim uppercase tracking-[0.2em] mb-1">CPF</p>
                                                                <p className="text-xs font-semibold text-foreground">{resp.cpf ? resp.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : 'Não Informado'}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[9px] text-text-dim uppercase tracking-[0.2em] mb-1">RG / Emissor</p>
                                                                <p className="text-xs font-semibold text-foreground">{resp.rg || 'N/I'} {resp.orgao_emissor ? `- ${resp.orgao_emissor}` : ''}</p>
                                                            </div>
                                                            <div className="col-span-2">
                                                                <p className="text-[9px] text-text-dim uppercase tracking-[0.2em] mb-1">Endereço Residencial</p>
                                                                <p className="text-xs font-semibold text-foreground leading-relaxed">
                                                                    {resp.logradouro ? `${resp.logradouro}, ${resp.numero || 'S/N'} ${resp.complemento ? `(${resp.complemento})` : ''} - ${resp.bairro ? `${resp.bairro}, ` : ''}${resp.cidade || ''} - ${resp.estado || ''} ${resp.cep ? `| CEP: ${resp.cep.replace(/^(\d{5})(\d{3})$/, "$1-$2")}` : ''}` : 'Endereço não informado'}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {resp.documento_url && (
                                                            <div className="pt-2">
                                                                <a
                                                                    href={resp.documento_url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="w-full bg-[#2D3D4D]/50 border border-panel-border text-foreground py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#2D3D4D] transition-all flex items-center justify-center gap-2"
                                                                >
                                                                    <FileText className="w-3.5 h-3.5" /> Ver Documento
                                                                </a>
                                                            </div>
                                                        )}
                                                        {resp.selfie_url && (
                                                            <div className="pt-2">
                                                                <a
                                                                    href={resp.selfie_url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="flex-1 py-2 bg-white/5 rounded-lg text-[10px] font-bold text-accent hover:text-foreground hover:bg-white/10 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
                                                                    title="Visualizar Selfie"
                                                                >
                                                                    <UserCircle2 className="w-4 h-4" /> Selfie
                                                                </a>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4 mt-12">
                                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">OBSERVAÇÕES INTERNAS</p>
                                    <div className="bg-panel-border/30 border border-panel-border p-6 rounded-xl min-h-[120px] text-sm text-accent whitespace-pre-wrap">
                                        {empresa.observacoes || "Nenhuma observação interna registrada até o momento para esta unidade."}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Section */}
                        <div className="p-6 sm:p-8 border-t border-panel-border flex flex-col sm:flex-row justify-end bg-panel/30 dark:bg-white/5 backdrop-blur-md">
                            <button
                                onClick={onClose}
                                className="w-full sm:w-auto bg-[#EAEAEA] text-[#0B0B0C] px-12 py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.4em] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl"
                            >
                                Fechar Janela
                            </button>
                        </div>

                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
