"use client";

import { X, Printer, ArrowLeft, Mail, Phone, MapPinned, Hash, UserCircle2, Calendar, ClipboardCheck, UserCheck, Share2, Fingerprint, Heart, Briefcase, Banknote, Building2, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface DetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    cliente: any;
}

export function DetalhesClienteModal({ isOpen, onClose, cliente }: DetailsModalProps) {
    if (!cliente) return null;

    const isPF = cliente.tipo === 'PF';
    const isMarried = isPF && (cliente.estado_civil === 'Casado(a)' || cliente.estado_civil === 'União estável');
    const isPF_local = cliente.tipo === 'PF';

    const formatId = (val: string, type: string) => {
        if (!val) return "---";
        const c = val.replace(/\D/g, "");
        if (type === "PF") return c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
        if (c.length === 14) return c.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
        return val;
    };

    const formatPhone = (value: string | undefined | null) => {
        if (!value) return "---";
        let val = value.replace(/\D/g, "");
        if (!val) return "---";
        if (val.length <= 2) {
            return `(${val}`;
        }
        if (val.length <= 6) {
            return `(${val.slice(0, 2)}) ${val.slice(2)}`;
        }
        if (val.length <= 10) {
            return `(${val.slice(0, 2)}) ${val.slice(2, 6)}-${val.slice(6)}`;
        }
        return `(${val.slice(0, 2)}) ${val.slice(2, 7)}-${val.slice(7, 11)}`;
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
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

                                /* COMPACTAÇÃO: REDUZIR ESPAÇOS PARA CABER EM 1 FOLHA (Apenas na Impressão) */
                                .print-container .p-8 { padding: 0.5rem 1.25rem !important; } /* Amassa as bordas verticais do card */
                                .print-container > div.border-b { padding: 1.5rem !important; overflow: visible !important; height: auto !important; } /* Protege o cabeçalho de cortes na borda */
                                .print-container .mb-8 { margin-bottom: 0.5rem !important; } /* Título do card mais colado aos dados */
                                .print-container .space-y-8 > * + * { margin-top: 0.5rem !important; } /* Cola os cards verticalmente */
                                .print-container .gap-8, .print-container .gap-10 { gap: 0.5rem !important; }
                                .print-container .gap-y-8 { row-gap: 0.5rem !important; }
                                .print-container .gap-x-10 { column-gap: 1rem !important; }
                                .print-container .space-y-1 > * + * { margin-top: 0 !important; } /* Rótulo bem colado ao Valor */
                                .print-container .text-sm { font-size: 0.8rem !important; line-height: 1.2 !important; } /* Fonte minimamente enxuta */
                                
                                /* EVITA FATIAMENTOS: Se a folha quebrar, joga o card inteiro pra baixo, não corta no meio! */
                                .print-container [class*="bg-[#16212B]"],
                                .print-container [class*="bg-[#1A252F]"] {
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
                        className="bg-panel glass-elite w-full max-w-5xl h-full sm:h-auto sm:max-h-[90vh] rounded-none sm:rounded-[32px] shadow-2xl overflow-hidden relative z-10 border-0 sm:border border-panel-border flex flex-col font-sans print-container"
                    >

                        {/* Header */}
                        <div className="p-5 sm:p-8 border-b border-panel-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-panel/30 dark:bg-white/5 backdrop-blur-md z-20">
                            <div className="flex items-center gap-3 sm:gap-8 min-w-0">
                                <button
                                    onClick={onClose}
                                    className="p-2 sm:px-4 sm:py-2 bg-black/5 dark:bg-white/5 border border-panel-border rounded-lg flex items-center gap-3 text-foreground hover:text-foreground transition-all group no-print shrink-0"
                                >
                                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                                    <span className="text-sm font-bold uppercase tracking-widest hidden sm:inline">Voltar</span>
                                </button>
                                <div className="min-w-0 flex-1">
                                    <h1 className="text-base sm:text-2xl font-serif-premium font-bold text-foreground tracking-tight leading-tight uppercase italic truncate">
                                        {cliente.nome_completo || cliente.razao_social}
                                    </h1>
                                    <p className="text-[8px] sm:text-[10px] text-text-dim font-bold uppercase tracking-[0.15em] sm:tracking-[0.3em] mt-0.5 sm:mt-2">
                                        Ficha Cadastral • {isPF ? 'Pessoa Física' : 'Pessoa Jurídica'}
                                    </p>
                                </div>
                                <button onClick={onClose} className="p-2 text-text-dim hover:text-foreground ml-2 sm:hidden no-print shrink-0">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 pt-4 sm:pt-0 border-t sm:border-0 border-panel-border">
                                <div className="flex flex-col items-start sm:items-center">
                                    <span className="text-[8px] sm:text-[10px] font-bold text-text-dim uppercase tracking-tighter mb-0.5 sm:mb-1">CÓDIGO</span>
                                    <span className="text-xs sm:text-sm font-bold text-primary">
                                        {cliente.codigo_interno}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handlePrint}
                                        className="flex items-center gap-2 bg-black/5 dark:bg-white/5 border border-panel-border text-foreground hover:bg-black/10 dark:hover:bg-white/10 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all no-print shadow-sm"
                                    >
                                        <Printer className="w-4 h-4" />
                                        <span className="hidden sm:inline">Imprimir</span>
                                    </button>
                                    <button onClick={onClose} className="hidden sm:block p-2 text-text-dim hover:text-foreground no-print underline underline-offset-4 decoration-accent/30 text-[10px] uppercase font-black tracking-widest cursor-pointer">
                                        <X className="w-6 h-6 text-accent" />
                                    </button>
                                </div>
                            </div>
                        </div>


                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar space-y-6 sm:space-y-8">

                            <div className="grid grid-cols-12 gap-8">

                                {/* Photo / Avatar box */}
                                <div className="col-span-12 lg:col-span-3 flex flex-col gap-6 no-print">
                                    <div className="aspect-square bg-black/5 dark:bg-white/5 border border-panel-border rounded-3xl overflow-hidden flex items-center justify-center relative group">
                                        {cliente.selfie_url ? (
                                            cliente.selfie_url.toLowerCase().endsWith('.pdf') ? (
                                                <a href={cliente.selfie_url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 p-4 text-primary hover:text-white transition-all w-full h-full justify-center bg-primary/5 hover:bg-primary/20">
                                                    <FileText className="w-16 h-16" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Ver PDF da Foto</span>
                                                </a>
                                            ) : (
                                                <img src={cliente.selfie_url} alt="Foto" className="w-full h-full object-cover" />
                                            )
                                        ) : (
                                            <UserCircle2 className="w-20 h-20 text-text-dim" />
                                        )}
                                        {cliente.selfie_url && !cliente.selfie_url.toLowerCase().endsWith('.pdf') && (
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                                                <span className="text-[8px] font-black text-foreground uppercase tracking-[0.2em]">Foto de Identificação</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-black/5 dark:bg-white/5 border border-panel-border rounded-xl p-6 space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] text-text-dim font-bold uppercase">Status</span>
                                            <span className={cn(
                                                "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                                                (cliente.status || "Ativo") === "Ativo"
                                                    ? "bg-white/10 text-white border-white/20"
                                                    : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                                            )}>
                                                {cliente.status || "Ativo"}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] text-text-dim font-bold uppercase">Papel</span>
                                            <span className="text-xs font-bold text-foreground uppercase">{cliente.papel || 'Locatário'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Main Data */}
                                <div className="col-span-12 lg:col-span-9 space-y-8">
                                    <div className="bg-black/5 dark:bg-white/5 border border-panel-border rounded-xl p-8">
                                        <h3 className="text-xs font-bold text-accent uppercase tracking-wider flex items-center gap-3 mb-8">
                                            <Fingerprint className="w-4 h-4 text-primary" />
                                            DADOS DE IDENTIFICAÇÃO
                                        </h3>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-y-8 gap-x-10">
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-medium text-text-dim uppercase">Documento ({cliente.tipo})</p>
                                                <p className="text-sm font-bold text-foreground tracking-tight">{formatId(cliente.documento, cliente.tipo)}</p>
                                            </div>
                                            {isPF ? (
                                                <>
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] font-medium text-text-dim uppercase">RG</p>
                                                        <p className="text-sm font-bold text-foreground tracking-tight">{cliente.rg || "---"}</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] font-medium text-text-dim uppercase">Órgão Expedidor</p>
                                                        <p className="text-sm font-bold text-foreground tracking-tight">{cliente.orgao_expedidor || "---"}</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] font-medium text-text-dim uppercase">Nascimento</p>
                                                        <p className="text-sm font-bold text-foreground tracking-tight">
                                                            {cliente.data_nascimento ? new Date(cliente.data_nascimento).toLocaleDateString('pt-BR') : "---"}
                                                        </p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] font-medium text-text-dim uppercase">Sexo</p>
                                                        <p className="text-sm font-bold text-foreground tracking-tight uppercase">{cliente.sexo || "---"}</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] font-medium text-text-dim uppercase">Estado Civil</p>
                                                        <div className="flex items-center gap-2">
                                                            <Heart className="w-3.5 h-3.5 text-accent" />
                                                            <p className="text-sm font-bold text-foreground tracking-tight">{cliente.estado_civil || "---"}</p>
                                                        </div>
                                                    </div>
                                                    <div className="md:col-span-1 space-y-1">
                                                        <p className="text-[10px] font-medium text-text-dim uppercase">Naturalidade</p>
                                                        <p className="text-sm font-bold text-foreground tracking-tight uppercase">{cliente.naturalidade || "---"}</p>
                                                    </div>
                                                    <div className="md:col-span-1 space-y-1">
                                                        <p className="text-[10px] font-medium text-text-dim uppercase">Nacionalidade</p>
                                                        <p className="text-sm font-bold text-foreground tracking-tight uppercase">{cliente.nacionalidade || "---"}</p>
                                                    </div>
                                                    <div className="md:col-span-1 space-y-1">
                                                        <p className="text-[10px] font-medium text-text-dim uppercase">Dependentes</p>
                                                        <p className="text-sm font-bold text-foreground tracking-tight">{cliente.num_dependentes || "0"}</p>
                                                    </div>
                                                    <div className="md:col-span-3 space-y-1">
                                                        <p className="text-[10px] font-medium text-text-dim uppercase">Filiação</p>
                                                        <p className="text-sm font-bold text-foreground tracking-tight uppercase italic">{cliente.filiacao || "---"}</p>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] font-medium text-text-dim uppercase">Nome Fantasia</p>
                                                        <p className="text-sm font-bold text-foreground tracking-tight uppercase">{cliente.nome_fantasia || "---"}</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] font-medium text-text-dim uppercase">Insc. Estadual</p>
                                                        <p className="text-sm font-bold text-foreground tracking-tight">{cliente.inscricao_estadual || "---"}</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] font-medium text-text-dim uppercase">Data Abertura</p>
                                                        <p className="text-sm font-bold text-foreground tracking-tight">
                                                            {cliente.data_abertura ? new Date(cliente.data_abertura).toLocaleDateString('pt-BR') : "---"}
                                                        </p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] font-medium text-text-dim uppercase">Pessoa de Contato</p>
                                                        <p className="text-sm font-bold text-foreground tracking-tight uppercase">{cliente.pessoa_contato || "---"}</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] font-medium text-text-dim uppercase">Telefone Contato</p>
                                                        <p className="text-sm font-bold text-foreground tracking-tight">{formatPhone(cliente.pessoa_contato_tel)}</p>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Contact Data */}
                                    <div className="bg-black/5 dark:bg-white/5 border border-panel-border rounded-xl p-8">
                                        <h3 className="text-xs font-bold text-accent uppercase tracking-wider flex items-center gap-3 mb-8">
                                            <Mail className="w-4 h-4 text-primary" />
                                            DADOS DE CONTATO
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-medium text-text-dim uppercase">E-mail Principal</p>
                                                <div className="flex items-center gap-2">
                                                    <Mail className="w-3.5 h-3.5 text-primary" />
                                                    <p className="text-sm font-bold text-foreground tracking-tight lowercase">{cliente.email || "---"}</p>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-medium text-text-dim uppercase">Celular / WhatsApp</p>
                                                <div className="flex items-center gap-2">
                                                    <Phone className="w-3.5 h-3.5 text-primary" />
                                                    <p className="text-sm font-bold text-foreground tracking-tight">{formatPhone(cliente.celular)}</p>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-medium text-text-dim uppercase">Telefone Fixo</p>
                                                <p className="text-sm font-bold text-foreground tracking-tight">{formatPhone(cliente.telefone)}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Localização */}
                                    <div className="bg-black/5 dark:bg-white/5 border border-panel-border rounded-xl p-8">
                                        <h3 className="text-xs font-bold text-accent uppercase tracking-wider flex items-center gap-3 mb-8">
                                            <MapPinned className="w-4 h-4 text-primary" />
                                            LOCALIZAÇÃO RESIDENCIAL / FISCAL
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-y-8 gap-x-8">
                                            <div className="md:col-span-1 space-y-1">
                                                <p className="text-[10px] font-medium text-text-dim uppercase">CEP</p>
                                                <p className="text-sm font-bold text-foreground tracking-tight">{cliente.cep || "---"}</p>
                                            </div>
                                            <div className="md:col-span-2 space-y-1">
                                                <p className="text-[10px] font-medium text-text-dim uppercase">Logradouro</p>
                                                <p className="text-sm font-bold text-foreground tracking-tight uppercase">{cliente.logradouro || "---"}</p>
                                            </div>
                                            <div className="md:col-span-1 space-y-1">
                                                <p className="text-[10px] font-medium text-text-dim uppercase">Número</p>
                                                <p className="text-sm font-bold text-foreground tracking-tight">{cliente.numero || "---"}</p>
                                            </div>
                                            <div className="md:col-span-1 space-y-1">
                                                <p className="text-[10px] font-medium text-text-dim uppercase">Complemento</p>
                                                <p className="text-sm font-bold text-foreground tracking-tight uppercase">{cliente.complemento || "---"}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-medium text-text-dim uppercase">Bairro</p>
                                                <p className="text-sm font-bold text-foreground tracking-tight uppercase">{cliente.bairro || "---"}</p>
                                            </div>
                                            <div className="md:col-span-1 space-y-1">
                                                <p className="text-[10px] font-medium text-text-dim uppercase">Cidade / UF</p>
                                                <p className="text-sm font-bold text-foreground tracking-tight uppercase">{cliente.cidade || "---"} - {cliente.estado || "--"}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-medium text-text-dim uppercase">Residência</p>
                                                <p className="text-sm font-bold text-foreground tracking-tight uppercase">{cliente.tipo_residencia || "---"}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-medium text-text-dim uppercase">Valor Aluguel</p>
                                                <p className="text-sm font-bold text-foreground tracking-tight">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cliente.valor_aluguel || 0)}
                                                </p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-medium text-text-dim uppercase">Tempo Residência</p>
                                                <p className="text-sm font-bold text-foreground tracking-tight">{cliente.tempo_residencia || "---"}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Professional (PF Only) or Business Extra (PJ Only) */}
                            <div className="bg-black/5 dark:bg-white/5 border border-panel-border rounded-xl p-8">
                                <h3 className="text-xs font-bold text-accent uppercase tracking-wider flex items-center gap-3 mb-8">
                                    {isPF ? <Briefcase className="w-4 h-4 text-primary" /> : <Building2 className="w-4 h-4 text-primary" />}
                                    {isPF ? 'DADOS PROFISSIONAIS E RENDA' : 'DADOS ADICIONAIS DA EMPRESA'}
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-y-8 gap-x-10">
                                    {isPF ? (
                                        <>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-medium text-text-dim uppercase">Profissão</p>
                                                <p className="text-sm font-bold text-foreground tracking-tight uppercase">{cliente.profissao || "---"}</p>
                                            </div>
                                            <div className="space-y-1 md:col-span-2">
                                                <p className="text-[10px] font-medium text-text-dim uppercase">Atividade / Ramo</p>
                                                <p className="text-sm font-bold text-foreground tracking-tight uppercase">{cliente.atividade || "---"}</p>
                                            </div>
                                            <div className="space-y-1 md:col-span-2">
                                                <p className="text-[10px] font-medium text-text-dim uppercase">Empresa de Trabalho</p>
                                                <p className="text-sm font-bold text-foreground tracking-tight uppercase italic">{cliente.empresa_trabalho || "---"}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-medium text-text-dim uppercase">CNPJ Empresa</p>
                                                <p className="text-sm font-bold text-foreground tracking-tight">{formatId(cliente.empresa_cnpj, 'PJ')}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-medium text-text-dim uppercase">Cargo / Função</p>
                                                <p className="text-sm font-bold text-foreground tracking-tight uppercase">{cliente.cargo_funcao || "---"}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-medium text-text-dim uppercase">Data Admissão</p>
                                                <p className="text-sm font-bold text-foreground tracking-tight">
                                                    {cliente.data_admissao ? new Date(cliente.data_admissao).toLocaleDateString('pt-BR') : "---"}
                                                </p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-medium text-text-dim uppercase">Telefone RH</p>
                                                <p className="text-sm font-bold text-foreground tracking-tight">{formatPhone(cliente.telefone_rh)}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-medium text-text-dim uppercase">Renda Principal</p>
                                                <div className="flex items-center gap-2">
                                                    <Banknote className="w-3.5 h-3.5 text-white" />
                                                    <p className="text-sm font-bold text-foreground tracking-tight">
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cliente.renda_principal || 0)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-medium text-text-dim uppercase">Outras Rendas</p>
                                                <p className="text-sm font-bold text-foreground tracking-tight">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cliente.outras_rendas || 0)}
                                                </p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-medium text-text-dim uppercase">Origem Outras Rendas</p>
                                                <p className="text-sm font-bold text-foreground tracking-tight uppercase">{cliente.origem_outras_rendas || "---"}</p>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-medium text-text-dim uppercase">Prédio Empresa</p>
                                                <p className="text-sm font-bold text-foreground tracking-tight uppercase">{cliente.predio_empresa || "---"}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-medium text-text-dim uppercase">Valor Aluguel Prédio</p>
                                                <p className="text-sm font-bold text-foreground tracking-tight">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cliente.predio_valor_aluguel || 0)}
                                                </p>
                                            </div>
                                            <div className="space-y-1 md:col-span-1">
                                                <p className="text-[10px] font-medium text-text-dim uppercase">Faturamento Mensal</p>
                                                <div className="flex items-center gap-2">
                                                    <Banknote className="w-3.5 h-3.5 text-white" />
                                                    <p className="text-sm font-bold text-foreground tracking-tight">
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cliente.renda_principal || 0)}
                                                    </p>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Section: Cônjuge (PF Only, Casado/União Estável) */}
                            {isMarried && (
                                <div className="bg-black/5 dark:bg-white/5 border border-panel-border rounded-xl p-8">
                                    <h3 className="text-xs font-bold text-accent uppercase tracking-wider flex items-center gap-3 mb-8">
                                        <Heart className="w-4 h-4 text-accent" />
                                        DADOS DO CÔNJUGE / PARCEIRO(A)
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-6 sm:gap-y-8 gap-x-6 sm:gap-x-10">
                                        <div className="space-y-1 sm:col-span-2">
                                            <p className="text-[10px] font-medium text-text-dim uppercase">Nome Completo</p>
                                            <p className="text-sm font-bold text-foreground tracking-tight uppercase">{cliente.conjuge_nome || "---"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-medium text-text-dim uppercase">Data Nascimento</p>
                                            <p className="text-sm font-bold text-foreground tracking-tight">
                                                {cliente.conjuge_data_nascimento ? new Date(cliente.conjuge_data_nascimento).toLocaleDateString('pt-BR') : "---"}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-medium text-text-dim uppercase">CPF</p>
                                            <p className="text-sm font-bold text-foreground tracking-tight">{formatId(cliente.conjuge_cpf, 'PF')}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-medium text-text-dim uppercase">RG</p>
                                            <p className="text-sm font-bold text-foreground tracking-tight">{cliente.conjuge_rg || "---"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-medium text-text-dim uppercase">Profissão</p>
                                            <p className="text-sm font-bold text-foreground tracking-tight uppercase">{cliente.conjuge_profissao || "---"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-medium text-text-dim uppercase">Empresa</p>
                                            <p className="text-sm font-bold text-foreground tracking-tight uppercase">{cliente.conjuge_empresa || "---"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-medium text-text-dim uppercase">Renda Mensal</p>
                                            <p className="text-sm font-bold text-foreground tracking-tight">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cliente.conjuge_renda || 0)}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-medium text-text-dim uppercase">Celular / WhatsApp</p>
                                            <p className="text-sm font-bold text-foreground tracking-tight">{formatPhone(cliente.conjuge_celular)}</p>
                                        </div>
                                    </div>

                                </div>
                            )}

                            {/* Attachments Section */}
                            <div className="bg-black/5 dark:bg-white/5 border border-panel-border rounded-xl p-8">
                                <h3 className="text-xs font-bold text-accent uppercase tracking-wider flex items-center gap-3 mb-8">
                                    <ClipboardCheck className="w-4 h-4 text-primary" />
                                    DOCUMENTAÇÃO ANEXADA
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {[
                                        { label: 'Documento Identidade', url: cliente.documento_identidade_url },
                                        { label: 'Comprovante Residência', url: cliente.comprovante_residencia_url },
                                        { label: 'Comprovante Renda', url: cliente.comprovante_renda_url },
                                        { label: 'Documento Cônjuge', url: cliente.documento_conjuge_url },
                                        { label: 'Selfie / Foto', url: cliente.selfie_url }
                                    ].filter(doc => doc.url).map((doc, idx) => (
                                        <div key={idx} className="bg-panel border border-panel-border p-4 rounded-xl flex items-center justify-between group hover:border-white/30 transition-all">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center border border-primary/20 shrink-0">
                                                    <ClipboardCheck className="w-5 h-5 text-primary" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-foreground truncate">{doc.label}</p>
                                                    <p className="text-[9px] text-text-dim uppercase tracking-widest">Digitalizado</p>
                                                </div>
                                            </div>
                                            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="p-2 bg-black/5 dark:bg-white/5 rounded-lg text-accent hover:text-foreground transition-all no-print shrink-0">
                                                <Share2 className="w-4 h-4" />
                                            </a>
                                        </div>
                                    ))}

                                    {[
                                        { label: 'Documento Identidade', url: cliente.documento_identidade_url },
                                        { label: 'Comprovante Residência', url: cliente.comprovante_residencia_url },
                                        { label: 'Comprovante Renda', url: cliente.comprovante_renda_url },
                                        { label: 'Documento Cônjuge', url: cliente.documento_conjuge_url },
                                        { label: 'Selfie / Foto', url: cliente.selfie_url }
                                    ].filter(doc => !doc.url).length === 5 && (
                                            <div className="col-span-full py-6 text-center text-text-dim italic text-xs uppercase tracking-widest">Nenhum documento anexado a esta ficha.</div>
                                        )}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 sm:p-8 border-t border-panel-border flex flex-col sm:flex-row gap-6 sm:gap-10 sm:justify-between items-stretch sm:items-center bg-panel/10 backdrop-blur-sm">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-10">
                                <div className="flex flex-col">
                                    <span className="text-[9px] sm:text-[10px] text-text-dim font-bold uppercase tracking-widest mb-1">CADASTRADO POR</span>
                                    <span className="text-xs font-bold text-foreground uppercase italic">{cliente.cadastrado_por || "Sistema"}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[9px] sm:text-[10px] text-text-dim font-bold uppercase tracking-widest mb-1">REGISTRO EM</span>
                                    <span className="text-xs font-bold text-foreground underline underline-offset-4 decoration-blue-500/50">
                                        {new Date(cliente.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-full sm:w-auto px-10 py-4 bg-[#EAEAEA] dark:bg-primary text-[#0B0B0C] dark:text-background rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.4em] flex items-center justify-center gap-3 transition-all hover:scale-[1.02] shadow-xl no-print"
                            >
                                Fechar Ficha <X className="w-4 h-4" />
                            </button>
                        </div>

                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
