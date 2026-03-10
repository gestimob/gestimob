"use client";

import { X, Loader2, MapPin, User, FileText, ChevronRight, CheckCircle2, Upload, Trash2, Wand2, Scan, Sparkles, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { convertToWebP, processPDF } from "@/lib/documentProcessor";
import { performOCR, OCRResult } from "@/lib/ocrProcessor";
import { FileViewerModal } from "./FileViewerModal";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { supabaseStorage } from "@/lib/supabaseStorage";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const maskCpfCnpj = (value: string) => {
    const val = value.replace(/\D/g, "");
    if (val.length <= 11) {
        return val.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    } else {
        return val.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2").slice(0, 18);
    }
};

const maskTelefone = (value: string) => {
    let val = value.replace(/\D/g, "");
    if (val.length > 11) val = val.slice(0, 11);
    if (val.length <= 10) {
        return val.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
    } else {
        return val.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
    }
};

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: any;
}

type TabType = 'basico' | 'endereco' | 'bancario' | 'documentos';

const initialFormState = {
    nome_completo: "", tipo: "PF", documento: "", email: "", telefone: "",
    cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "", codigo_interno: "",
    dados_bancarios: []
};

const Input = ({ label, value, onChange, placeholder, type = "text", colSpan = "col-span-1", readOnly = false, maxLength, required = false }: any) => (
    <div className={cn("space-y-2", colSpan)}>
        <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">{label} {required && "*"}</label>
        <input type={type} value={value || ""} onChange={onChange} readOnly={readOnly} maxLength={maxLength} required={required}
            className={cn("w-full bg-black/5 dark:bg-white/5 border border-panel-border rounded-lg h-9 px-4 text-foreground text-[13px] outline-none focus:border-primary transition-all font-medium placeholder:text-text-dim/30", readOnly && "opacity-50 cursor-not-allowed")} placeholder={placeholder} />
    </div>
);

