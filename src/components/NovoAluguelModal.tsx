"use client";

import { X, Loader2, Key, CalendarClock, Upload, FileText, Trash2, FileCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { supabaseStorage } from "@/lib/supabaseStorage";
import { cn } from "@/lib/utils";
import { processPDF, convertToWebP } from "@/lib/documentProcessor";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: any;
    isReadOnly?: boolean;
}

const Input = ({ label, value, onChange, placeholder = "", type = "text", colSpan = "", icon: Icon = null, ...props }: any) => (
    <div className={cn("space-y-2", colSpan)}>
        <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">{label}</label>
        <div className="relative">
            {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-accent" />}
            <input type={type} value={value || ""} onChange={onChange} placeholder={placeholder}
                className={cn("w-full bg-black/5 dark:bg-white/5 border border-panel-border rounded-xl py-3 px-5 text-foreground text-[13px] outline-none focus:border-primary transition-all font-medium placeholder:text-text-dim", Icon && "pl-11")}
                {...props} />
        </div>
    </div>
);

const Select = ({ label, value, onChange, options, colSpan = "", required = false, disabled = false }: any) => (
    <div className={cn("space-y-2", colSpan)}>
        <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">{label} {required && "*"}</label>
        <select value={value || ""} onChange={onChange} required={required} disabled={disabled}
            className={cn(
                "w-full bg-black/5 dark:bg-white/5 border border-panel-border rounded-xl py-3 px-5 text-foreground text-[13px] outline-none focus:border-primary transition-all font-medium appearance-none",
                disabled && "opacity-60 cursor-not-allowed"
            )}>
            {options.map((o: any, idx: number) => <option key={`${o.value}-${idx}`} value={o.value} className="bg-[#121212] text-white">{o.label}</option>)}
        </select>
    </div>
);

// Componente de input monetário com formatação BRL (R$ XX.XXX,XX)
const CurrencyInput = ({ label, value, onChange, colSpan = "", readOnly = false, ...props }: any) => {
    const formatBRL = (val: number): string => {
        if (val === 0 || val === undefined || val === null) return 'R$ 0,00';
        return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Remove tudo que não é dígito
        const rawDigits = e.target.value.replace(/\D/g, '');
        // Converte para centavos -> reais
        const numericValue = parseInt(rawDigits || '0', 10) / 100;
        onChange(numericValue);
    };

    return (
        <div className={cn("space-y-2", colSpan)}>
            <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">{label}</label>
            <input
                type="text"
                inputMode="numeric"
                value={formatBRL(value || 0)}
                onChange={handleChange}
                readOnly={readOnly}
                className={cn(
                    "w-full bg-black/5 dark:bg-white/5 border border-panel-border rounded-xl py-3 px-5 text-foreground text-[13px] outline-none focus:border-primary transition-all font-medium placeholder:text-text-dim",
                    readOnly && "opacity-60 pointer-events-none"
                )}
                {...props}
            />
        </div>
    );
};

const initialFormState = {
    codigo_interno: "", cliente_id: "", proprietario_id: "", imovel_id: "",
    data_inicio: "", data_vencimento: "", duracao_meses: 12, valor_aluguel: 0, status: "Preparação de Contrato",
    finalidade_aluguel: "Residencial",
    tipo_reajuste: "Índice", tempo_reajuste_fixo: 12,
    reajustes_fixos: [],
    tipo_garantia: "Fiador", fiadores_ids: [], caucao_quantidade: 0, caucao_valor: 0,
    tipo_proprietario: "PF",
    proprietarios_secundarios: [],
    impresso_no_contrato: true,
    troca_titularidade_cagepa: false, troca_titularidade_energisa: false,
    comprovante_cagepa_url: "", comprovante_energisa_url: "",
    valor_condominio: 0,
    tipo_pagamento_condominio: "Separado",
    valor_total_aluguel_condominio: 0,
    contas_bancarias: [],
    created_at: new Date().toISOString().slice(0, 10)
};

export function NovoAluguelModal({ isOpen, onClose, onSuccess, initialData, isReadOnly = false }: ModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<any>(initialFormState);
    const [clientes, setClientes] = useState<any[]>([]);
    const [imoveis, setImoveis] = useState<any[]>([]);
    const [proprietarios, setProprietarios] = useState<any[]>([]);
    const [empresas, setEmpresas] = useState<any[]>([]);
    const [cagepaFile, setCagepaFile] = useState<File | null>(null);
    const [energisaFile, setEnergisaFile] = useState<File | null>(null);
    const [availableBankAccounts, setAvailableBankAccounts] = useState<any[]>([]);

    useEffect(() => {
        if (isOpen) {
            fetchRelationalData();
            if (initialData?.id) {
                // Modo edição
                const createdDate = initialData.created_at ? new Date(initialData.created_at).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);

                // Migrate legacy data if needed
                let legacyArr = initialData.reajustes_fixos || [];
                if (initialData.tipo_reajuste === "Fixo" && !initialData.reajustes_fixos) {
                    if (initialData.rf_p1_inicio) legacyArr.push({ inicio: initialData.rf_p1_inicio, final: initialData.rf_p1_final, valor: initialData.rf_p1_valor });
                    if (initialData.rf_p2_inicio) legacyArr.push({ inicio: initialData.rf_p2_inicio, final: initialData.rf_p2_final, valor: initialData.rf_p2_valor });
                    if (initialData.rf_p3_inicio) legacyArr.push({ inicio: initialData.rf_p3_inicio, final: initialData.rf_p3_final, valor: initialData.rf_p3_valor });
                }

                setFormData({
                    ...initialFormState, ...initialData,
                    reajustes_fixos: legacyArr,
                    cliente_id: initialData.cliente_id || "",
                    proprietario_id: initialData.proprietario_id || initialData.imoveis?.empresas?.id || initialData.imoveis?.proprietarios?.id || "",
                    imovel_id: initialData.imovel_id || "",
                    tipo_proprietario: initialData.proprietario_id ? "PF" : (initialData.imoveis?.empresas ? "PJ" : "PF"),
                    proprietarios_secundarios: initialData.proprietarios_secundarios || [],
                    impresso_no_contrato: initialData.impresso_no_contrato !== false,
                    contas_bancarias: initialData.contas_bancarias || [],
                    created_at: createdDate
                });
                setCagepaFile(null);
                setEnergisaFile(null);
            } else if (initialData) {
                // Modo duplicação: gera novo código e usa dados duplicados
                const createdDate = new Date().toISOString().slice(0, 10);

                let legacyArr = initialData.reajustes_fixos || [];
                if (initialData.tipo_reajuste === "Fixo" && !initialData.reajustes_fixos) {
                    if (initialData.rf_p1_inicio) legacyArr.push({ inicio: initialData.rf_p1_inicio, final: initialData.rf_p1_final, valor: initialData.rf_p1_valor });
                    if (initialData.rf_p2_inicio) legacyArr.push({ inicio: initialData.rf_p2_inicio, final: initialData.rf_p2_final, valor: initialData.rf_p2_valor });
                    if (initialData.rf_p3_inicio) legacyArr.push({ inicio: initialData.rf_p3_inicio, final: initialData.rf_p3_final, valor: initialData.rf_p3_valor });
                }

                setFormData({
                    ...initialFormState, ...initialData,
                    reajustes_fixos: legacyArr,
                    cliente_id: initialData.cliente_id || "",
                    proprietario_id: initialData.proprietario_id || initialData.imoveis?.empresas?.id || initialData.imoveis?.proprietarios?.id || "",
                    imovel_id: initialData.imovel_id || "",
                    tipo_proprietario: initialData.proprietario_id ? "PF" : (initialData.imoveis?.empresas ? "PJ" : "PF"),
                    proprietarios_secundarios: initialData.proprietarios_secundarios || [],
                    impresso_no_contrato: initialData.impresso_no_contrato !== false,
                    contas_bancarias: initialData.contas_bancarias || [],
                    created_at: createdDate
                });
                generateCode();
                setCagepaFile(null);
                setEnergisaFile(null);
            } else {
                // Modo novo cadastro
                generateCode();
                setFormData((prev: any) => ({ ...prev, created_at: new Date().toISOString().slice(0, 10), proprietarios_secundarios: [], impresso_no_contrato: true }));
                setCagepaFile(null);
                setEnergisaFile(null);
            }
        }
    }, [isOpen, initialData]);

    async function generateCode() {
        try {
            const { data } = await supabase
                .from('alugueis')
                .select('codigo_interno')
                .ilike('codigo_interno', 'A-%')
                .order('codigo_interno', { ascending: false })
                .limit(1);

            let nextCode = 1;
            if (data && data.length > 0 && data[0].codigo_interno) {
                const currentCodeStr = data[0].codigo_interno;
                const match = currentCodeStr.match(/\d+/);
                if (match) {
                    nextCode = parseInt(match[0], 10) + 1;
                }
            }

            const formattedCode = `A-${String(nextCode).padStart(4, '0')}`;
            setFormData((prev: any) => ({ ...prev, codigo_interno: formattedCode }));
        } catch (err) {
            const rnd = `A-${Math.floor(Math.random() * 9000) + 1000}`;
            setFormData((prev: any) => ({ ...prev, codigo_interno: rnd }));
        }
    }

    // Calcular o total automaticamente quando aluguel ou condomínio mudarem
    useEffect(() => {
        const aluguel = Number(formData.valor_aluguel) || 0;
        const condo = Number(formData.valor_condominio) || 0;
        const total = aluguel + condo;

        if (formData.valor_total_aluguel_condominio !== total) {
            setFormData((prev: any) => ({ ...prev, valor_total_aluguel_condominio: total }));
        }
    }, [formData.valor_aluguel, formData.valor_condominio]);

    async function fetchRelationalData() {
        const [c, i, p, e] = await Promise.all([
            supabase.from('clientes').select('id, nome_completo, papel').order('nome_completo'),
            supabase.from('imoveis').select('id, endereco, logradouro, nome_identificacao, valor_aluguel, valor_condominio, proprietario_id, empresa_id, proprietarios_secundarios, impresso_no_contrato').eq('status', 'Disponível'),
            supabase.from('proprietarios').select('id, nome_completo, dados_bancarios').order('nome_completo'),
            supabase.from('empresas').select('id, nome_fantasia, dados_bancarios').order('nome_fantasia')
        ]);
        if (c.data) setClientes(c.data);
        if (i.data) setImoveis(initialData && initialData.imoveis ? [initialData.imoveis, ...i.data.filter(x => x.id !== initialData.imovel_id)] : i.data);
        if (p.data) setProprietarios(p.data);
        if (e.data) setEmpresas(e.data.map(x => ({ ...x, nome_completo: x.nome_fantasia })));
    }

    useEffect(() => {
        if (!formData.proprietario_id) {
            setAvailableBankAccounts([]);
            return;
        }

        const owner = formData.tipo_proprietario === "PF" 
            ? proprietarios.find(p => p.id === formData.proprietario_id)
            : empresas.find(e => e.id === formData.proprietario_id);
        
        if (owner && owner.dados_bancarios) {
            const accounts = Array.isArray(owner.dados_bancarios) ? owner.dados_bancarios : [];
            setAvailableBankAccounts(accounts);
            
            // Auto-select if none selected and it's mandatory
            if (formData.status === 'Preparação de Contrato' && (!formData.contas_bancarias || formData.contas_bancarias.length === 0) && accounts.length > 0) {
                // setFormData(prev => ({ ...prev, contas_bancarias: [accounts[0]] })); // Removed to avoid loops, let user pick
            }
        } else {
            setAvailableBankAccounts([]);
        }
    }, [formData.proprietario_id, formData.tipo_proprietario, proprietarios, empresas]);

    // Função auxiliar para adicionar meses a uma data (formato yyyy-mm-dd)
    function addMonthsToDate(dateStr: string, months: number): string {
        if (!dateStr) return '';
        const d = new Date(dateStr + 'T12:00:00');
        d.setMonth(d.getMonth() + months);
        return d.toISOString().slice(0, 10);
    }

    // Calcula as datas dos períodos automaticamente a partir de data_inicio e duracao
    function calcularDatasReajuste(dataInicio: string, tempo: number, currentArr: any[] = []) {
        if (!dataInicio || tempo <= 0) return { reajustes_fixos: [] };
        let arr = [];
        let currentInicio = dataInicio;
        let mesesRestantes = tempo;
        let i = 0;

        while (mesesRestantes > 0) {
            const mesesNoPeriodo = Math.min(12, mesesRestantes);
            const dataFinal = addMonthsToDate(currentInicio, mesesNoPeriodo);

            arr.push({
                inicio: currentInicio,
                final: dataFinal,
                valor: currentArr[i]?.valor || 0
            });

            currentInicio = dataFinal;
            mesesRestantes -= mesesNoPeriodo;
            i++;
        }
        return { reajustes_fixos: arr };
    }

    const handleUploadFile = async (prefix: string, file: File, dbRecordId: string) => {
        try {
            let processedFileData: any = file;
            if (file.type === 'application/pdf') {
                const result = await processPDF(file);
                processedFileData = result.blob;
            } else if (file.type.startsWith('image/') && file.type !== 'image/webp') {
                processedFileData = await convertToWebP(file);
            }

            const fileExt = file.name.split('.').pop();
            const fileName = `${prefix}_${Date.now()}.${fileExt}`;
            const filePath = `${dbRecordId}/titularidades/${fileName}`;

            const { data: uploadData, error: uploadError } = await supabaseStorage.storage
                .from('documentos')
                .upload(filePath, processedFileData, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabaseStorage.storage
                .from('documentos')
                .getPublicUrl(filePath);

            return publicUrlData.publicUrl;
        } catch (error) {
            console.error(`Error uploading ${prefix} file:`, error);
            throw error;
        }
    };

    const handleDeleteFile = async (key: string) => {
        try {
            const url = formData[key];
            if (!url) return;
            const pathMatch = url.match(/documentos\/(.+)$/);
            if (pathMatch && pathMatch[1]) {
                await supabaseStorage.storage.from('documentos').remove([pathMatch[1]]);
            }
            setFormData({ ...formData, [key]: "" });
            if (key === 'comprovante_cagepa_url') setCagepaFile(null);
            if (key === 'comprovante_energisa_url') setEnergisaFile(null);
        } catch (e) {
            console.error("Erro ao deletar arquivo", e);
        }
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (formData.status === 'Preparação de Contrato' && (!formData.contas_bancarias || formData.contas_bancarias.length === 0)) {
                alert("Pelo menos uma conta bancária deve ser selecionada para impressão no contrato.");
                setLoading(false);
                return;
            }
            // Lista de campos que realmente existem na tabela 'alugueis'
            const validKeys = [
                'codigo_interno', 'cliente_id', 'proprietario_id', 'imovel_id',
                'data_inicio', 'data_vencimento', 'duracao_meses', 'valor_aluguel', 'status',
                'finalidade_aluguel', 'tipo_reajuste', 'tempo_reajuste_fixo',
                'reajustes_fixos',
                'tipo_garantia', 'fiadores_ids', 'caucao_quantidade', 'caucao_valor',
                'proprietarios_secundarios', 'impresso_no_contrato',
                'troca_titularidade_cagepa', 'troca_titularidade_energisa',
                'comprovante_cagepa_url', 'comprovante_energisa_url',
                'valor_condominio', 'tipo_pagamento_condominio', 'valor_total_aluguel_condominio',
                'data_finalizacao',
                'contas_bancarias',
                'created_at'
            ];

            const finalData: any = {};
            validKeys.forEach(key => {
                if (formData[key] !== undefined) {
                    finalData[key] = formData[key] === "" ? null : formData[key];
                }
            });

            if (finalData.fiadores_ids && Array.isArray(finalData.fiadores_ids)) {
                finalData.fiadores_ids = finalData.fiadores_ids.filter((id: string) => id && id.trim() !== "");
            }

            // Quando o proprietário é PJ (empresa), o ID vem da tabela 'empresas',
            // mas alugueis.proprietario_id referencia 'proprietarios'.
            // Nesse caso, setamos proprietario_id como null para evitar violação de FK.
            if (formData.tipo_proprietario === "PJ") {
                finalData.proprietario_id = null;
            }

            let recordId = initialData?.id;

            if (recordId) {
                if (cagepaFile) finalData.comprovante_cagepa_url = await handleUploadFile('CAGEPA', cagepaFile, recordId);
                if (energisaFile) finalData.comprovante_energisa_url = await handleUploadFile('ENERGISA', energisaFile, recordId);
                const { error } = await supabase.from('alugueis').update(finalData).eq('id', recordId);
                if (error) throw error;
            } else {
                const { data: insertedData, error } = await supabase.from('alugueis').insert([finalData]).select('id').single();
                if (error) throw error;
                recordId = insertedData.id;

                let updatesNeeded = false;
                if (cagepaFile) {
                    finalData.comprovante_cagepa_url = await handleUploadFile('CAGEPA', cagepaFile, recordId);
                    updatesNeeded = true;
                }
                if (energisaFile) {
                    finalData.comprovante_energisa_url = await handleUploadFile('ENERGISA', energisaFile, recordId);
                    updatesNeeded = true;
                }

                if (updatesNeeded) {
                    await supabase.from('alugueis').update({
                        comprovante_cagepa_url: finalData.comprovante_cagepa_url,
                        comprovante_energisa_url: finalData.comprovante_energisa_url
                    }).eq('id', recordId);
                }

                // Atualiza status do imóvel para 'Alugado' apenas em novos contratos
                if (formData.imovel_id) {
                    await supabase.from('imoveis').update({ status: 'Alugado' }).eq('id', formData.imovel_id);
                }
            }

            onSuccess();
            onClose();
        } catch (error: any) {
            alert("Erro ao salvar o aluguel: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-background/90 backdrop-blur-xl" />

                    <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="bg-panel glass-elite w-full max-w-4xl max-h-[90vh] flex flex-col rounded-[48px] shadow-2xl relative z-10 border border-panel-border overflow-hidden">

                        <header className="px-10 py-8 flex justify-between items-center bg-panel/30 dark:bg-white/5 backdrop-blur-md border-b border-panel-border shrink-0">
                            <div>
                                <h3 className="text-2xl font-serif-premium font-bold text-foreground uppercase italic tracking-tighter lowercase first-letter:uppercase">
                                    {isReadOnly ? 'Visualizar Aluguel' : (initialData ? 'Editar Aluguel' : 'Novo Aluguel')}
                                </h3>
                                <p className="text-[10px] uppercase font-black tracking-widest text-foreground mt-1">CÓD INTERNO: {formData.codigo_interno || '----'}</p>
                            </div>
                            <button type="button" onClick={onClose} className="w-10 h-10 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full flex items-center justify-center text-accent transition-all border border-panel-border"><X className="w-6 h-6" /></button>
                        </header>

                        <form onSubmit={handleSubmit} className="p-10 space-y-8 flex-1 overflow-y-auto custom-scrollbar">

                            {/* Troca de Titularidades — só aparece quando Em Vigência */}
                            {formData.status === 'Em Vigência' && (
                                <div className="bg-black/5 dark:bg-white/5 border border-panel-border rounded-2xl p-5 space-y-4">
                                    <label className="text-[10px] font-black text-primary dark:text-blue-400 uppercase tracking-widest">Troca de Titularidades</label>
                                    <div className="flex items-center gap-6">
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <input type="checkbox" checked={formData.troca_titularidade_cagepa}
                                                disabled={isReadOnly}
                                                onChange={(e) => setFormData({ ...formData, troca_titularidade_cagepa: e.target.checked })}
                                                className="w-4 h-4 rounded accent-emerald-500 disabled:opacity-50" />
                                            <span className={cn("text-sm font-bold transition-colors", formData.troca_titularidade_cagepa ? "text-blue-600 dark:text-blue-400" : "text-accent group-hover:text-foreground")}>CAGEPA</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <input type="checkbox" checked={formData.troca_titularidade_energisa}
                                                disabled={isReadOnly}
                                                onChange={(e) => setFormData({ ...formData, troca_titularidade_energisa: e.target.checked })}
                                                className="w-4 h-4 rounded accent-emerald-500 disabled:opacity-50" />
                                            <span className={cn("text-sm font-bold transition-colors", formData.troca_titularidade_energisa ? "text-blue-600 dark:text-blue-400" : "text-accent group-hover:text-foreground")}>ENERGISA</span>
                                        </label>
                                    </div>

                                    {(formData.troca_titularidade_cagepa || formData.troca_titularidade_energisa) && (
                                        <div className="pt-2 border-t border-panel-border space-y-4">
                                            <div className="bg-primary/10 text-primary dark:text-blue-400 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
                                                <FileCheck className="w-4 h-4" />
                                                Faça o upload do comprovante de solicitação da transferência para continuar.
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                {/* Upload CAGEPA */}
                                                {formData.troca_titularidade_cagepa && (
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Comprovante CAGEPA</label>
                                                        {formData.comprovante_cagepa_url || cagepaFile ? (
                                                            <div className="flex items-center gap-3 p-3 bg-white/5 border border-panel-border rounded-xl">
                                                                <div className="w-10 h-10 bg-primary/20 text-primary rounded-lg flex items-center justify-center shrink-0">
                                                                    <FileText className="w-5 h-5" />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-bold text-foreground truncate">
                                                                        {cagepaFile ? cagepaFile.name : formData.comprovante_cagepa_url?.split('/').pop() || 'Comprovante CAGEPA'}
                                                                    </p>
                                                                    <div className="flex gap-3 mt-1 text-xs">
                                                                        {formData.comprovante_cagepa_url && !cagepaFile && (
                                                                            <a href={formData.comprovante_cagepa_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-blue-600 font-bold flex items-center gap-1 transition-colors">
                                                                                Visualizar
                                                                            </a>
                                                                        )}
                                                                        {!isReadOnly && (
                                                                            <button type="button" onClick={() => handleDeleteFile('comprovante_cagepa_url')} className="text-rose-500 hover:text-rose-600 font-bold flex items-center gap-1 transition-colors">
                                                                                <Trash2 className="w-3 h-3" /> Excluir
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-panel-border rounded-xl cursor-pointer bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors relative overflow-hidden group">
                                                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                                    <Upload className="w-6 h-6 text-accent mb-2 group-hover:scale-110 transition-transform" />
                                                                    <p className="text-xs text-primary dark:text-blue-400 font-bold uppercase tracking-widest">Anexar CAGEPA</p>
                                                                </div>
                                                                <input type="file" className="hidden" accept="image/*,application/pdf"
                                                                    disabled={isReadOnly}
                                                                    onChange={(e) => {
                                                                        if (e.target.files?.[0]) {
                                                                            setCagepaFile(e.target.files[0]);
                                                                        }
                                                                    }} />
                                                            </label>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Upload ENERGISA */}
                                                {formData.troca_titularidade_energisa && (
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Comprovante ENERGISA</label>
                                                        {formData.comprovante_energisa_url || energisaFile ? (
                                                            <div className="flex items-center gap-3 p-3 bg-white/5 border border-panel-border rounded-xl">
                                                                <div className="w-10 h-10 bg-primary/20 text-primary rounded-lg flex items-center justify-center shrink-0">
                                                                    <FileText className="w-5 h-5" />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-bold text-foreground truncate">
                                                                        {energisaFile ? energisaFile.name : formData.comprovante_energisa_url?.split('/').pop() || 'Comprovante ENERGISA'}
                                                                    </p>
                                                                    <div className="flex gap-3 mt-1 text-xs">
                                                                        {formData.comprovante_energisa_url && !energisaFile && (
                                                                            <a href={formData.comprovante_energisa_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-blue-600 font-bold flex items-center gap-1 transition-colors">
                                                                                Visualizar
                                                                            </a>
                                                                        )}
                                                                        {!isReadOnly && (
                                                                            <button type="button" onClick={() => handleDeleteFile('comprovante_energisa_url')} className="text-rose-500 hover:text-rose-600 font-bold flex items-center gap-1 transition-colors">
                                                                                <Trash2 className="w-3 h-3" /> Excluir
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-panel-border rounded-xl cursor-pointer bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors relative overflow-hidden group">
                                                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                                    <Upload className="w-6 h-6 text-accent mb-2 group-hover:scale-110 transition-transform" />
                                                                    <p className="text-xs text-primary dark:text-blue-400 font-bold uppercase tracking-widest">Anexar ENERGISA</p>
                                                                </div>
                                                                <input type="file" className="hidden" accept="image/*,application/pdf"
                                                                    disabled={isReadOnly}
                                                                    onChange={(e) => {
                                                                        if (e.target.files?.[0]) {
                                                                            setEnergisaFile(e.target.files[0]);
                                                                        }
                                                                    }} />
                                                            </label>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-6">
                                <Select required label="Imóvel" value={formData.imovel_id} colSpan="col-span-1"
                                    onChange={(e: any) => {
                                        const id = e.target.value;
                                        const imovel = imoveis.find(i => i.id === id);
                                        if (imovel) {
                                            setFormData({
                                                ...formData,
                                                imovel_id: id,
                                                proprietario_id: imovel.proprietario_id || imovel.empresa_id || "",
                                                tipo_proprietario: imovel.proprietario_id ? "PF" : (imovel.empresa_id ? "PJ" : "PF"),
                                                proprietarios_secundarios: imovel.proprietarios_secundarios || [],
                                                impresso_no_contrato: imovel.impresso_no_contrato !== false,
                                                valor_aluguel: imovel.valor_aluguel || 0,
                                                valor_condominio: imovel.valor_condominio || 0
                                            });
                                        } else {
                                            setFormData({ ...formData, imovel_id: id, proprietarios_secundarios: [], impresso_no_contrato: true });
                                        }
                                    }}
                                    disabled={isReadOnly}
                                    options={[{ label: 'Selecione um imóvel...', value: '' }, ...imoveis.map(i => ({ label: i.nome_identificacao || i.logradouro || i.endereco?.split(',')[0], value: i.id }))]} />

                                <Input disabled={isReadOnly} label="Data de Criação" type="date" value={formData.created_at} onChange={(e: any) => setFormData({ ...formData, created_at: e.target.value })} />

                                <Select required disabled={isReadOnly} label="Cliente (Locatário)" value={formData.cliente_id} onChange={(e: any) => setFormData({ ...formData, cliente_id: e.target.value })} options={[{ label: 'Selecione um cliente...', value: '' }, ...clientes.filter(c => c.papel !== 'Apenas Fiador').map(c => ({ label: c.nome_completo, value: c.id }))]} colSpan="col-span-1" />

                                {formData.proprietarios_secundarios && formData.proprietarios_secundarios.length > 0 ? (
                                    <div className="col-span-1 border border-panel-border rounded-2xl p-4 bg-black/5 dark:bg-white/5 space-y-3">
                                        <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1 flex items-center gap-2">
                                            <FileText className="w-3 h-3 text-primary" /> Proprietários no Contrato
                                        </label>
                                        <div className="space-y-2 max-h-[120px] overflow-y-auto custom-scrollbar pr-2">
                                            {/* Proprietário Principal */}
                                            <label className="flex items-center gap-2 p-2 bg-background/50 border border-panel-border rounded-xl cursor-pointer hover:border-primary transition-all">
                                                <input type="checkbox" 
                                                    disabled={isReadOnly}
                                                    checked={formData.impresso_no_contrato !== false} 
                                                    onChange={(e) => setFormData({ ...formData, impresso_no_contrato: e.target.checked })} 
                                                    className="w-4 h-4 rounded border-panel-border text-primary focus:ring-primary bg-transparent" />
                                                <span className="text-[11px] font-bold text-foreground truncate">
                                                    {(formData.tipo_proprietario === "PF" 
                                                        ? proprietarios.find(p => p.id === formData.proprietario_id)?.nome_completo 
                                                        : empresas.find(e => e.id === formData.proprietario_id)?.nome_fantasia) || 'Proprietário Principal'} (Principal)
                                                </span>
                                            </label>

                                            {/* Proprietários Secundários */}
                                            {formData.proprietarios_secundarios.map((sec: any, idx: number) => {
                                                const name = (sec.tipo === "PF" ? proprietarios : empresas).find(p => p.id === sec.id)?.nome_completo || (sec.tipo === "PF" ? proprietarios : empresas).find(p => p.id === sec.id)?.nome_fantasia || 'Proprietário Adicional';
                                                return (
                                                    <label key={`owner-sec-${idx}`} className="flex items-center gap-2 p-2 bg-background/50 border border-panel-border rounded-xl cursor-pointer hover:border-primary transition-all">
                                                        <input type="checkbox" 
                                                            disabled={isReadOnly}
                                                            checked={sec.no_contrato !== false} 
                                                            onChange={(e) => {
                                                                const newSec = [...formData.proprietarios_secundarios];
                                                                newSec[idx].no_contrato = e.target.checked;
                                                                setFormData({ ...formData, proprietarios_secundarios: newSec });
                                                            }} 
                                                            className="w-4 h-4 rounded border-panel-border text-primary focus:ring-primary bg-transparent" />
                                                        <span className="text-[11px] font-bold text-foreground truncate">{name}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="col-span-1 space-y-2 relative pointer-events-none opacity-60">
                                        <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Proprietário Responsável *</label>
                                        <div className="flex gap-2 mb-2 bg-black/5 dark:bg-white/5 p-1 rounded-xl border border-panel-border">
                                            <button type="button" disabled={isReadOnly} onClick={() => setFormData({ ...formData, tipo_proprietario: "PF", proprietario_id: "" })}
                                                className={cn("flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", formData.tipo_proprietario === "PF" ? "bg-primary shadow-lg text-background" : "text-accent hover:text-foreground")}>PF</button>
                                            <button type="button" disabled={isReadOnly} onClick={() => setFormData({ ...formData, tipo_proprietario: "PJ", proprietario_id: "" })}
                                                className={cn("flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", formData.tipo_proprietario === "PJ" ? "bg-primary shadow-lg text-background" : "text-accent hover:text-foreground")}>PJ</button>
                                        </div>
                                        <select required disabled={isReadOnly || true} value={formData.proprietario_id || ""} onChange={(e) => setFormData({ ...formData, proprietario_id: e.target.value })}
                                            className="w-full bg-black/5 dark:bg-white/5 border border-panel-border rounded-xl py-3 px-5 text-foreground text-[13px] outline-none focus:border-primary transition-all font-medium appearance-none block">
                                            <option value="" className="bg-[#121212] text-white">Selecione um {formData.tipo_proprietario === "PF" ? "proprietário" : "empresa"}...</option>
                                            {(formData.tipo_proprietario === "PF" ? proprietarios : empresas).map((p: any) => (
                                                <option key={p.id} value={p.id} className="bg-[#121212] text-white">{p.nome_completo || p.nome_fantasia}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <Input required disabled={isReadOnly} label="Início do Contrato" type="date" value={formData.data_inicio} onChange={(e: any) => {
                                    const newDate = e.target.value;
                                    // Calcular vencimento = data_inicio + 30 dias
                                    let vencimento = '';
                                    let finalizacao = '';
                                    if (newDate) {
                                        const d = new Date(newDate + 'T00:00:00');
                                        d.setDate(d.getDate() + 30);
                                        vencimento = d.toISOString().slice(0, 10);
                                        // Calcular finalização = data_inicio + duracao_meses
                                        if (formData.duracao_meses) {
                                            const df = new Date(newDate + 'T00:00:00');
                                            df.setMonth(df.getMonth() + parseInt(formData.duracao_meses));
                                            finalizacao = df.toISOString().slice(0, 10);
                                        }
                                    }
                                    if (formData.tipo_reajuste === 'Fixo') {
                                        const datas = calcularDatasReajuste(newDate, formData.duracao_meses);
                                        setFormData({ ...formData, data_inicio: newDate, data_vencimento: vencimento, data_finalizacao: finalizacao, ...datas });
                                    } else {
                                        setFormData({ ...formData, data_inicio: newDate, data_vencimento: vencimento, data_finalizacao: finalizacao });
                                    }
                                }} />
                                <Input disabled={isReadOnly} label="Vencimento" type="date" value={formData.data_vencimento} onChange={(e: any) => setFormData({ ...formData, data_vencimento: e.target.value })} />
                                <Input required disabled={isReadOnly} label="Duração (Meses)" type="number" value={formData.duracao_meses} onChange={(e: any) => {
                                    const m = parseInt(e.target.value) || 0;
                                    // Calcular finalização = data_inicio + meses
                                    let finalizacao = '';
                                    if (formData.data_inicio && m > 0) {
                                        const df = new Date(formData.data_inicio + 'T00:00:00');
                                        df.setMonth(df.getMonth() + m);
                                        finalizacao = df.toISOString().slice(0, 10);
                                    }
                                    setFormData({
                                        ...formData,
                                        duracao_meses: m,
                                        data_finalizacao: finalizacao,
                                        ...(formData.tipo_reajuste === "Fixo" ? calcularDatasReajuste(formData.data_inicio, m, formData.reajustes_fixos) : {})
                                    });
                                }} />

                                <CurrencyInput required disabled={isReadOnly} label="Valor Aluguel" value={formData.valor_aluguel} onChange={(val: number) => {
                                    setFormData((prev: any) => ({
                                        ...prev,
                                        valor_aluguel: val,
                                        caucao_valor: val * (prev.caucao_quantidade || 0)
                                    }));
                                }} />

                                <CurrencyInput disabled={isReadOnly} label="Valor do Condomínio" value={formData.valor_condominio} onChange={(val: number) => {
                                    setFormData((prev: any) => ({
                                        ...prev,
                                        valor_condominio: val
                                    }));
                                }} />

                                <Input disabled={isReadOnly} label="Finalização do Contrato" type="date" value={formData.data_finalizacao || ''} onChange={(e: any) => setFormData({ ...formData, data_finalizacao: e.target.value })} colSpan="col-span-1" />

                                <div className="col-span-1 space-y-3 pt-4 border-t border-panel-border mt-2">
                                    <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Forma de Pagamento do Condomínio</label>
                                    <div className="flex flex-col gap-3">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" className="accent-primary w-4 h-4 cursor-pointer"
                                                disabled={isReadOnly}
                                                checked={formData.tipo_pagamento_condominio === "Separado"}
                                                onChange={() => setFormData((prev: any) => ({ ...prev, tipo_pagamento_condominio: "Separado" }))} />
                                            <span className="text-sm font-bold text-foreground">Pagamento Separado</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" className="accent-primary w-4 h-4 cursor-pointer"
                                                disabled={isReadOnly}
                                                checked={formData.tipo_pagamento_condominio === "Único"}
                                                onChange={() => setFormData((prev: any) => ({ ...prev, tipo_pagamento_condominio: "Único" }))} />
                                            <span className="text-sm font-bold text-foreground">Pagamento Único</span>
                                        </label>
                                    </div>
                                    
                                    <div className="pt-2">
                                        <Select
                                            label="Status"
                                            value={formData.status}
                                            onChange={(e: any) => setFormData({ ...formData, status: e.target.value })}
                                            disabled={!initialData || isReadOnly}
                                            options={[
                                                { label: 'Preparação de Contrato', value: 'Preparação de Contrato' },
                                                { label: 'Em Vigência', value: 'Em Vigência' },
                                                { label: 'Finalizado', value: 'Finalizado' },
                                                { label: 'Cancelado', value: 'Cancelado' },
                                                { label: 'Aguardando Assinatura', value: 'Aguardando Assinatura' }
                                            ]}
                                        />
                                    </div>
                                </div>

                                <div className="col-span-1 space-y-2 pt-4 border-t border-panel-border mt-2">
                                    <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Impresso no Contrato (Contas) *</label>
                                    <div className="space-y-2 max-h-[160px] overflow-y-auto custom-scrollbar border border-panel-border rounded-xl p-3 bg-black/5 dark:bg-white/5">
                                        {availableBankAccounts.length === 0 ? (
                                            <div className="text-[10px] text-accent italic p-2">Nenhum dado bancário cadastrado para este proprietário.</div>
                                        ) : (
                                            availableBankAccounts.map((acc, idx) => (
                                                <label key={idx} className="flex items-center gap-3 p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-panel-border">
                                                    <input type="checkbox" 
                                                        disabled={isReadOnly}
                                                        checked={formData.contas_bancarias?.some((a: any) => a.conta === acc.conta && a.agencia === acc.agencia)}
                                                        onChange={(e) => {
                                                            let newSelection = [...(formData.contas_bancarias || [])];
                                                            if (e.target.checked) {
                                                                newSelection.push(acc);
                                                            } else {
                                                                newSelection = newSelection.filter((a: any) => !(a.conta === acc.conta && a.agencia === acc.agencia));
                                                            }
                                                            setFormData({ ...formData, contas_bancarias: newSelection });
                                                        }}
                                                        className="w-4 h-4 rounded border-panel-border text-primary focus:ring-primary bg-transparent" />
                                                    <div className="flex flex-col overflow-hidden">
                                                        <span className="text-[11px] font-bold text-foreground truncate">{acc.banco} - {acc.tipo_conta}</span>
                                                        <span className="text-[9px] text-text-dim">Ag: {acc.agencia} | C: {acc.conta}</span>
                                                    </div>
                                                </label>
                                            ))
                                        )}
                                    </div>
                                    {formData.status === 'Preparação de Contrato' && (!formData.contas_bancarias || formData.contas_bancarias.length === 0) && (
                                        <p className="text-[9px] text-rose-500 font-bold uppercase tracking-wider ml-1">Mínimo 1 conta para contrato</p>
                                    )}
                                </div>

                                {formData.tipo_pagamento_condominio === "Único" && (
                                    <CurrencyInput
                                        label="Aluguel + Condomínio"
                                        readOnly
                                        value={formData.valor_total_aluguel_condominio}
                                        onChange={() => { }}
                                        colSpan="col-span-2"
                                    />
                                )}

                                <div className="col-span-2 space-y-3 pt-4 border-t border-panel-border mt-2">
                                    <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Finalidade do Aluguel</label>
                                    <div className="flex gap-6">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" className="accent-primary w-4 h-4 cursor-pointer"
                                                disabled={isReadOnly}
                                                checked={formData.finalidade_aluguel === "Residencial"}
                                                onChange={() => setFormData({ ...formData, finalidade_aluguel: "Residencial" })} />
                                            <span className="text-sm font-bold text-foreground">Residencial</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" className="accent-primary w-4 h-4 cursor-pointer"
                                                disabled={isReadOnly}
                                                checked={formData.finalidade_aluguel === "Comercial"}
                                                onChange={() => setFormData({ ...formData, finalidade_aluguel: "Comercial" })} />
                                            <span className="text-sm font-bold text-foreground">Comercial</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="col-span-2 space-y-3 pt-4 border-t border-panel-border mt-2">
                                    <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Tipo de Garantia</label>
                                    <div className="flex gap-6">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" className="accent-primary w-4 h-4 cursor-pointer"
                                                disabled={isReadOnly}
                                                checked={formData.tipo_garantia === "Fiador"}
                                                onChange={() => setFormData({ ...formData, tipo_garantia: "Fiador" })} />
                                            <span className="text-sm font-bold text-foreground">Fiador(es)</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" className="accent-primary w-4 h-4 cursor-pointer"
                                                disabled={isReadOnly}
                                                checked={formData.tipo_garantia === "Caução"}
                                                onChange={() => setFormData({ ...formData, tipo_garantia: "Caução" })} />
                                            <span className="text-sm font-bold text-foreground">Caução</span>
                                        </label>
                                    </div>
                                </div>

                                {formData.tipo_garantia === "Fiador" && (
                                    <div className="col-span-2 space-y-4 bg-black/5 dark:bg-white/5 p-6 rounded-2xl border border-panel-border mt-2">
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="text-[10px] font-black text-text-dim uppercase tracking-widest">Fiadores Atribuídos</label>
                                            {!isReadOnly && (
                                                <button type="button" onClick={() => setFormData({ ...formData, fiadores_ids: [...formData.fiadores_ids, ""] })} className="text-[10px] font-black bg-primary/10 text-primary px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-colors uppercase tracking-widest">+ Adicionar Fiador</button>
                                            )}
                                        </div>

                                        {formData.fiadores_ids.length === 0 && (
                                            <div className="text-center p-4 border border-dashed border-panel-border rounded-xl text-accent text-xs">Nenhum fiador adicionado. Clique no botão acima para adicionar.</div>
                                        )}

                                        {formData.fiadores_ids.map((fiadorId: string, idx: number) => (
                                            <div key={idx} className="flex gap-3">
                                                <div className="flex-1">
                                                    <select required disabled={isReadOnly} value={fiadorId} onChange={e => {
                                                        const newFiadores = [...formData.fiadores_ids];
                                                        newFiadores[idx] = e.target.value;
                                                        setFormData({ ...formData, fiadores_ids: newFiadores });
                                                    }} className="w-full h-11 bg-background border border-panel-border rounded-xl px-5 text-foreground text-[13px] outline-none focus:border-primary transition-all font-medium appearance-none">
                                                        <option value="">Selecione um fiador (mesmo banco de clientes)...</option>
                                                        {clientes.filter((c: any) => c.papel === 'Apenas Fiador' || c.papel === 'Locatário e Fiador').map((c: any) => <option key={c.id} value={c.id}>{c.nome_completo}</option>)}
                                                    </select>
                                                </div>
                                                {!isReadOnly && (
                                                    <button type="button" onClick={() => {
                                                        const newFiadores = [...formData.fiadores_ids];
                                                        newFiadores.splice(idx, 1);
                                                        setFormData({ ...formData, fiadores_ids: newFiadores });
                                                    }} className="w-11 h-11 bg-rose-500/10 text-rose-500 rounded-xl flex items-center justify-center shrink-0 hover:bg-rose-500/20 transition-all">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {formData.tipo_garantia === "Caução" && (
                                    <div className="col-span-2 grid grid-cols-2 gap-4 bg-black/5 dark:bg-white/5 p-6 rounded-2xl border border-panel-border mt-2">
                                        <Input disabled={isReadOnly} label="Quantidade (Meses)" type="number"
                                            value={formData.caucao_quantidade}
                                            onChange={(e: any) => {
                                                const qtd = parseInt(e.target.value) || 0;
                                                setFormData({
                                                    ...formData,
                                                    caucao_quantidade: qtd,
                                                    caucao_valor: qtd * (formData.valor_aluguel || 0)
                                                });
                                            }}
                                        />
                                        <CurrencyInput label="Valor Calculado Caução" value={formData.caucao_valor} onChange={() => { }} readOnly />
                                    </div>
                                )}

                                <div className="col-span-2 space-y-3 pt-4 border-t border-panel-border mt-2">
                                    <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Tipo de Reajuste</label>
                                    <div className="flex gap-6">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" className="accent-primary w-4 h-4 cursor-pointer"
                                                disabled={isReadOnly}
                                                checked={formData.tipo_reajuste === "Índice"}
                                                onChange={() => setFormData({ ...formData, tipo_reajuste: "Índice" })} />
                                            <span className="text-sm font-bold text-foreground">Reajuste por índice</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" className="accent-primary w-4 h-4 cursor-pointer"
                                                disabled={isReadOnly}
                                                checked={formData.tipo_reajuste === "Fixo"}
                                                onChange={() => {
                                                    const datas = calcularDatasReajuste(formData.data_inicio, formData.duracao_meses, formData.reajustes_fixos);
                                                    setFormData({ ...formData, tipo_reajuste: "Fixo", ...datas });
                                                }} />
                                            <span className="text-sm font-bold text-foreground">Reajuste Fixo</span>
                                        </label>
                                    </div>
                                </div>

                                {formData.tipo_reajuste === "Fixo" && (
                                    <div className="col-span-2 space-y-4 bg-black/5 dark:bg-white/5 p-6 rounded-2xl border border-panel-border mt-2">
                                        {(formData.reajustes_fixos || []).map((periodo: any, idx: number) => {
                                            const totalMeses = formData.duracao_meses;
                                            const startMonthIdx = idx * 12 + 1;
                                            const endMonthIdx = Math.min((idx + 1) * 12, totalMeses);
                                            return (
                                                <div key={idx} className={cn("grid grid-cols-3 gap-4", idx !== formData.reajustes_fixos.length - 1 ? "pb-4 border-b border-panel-border/30" : "pb-0")}>
                                                    <div className="col-span-3 text-[10px] font-black uppercase text-accent tracking-widest">{idx + 1}º Período ({startMonthIdx} a {endMonthIdx} meses)</div>
                                                    <Input disabled={isReadOnly} label="Data Inicial" type="date" value={periodo.inicio}
                                                        onChange={(e: any) => {
                                                            const arr = [...formData.reajustes_fixos];
                                                            arr[idx] = { ...arr[idx], inicio: e.target.value };
                                                            setFormData({ ...formData, reajustes_fixos: arr });
                                                        }} />
                                                    <Input disabled={isReadOnly} label="Data Final" type="date" value={periodo.final}
                                                        onChange={(e: any) => {
                                                            const arr = [...formData.reajustes_fixos];
                                                            arr[idx] = { ...arr[idx], final: e.target.value };
                                                            setFormData({ ...formData, reajustes_fixos: arr });
                                                        }} />
                                                    <CurrencyInput disabled={isReadOnly} label="Valor" value={periodo.valor}
                                                        onChange={(val: number) => {
                                                            const arr = [...formData.reajustes_fixos];
                                                            arr[idx] = { ...arr[idx], valor: val };
                                                            setFormData({ ...formData, reajustes_fixos: arr });
                                                        }} />
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={onClose} className="flex-1 py-4 text-accent font-black text-xs uppercase tracking-widest hover:bg-black/5 dark:hover:bg-white/5 rounded-2xl transition-all">Cancelar</button>
                                <button type="submit" disabled={loading} className="flex-[2] btn-elite py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shadow-2xl flex items-center justify-center gap-2">
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (initialData ? "Salvar Alterações" : "Emitir Novo Aluguel")}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
