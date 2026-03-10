"use client";

import { useState, useEffect } from "react";
import {
    X,
    Mail,
    Calendar,
    CheckCircle2,
    AlertCircle,
    Loader2,
    ChevronRight,
    Eye,
    MessageSquare
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface HistoricoEmailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    cliente: any;
    tipo: 'proprietario' | 'locatario';
}

export function HistoricoEmailsModal({ isOpen, onClose, cliente, tipo }: HistoricoEmailsModalProps) {
    const [historico, setHistorico] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEmail, setSelectedEmail] = useState<any>(null);

    useEffect(() => {
        if (isOpen && cliente) {
            fetchHistorico();
        }
    }, [isOpen, cliente]);

    async function fetchHistorico() {
        try {
            setLoading(true);
            const query = supabase
                .from('historico_comunicacoes')
                .select('*')
                .order('created_at', { ascending: false });

            if (tipo === 'proprietario') {
                query.eq('proprietario_id', cliente.id);
            } else {
                query.eq('locatario_id', cliente.id);
            }

            const { data, error } = await query;

            if (error) throw error;
            setHistorico(data || []);
        } catch (err) {
            console.error("Erro ao buscar histórico:", err);
        } finally {
            setLoading(false);
        }
    }

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">
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
                    className="bg-panel dark:glass w-full max-w-2xl max-h-[80vh] rounded-[24px] overflow-hidden relative z-10 border border-panel-border flex flex-col shadow-2xl"
                >
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-panel-border flex items-center justify-between bg-panel/30 dark:bg-white/5 backdrop-blur-md">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary border border-primary/20">
                                <Mail className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-foreground">Histórico de E-mails</h2>
                                <p className="text-[10px] text-accent font-black uppercase tracking-widest leading-none mt-1">
                                    {cliente?.nome_completo}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-background border border-panel-border text-accent hover:text-foreground transition-all"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                        {loading ? (
                            <div className="py-20 flex flex-col items-center gap-4 text-accent">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                <p className="text-[10px] uppercase font-black tracking-widest">Carregando histórico...</p>
                            </div>
                        ) : historico.length === 0 ? (
                            <div className="py-20 flex flex-col items-center gap-4 text-accent/50">
                                <MessageSquare className="w-12 h-12 stroke-[1.5]" />
                                <div className="text-center">
                                    <p className="text-sm font-semibold text-accent">Nenhum e-mail enviado ainda.</p>
                                    <p className="text-[10px] uppercase font-black tracking-widest mt-1">As comunicações automáticas aparecerão aqui.</p>
                                </div>
                            </div>
                        ) : selectedEmail ? (
                            /* Email Detail View */
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <button
                                    onClick={() => setSelectedEmail(null)}
                                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-accent hover:text-primary transition-all mb-4"
                                >
                                    <ChevronRight className="w-4 h-4 rotate-180" /> Voltar à lista
                                </button>

                                <div className="space-y-4">
                                    <div className="bg-background border border-panel-border rounded-2xl p-6 space-y-4">
                                        <div>
                                            <p className="text-[10px] font-black text-accent uppercase tracking-widest mb-1">Assunto</p>
                                            <p className="text-lg font-bold text-foreground leading-tight">{selectedEmail.assunto}</p>
                                        </div>
                                        <div className="flex items-center justify-between py-4 border-t border-panel-border">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-3.5 h-3.5 text-accent" />
                                                <span className="text-[11px] font-medium text-accent">
                                                    {new Date(selectedEmail.created_at).toLocaleString('pt-BR')}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 px-3 py-1 bg-white/10 text-white border border-white/20 rounded-full">
                                                <CheckCircle2 className="w-3 h-3" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Enviado</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-background border border-panel-border rounded-2xl p-6 overflow-hidden">
                                        <p className="text-[10px] font-black text-accent uppercase tracking-widest mb-4">Conteúdo da Mensagem</p>
                                        <div
                                            className="text-sm text-foreground prose prose-invert max-w-none"
                                            dangerouslySetInnerHTML={{ __html: selectedEmail.conteudo }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* List View */
                            <div className="space-y-3">
                                {historico.map((email) => (
                                    <button
                                        key={email.id}
                                        onClick={() => setSelectedEmail(email)}
                                        className="w-full bg-background border border-panel-border rounded-2xl p-4 flex items-center justify-between hover:border-primary transition-all group text-left"
                                    >
                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                            <div className="w-10 h-10 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center text-accent group-hover:bg-primary/10 group-hover:text-primary transition-colors shrink-0">
                                                <Mail className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-foreground truncate">{email.assunto}</p>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-[10px] font-medium text-accent flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        {new Date(email.created_at).toLocaleDateString('pt-BR')}
                                                    </span>
                                                    <span className="w-1 h-1 bg-accent/30 rounded-full" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-white">
                                                        Enviado
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-accent group-hover:text-primary transition-all group-hover:translate-x-1" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
