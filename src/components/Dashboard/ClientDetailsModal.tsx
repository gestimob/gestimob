"use client";

import { X, FileText, Download, ExternalLink, Hash, Building2, User, ClipboardCheck, Zap, Droplets, MapPin, Phone, Mail, Fingerprint } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface ClientDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    client: any; // Comprehensive client object with nested lease/contract/property data
}

export function ClientDetailsModal({ isOpen, onClose, client }: ClientDetailsModalProps) {
    if (!client) return null;

    // Filter for files that actually exist
    const files = [
        { label: 'Documentação (Identidade)', url: client.documento_identidade_url, icon: User },
        { label: 'Contrato Assinado', url: client.activeLease?.contratos?.contrato_assinado_url, icon: ClipboardCheck },
        { label: 'Titularidade Cagepa', url: client.activeLease?.comprovante_cagepa_url, icon: Droplets },
        { label: 'Titularidade Energisa', url: client.activeLease?.comprovante_energisa_url, icon: Zap },
    ].filter(f => f.url);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-background/90 backdrop-blur-xl"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="bg-panel dark:glass w-full max-w-2xl rounded-[32px] shadow-3xl overflow-hidden relative z-10 border border-panel-border flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-8 border-b border-panel-border flex items-center justify-between bg-white/5 backdrop-blur-md">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                                    <User className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white uppercase tracking-tight leading-none mb-1">
                                        {client.nome_completo}
                                    </h3>
                                    <p className="text-[10px] text-accent font-black uppercase tracking-widest">
                                        Detalhes do Cliente Ativo
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center text-accent transition-all border border-panel-border"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh] custom-scrollbar bg-transparent">
                            {/* Personal Info Section */}
                            <div className="bg-black/5 dark:bg-white/5 border border-panel-border rounded-[40px] p-8 space-y-6">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-accent border-b border-panel-border pb-4">
                                    Informações do Cliente
                                </h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <div className="flex items-start gap-3">
                                            <Fingerprint className="w-4 h-4 text-white mt-1 shrink-0" />
                                            <div>
                                                <p className="text-[10px] uppercase font-black tracking-widest text-accent mb-1">Documentos</p>
                                                <p className="text-sm font-bold text-white">CPF: {client.documento || '---'}</p>
                                                <p className="text-xs text-gray-400">RG: {client.rg || '---'}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3">
                                            <Mail className="w-4 h-4 text-accent mt-1 shrink-0" />
                                            <div>
                                                <p className="text-[10px] uppercase font-black tracking-widest text-accent mb-1">E-mail</p>
                                                <p className="text-sm font-bold text-white truncate">{client.email || 'Não informado'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-start gap-3">
                                            <Phone className="w-4 h-4 text-white mt-1 shrink-0" />
                                            <div>
                                                <p className="text-[10px] uppercase font-black tracking-widest text-accent mb-1">WhatsApp / Contato</p>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-bold text-white">{client.celular || '---'}</p>
                                                    {client.celular && (
                                                        <a
                                                            href={`https://wa.me/55${client.celular.replace(/\D/g, '')}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="px-2 py-1 bg-white/10 hover:bg-white text-white hover:text-white rounded text-[8px] font-black uppercase tracking-widest transition-all"
                                                        >
                                                            Chamar no WhatsApp
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3">
                                            <MapPin className="w-4 h-4 text-rose-400 mt-1 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[10px] uppercase font-black tracking-widest text-accent mb-1">Endereço Completo</p>
                                                <p className="text-sm font-bold text-white leading-snug">
                                                    {client.logradouro}{client.numero ? `, ${client.numero}` : ''}
                                                </p>
                                                <p className="text-xs text-gray-400">
                                                    {client.bairro ? `${client.bairro} - ` : ''}{client.cidade}/{client.estado}
                                                </p>
                                                <p className="text-[10px] text-slate-400 italic">CEP: {client.cep || '---'}</p>
                                                <p className="text-[10px] text-gray-400 italic">CEP: {client.cep || '---'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="px-1">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-accent mb-4">
                                    Vínculos Contratuais
                                </h4>
                            </div>
                            {/* Contract & Lease Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-black/5 dark:bg-white/5 border border-panel-border rounded-2xl p-5 group hover:border-white/20 transition-all">
                                    <div className="flex items-center gap-3 mb-3">
                                        <Hash className="w-4 h-4 text-white" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-accent">Contrato / Aluguel</span>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-foreground font-bold">Contrato: {client.activeLease?.contratos?.[0]?.codigo_contrato || 'Aguardando'}</p>
                                        <p className="text-sm text-text-dim">Cód. Interno (Aluguel): {client.activeLease?.codigo_interno || '---'}</p>
                                    </div>

                                </div>

                                <div className="bg-black/5 dark:bg-white/5 border border-panel-border rounded-2xl p-5 group hover:border-white/20 transition-all">
                                    <div className="flex items-center gap-3 mb-3">
                                        <Building2 className="w-4 h-4 text-white" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-accent">Imóvel Alugado</span>
                                    </div>
                                    <p className="text-foreground font-bold">
                                        {client.activeLease?.imoveis?.nome_identificacao || 'Nenhum imóvel vinculado'}
                                    </p>
                                </div>
                            </div>

                            {/* Uploads Section */}
                            <div>
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-accent mb-4 px-1">
                                    Arquivos e Documentação
                                </h4>
                                <div className="grid grid-cols-1 gap-3">
                                    {files.length === 0 ? (
                                        <div className="py-10 text-center text-text-dim text-sm italic bg-black/5 dark:bg-white/5 rounded-2xl border border-dashed border-panel-border">
                                            Nenhum arquivo anexado para este cliente.
                                        </div>
                                    ) : (
                                        files.map((file, idx) => (
                                            <div
                                                key={idx}
                                                className="bg-black/5 dark:bg-white/5 border border-panel-border hover:border-white/20 rounded-2xl p-4 flex items-center justify-between group transition-all"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-panel border border-panel-border group-hover:border-accent/20 rounded-xl flex items-center justify-center transition-all shadow-sm dark:shadow-none">
                                                        <file.icon className="w-5 h-5 text-accent group-hover:text-white transition-all" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-foreground group-hover:text-white transition-colors">
                                                            {file.label}
                                                        </p>
                                                        <p className="text-[9px] text-accent font-black uppercase tracking-widest">Arquivo Digitalizado</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <a
                                                        href={file.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-all border border-white/5 shadow-none"
                                                        title="Visualizar"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </a>
                                                    <a
                                                        href={file.url}
                                                        download
                                                        className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-all border border-white/5 shadow-none"
                                                        title="Baixar"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                    </a>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-8 border-t border-panel-border bg-panel/30 dark:bg-white/5">
                            <button
                                onClick={onClose}
                                className="w-full bg-[#EAEAEA] dark:bg-primary text-[#0B0B0C] dark:text-background py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all hover:scale-[1.01] active:scale-[0.99] shadow-xl"
                            >
                                Fechar Detalhes
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