export function NovoProprietarioModal({ isOpen, onClose, onSuccess, initialData }: ModalProps) {
    const [loading, setLoading] = useState(false);
    const [searchingCep, setSearchingCep] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('basico');

    const [formData, setFormData] = useState<any>(initialFormState);

    const [docIdentidade, setDocIdentidade] = useState<File | null>(null);
    const [selfie, setSelfie] = useState<File | null>(null);
    const [ocrLoading, setOcrLoading] = useState(false);
    const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);

    const isPF = formData.tipo === 'PF';

    const [viewerData, setViewerData] = useState<{ url: string | null; name: string; onDelete?: () => void }>({ url: null, name: '' });

    const openViewer = (file: File | null, url: string | null, name: string, type: 'identidade' | 'selfie') => {
        let viewUrl = null;
        if (file) {
            viewUrl = URL.createObjectURL(file);
        } else if (url) {
            viewUrl = url;
        }
        if (!viewUrl) return;

        setViewerData({
            url: viewUrl,
            name,
            onDelete: () => {
                if (file) {
                    if (type === 'identidade') setDocIdentidade(null);
                    else setSelfie(null);
                } else if (url) {
                    handleDeleteFile(url, type);
                }
            }
        });
    };

    const handleFileValidation = (file: File) => {
        const isPDF = file.type === 'application/pdf';
        const isImage = file.type.startsWith('image/');
        const isSmall = file.size <= 5 * 1024 * 1024;

        if (!isPDF && !isImage) {
            alert('Apenas PDF e Imagens são permitidas.');
            return false;
        }
        if (!isSmall) {
            alert('O arquivo deve ter no máximo 5MB.');
            return false;
        }
        return true;
    };

    const handleImageOnlyValidation = (file: File) => {
        const isImage = file.type.startsWith('image/');
        const isSmall = file.size <= 5 * 1024 * 1024;

        if (!isImage) {
            alert('A selfie deve ser uma imagem (JPG, PNG).');
            return false;
        }
        if (!isSmall) {
            alert('A imagem deve ter no máximo 5MB.');
            return false;
        }
        return true;
    };

    const fetchNextCode = async () => {
        try {
            const { data, error } = await supabase
                .from('proprietarios')
                .select('codigo_interno')
                .not('codigo_interno', 'is', null)
                .order('created_at', { ascending: false })
                .limit(1);

            let nextCode = 1;

            if (data && data.length > 0 && data[0].codigo_interno) {
                const currentCodeStr = data[0].codigo_interno;
                const match = currentCodeStr.match(/\d+/);
                if (match) {
                    nextCode = parseInt(match[0], 10) + 1;
                }
            }

            return `P-${String(nextCode).padStart(4, '0')}`;
        } catch (error) {
            console.error("Erro ao gerar próximo código proprietário:", error);
            const rnd = Math.floor(Math.random() * 9000) + 1000;
            return `P-${rnd}`;
        }
    };

    useEffect(() => {
        const initForm = async () => {
            if (isOpen) {
                if (initialData) {
                    setFormData({ ...initialFormState, ...initialData });
                } else {
                    const nextCode = await fetchNextCode();
                    setFormData({ ...initialFormState, codigo_interno: nextCode, dados_bancarios: [] });
                    setDocIdentidade(null);
                    setSelfie(null);
                    setOcrResult(null);
                }
                setActiveTab('basico');
            }
        };
        initForm();
    }, [initialData, isOpen]);

    const handleIdInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const masked = maskCpfCnpj(e.target.value);
        const raw = masked.replace(/\D/g, "");
        setFormData({ ...formData, documento: masked, tipo: raw.length > 11 ? "PJ" : "PF" });
    };

    const handleTelInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, telefone: maskTelefone(e.target.value) });
    };

    const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const cep = e.target.value.replace(/\D/g, "").slice(0, 8);
        setFormData((p: any) => ({ ...p, cep }));
        if (cep.length === 8) {
            setSearchingCep(true);
            try {
                const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                const data = await res.json();
                if (!data.erro) {
                    setFormData((p: any) => ({
                        ...p,
                        logradouro: data.logradouro,
                        bairro: data.bairro,
                        cidade: data.localidade,
                        estado: data.uf
                    }));
                }
            } catch (e) { console.error(e); } finally { setSearchingCep(false); }
        }
    };

    const handleDeleteFile = async (url: string, type: 'identidade' | 'selfie') => {
        if (!confirm("Deseja realmente excluir este arquivo?")) return;

        try {
            const pathParts = url.split('/documentos/');
            if (pathParts.length < 2) return;

            const rawPath = pathParts[1].split('?')[0];
            const storagePath = decodeURIComponent(rawPath);

            const { error: storageError } = await supabaseStorage.storage.from('documentos').remove([storagePath]);
            if (storageError) throw storageError;

            if (initialData?.id) {
                const updateField = type === 'identidade' ? { documento_identidade_url: null } : { documento_selfie_url: null };
                await supabase.from('proprietarios').update(updateField).eq('id', initialData.id);
            }

            if (type === 'identidade') {
                setFormData((prev: any) => ({ ...prev, documento_identidade_url: null }));
                setDocIdentidade(null);
            } else {
                setFormData((prev: any) => ({ ...prev, documento_selfie_url: null }));
                setSelfie(null);
            }

            alert("Arquivo removido com sucesso.");
        } catch (error: any) {
            console.error("Erro ao deletar arquivo:", error);
            alert("Erro ao remover arquivo: " + error.message);
        }
    };

    const handleOCR = async (file: File) => {
        if (file.type === "application/pdf") {
            alert("A leitura OCR só está disponível para imagens (JPG, PNG). Se o seu documento for um PDF, preencha os dados manualmente.");
            return;
        }
        setOcrLoading(true);
        setOcrResult(null);
        try {
            const result = await performOCR(file);
            setOcrResult(result);
        } catch (e) {
            console.error(e);
            alert("Erro ao processar OCR.");
        } finally {
            setOcrLoading(false);
        }
    };

    const applyOCR = () => {
        if (!ocrResult) return;
        const { extractedData } = ocrResult;
        const newData = { ...formData };
        if (extractedData.name) newData.nome_completo = extractedData.name;

        if (extractedData.cnpj) {
            newData.documento = maskCpfCnpj(extractedData.cnpj);
            newData.tipo = "PJ";
        } else if (extractedData.cpf) {
            newData.documento = maskCpfCnpj(extractedData.cpf);
            newData.tipo = "PF";
        }

        setFormData(newData);
        setOcrResult(null);
        setActiveTab('basico');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (activeTab !== 'documentos') {
            return;
        }

        if (!formData.nome_completo || !formData.documento) {
            alert("Por favor, preencha o Nome e Documento na aba 'Dados Principais'.");
            setActiveTab('basico');
            return;
        }

        if (!formData.cep || !formData.logradouro || !formData.numero || !formData.cidade || !formData.estado) {
            alert("Por favor, preencha o CEP e Endereço obrigatórios na aba 'Localização'.");
            setActiveTab('endereco');
            return;
        }

        setLoading(true);
        try {
            let finalData = { ...formData };

            // Sanitize empty strings to null
            Object.keys(finalData).forEach(key => {
                if (finalData[key] === "") finalData[key] = null;
            });

            let propId = initialData?.id;
            if (initialData?.id) {
                const { error } = await supabase.from('proprietarios').update(finalData).eq('id', initialData.id);
                if (error) throw error;
            } else {
                const { data, error } = await supabase.from('proprietarios').insert([finalData]).select().single();
                if (error) throw error;
                propId = data.id;
            }

            const uploadFileProcessor = async (file: File, prefix: string) => {
                let fToUpload: Blob | File = file;
                let fName = `${prefix}_${propId}_${Date.now()}`;
                if (file.type.startsWith('image/')) {
                    fToUpload = await convertToWebP(file);
                    fName += '.webp';
                } else if (file.type === 'application/pdf') {
                    const res = await processPDF(file);
                    fToUpload = res.blob;
                    fName += '.pdf';
                }
                const { data: up, error } = await supabaseStorage.storage.from('documentos').upload(`proprietarios/${propId}/${fName}`, fToUpload);
                if (error) throw error;
                const { data: { publicUrl } } = supabaseStorage.storage.from('documentos').getPublicUrl(up.path);
                return publicUrl;
            };

            const updates: any = {};
            if (docIdentidade) updates.documento_identidade_url = await uploadFileProcessor(docIdentidade, 'id');
            if (selfie) updates.documento_selfie_url = await uploadFileProcessor(selfie, 'selfie');

            if (Object.keys(updates).length > 0) {
                await supabase.from('proprietarios').update(updates).eq('id', propId);
            }

            onSuccess();
            onClose();
        } catch (error: any) { alert(error.message); } finally { setLoading(false); }
    };

    const navItems = [
        { id: 'basico', label: 'Dados Básicos', icon: User, desc: 'Identificação' },
        { id: 'endereco', label: 'Endereço', icon: MapPin, desc: 'Localização' },
        { id: 'bancario', label: 'Dados Bancários', icon: FileText, desc: 'Finanças' },
        { id: 'documentos', label: 'Documentos', icon: FileText, desc: 'Arquivos' },
    ];

    const currentStepIndex = navItems.findIndex(i => i.id === activeTab);

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-background/90 backdrop-blur-xl" />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-panel glass-elite w-full max-w-5xl h-[90vh] md:h-[650px] rounded-[32px] md:rounded-[48px] shadow-2xl relative z-10 border border-panel-border flex flex-col md:flex-row overflow-hidden font-sans">

                            <aside className="w-full md:w-72 bg-panel/30 dark:bg-white/5 backdrop-blur-md border-b md:border-b-0 md:border-r border-panel-border flex flex-col shrink-0">
                                <div className="p-4 md:p-10 md:pb-6 text-foreground italic uppercase font-bold text-lg md:text-2xl leading-none tracking-tighter font-serif-premium lowercase first-letter:uppercase">
                                    {initialData ? 'Editar' : 'Novo'} <br className="hidden md:block" /> Proprietário
                                </div>
                                <nav className="flex md:flex-col overflow-x-auto md:overflow-x-visible p-4 md:p-8 md:pt-0 gap-2 md:gap-3 scrollbar-hide">
                                    {navItems.map((item) => (
                                        <button key={item.id} onClick={() => setActiveTab(item.id as TabType)}
                                            className={cn("flex-none md:w-full flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl md:rounded-2xl transition-all border", activeTab === item.id ? "bg-panel border-panel-border shadow-sm md:scale-105 pointer-events-none" : "hover:bg-black/5 dark:hover:bg-white/5 border-transparent text-accent hover:text-foreground")}>
                                            <div className={cn("w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center transition-all shrink-0", activeTab === item.id ? "bg-primary text-background shadow-[0_0_20px_rgba(255,255,255,0.1)]" : "bg-black/5 dark:bg-white/5 text-accent")}>
                                                <item.icon className="w-4 h-4" />
                                            </div>
                                            <div className="text-left font-black tracking-widest text-[9px] md:text-[10px] uppercase whitespace-nowrap">{item.label}</div>
                                        </button>
                                    ))}
                                </nav>
                            </aside>

                            <div className="flex-1 flex flex-col relative bg-panel">
                                <header className="px-6 md:px-10 py-4 md:py-8 flex justify-between items-center bg-panel/30 dark:bg-white/5 backdrop-blur-md border-b border-panel-border shrink-0">
                                    <div>
                                        <div className="text-[9px] md:text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-1">Etapa {currentStepIndex + 1}/{navItems.length}</div>
                                        <h3 className="text-xl md:text-3xl font-black text-foreground uppercase italic tracking-tighter">{navItems[currentStepIndex].label}</h3>
                                    </div>
                                    <button onClick={onClose} className="w-8 h-8 md:w-10 md:h-10 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full flex items-center justify-center text-accent transition-all border border-panel-border"><X className="w-5 h-5" /></button>
                                </header>

                                <form onSubmit={handleSubmit} id="propModalForm" className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar relative">
                                    <AnimatePresence mode="wait">
                                        {activeTab === 'basico' && (
                                            <motion.div key="bas" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                                <Input label="Código Interno" value={formData.codigo_interno} readOnly colSpan="col-span-1" />
                                                <div className="hidden md:block col-span-1" />

                                                <Input required label="Nome Completo" value={formData.nome_completo} onChange={(e: any) => setFormData({ ...formData, nome_completo: e.target.value })} colSpan="col-span-2" />

                                                <Input required label="Documento (CPF/CNPJ)" value={formData.documento} onChange={handleIdInput} maxLength={18} placeholder="000.000.000-00" colSpan="col-span-1" />

                                                <Input label="Telefone / Whatsapp" value={formData.telefone} onChange={handleTelInput} placeholder="(00) 00000-0000" maxLength={15} colSpan="col-span-1" />

                                                <Input label="E-mail" value={formData.email} onChange={(e: any) => setFormData({ ...formData, email: e.target.value })} type="email" colSpan="col-span-2" />
                                            </motion.div>
                                        )}

                                        {activeTab === 'endereco' && (
                                            <motion.div key="end" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="grid grid-cols-2 md:grid-cols-6 gap-4 md:gap-6">
                                                <div className="col-span-2 md:col-span-2 space-y-2">
                                                    <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">CEP *</label>
                                                    <div className="relative">
                                                        <input required value={formData.cep || ""} onChange={handleCepChange} placeholder="00000-000" maxLength={9}
                                                            className="w-full bg-black/5 dark:bg-white/5 border border-panel-border rounded-lg h-9 px-4 text-foreground text-[13px] outline-none focus:border-primary transition-all font-medium" />
                                                        {searchingCep && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />}
                                                    </div>
                                                </div>

                                                <div className="hidden md:block col-span-4" />
                                                <Input required label="Rua / Logradouro" value={formData.logradouro} onChange={(e: any) => setFormData({ ...formData, logradouro: e.target.value })} colSpan="col-span-2 md:col-span-4" />
                                                <Input required label="Número" value={formData.numero} onChange={(e: any) => setFormData({ ...formData, numero: e.target.value })} colSpan="col-span-1 md:col-span-2" />
                                                <Input label="Complemento" value={formData.complemento} onChange={(e: any) => setFormData({ ...formData, complemento: e.target.value })} colSpan="col-span-1 md:col-span-3" />
                                                <Input required label="Bairro" value={formData.bairro} onChange={(e: any) => setFormData({ ...formData, bairro: e.target.value })} colSpan="col-span-1 md:col-span-3" />
                                                <Input required label="Cidade" value={formData.cidade} onChange={(e: any) => setFormData({ ...formData, cidade: e.target.value })} colSpan="col-span-2 md:col-span-4" />
                                                <Input required label="UF" value={formData.estado} onChange={(e: any) => setFormData({ ...formData, estado: e.target.value })} colSpan="col-span-1 md:col-span-2" maxLength={2} />
                                            </motion.div>
                                        )}

                                        {activeTab === 'bancario' && (
                                            <motion.div key="ban" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                                                <div className="flex justify-between items-center mb-4">
                                                    <p className="text-[10px] text-text-dim font-black uppercase tracking-widest leading-none">Contas cadastradas: {formData.dados_bancarios?.length || 0}</p>
                                                    <button type="button" onClick={() => {
                                                        const current = formData.dados_bancarios || [];
                                                        setFormData({
                                                            ...formData,
                                                            dados_bancarios: [...current, { banco: '', num_banco: '', agencia: '', conta: '', tipo_conta: 'Corrente', chave_pix: '' }]
                                                        });
                                                    }} className="text-[10px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2 hover:opacity-80 transition-all">
                                                        <Plus className="w-3.5 h-3.5" /> Adicionar Conta
                                                    </button>
                                                </div>

                                                <div className="space-y-6">
                                                    {(!formData.dados_bancarios || formData.dados_bancarios.length === 0) ? (
                                                        <div className="p-12 border-2 border-dashed border-panel-border rounded-[32px] flex flex-col items-center justify-center text-center opacity-50 space-y-3">
                                                            <Sparkles className="w-10 h-10 text-accent" />
                                                            <div className="space-y-1">
                                                                <h4 className="text-[13px] font-black text-foreground uppercase italic tracking-widest">Nenhuma conta cadastrada</h4>
                                                                <p className="text-[10px] text-text-dim font-black uppercase tracking-widest">Clique em adicionar para inserir dados bancários.</p>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        formData.dados_bancarios.map((item: any, idx: number) => (
                                                            <div key={idx} className="bg-black/5 dark:bg-white/5 border border-panel-border rounded-2xl md:rounded-[32px] p-4 md:p-8 space-y-4 md:space-y-6 relative group">
                                                                <button type="button" onClick={() => {
                                                                    const updated = formData.dados_bancarios.filter((_: any, i: number) => i !== idx);
                                                                    setFormData({ ...formData, dados_bancarios: updated });
                                                                }} className="absolute top-6 right-6 w-8 h-8 rounded-full flex items-center justify-center text-rose-500 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>

                                                                <div className="flex items-center gap-3 mb-2">
                                                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-[10px] font-black">{idx + 1}</div>
                                                                    <h4 className="text-[10px] font-black text-foreground uppercase tracking-[0.2em]">Dados da Conta</h4>
                                                                </div>

                                                                <div className="grid grid-cols-2 md:grid-cols-6 gap-4 md:gap-6">
                                                                    <Input label="Banco" value={item.banco} onChange={(e: any) => {
                                                                        const updated = [...formData.dados_bancarios];
                                                                        updated[idx].banco = e.target.value;
                                                                        setFormData({ ...formData, dados_bancarios: updated });
                                                                    }} colSpan="col-span-2 md:col-span-3" />
                                                                    <Input label="Número Banco" value={item.num_banco} onChange={(e: any) => {
                                                                        const updated = [...formData.dados_bancarios];
                                                                        updated[idx].num_banco = e.target.value;
                                                                        setFormData({ ...formData, dados_bancarios: updated });
                                                                    }} colSpan="col-span-2 md:col-span-3" />

                                                                    <Input label="Agência" value={item.agencia} onChange={(e: any) => {
                                                                        const updated = [...formData.dados_bancarios];
                                                                        updated[idx].agencia = e.target.value;
                                                                        setFormData({ ...formData, dados_bancarios: updated });
                                                                    }} colSpan="col-span-1 md:col-span-2" />
                                                                    <Input label="Conta" value={item.conta} onChange={(e: any) => {
                                                                        const updated = [...formData.dados_bancarios];
                                                                        updated[idx].conta = e.target.value;
                                                                        setFormData({ ...formData, dados_bancarios: updated });
                                                                    }} colSpan="col-span-1 md:col-span-2" />

                                                                    <div className="col-span-2 md:col-span-2 space-y-2">
                                                                        <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Tipo de Conta</label>
                                                                        <div className="flex gap-4 h-9 items-center">
                                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                                <input type="radio" name={`tipo-${idx}`} checked={item.tipo_conta === 'Corrente'} onChange={() => {
                                                                                    const updated = [...formData.dados_bancarios];
                                                                                    updated[idx].tipo_conta = 'Corrente';
                                                                                    setFormData({ ...formData, dados_bancarios: updated });
                                                                                }} className="w-4 h-4 accent-primary" />
                                                                                <span className="text-[11px] font-bold text-foreground">Corrente</span>
                                                                            </label>
                                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                                <input type="radio" name={`tipo-${idx}`} checked={item.tipo_conta === 'Poupança'} onChange={() => {
                                                                                    const updated = [...formData.dados_bancarios];
                                                                                    updated[idx].tipo_conta = 'Poupança';
                                                                                    setFormData({ ...formData, dados_bancarios: updated });
                                                                                }} className="w-4 h-4 accent-primary" />
                                                                                <span className="text-[11px] font-bold text-foreground">Poupança</span>
                                                                            </label>
                                                                        </div>
                                                                    </div>

                                                                    <Input label="Chave PIX" value={item.chave_pix} onChange={(e: any) => {
                                                                        const updated = [...formData.dados_bancarios];
                                                                        updated[idx].chave_pix = e.target.value;
                                                                        setFormData({ ...formData, dados_bancarios: updated });
                                                                    }} colSpan="col-span-6" />
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}

                                        {activeTab === 'documentos' && (
                                            <motion.div key="doc" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 items-start pb-10">

                                                {/* Upload Identidade */}
                                                <div className="w-full p-8 bg-black/5 dark:bg-white/5 border border-panel-border rounded-[32px] space-y-6 flex flex-col items-center group relative">
                                                    <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center group-hover:bg-primary transition-all shadow-lg shadow-primary/20"><Upload className="w-8 h-8 text-background" /></div>
                                                    <div className="text-center space-y-1">
                                                        <h4 className="text-[13px] font-black text-foreground uppercase italic tracking-widest">{isPF ? "RG / CNH" : "Contrato Social"}</h4>
                                                        <p className="text-[10px] text-text-dim font-black uppercase tracking-widest">PDF ou Imagens</p>
                                                    </div>
                                                    <input type="file" id="uPropDoc" className="hidden" accept=".jpg,.jpeg,.png,.pdf" onChange={e => {
                                                        const file = e.target.files?.[0];
                                                        if (file && handleFileValidation(file)) setDocIdentidade(file);
                                                    }} />
                                                    <label htmlFor="uPropDoc" onClick={(e) => { if (docIdentidade || formData.documento_identidade_url) { e.preventDefault(); openViewer(docIdentidade, formData.documento_identidade_url, docIdentidade?.name || 'Identidade', 'identidade'); } }} className="w-full h-32 border-2 border-dashed border-panel-border rounded-[24px] flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary transition-all text-[10px] uppercase font-black tracking-widest text-accent text-center px-4 bg-background/50">
                                                        {docIdentidade ? docIdentidade.name : (formData.documento_identidade_url ? "Arquivo já enviado" : "Selecionar Arquivo")}
                                                    </label>
                                                    {(docIdentidade || formData.documento_identidade_url) && (
                                                        <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (docIdentidade) setDocIdentidade(null); else handleDeleteFile(formData.documento_identidade_url, 'identidade'); }}
                                                            className="absolute -top-3 -right-3 w-8 h-8 bg-rose-500 hover:bg-rose-600 text-white rounded-full flex items-center justify-center transition-all shadow-xl z-20">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {docIdentidade && (
                                                        <button type="button" onClick={() => handleOCR(docIdentidade)} disabled={ocrLoading}
                                                            className="absolute -bottom-5 bg-primary text-background px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2 hover:scale-105 transition-all disabled:opacity-50">
                                                            {ocrLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scan className="w-4 h-4" />}
                                                            {ocrLoading ? "Processando..." : "Escanear Doc"}
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Upload Selfie */}
                                                <div className="w-full p-8 bg-black/5 dark:bg-white/5 border border-panel-border rounded-[32px] space-y-6 flex flex-col items-center group relative">
                                                    <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center group-hover:bg-white dark:group-hover:bg-primary group-hover:text-[#0B0B0C] dark:group-hover:text-background transition-all shadow-lg"><User className="w-8 h-8 text-white group-hover:text-[#0B0B0C] dark:group-hover:text-background" /></div>
                                                    <div className="text-center space-y-1">
                                                        <h4 className="text-[13px] font-black text-foreground uppercase italic tracking-widest">Selfie</h4>
                                                        <p className="text-[10px] text-text-dim font-black uppercase tracking-widest">Apenas Imagens</p>
                                                    </div>
                                                    <input type="file" id="uPropSelfie" className="hidden" accept=".jpg,.jpeg,.png,capture=camera" onChange={e => {
                                                        const file = e.target.files?.[0];
                                                        if (file && handleImageOnlyValidation(file)) setSelfie(file);
                                                    }} />
                                                    <label htmlFor="uPropSelfie" onClick={(e) => { if (selfie || formData.documento_selfie_url) { e.preventDefault(); openViewer(selfie, formData.documento_selfie_url, selfie?.name || 'Selfie', 'selfie'); } }} className="w-full h-32 border-2 border-dashed border-panel-border rounded-[24px] flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-white transition-all text-[10px] uppercase font-black tracking-widest text-accent text-center px-4 bg-background/50">
                                                        {selfie ? selfie.name : (formData.documento_selfie_url ? "Selfie já enviada" : "Tirar Foto / Anexar")}
                                                    </label>
                                                    {(selfie || formData.documento_selfie_url) && (
                                                        <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (selfie) setSelfie(null); else handleDeleteFile(formData.documento_selfie_url, 'selfie'); }}
                                                            className="absolute -top-3 -right-3 w-8 h-8 bg-rose-500 hover:bg-rose-600 text-white rounded-full flex items-center justify-center transition-all shadow-xl z-20">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>

                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <AnimatePresence>
                                        {ocrResult && (
                                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                                                className="absolute bottom-10 inset-x-10 bg-primary rounded-[32px] p-6 shadow-2xl z-50 flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shadow-lg shrink-0"><Sparkles className="w-6 h-6 text-primary-foreground" /></div>
                                                    <div className="space-y-1">
                                                        <h4 className="text-lg font-black text-primary-foreground uppercase italic tracking-tighter">Leitura Concluída</h4>
                                                        <p className="text-primary-foreground/80 text-[9px] font-bold uppercase tracking-widest">Dados extraídos com sucesso.</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-3">
                                                    <button type="button" onClick={() => setOcrResult(null)} className="px-5 py-3 text-[10px] font-black text-primary-foreground uppercase tracking-widest hover:bg-black/10 rounded-xl transition-all">Cancelar</button>
                                                    <button type="button" onClick={applyOCR} className="bg-background text-foreground px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-all flex items-center gap-2"><Wand2 className="w-4 h-4" /> Preencher</button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </form>

                                <footer className="p-6 md:p-10 border-t border-panel-border bg-panel/30 dark:bg-white/5 backdrop-blur-md flex items-center gap-3 md:gap-6 shrink-0 z-10">
                                    <button type="button" onClick={onClose} className="px-4 md:px-8 py-3 md:py-4 rounded-xl font-black text-[9px] md:text-[10px] text-accent hover:bg-panel uppercase tracking-[0.2em] md:tracking-[0.3em] transition-all border border-panel-border">Cancelar</button>
                                    <div className="flex-1" />
                                    {currentStepIndex > 0 && (
                                        <button type="button" onClick={() => setActiveTab(navItems[currentStepIndex - 1].id as TabType)} className="px-4 md:px-8 py-3 md:py-4 rounded-xl font-black text-[9px] md:text-[10px] text-accent hover:bg-panel uppercase tracking-[0.2em] md:tracking-[0.3em] transition-all border border-panel-border">Voltar</button>
                                    )}
                                    {currentStepIndex < navItems.length - 1 ? (
                                        <button type="button" onClick={(e) => { e.preventDefault(); setActiveTab(navItems[currentStepIndex + 1].id as TabType); }} className="btn-elite px-4 md:px-10 py-3 md:py-4 rounded-xl font-black text-[9px] md:text-[10px] uppercase tracking-[0.2em] md:tracking-[0.3em] flex items-center gap-2 md:gap-3 transition-all hover:scale-[1.02] shadow-xl">Próximo <ChevronRight className="w-4 h-4" /></button>
                                    ) : (
                                        <button form="propModalForm" type="submit" disabled={loading} className="btn-elite px-4 md:px-10 py-3 md:py-4 rounded-xl font-black text-[9px] md:text-[10px] uppercase tracking-[0.2em] md:tracking-[0.3em] flex items-center gap-2 md:gap-3 transition-all hover:scale-[1.02] shadow-xl disabled:opacity-50">
                                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Finalizar <CheckCircle2 className="w-4 h-4" /></>}
                                        </button>
                                    )}
                                </footer>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            <FileViewerModal
                isOpen={!!viewerData.url}
                onClose={() => setViewerData({ url: null, name: '' })}
                fileUrl={viewerData.url}
                fileName={viewerData.name}
                onDelete={viewerData.onDelete}
            />
        </>
    );
}
