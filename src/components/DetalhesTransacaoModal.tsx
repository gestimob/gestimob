"use client";

import { useState, useEffect } from "react";
import { X, Calendar, DollarSign, FileText, User, Receipt, Hash, Upload, Trash2, Save, FileCheck, Loader2, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { supabaseStorage } from "@/lib/supabaseStorage";
import { cn } from "@/lib/utils";
import { processPDF, convertToWebP } from "@/lib/documentProcessor";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    transacao: any;
    onSaveSuccess?: () => void;
}

function formatBRL(val: number): string {
    return val?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }) || 'R$ 0,00';
}

function formatNumber(val: number): string {
    return val?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00';
}

function formatDateToInput(d: string | null): string {
    if (!d) return '';
    return d.slice(0, 10);
}

function formatDate(d: string | null): string {
    if (!d) return '---';
    const date = new Date(d + (d.length === 10 ? 'T00:00:00' : ''));
    return date.toLocaleDateString('pt-BR');
}

export function DetalhesTransacaoModal({ isOpen, onClose, transacao, onSaveSuccess }: ModalProps) {
    const [parcelas, setParcelas] = useState<any[]>([]);
    const [loadingParcelas, setLoadingParcelas] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // "unico" = Boleto Único, "mensal" = Boletos Mensais
    const [tipoBoleto, setTipoBoleto] = useState<"unico" | "mensal">("unico");

    const [uploadItems, setUploadItems] = useState<any[]>([]);

    useEffect(() => {
        if (isOpen && transacao) {
            fetchParcelas();
        } else {
            setParcelas([]);
            setUploadItems([]);
        }
    }, [isOpen, transacao]);

    async function fetchParcelas() {
        setLoadingParcelas(true);
        const { data } = await supabase
            .from('parcelas')
            .select('*')
            .eq('transacao_id', transacao.id)
            .order('numero_parcela', { ascending: true });

        if (data) {
            setParcelas(data);
            setupUploadItems(data, tipoBoleto);
        }
        setLoadingParcelas(false);
    }

    function handleTipoChange(tipo: "unico" | "mensal") {
        setTipoBoleto(tipo);
        setupUploadItems(parcelas, tipo);
    }

    function setupUploadItems(ps: any[], tipo: "unico" | "mensal") {
        if (ps.length === 0) return setUploadItems([]);

        // Verifica se a primeira já tem um boleto que parece ser único (replicado para todos)
        // ou só inicializa normalmente
        if (tipo === "unico") {
            const total = ps.reduce((acc, current) => acc + (current.valor || 0), 0);
            setUploadItems([{
                id: 'unico',
                parcela_id: ps[0].id,
                file: null,
                existingUrl: ps[0].boleto_url,
                vencimento: formatDateToInput(ps[0].data_vencimento),
                valor: formatNumber(total),
                label: "Boleto Único"
            }]);
        } else {
            setUploadItems(ps.map((p, i) => ({
                id: `mensal_${p.id}`,
                parcela_id: p.id,
                file: null,
                existingUrl: p.boleto_url,
                vencimento: formatDateToInput(p.data_vencimento),
                valor: formatNumber(p.valor),
                label: `Boleto Parcela ${i + 1} de ${ps.length}`
            })));
        }
    }

    const handleUpdateItem = (index: number, key: string, value: any) => {
        const newItems = [...uploadItems];
        newItems[index][key] = value;
        setUploadItems(newItems);
    };

    const handleSaveAnexos = async () => {
        setIsSaving(true);
        try {
            if (tipoBoleto === "unico") {
                const item = uploadItems[0];
                let finalUrl = item.existingUrl; // keeps existing if not removed

                // If they removed existing and didn't add new
                if (!item.file && !item.existingUrl) {
                    finalUrl = null;
                }

                if (item.file) {
                    let finalFile: File | Blob = item.file;
                    const safeName = item.file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9.\-_]/g, "_");
                    let fileName = `${Date.now()}_${safeName}`;
                    const ext = item.file.name.split('.').pop()?.toLowerCase();
                    let contentType: string | undefined = item.file.type;

                    if (ext === 'pdf') {
                        const pdfResult = await processPDF(item.file);
                        finalFile = pdfResult.blob as File;
                        fileName = fileName.replace(/\.[^/.]+$/, ".pdf");
                        contentType = 'application/pdf';
                    } else if (['png', 'jpg', 'jpeg'].includes(ext || '')) {
                        finalFile = await convertToWebP(item.file);
                        fileName = fileName.replace(/\.[^/.]+$/, ".webp");
                        contentType = 'image/webp';
                    } else {
                        fileName = fileName.replace(/\.[^/.]+$/, `.${ext}`);
                        contentType = item.file.type;
                    }

                    const filePath = `transacoes/${transacao.id}/${fileName}`;
                    const { error: uploadError } = await supabaseStorage.storage.from('documentos')
                        .upload(filePath, finalFile, { contentType: contentType, upsert: true });

                    if (uploadError) {
                        console.error("Erro upload", uploadError);
                        throw uploadError;
                    }

                    const { data: { publicUrl } } = supabaseStorage.storage.from('documentos').getPublicUrl(filePath);

                    finalUrl = publicUrl;
                }

                // Atualiza todas as parcelas
                const updates = parcelas.map(p => {
                    const up: any = { boleto_url: finalUrl };

                    // Somente atualiza a data e o valor da primeira parcela (ou seja, não replica o valor total pra todas)
                    if (p.id === item.parcela_id) {
                        up.data_vencimento = item.vencimento;
                        const valClean = parseFloat(item.valor.replace(/[^\d,-]/g, '').replace('.', '').replace(',', '.'));
                        if (!isNaN(valClean)) up.valor = valClean;
                    }

                    return supabase.from('parcelas').update(up).eq('id', p.id);
                });

                await Promise.all(updates);

            } else {
                // Mensais
                const updates = uploadItems.map(async (item) => {
                    let finalUrl = item.existingUrl;

                    if (!item.file && !item.existingUrl) {
                        finalUrl = null;
                    }

                    if (item.file) {
                        let finalFile: File | Blob = item.file;
                        const safeName = item.file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9.\-_]/g, "_");
                        let fileName = `${Date.now()}_${safeName}`;
                        const ext = item.file.name.split('.').pop()?.toLowerCase();
                        let contentType: string | undefined = item.file.type;

                        if (ext === 'pdf') {
                            const pdfResult = await processPDF(item.file);
                            finalFile = pdfResult.blob as File;
                            fileName = fileName.replace(/\.[^/.]+$/, ".pdf");
                            contentType = 'application/pdf';
                        } else if (['png', 'jpg', 'jpeg'].includes(ext || '')) {
                            finalFile = await convertToWebP(item.file);
                            fileName = fileName.replace(/\.[^/.]+$/, ".webp");
                            contentType = 'image/webp';
                        } else {
                            fileName = fileName.replace(/\.[^/.]+$/, `.${ext}`);
                            contentType = item.file.type;
                        }

                        const filePath = `transacoes/${transacao.id}/${fileName}`;
                        const { error: uploadError } = await supabaseStorage.storage.from('documentos')
                            .upload(filePath, finalFile, { contentType: contentType, upsert: true });

                        if (uploadError) throw uploadError;

                        const { data: { publicUrl } } = supabaseStorage.storage.from('documentos').getPublicUrl(filePath);

                        finalUrl = publicUrl;
                    }

                    const up: any = { boleto_url: finalUrl };
                    if (item.vencimento) up.data_vencimento = item.vencimento;
                    if (item.valor) {
                        const valClean = parseFloat(item.valor.replace(/[^\d,-]/g, '').replace('.', '').replace(',', '.'));
                        if (!isNaN(valClean)) up.valor = valClean;
                    }

                    return supabase.from('parcelas').update(up).eq('id', item.parcela_id);
                });

                await Promise.all(updates);
            }

            alert("Boletos salvos com sucesso!");
        } catch (err: any) {
            alert("Erro ao salvar: " + err.message);
        } finally {
            setIsSaving(false);
            fetchParcelas();
            if (onSaveSuccess) onSaveSuccess();
        }
    };

    if (!transacao) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-background/90 backdrop-blur-xl" />

                    <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="bg-panel glass-elite w-full max-w-2xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col rounded-none sm:rounded-[48px] shadow-2xl relative z-10 border-0 sm:border border-panel-border overflow-hidden">


                        <header className="px-5 sm:px-10 py-4 sm:py-6 flex justify-between items-center bg-gradient-to-b from-black/5 dark:from-white/5 to-transparent border-b border-panel-border shrink-0">
                            <div className="min-w-0 flex-1">
                                <h3 className="text-xl sm:text-2xl font-serif-premium font-bold text-foreground lowercase first-letter:uppercase italic tracking-tighter truncate">Detalhes da Transação</h3>
                                <p className="text-[8px] sm:text-[10px] uppercase font-black tracking-widest text-foreground mt-0.5 sm:mt-1">CÓD INTERNO: {transacao.codigo_transacao || '----'}</p>
                            </div>
                            <button type="button" onClick={onClose} className="w-8 h-8 sm:w-10 sm:h-10 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full flex items-center justify-center text-accent transition-all border border-panel-border shrink-0 ml-2 sm:ml-4"><X className="w-5 h-5 sm:w-6 sm:h-6" /></button>
                        </header>


                        <div className="p-6 sm:p-10 space-y-6 sm:space-y-10 flex-1 overflow-y-auto custom-scrollbar">


                            {/* Informações Principais */}
                            <div className="space-y-4">
                                <h3 className="text-[9px] sm:text-[10px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Receipt className="w-3 h-3" /> Informações Principais
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="bg-white/[0.02] border border-panel-border rounded-xl sm:rounded-2xl p-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Calendar className="w-3.5 h-3.5 text-accent" />
                                            <span className="text-[9px] sm:text-[10px] font-black text-text-dim uppercase tracking-widest">Data de Geração</span>
                                        </div>
                                        <p className="text-xs sm:text-[13px] font-bold text-foreground">{formatDate(transacao.created_at)}</p>
                                    </div>

                                    <div className="bg-white/[0.02] border border-panel-border rounded-xl sm:rounded-2xl p-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Hash className="w-3.5 h-3.5 text-accent" />
                                            <span className="text-[9px] sm:text-[10px] font-black text-text-dim uppercase tracking-widest">Quantidade de Parcelas</span>
                                        </div>
                                        <p className="text-xs sm:text-[13px] font-bold text-foreground">{transacao.quantidade_parcelas}x</p>
                                    </div>

                                    <div className="bg-white/[0.02] border border-panel-border rounded-xl sm:rounded-2xl p-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <DollarSign className="w-3.5 h-3.5 text-accent" />
                                            <span className="text-[9px] sm:text-[10px] font-black text-text-dim uppercase tracking-widest">Valor da Parcela</span>
                                        </div>
                                        <p className="text-xs sm:text-[13px] font-black text-white">{formatBRL(transacao.valor_parcela)}</p>
                                    </div>

                                    <div className="bg-white/[0.02] border border-panel-border rounded-xl sm:rounded-2xl p-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <DollarSign className="w-3.5 h-3.5 text-accent" />
                                            <span className="text-[9px] sm:text-[10px] font-black text-text-dim uppercase tracking-widest">Valor Adicional</span>
                                        </div>
                                        <p className="text-xs sm:text-[13px] font-black text-amber-500">{formatBRL(transacao.valor_adicional)}</p>
                                    </div>
                                </div>
                            </div>


                            {/* Vínculos */}
                            <div className="space-y-4">
                                <h3 className="text-[9px] sm:text-[10px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                                    <FileText className="w-3 h-3" /> Vínculos
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="bg-white/[0.02] border border-panel-border rounded-xl sm:rounded-2xl p-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <FileText className="w-3.5 h-3.5 text-accent" />
                                            <span className="text-[9px] sm:text-[10px] font-black text-text-dim uppercase tracking-widest">Contrato Vinculado</span>
                                        </div>
                                        <p className="text-xs sm:text-[13px] font-bold text-foreground">{transacao.contrato_codigo || 'Nenhum'}</p>
                                    </div>

                                    <div className="bg-white/[0.02] border border-panel-border rounded-xl sm:rounded-2xl p-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <FileText className="w-3.5 h-3.5 text-accent" />
                                            <span className="text-[9px] sm:text-[10px] font-black text-text-dim uppercase tracking-widest">Aluguel Vinculado</span>
                                        </div>
                                        <p className="text-xs sm:text-[13px] font-bold text-foreground">{transacao.aluguel_codigo || 'Nenhum'}</p>
                                    </div>

                                    <div className="sm:col-span-2 bg-white/[0.02] border border-panel-border rounded-xl sm:rounded-2xl p-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <User className="w-3.5 h-3.5 text-accent" />
                                            <span className="text-[9px] sm:text-[10px] font-black text-text-dim uppercase tracking-widest">Locatário</span>
                                        </div>
                                        <p className="text-xs sm:text-[13px] font-bold text-foreground">{transacao.locatario_nome || '---'}</p>
                                    </div>
                                </div>
                            </div>


                            {/* Anexo de Boletos */}
                            <div className="space-y-6 pt-6 border-t border-panel-border">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <h3 className="text-[9px] sm:text-[10px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                                        <Upload className="w-3 h-3" /> Anexar Boletos
                                    </h3>

                                    <div className="flex items-center gap-4 text-[10px] sm:text-xs font-bold text-accent">
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <input type="radio"
                                                name="tipoBaseBoleto"
                                                checked={tipoBoleto === "unico"}
                                                onChange={() => handleTipoChange("unico")}
                                                className="w-3 h-3 sm:w-4 sm:h-4 accent-primary" />
                                            <span className="group-hover:text-foreground transition-colors">Boleto Único</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <input type="radio"
                                                name="tipoBaseBoleto"
                                                checked={tipoBoleto === "mensal"}
                                                onChange={() => handleTipoChange("mensal")}
                                                className="w-3 h-3 sm:w-4 sm:h-4 accent-primary" />
                                            <span className="group-hover:text-foreground transition-colors">Mensais</span>
                                        </label>
                                    </div>
                                </div>


                                {loadingParcelas ? (
                                    <div className="flex items-center justify-center py-6">
                                        <Loader2 className="w-5 h-5 text-primary animate-spin" />
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {uploadItems.map((item, index) => (
                                            <div key={item.id} className="bg-white/[0.02] border border-panel-border rounded-[24px] sm:rounded-3xl p-5 sm:p-6 space-y-4">
                                                <h4 className="text-[10px] sm:text-[11px] font-black text-foreground uppercase tracking-widest">{item.label}</h4>

                                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 sm:gap-6 items-end">

                                                    {/* Upload Field */}
                                                    <div className="sm:col-span-5 space-y-2">
                                                        <label className="text-[9px] sm:text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Arquivo (PDF/PNG)</label>
                                                        {item.file ? (
                                                            <div className="flex items-center gap-3 p-2 bg-white/5 border border-panel-border rounded-xl h-[36px]">
                                                                <div className="w-6 h-6 bg-primary/20 text-primary rounded-lg flex items-center justify-center shrink-0">
                                                                    <FileCheck className="w-3 h-3" />
                                                                </div>
                                                                <div className="flex-1 min-w-0 flex justify-between items-center">
                                                                    <p className="text-[9px] sm:text-[10px] font-bold text-foreground truncate">{item.file.name}</p>
                                                                    <button type="button" onClick={() => handleUpdateItem(index, 'file', null)} className="text-rose-500 hover:text-rose-600 text-[9px] sm:text-[10px] font-black uppercase flex items-center gap-1 transition-colors shrink-0 ml-2">
                                                                        <Trash2 className="w-3 h-3 shrink-0" /> <span className="hidden sm:inline">Excluir</span>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : item.existingUrl ? (
                                                            <div className="flex items-center gap-3 p-2 bg-white/5 border border-panel-border rounded-xl h-[36px]">
                                                                <div className="w-6 h-6 bg-primary/20 text-primary rounded-lg flex items-center justify-center shrink-0">
                                                                    <FileCheck className="w-3 h-3" />
                                                                </div>
                                                                <div className="flex-1 min-w-0 flex justify-between items-center">
                                                                    <p className="text-[9px] sm:text-[10px] font-bold text-foreground truncate">Boleto Salvo</p>
                                                                    <div className="flex gap-2 sm:gap-3 shrink-0 ml-2">
                                                                        <a href={item.existingUrl} target="_blank" rel="noreferrer" className="text-primary hover:text-primary-hover text-[9px] sm:text-[10px] font-black uppercase flex items-center gap-1 transition-colors">
                                                                            <ExternalLink className="w-3 h-3 shrink-0" /> <span className="hidden sm:inline">Abrir</span>
                                                                        </a>
                                                                        <button type="button" onClick={() => handleUpdateItem(index, 'existingUrl', null)} className="text-rose-500 hover:text-rose-600 text-[9px] sm:text-[10px] font-black uppercase flex items-center gap-1 transition-colors">
                                                                            <Trash2 className="w-3 h-3 shrink-0" /> <span className="hidden sm:inline">Remover</span>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <label className="flex flex-col items-center justify-center w-full h-[36px] border border-dashed border-primary/30 rounded-xl cursor-pointer bg-primary/5 hover:bg-primary/10 transition-colors relative group">
                                                                <div className="flex items-center gap-2">
                                                                    <Upload className="w-3 h-3 text-primary group-hover:scale-110 transition-transform" />
                                                                    <span className="text-[9px] sm:text-[10px] text-primary font-bold uppercase tracking-widest">Anexar</span>
                                                                </div>
                                                                <input type="file" className="hidden" accept="image/*,application/pdf"
                                                                    onChange={(e) => {
                                                                        if (e.target.files?.[0]) {
                                                                            handleUpdateItem(index, 'file', e.target.files[0]);
                                                                        }
                                                                    }} />
                                                            </label>
                                                        )}
                                                    </div>

                                                    {/* Vencimento */}
                                                    <div className="sm:col-span-3 space-y-2">
                                                        <label className="text-[9px] sm:text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Vencimento</label>
                                                        <input
                                                            type="date"
                                                            value={item.vencimento}
                                                            onChange={(e) => handleUpdateItem(index, 'vencimento', e.target.value)}
                                                            className="w-full h-[36px] bg-white/5 border border-panel-border rounded-xl px-3 sm:px-4 text-[10px] font-bold text-foreground focus:outline-none focus:border-primary transition-all [&::-webkit-calendar-picker-indicator]:invert-[0.5] dark:[&::-webkit-calendar-picker-indicator]:invert-0"
                                                        />
                                                    </div>

                                                    {/* Valor */}
                                                    <div className="sm:col-span-4 space-y-2">
                                                        <label className="text-[9px] sm:text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Valor do Boleto</label>
                                                        <div className="relative">
                                                            <span className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-[9px] sm:text-[10px] font-black text-accent">R$</span>
                                                            <input
                                                                type="text"
                                                                value={item.valor}
                                                                onChange={(e) => {
                                                                    const raw = e.target.value.replace(/[^0-9,]/g, '');
                                                                    handleUpdateItem(index, 'valor', raw);
                                                                }}
                                                                className="w-full h-[36px] bg-white/5 border border-panel-border rounded-xl pl-8 sm:pl-9 pr-3 sm:pr-4 text-[10px] font-bold text-white focus:outline-none focus:border-primary transition-all"
                                                            />
                                                        </div>
                                                    </div>

                                                </div>
                                            </div>
                                        ))}

                                        <div className="flex flex-col sm:flex-row justify-end pt-4">
                                            <button
                                                onClick={handleSaveAnexos}
                                                disabled={isSaving}
                                                className="h-12 w-full sm:w-auto px-8 bg-[#EAEAEA] text-[#0B0B0C] hover:scale-[1.02] active:scale-95 disabled:opacity-50 rounded-xl font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-3 shadow-lg shadow-black/20">
                                                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                                {isSaving ? "Salvando..." : "Salvar Boletos"}
                                            </button>
                                        </div>

                                    </div>
                                )}
                            </div>

                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
