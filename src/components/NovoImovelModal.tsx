"use client";

import { X, Search, Loader2, Home, MapPin, FileText, FileBox, UploadCloud, Trash2, CheckCircle2, Building, User, Camera, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { convertToWebP, processPDF } from "@/lib/documentProcessor";
import { cn } from "@/lib/utils";
import { supabaseStorage } from "@/lib/supabaseStorage";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: any;
}

type TabType = 'basico' | 'localizacao' | 'documentos' | 'fotos';

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

const Select = ({ label, value, onChange, options, colSpan = "" }: any) => (
    <div className={cn("space-y-2", colSpan)}>
        <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">{label}</label>
        <select value={value || ""} onChange={onChange}
            className="w-full bg-black/5 dark:bg-white/5 border border-panel-border rounded-xl py-3 px-5 text-foreground text-[13px] outline-none focus:border-primary transition-all font-medium appearance-none">
            {options.map((o: any) => <option key={o.value} value={o.value} className="bg-[#121212] text-white underline-none">{o.label}</option>)}
        </select>
    </div>
);

const CurrencyInput = ({ label, value, onChange, colSpan = "", readOnly = false, ...props }: any) => {
    const formatBRL = (val: number): string => {
        if (val === 0 || val === undefined || val === null) return 'R$ 0,00';
        return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawDigits = e.target.value.replace(/\D/g, '');
        const numericValue = parseInt(rawDigits || '0', 10) / 100;
        onChange(numericValue);
    };
    return (
        <div className={cn("space-y-2", colSpan)}>
            <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">{label}</label>
            <input type="text" inputMode="numeric" value={formatBRL(value || 0)} onChange={handleChange} readOnly={readOnly}
                className={cn("w-full bg-black/5 dark:bg-white/5 border border-panel-border rounded-xl py-3 px-5 text-foreground text-[13px] outline-none focus:border-primary transition-all font-medium", readOnly && "opacity-60 pointer-events-none")}
                {...props} />
        </div>
    );
};

const initialFormState = {
    codigo_interno: "", tipo: "Apartamento", status: "Disponível", tipo_aluguel: "Residencial",
    area_m2: 0, quartos: 0, suites: 0, banheiros: 0, vagas: 0, andar_imovel: "", valor_aluguel: 0, valor_condominio: 0,
    cep: "", endereco: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "",
    inscricao_iptu: "", iptu_vencimento: "", iptu_pdf_url: "", num_energisa: "", num_cagepa: "", num_matricula: "", arquivo_matricula_url: "",
    empresa_id: "", proprietario_id: "", fotos_urls: [], tipo_proprietario_principal: "PF", proprietarios_secundarios: []
};

export function NovoImovelModal({ isOpen, onClose, onSuccess, initialData }: ModalProps) {
    const [loading, setLoading] = useState(false);
    const [searchingCep, setSearchingCep] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('basico');
    const [step, setStep] = useState(1); // 1 = rest
    const [formData, setFormData] = useState<any>(initialFormState);
    const [empresas, setEmpresas] = useState<any[]>([]);
    const [proprietarios, setProprietarios] = useState<any[]>([]);
    const [arquivoMatricula, setArquivoMatricula] = useState<File | null>(null);
    const [arquivoIptu, setArquivoIptu] = useState<File | null>(null);
    const [fotosInput, setFotosInput] = useState<File[]>([]);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const iptuInputRef = useRef<HTMLInputElement>(null);
    const fotosInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            fetchRelationalData();
            if (initialData) {
                setFormData({
                    ...initialFormState,
                    ...initialData,
                    tipo_proprietario_principal: initialData.empresa_id ? "PJ" : "PF",
                    proprietarios_secundarios: initialData.proprietarios_secundarios || []
                });
                setStep(1);
            } else {
                generateCode();
                setStep(1);
            }
            setActiveTab('basico');
            setArquivoMatricula(null);
            setArquivoIptu(null);
            setFotosInput([]);
        }
    }, [isOpen, initialData]);

    async function generateCode() {
        try {
            const { data, error } = await supabase
                .from('imoveis')
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

            const formattedCode = `I-${String(nextCode).padStart(4, '0')}`;
            setFormData((prev: any) => ({ ...prev, codigo_interno: formattedCode }));
        } catch (err) {
            console.error("Erro ao gerar código sequencial imovel:", err);
            const rnd = `I-${Math.floor(Math.random() * 9000) + 1000}`;
            setFormData((prev: any) => ({ ...prev, codigo_interno: rnd }));
        }
    }

    async function fetchRelationalData() {
        const [emp, props] = await Promise.all([
            supabase.from('empresas').select('id, nome_fantasia').order('nome_fantasia'),
            supabase.from('proprietarios').select('id, nome_completo').order('nome_completo')
        ]);
        if (emp.data) setEmpresas(emp.data);
        if (props.data) setProprietarios(props.data);
    }

    const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const cepVal = value.replace(/\D/g, "");
        if (cepVal.length > 8) return;
        let formattedCep = cepVal;
        if (cepVal.length > 5) formattedCep = cepVal.substring(0, 5) + "-" + cepVal.substring(5, 8);

        setFormData((prev: any) => ({ ...prev, cep: formattedCep }));

        if (cepVal.length === 8) {
            (async () => {
                setSearchingCep(true);
                try {
                    const res = await fetch(`https://viacep.com.br/ws/${cepVal}/json/`);
                    const data = await res.json();
                    if (!data.erro) {
                        setFormData((prev: any) => ({
                            ...prev,
                            logradouro: data.logradouro,
                            bairro: data.bairro,
                            cidade: data.localidade,
                            estado: data.uf,
                            endereco: `${data.logradouro}, ${prev.numero || ''} - ${data.bairro}, ${data.localidade} - ${data.uf}`
                        }));
                    }
                } catch (err) {
                    console.error(err);
                } finally {
                    setSearchingCep(false);
                }
            })();
        }
    };

    const handleAddressFieldChange = (field: string, val: string) => {
        const newData = { ...formData, [field]: val };
        newData.endereco = `${newData.logradouro || ''}, ${newData.numero || ''} ${newData.complemento ? '(' + newData.complemento + ')' : ''} - ${newData.bairro || ''}, ${newData.cidade || ''} - ${newData.estado || ''}`;
        setFormData(newData);
    };

    const navItems = [
        { id: 'basico', label: 'Dados Iniciais', icon: Home },
        { id: 'localizacao', label: 'Localização', icon: MapPin },
        { id: 'documentos', label: 'Cadastros', icon: FileBox },
        { id: 'fotos', label: 'Fotos do Imóvel', icon: Camera }
    ];

    const currentStep = navItems.findIndex(i => i.id === activeTab) + 1;

    const handlePrev = () => {
        const prevIdx = navItems.findIndex(i => i.id === activeTab) - 1;
        if (prevIdx >= 0) setActiveTab(navItems[prevIdx].id as TabType);
    };

    const handleNext = () => {
        const nextIdx = navItems.findIndex(i => i.id === activeTab) + 1;
        if (nextIdx < navItems.length) setActiveTab(navItems[nextIdx].id as TabType);
        else handleSubmit();
    };

    const parseNum = (val: any) => parseFloat(val) || 0;
    const parseIntNum = (val: any) => parseInt(val) || 0;

    const handleSubmit = async () => {
        setLoading(true);
        try {
            let finalData = { ...formData };
            finalData.area_m2 = parseNum(finalData.area_m2);
            finalData.quartos = parseIntNum(finalData.quartos);
            finalData.suites = parseIntNum(finalData.suites);
            finalData.banheiros = parseIntNum(finalData.banheiros);
            finalData.vagas = parseIntNum(finalData.vagas);
            finalData.valor_aluguel = parseNum(finalData.valor_aluguel);
            finalData.valor_condominio = parseNum(finalData.valor_condominio);

            // File Uploads - Matricula
            if (arquivoMatricula) {
                let fToUpload: Blob = arquivoMatricula;
                let fName = `matricula_${Date.now()}`;
                if (arquivoMatricula.type === 'application/pdf') { const res = await processPDF(arquivoMatricula); fToUpload = res.blob; fName += '.pdf'; }
                else if (arquivoMatricula.type.startsWith('image/')) { fToUpload = await convertToWebP(arquivoMatricula); fName += '.webp'; }

                const { data: uploadData, error: upError } = await supabaseStorage.storage.from('documentos').upload(`imoveis/${finalData.codigo_interno}/${fName}`, fToUpload, { upsert: true });
                if (upError) throw upError;
                const { data: pubData } = supabaseStorage.storage.from('documentos').getPublicUrl(uploadData.path);
                finalData.arquivo_matricula_url = pubData.publicUrl;
            }

            // File Uploads - Boleto IPTU
            if (arquivoIptu) {
                let fToUpload: Blob = arquivoIptu;
                let fName = `iptu_${Date.now()}`;
                if (arquivoIptu.type === 'application/pdf') {
                    const res = await processPDF(arquivoIptu);
                    fToUpload = res.blob;
                    fName += '.pdf';
                } else if (arquivoIptu.type.startsWith('image/')) {
                    fToUpload = await convertToWebP(arquivoIptu);
                    fName += '.webp';
                }

                const uploadPath = `imoveis/${finalData.codigo_interno}/${fName}`;
                const { data: uploadData, error: upError } = await supabaseStorage.storage
                    .from('documentos')
                    .upload(uploadPath, fToUpload, { upsert: true });

                if (upError) throw upError;

                const { data: pubData } = supabaseStorage.storage
                    .from('documentos')
                    .getPublicUrl(uploadData.path);
                finalData.iptu_pdf_url = pubData.publicUrl;
            }

            // File Uploads - Fotos
            if (fotosInput.length > 0) {
                let newFotos = [...(finalData.fotos_urls || [])];
                for (let i = 0; i < fotosInput.length; i++) {
                    let file = fotosInput[i];
                    let fToUpload: Blob = file;
                    if (file.type.startsWith('image/')) { fToUpload = await convertToWebP(file); }
                    const filePath = `imoveis/${finalData.codigo_interno}/foto_${Date.now()}_${i}.webp`;
                    const { data: upData, error: upError } = await supabaseStorage.storage.from('documentos').upload(filePath, fToUpload, { upsert: true });
                    if (!upError && upData) {
                        const { data: pubData } = supabaseStorage.storage.from('documentos').getPublicUrl(upData.path);
                        newFotos.push(pubData.publicUrl);
                    }
                }
                finalData.fotos_urls = newFotos;
            }

            // Remove empty strings and relational objects
            delete finalData.empresas;
            delete finalData.proprietarios;
            Object.keys(finalData).forEach(k => { if (finalData[k] === "") finalData[k] = null; });

            if (formData.tipo_proprietario_principal === "PF") {
                finalData.empresa_id = null;
            } else {
                finalData.proprietario_id = null;
            }

            delete finalData.tipo_proprietario_principal;

            if (finalData.proprietarios_secundarios) {
                finalData.proprietarios_secundarios = finalData.proprietarios_secundarios.filter((p: any) => p.id && String(p.id).trim() !== "");
            }

            if (initialData?.id) {
                const { error } = await supabase.from('imoveis').update(finalData).eq('id', initialData.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('imoveis').insert([finalData]);
                if (error) throw error;
            }

            onSuccess();
            onClose();
        } catch (error: any) {
            alert("Erro ao salvar o imóvel: " + error.message);
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
                        className="bg-panel glass-elite w-full max-w-6xl max-h-[92vh] rounded-[48px] shadow-2xl relative z-10 border border-panel-border flex flex-col md:flex-row overflow-hidden">

                        {step === 1 && (
                            <>
                                <aside className="w-full md:w-72 bg-panel/30 dark:bg-white/5 border-r border-panel-border flex flex-col shrink-0">
                                    <div className="p-8 pb-4">
                                        <div className="flex items-center gap-4 mb-8">
                                            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shrink-0 border border-primary/30 text-background shadow-lg shadow-primary/10"><Building className="w-6 h-6" /></div>
                                            <div>
                                                <h2 className="text-xl font-serif-premium font-bold tracking-tight text-foreground leading-none lowercase first-letter:uppercase">{initialData ? 'Edição' : 'Cadastro'}</h2>
                                                <p className="text-xs font-bold text-accent uppercase tracking-widest mt-1">Imóvel</p>
                                            </div>
                                        </div>
                                    </div>
                                    <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar pb-8">
                                        {navItems.map((item) => (
                                            <button key={item.id} onClick={() => setActiveTab(item.id as TabType)}
                                                className={cn("w-full flex items-center gap-4 p-4 rounded-2xl transition-all group border",
                                                    activeTab === item.id ? "bg-black/5 dark:bg-white/5 border-panel-border shadow-lg" : "hover:bg-black/[0.02] dark:hover:bg-white/[0.02] border-transparent")}>
                                                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center transition-all",
                                                    activeTab === item.id ? "bg-primary text-background shadow-[0_0_15px_rgba(255,255,255,0.1)]" : "bg-black/5 dark:bg-white/5 text-accent")}>
                                                    <item.icon className="w-4 h-4" />
                                                </div>
                                                <div className="text-left font-black">
                                                    <div className={cn("text-[10px] uppercase tracking-widest", activeTab === item.id ? "text-foreground" : "text-accent")}>{item.label}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </nav>
                                    <div className="p-8 pt-4">
                                        <div className="bg-black/5 dark:bg-white/5 border border-panel-border rounded-2xl p-4 flex flex-col gap-1 items-center justify-center shadow-lg shadow-black/20">
                                            <span className="text-[10px] font-black uppercase text-accent tracking-[0.2em]">CÓD INTERNO</span>
                                            <span className="text-xl text-foreground font-black tracking-tighter">{formData.codigo_interno}</span>
                                        </div>
                                    </div>
                                </aside>

                                <div className="flex-1 flex flex-col bg-panel/50 dark:bg-transparent min-w-0">
                                    <header className="px-10 py-6 flex justify-between items-center bg-gradient-to-b from-black/5 dark:from-white/5 to-transparent border-b border-panel-border shrink-0">
                                        <div>
                                            <div className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-1">Passo {currentStep}/{navItems.length}</div>
                                            <h3 className="text-2xl font-serif-premium font-bold text-foreground uppercase italic tracking-tighter lowercase first-letter:uppercase">{navItems.find(i => i.id === activeTab)?.label}</h3>
                                        </div>
                                        <button onClick={onClose} className="w-10 h-10 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full flex items-center justify-center text-accent transition-all border border-panel-border"><X className="w-6 h-6" /></button>
                                    </header>

                                    <div className="flex-1 overflow-y-auto custom-scrollbar p-10">
                                        <AnimatePresence mode="wait">
                                            {activeTab === 'basico' && (
                                                <motion.div key="basico" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="grid grid-cols-4 gap-6">
                                                    <div className="col-span-4 space-y-2">
                                                        <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Proprietário Principal *</label>
                                                        <div className="flex gap-2 mb-2 bg-black/5 dark:bg-white/5 p-1 rounded-xl border border-panel-border max-w-[200px]">
                                                            <button type="button" onClick={() => setFormData({ ...formData, tipo_proprietario_principal: "PF", proprietario_id: "", empresa_id: "" })}
                                                                className={cn("flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", formData.tipo_proprietario_principal === "PF" ? "bg-primary text-background shadow-lg" : "text-accent hover:text-foreground")}>PF</button>
                                                            <button type="button" onClick={() => setFormData({ ...formData, tipo_proprietario_principal: "PJ", proprietario_id: "", empresa_id: "" })}
                                                                className={cn("flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", formData.tipo_proprietario_principal === "PJ" ? "bg-primary text-background shadow-lg" : "text-accent hover:text-foreground")}>PJ</button>
                                                        </div>
                                                        <select required value={formData.tipo_proprietario_principal === "PF" ? (formData.proprietario_id || "") : (formData.empresa_id || "")} onChange={(e) => setFormData(formData.tipo_proprietario_principal === "PF" ? { ...formData, proprietario_id: e.target.value } : { ...formData, empresa_id: e.target.value })}
                                                            className="w-full bg-black/5 dark:bg-white/5 border border-panel-border rounded-xl py-3 px-5 text-foreground text-[13px] outline-none focus:border-primary transition-all font-medium appearance-none">
                                                            <option value="" className="bg-[#121212] text-white">Selecione um {formData.tipo_proprietario_principal === "PF" ? "proprietário" : "empresa"}...</option>
                                                            {(formData.tipo_proprietario_principal === "PF" ? proprietarios : empresas).map((p: any) => (
                                                                <option key={p.id} value={p.id} className="bg-[#121212] text-white">{p.nome_completo || p.nome_fantasia}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <div className="col-span-4 mt-2">
                                                        <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1 block mb-2">Proprietários Adicionais</label>
                                                        {(formData.proprietarios_secundarios || []).map((sec: any, idx: number) => (
                                                            <div key={idx} className="flex gap-4 items-end mb-4 bg-black/5 dark:bg-white/5 p-4 rounded-xl border border-panel-border">
                                                                <div className="flex-1 space-y-2">
                                                                    <div className="flex gap-2 bg-black/5 dark:bg-white/5 p-1 rounded-xl border border-panel-border w-fit">
                                                                        <button type="button" onClick={() => {
                                                                            const newSec = [...formData.proprietarios_secundarios];
                                                                            newSec[idx] = { ...newSec[idx], tipo: 'PF', id: '' };
                                                                            setFormData({ ...formData, proprietarios_secundarios: newSec });
                                                                        }} className={cn("px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", sec.tipo === "PF" ? "bg-primary text-background shadow-lg" : "text-accent hover:text-foreground")}>PF</button>
                                                                        <button type="button" onClick={() => {
                                                                            const newSec = [...formData.proprietarios_secundarios];
                                                                            newSec[idx] = { ...newSec[idx], tipo: 'PJ', id: '' };
                                                                            setFormData({ ...formData, proprietarios_secundarios: newSec });
                                                                        }} className={cn("px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", sec.tipo === "PJ" ? "bg-primary text-background shadow-lg" : "text-accent hover:text-foreground")}>PJ</button>
                                                                    </div>
                                                                    <select value={sec.id || ""} onChange={(e) => {
                                                                        const newSec = [...formData.proprietarios_secundarios];
                                                                        newSec[idx].id = e.target.value;
                                                                        setFormData({ ...formData, proprietarios_secundarios: newSec });
                                                                    }} className="w-full bg-black/5 dark:bg-white/5 border border-panel-border rounded-xl py-3 px-5 text-foreground text-[13px] outline-none focus:border-primary transition-all font-medium appearance-none">
                                                                        <option value="" className="bg-[#121212] text-white">Selecione...</option>
                                                                        {(sec.tipo === "PF" ? proprietarios : empresas).map((p: any) => (
                                                                            <option key={p.id} value={p.id} className="bg-[#121212] text-white">{p.nome_completo || p.nome_fantasia}</option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                                <button type="button" onClick={() => {
                                                                    const newSec = formData.proprietarios_secundarios.filter((_: any, i: number) => i !== idx);
                                                                    setFormData({ ...formData, proprietarios_secundarios: newSec });
                                                                }} className="w-11 h-11 shrink-0 bg-red-500/10 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-500/20 transition-all border border-red-500/20">
                                                                    <Trash2 className="w-5 h-5" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                        <button type="button" onClick={() => setFormData({ ...formData, proprietarios_secundarios: [...(formData.proprietarios_secundarios || []), { id: '', tipo: 'PF' }] })}
                                                            className="text-xs font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors flex items-center gap-2 mt-2">
                                                            + Adicionar Proprietário
                                                        </button>
                                                    </div>

                                                    <Input label="Nome / Identificação do Imóvel" value={formData.nome_identificacao} onChange={(e: any) => setFormData({ ...formData, nome_identificacao: e.target.value })} colSpan="col-span-4" placeholder="Ex: Apto 101 Beira Mar, Galpão Logístico..." />

                                                    <Select label="Tipo de Imóvel" value={formData.tipo} onChange={(e: any) => setFormData({ ...formData, tipo: e.target.value })} options={[{ label: 'Apartamento', value: 'Apartamento' }, { label: 'Casa', value: 'Casa' }, { label: 'Comercial', value: 'Comercial' }, { label: 'Terreno', value: 'Terreno' }, { label: 'Galpão', value: 'Galpão' }]} colSpan="col-span-2" />
                                                    <Select label="Status" value={formData.status} onChange={(e: any) => setFormData({ ...formData, status: e.target.value })} options={[{ label: 'Disponível', value: 'Disponível' }, { label: 'Alugado', value: 'Alugado' }, { label: 'Inativo', value: 'Inativo' }]} />
                                                    <Select label="Tipo Aluguel" value={formData.tipo_aluguel} onChange={(e: any) => setFormData({ ...formData, tipo_aluguel: e.target.value })} options={[{ label: 'Residencial', value: 'Residencial' }, { label: 'Comercial', value: 'Comercial' }]} />

                                                    <CurrencyInput label="Valor Aluguel" value={formData.valor_aluguel} onChange={(val: number) => setFormData({ ...formData, valor_aluguel: val })} colSpan="col-span-2" />
                                                    <CurrencyInput label="Valor Condomínio" value={formData.valor_condominio} onChange={(val: number) => setFormData({ ...formData, valor_condominio: val })} colSpan="col-span-2" />

                                                    <div className="col-span-4 grid grid-cols-5 gap-4 mt-4 bg-black/5 dark:bg-white/5 p-6 rounded-2xl border border-panel-border">
                                                        <Input label="Área (m²)" value={formData.area_m2} onChange={(e: any) => setFormData({ ...formData, area_m2: e.target.value })} type="number" />
                                                        <Input label="Quartos" value={formData.quartos} onChange={(e: any) => setFormData({ ...formData, quartos: e.target.value })} type="number" />
                                                        <Input label="Suítes" value={formData.suites} onChange={(e: any) => setFormData({ ...formData, suites: e.target.value })} type="number" />
                                                        <Input label="Banheiros" value={formData.banheiros} onChange={(e: any) => setFormData({ ...formData, banheiros: e.target.value })} type="number" />
                                                        <Input label="Vagas" value={formData.vagas} onChange={(e: any) => setFormData({ ...formData, vagas: e.target.value })} type="number" />
                                                        <Input label="Andar" value={formData.andar_imovel} onChange={(e: any) => setFormData({ ...formData, andar_imovel: e.target.value })} colSpan="col-span-1" />
                                                    </div>
                                                </motion.div>
                                            )}

                                            {activeTab === 'localizacao' && (
                                                <motion.div key="localizacao" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="grid grid-cols-4 gap-6">
                                                    <div className="col-span-1 relative">
                                                        <Input label="CEP" value={formData.cep} onChange={handleCepChange} placeholder="00000-000" maxLength={9} />
                                                        {searchingCep && <Loader2 className="absolute right-4 top-[38px] w-4 h-4 text-primary animate-spin" />}
                                                    </div>
                                                    <Input label="Logradouro" value={formData.logradouro} onChange={(e: any) => handleAddressFieldChange('logradouro', e.target.value)} colSpan="col-span-3" />
                                                    <Input label="Número" value={formData.numero} onChange={(e: any) => handleAddressFieldChange('numero', e.target.value)} />
                                                    <Input label="Complemento" value={formData.complemento} onChange={(e: any) => handleAddressFieldChange('complemento', e.target.value)} colSpan="col-span-2" />
                                                    <Input label="Bairro" value={formData.bairro} onChange={(e: any) => handleAddressFieldChange('bairro', e.target.value)} colSpan="col-span-2" />
                                                    <Input label="Cidade" value={formData.cidade} onChange={(e: any) => handleAddressFieldChange('cidade', e.target.value)} colSpan="col-span-3" />
                                                    <Input label="UF" value={formData.estado} onChange={(e: any) => handleAddressFieldChange('estado', e.target.value)} maxLength={2} />
                                                </motion.div>
                                            )}

                                            {activeTab === 'documentos' && (
                                                <motion.div key="documentos" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="grid grid-cols-2 gap-6">
                                                    <div className="flex gap-4">
                                                        <Input label="Inscrição IPTU" value={formData.inscricao_iptu} onChange={(e: any) => setFormData({ ...formData, inscricao_iptu: e.target.value })} colSpan="flex-1" />
                                                        <Input label="Vencimento" type="date" value={formData.iptu_vencimento} onChange={(e: any) => setFormData({ ...formData, iptu_vencimento: e.target.value })} colSpan="w-[160px]" />
                                                    </div>
                                                    <Input label="Nº Energisa" value={formData.num_energisa} onChange={(e: any) => setFormData({ ...formData, num_energisa: e.target.value })} />
                                                    <Input label="Nº CAGEPA" value={formData.num_cagepa} onChange={(e: any) => setFormData({ ...formData, num_cagepa: e.target.value })} />
                                                    <Input label="Registro de Matrícula" value={formData.num_matricula} onChange={(e: any) => setFormData({ ...formData, num_matricula: e.target.value })} />

                                                    <div className="col-span-2 mt-4 space-y-4">
                                                        <label className="text-xs font-black text-text-dim uppercase tracking-widest flex items-center gap-2"><UploadCloud className="w-4 h-4" /> Arquivo de Matrícula (PDF / Imagem)</label>

                                                        {!arquivoMatricula && !formData.arquivo_matricula_url ? (
                                                            <div onClick={() => fileInputRef.current?.click()} className="h-32 bg-black/5 dark:bg-white/5 border-2 border-dashed border-panel-border rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary transition-all group">
                                                                <FileText className="w-8 h-8 text-accent group-hover:text-primary transition-colors" />
                                                                <span className="text-sm font-bold text-foreground">Clique para adicionar matrícula...</span>
                                                            </div>
                                                        ) : (
                                                            <div className="p-4 bg-accent/10 border border-accent/20 rounded-xl flex items-center justify-between">
                                                                <div className="flex items-center gap-4">
                                                                    <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-accent" /></div>
                                                                    <div>
                                                                        <div className="text-sm font-bold text-foreground">{arquivoMatricula?.name || "Matrícula Anexada (Nuvem)"}</div>
                                                                        <div className="text-[10px] text-accent uppercase font-black">{arquivoMatricula ? 'Pronto para Upload' : 'Documento Salvo'}</div>
                                                                    </div>
                                                                </div>
                                                                <button type="button" onClick={() => { setArquivoMatricula(null); setFormData({ ...formData, arquivo_matricula_url: '' }) }} className="w-8 h-8 flex items-center justify-center rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all"><Trash2 className="w-4 h-4" /></button>
                                                            </div>
                                                        )}
                                                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.pdf" onChange={(e) => {
                                                            if (e.target.files && e.target.files[0]) setArquivoMatricula(e.target.files[0]);
                                                        }} />
                                                    </div>

                                                    <div className="col-span-2 mt-2 space-y-4">
                                                        <label className="text-xs font-black text-text-dim uppercase tracking-widest flex items-center gap-2"><UploadCloud className="w-4 h-4" /> Boleto de IPTU (PDF / Imagem)</label>

                                                        {!arquivoIptu && !formData.iptu_pdf_url ? (
                                                            <div onClick={() => iptuInputRef.current?.click()} className="h-32 bg-black/5 dark:bg-white/5 border-2 border-dashed border-panel-border rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary transition-all group">
                                                                <FileBox className="w-8 h-8 text-accent group-hover:text-primary transition-colors" />
                                                                <span className="text-sm font-bold text-foreground">Clique para adicionar boleto...</span>
                                                            </div>
                                                        ) : (
                                                            <div className="p-4 bg-white/10 border border-white/20 rounded-xl flex items-center justify-between">
                                                                <div className="flex items-center gap-4">
                                                                    <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-white" /></div>
                                                                    <div>
                                                                        <div className="text-sm font-bold text-foreground">{arquivoIptu?.name || "Boleto Anexado (Nuvem)"}</div>
                                                                        <div className="text-[10px] text-accent uppercase font-black">{arquivoIptu ? 'Pronto para Upload' : 'Documento Salvo'}</div>
                                                                    </div>
                                                                </div>
                                                                <button type="button" onClick={() => { setArquivoIptu(null); setFormData({ ...formData, iptu_pdf_url: '' }) }} className="w-8 h-8 flex items-center justify-center rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all"><Trash2 className="w-4 h-4" /></button>
                                                            </div>
                                                        )}
                                                        <input type="file" ref={iptuInputRef} className="hidden" accept="image/*,.pdf" onChange={(e) => {
                                                            if (e.target.files && e.target.files[0]) setArquivoIptu(e.target.files[0]);
                                                        }} />
                                                    </div>
                                                </motion.div>
                                            )}

                                            {activeTab === 'fotos' && (
                                                <motion.div key="fotos" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="text-xs font-black text-text-dim uppercase tracking-widest">Fotos Atuais</h4>
                                                        <button type="button" onClick={() => fotosInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-bold transition-all">
                                                            <Camera className="w-4 h-4" /> Importar Fotos / Câmera
                                                        </button>
                                                    </div>

                                                    <input type="file" ref={fotosInputRef} className="hidden" accept="image/*" multiple onChange={(e) => {
                                                        if (e.target.files) {
                                                            const arr = Array.from(e.target.files);
                                                            setFotosInput(prev => [...prev, ...arr]);
                                                        }
                                                    }} />

                                                    <div className="grid grid-cols-3 gap-4">
                                                        {formData.fotos_urls?.map((url: string, i: number) => (
                                                            <div key={'furl' + i} className="aspect-[4/3] bg-black/5 dark:bg-white/5 rounded-xl border border-panel-border overflow-hidden relative group">
                                                                <img src={url} alt="Foto Imóvel" className="w-full h-full object-cover" />
                                                                <button onClick={() => setFormData({ ...formData, fotos_urls: formData.fotos_urls.filter((_: any, idx: number) => idx !== i) })}
                                                                    className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-rose-500 transition-all"><Trash2 className="w-4 h-4" /></button>
                                                            </div>
                                                        ))}

                                                        {fotosInput.map((file, i) => (
                                                            <div key={'fin' + i} className="aspect-[4/3] bg-black/5 dark:bg-white/5 rounded-xl border border-primary/30 overflow-hidden relative group flex items-center justify-center">
                                                                <span className="text-[10px] font-bold text-primary uppercase absolute top-2 left-2 bg-primary/10 px-2 py-1 rounded">Nova</span>
                                                                <img src={URL.createObjectURL(file)} alt="Foto P" className="w-full h-full object-cover opacity-80" />
                                                                <button onClick={() => setFotosInput(prev => prev.filter((_, idx) => idx !== i))}
                                                                    className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-black/60 text-white flex items-center justify-center bg-rose-500/80 hover:bg-rose-500 transition-all z-10"><Trash2 className="w-4 h-4" /></button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    <footer className="p-10 border-t border-panel-border bg-panel/50 dark:bg-transparent flex items-center gap-4 shrink-0">
                                        <button type="button" onClick={handlePrev} className="px-8 py-4 rounded-xl font-black text-[10px] text-accent hover:bg-black/5 dark:hover:bg-white/5 uppercase tracking-[0.3em] transition-all border border-panel-border">Voltar</button>
                                        <div className="flex-1" />
                                        {currentStep < navItems.length ? (
                                            <button type="button" onClick={handleNext} className="btn-elite px-10 py-4 flex items-center gap-4 transition-all">Próximo <ChevronRight className="w-4 h-4" /></button>
                                        ) : (
                                            <button type="submit" onClick={handleSubmit} disabled={loading} className="btn-elite px-10 py-4 flex items-center gap-4 transition-all disabled:opacity-50">
                                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Finalizar Cadastro <CheckCircle2 className="w-4 h-4" /></>}
                                            </button>
                                        )}
                                    </footer>
                                </div>
                            </>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
