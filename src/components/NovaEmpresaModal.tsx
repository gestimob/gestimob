"use client";

import { X, Loader2, MapPin, Building2, FileText, ChevronRight, CheckCircle2, Hash, Plus, Trash2, Upload, Scan, Sparkles, Wand2 } from "lucide-react";
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

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: any;
}

type TabType = 'basico' | 'endereco' | 'responsaveis' | 'bancario' | 'documentos';

const Input = ({ label, value, onChange, placeholder, type = "text", colSpan = "col-span-1", readOnly = false, required = false }: {
    label: string, value: any, onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void, placeholder?: string, type?: string, colSpan?: string, readOnly?: boolean, required?: boolean
}) => (
    <div className={cn("space-y-3", colSpan)}>
        <label className="text-[10px] font-black text-text-dim uppercase tracking-widest">{label}</label>
        <input type={type} value={value || ""} onChange={onChange} readOnly={readOnly} required={required}
            className={cn("w-full bg-black/5 dark:bg-white/5 border border-panel-border rounded-xl py-3 px-4 text-foreground text-[13px] outline-none focus:border-primary transition-all font-medium placeholder:text-text-dim/30", readOnly && "opacity-50 cursor-not-allowed")} placeholder={placeholder} />
    </div>
);

export function NovaEmpresaModal({ isOpen, onClose, onSuccess, initialData }: ModalProps) {
    const [loading, setLoading] = useState(false);
    const [searchingCep, setSearchingCep] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('basico');

    const initialForm = {
        codigo: "",
        nome_fantasia: "",
        razao_social: "",
        cnpj: "",
        responsavel_legal: "",
        cep: "",
        logradouro: "",
        numero: "",
        complemento: "",
        bairro: "",
        cidade: "",
        estado: "",
        cadastrado_por: "",
        observacoes: "",
        status: "Ativo",
        dados_bancarios: []
    };

    const [contratoSocial, setContratoSocial] = useState<File | null>(null);
    const [responsaveis, setResponsaveis] = useState<any[]>([
        {
            id: Math.random().toString(36).substr(2, 9),
            nome: '',
            nacionalidade: '',
            estado_civil: '',
            cpf: '',
            rg: '',
            orgao_emissor: '',
            cep: '',
            logradouro: '',
            numero: '',
            complemento: '',
            bairro: '',
            cidade: '',
            estado: '',
            arquivo: null as File | null,
            selfie: null as File | null,
            selfie_url: null,
            isNew: true
        }
    ]);

    const [viewerData, setViewerData] = useState<{ url: string | null; name: string; onDelete?: () => void }>({ url: null, name: '' });

    const openViewer = (file: File | null, url: string | null, name: string, deleteCallback: () => void) => {
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
            onDelete: deleteCallback
        });
    };

    const [ocrLoading, setOcrLoading] = useState(false);
    const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);


    const handleFileValidation = (file: File) => {
        const isPDF = file.type === 'application/pdf';
        const isJPG = file.type === 'image/jpeg' || file.type === 'image/jpg';
        const isPNG = file.type === 'image/png';
        const isSmall = file.size <= 3 * 1024 * 1024;

        if (!isPDF && !isJPG && !isPNG) {
            alert('Apenas PDF, JPG/JPEG e PNG são permitidos.');
            return false;
        }
        if (!isSmall) {
            alert('O arquivo deve ter no máximo 3MB.');
            return false;
        }
        return true;
    };

    // Função para buscar o próximo código sequencial
    const fetchNextCode = async () => {
        try {
            const { data, error } = await supabase
                .from('empresas')
                .select('codigo')
                .not('codigo', 'is', null)
                .order('created_at', { ascending: false })
                .limit(1);

            if (error) throw error;

            let nextCode = 1;
            if (data && data.length > 0 && data[0].codigo) {
                const currentCodeStr = data[0].codigo;
                const match = currentCodeStr.match(/\d+/);
                if (match) {
                    nextCode = parseInt(match[0], 10) + 1;
                }
            }

            return `E-${String(nextCode).padStart(4, '0')}`;
        } catch (error) {
            console.error("Erro ao gerar próximo código empresa:", error);
            const rnd = Math.floor(Math.random() * 9000) + 1000;
            return `E-${rnd}`;
        }
    };

    const [formData, setFormData] = useState<any>(initialForm);

    useEffect(() => {
        const initForm = async () => {
            if (isOpen) {
                if (initialData) {
                    setFormData({ ...initialData, dados_bancarios: initialData.dados_bancarios || [] });

                    // Busca responsáveis existentes
                    const { data } = await supabase
                        .from('empresa_responsaveis')
                        .select('*')
                        .eq('empresa_id', initialData.id);

                    if (data && data.length > 0) {
                        setResponsaveis(data.map(r => ({
                            id: r.id,
                            nome: r.nome,
                            nacionalidade: r.nacionalidade || '',
                            estado_civil: r.estado_civil || '',
                            cpf: r.cpf || '',
                            rg: r.rg || '',
                            orgao_emissor: r.orgao_emissor || '',
                            cep: r.cep || '',
                            logradouro: r.logradouro || '',
                            numero: r.numero || '',
                            complemento: r.complemento || '',
                            bairro: r.bairro || '',
                            cidade: r.cidade || '',
                            estado: r.estado || '',
                            arquivo: null,
                            documento_url: r.documento_url,
                            selfie: null,
                            selfie_url: r.selfie_url,
                            isNew: false
                        })));
                    } else {
                        setResponsaveis([{
                            id: Math.random().toString(36).substr(2, 9),
                            nome: '',
                            nacionalidade: '', estado_civil: '', cpf: '', rg: '', orgao_emissor: '',
                            cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
                            arquivo: null, selfie: null, selfie_url: null, isNew: true
                        }]);
                    }
                } else {
                    const nextCode = await fetchNextCode();

                    // Busca o usuário logado para gravar quem cadastrou
                    const { data: { user } } = await supabase.auth.getUser();
                    const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Sistema";

                    setFormData({
                        ...initialForm, // Start with initialForm to ensure dados_bancarios is an empty array
                        codigo: nextCode,
                        cadastrado_por: userName,
                    });
                    setResponsaveis([{
                        id: Math.random().toString(36).substr(2, 9),
                        nome: '',
                        nacionalidade: '', estado_civil: '', cpf: '', rg: '', orgao_emissor: '',
                        cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
                        arquivo: null, selfie: null, selfie_url: null, isNew: true
                    }]);
                    setContratoSocial(null);
                    setOcrResult(null);
                }
                setActiveTab('basico');
            }
        };

        initForm();
    }, [initialData, isOpen]);

    const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const cep = e.target.value.replace(/\D/g, "").slice(0, 8);
        setFormData((prev: any) => ({ ...prev, cep }));

        if (cep.length === 8) {
            setSearchingCep(true);
            try {
                const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                const data = await response.json();
                if (!data.erro) {
                    setFormData((prev: any) => ({
                        ...prev,
                        logradouro: data.logradouro || "",
                        bairro: data.bairro || "",
                        cidade: data.localidade || "",
                        estado: data.uf || ""
                    }));
                }
            } catch (error) {
                console.error("Erro CEP:", error);
            } finally {
                setSearchingCep(false);
            }
        }
    };

    const handleDeleteFile = async (type: 'contrato' | 'responsavel' | 'responsavel_selfie', id?: string, url?: string) => {
        if (!url) return;

        try {
            // Extrair o path correto, lidando com caracteres especiais (espaços, etc)
            const pathParts = url.split('/documentos/');
            if (pathParts.length < 2) return;

            // Pega a parte após /documentos/, remove query params e decodifica a URL
            const rawPath = pathParts[1].split('?')[0];
            const storagePath = decodeURIComponent(rawPath);

            console.log(`[Storage] Tentando deletar: ${storagePath}`);

            const { error: storageError } = await supabaseStorage.storage
                .from('documentos')
                .remove([storagePath]);

            if (storageError) throw storageError;

            // Atualização do Banco e Estado Local
            if (type === 'contrato' && initialData?.id) {
                await supabase.from('empresas').update({ contrato_social_url: null }).eq('id', initialData.id);
                // Atualiza o objeto initialData local para sumir o botão na hora
                initialData.contrato_social_url = null;
            } else if (type === 'responsavel' && id) {
                await supabase.from('empresa_responsaveis').update({ documento_url: null }).eq('id', id);
                setResponsaveis(prev => prev.map(r => r.id === id ? { ...r, documento_url: null } : r));
            } else if (type === 'responsavel_selfie' && id) {
                await supabase.from('empresa_responsaveis').update({ selfie_url: null }).eq('id', id);
                setResponsaveis(prev => prev.map(r => r.id === id ? { ...r, selfie_url: null } : r));
            }

            alert("Arquivo removido com sucesso do storage e banco.");
        } catch (error: any) {
            console.error("Erro ao deletar arquivo:", error);
            alert("Erro ao remover arquivo: " + error.message);
        }
    };

    const handleDeleteResponsavel = async (index: number, respId: string | number, resp: any) => {
        if (!confirm("Deseja realmente remover este responsável inteiro?")) return;

        if (resp.documento_url) await handleDeleteFile('responsavel', String(respId), resp.documento_url);
        if (resp.selfie_url) await handleDeleteFile('responsavel_selfie', String(respId), resp.selfie_url);

        if (!resp.isNew) {
            try {
                await supabase.from('empresa_responsaveis').delete().eq('id', resp.id);
            } catch (error) {
                console.error("Erro ao deletar responsável do banco:", error);
            }
        }

        setResponsaveis(prev => {
            const newArray = [...prev];
            newArray.splice(index, 1);
            return newArray;
        });
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
            alert("Erro ao processar OCR. Tente novamente.");
        } finally {
            setOcrLoading(false);
        }
    };

    const applyOCR = () => {
        if (!ocrResult) return;
        const { extractedData } = ocrResult;
        const newData = { ...formData };

        if (extractedData.name) newData.razao_social = extractedData.name;
        if (extractedData.cnpj) {
            // Mask CNPJ
            const val = extractedData.cnpj.replace(/\D/g, "").slice(0, 14);
            newData.cnpj = val;
        }

        setFormData(newData);
        setOcrResult(null);
        setActiveTab('basico');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Evitar submit acidental se não estiver na última aba
        if (activeTab !== 'documentos') {
            return;
        }

        // Validação manual já que os campos ficam ocultos (unmounted) nas outras abas
        if (!formData.nome_fantasia || !formData.razao_social || !formData.cnpj) {
            alert("Por favor, preencha os dados obrigatórios na aba 'Identificação Corporativa'.");
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
            finalData.responsavel_legal = responsaveis[0]?.nome || null;

            // Sanitize empty strings to null for database compatibility
            Object.keys(finalData).forEach(key => {
                if (finalData[key] === "") finalData[key] = null;
            });

            // Se for um novo cadastro, garante que o usuário logado seja registrado
            if (!initialData?.id) {
                const { data: { user } } = await supabase.auth.getUser();
                finalData.cadastrado_por = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Sistema";
            }

            // Remove campos que vêm de Join
            delete finalData.empresa_responsaveis;

            let empresaId = initialData?.id;

            // 1. Salvar ou Atualizar Empresa
            if (initialData?.id) {
                const { error } = await supabase.from('empresas').update(finalData).eq('id', initialData.id);
                if (error) throw error;
            } else {
                const { data, error } = await supabase.from('empresas').insert([finalData]).select().single();
                if (error) throw error;
                empresaId = data.id;
            }

            // 2. Upload do Contrato Social
            if (contratoSocial) {
                let fileToUpload: Blob | File = contratoSocial;
                let fileName = `contrato_social_${Date.now()}`;

                if (contratoSocial.type.startsWith('image/')) {
                    fileToUpload = await convertToWebP(contratoSocial);
                    fileName += '.webp';
                } else {
                    const result = await processPDF(contratoSocial);
                    fileToUpload = result.blob;
                    fileName += '.pdf';
                }

                const { data: uploadData, error: uploadError } = await supabaseStorage.storage
                    .from('documentos')
                    .upload(`${empresaId}/${fileName}`, fileToUpload);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabaseStorage.storage.from('documentos').getPublicUrl(uploadData.path);
                await supabase.from('empresas').update({ contrato_social_url: publicUrl }).eq('id', empresaId);
            }

            // 3. Processar Responsáveis e seus Documentos
            for (const resp of responsaveis) {
                if (!resp.nome) continue;

                let publicUrl = resp.documento_url || null;
                let selfieUrl = resp.selfie_url || null;

                // Upload documento
                if (resp.arquivo) {
                    let fileToUpload: Blob | File = resp.arquivo;
                    let fileName = `doc_resp_${resp.id}_${Date.now()}`;
                    if (resp.arquivo.type.startsWith('image/')) {
                        fileToUpload = await convertToWebP(resp.arquivo);
                        fileName += '.webp';
                    } else {
                        const result = await processPDF(resp.arquivo);
                        fileToUpload = result.blob;
                        fileName += '.pdf';
                    }
                    const { data: uploadData, error: uploadError } = await supabaseStorage.storage.from('documentos').upload(`${empresaId}/responsaveis/${fileName}`, fileToUpload);
                    if (uploadError) throw uploadError;
                    const { data: urlData } = supabaseStorage.storage.from('documentos').getPublicUrl(uploadData.path);
                    publicUrl = urlData.publicUrl;
                }

                // Upload selfie
                if (resp.selfie) {
                    let fileToUpload: Blob | File = resp.selfie;
                    let fileName = `selfie_resp_${resp.id}_${Date.now()}`;
                    if (resp.selfie.type.startsWith('image/')) {
                        fileToUpload = await convertToWebP(resp.selfie);
                        fileName += '.webp';
                    } else {
                        const result = await processPDF(resp.selfie);
                        fileToUpload = result.blob;
                        fileName += '.pdf';
                    }
                    const { data: uploadData, error: uploadError } = await supabaseStorage.storage.from('documentos').upload(`${empresaId}/responsaveis/${fileName}`, fileToUpload);
                    if (uploadError) throw uploadError;
                    const { data: urlData } = supabaseStorage.storage.from('documentos').getPublicUrl(uploadData.path);
                    selfieUrl = urlData.publicUrl;
                }

                const respData = {
                    empresa_id: empresaId,
                    nome: resp.nome,
                    nacionalidade: resp.nacionalidade,
                    estado_civil: resp.estado_civil,
                    cpf: resp.cpf,
                    rg: resp.rg,
                    orgao_emissor: resp.orgao_emissor,
                    cep: resp.cep,
                    logradouro: resp.logradouro,
                    numero: resp.numero,
                    complemento: resp.complemento,
                    bairro: resp.bairro,
                    cidade: resp.cidade,
                    estado: resp.estado,
                    documento_url: publicUrl,
                    selfie_url: selfieUrl
                };

                if (resp.isNew) {
                    const { error } = await supabase.from('empresa_responsaveis').insert(respData);
                    if (error) throw error;
                } else {
                    const { error } = await supabase.from('empresa_responsaveis').update(respData).eq('id', resp.id);
                    if (error) throw error;
                }
            }

            onSuccess();
            onClose();
        } catch (error: any) {
            console.error("Erro ao salvar:", error);
            if (error.message?.includes("column \"codigo\" of relation \"empresas\" does not exist")) {
                alert("ERRO DE BANCO: A coluna 'codigo' ainda não foi criada no seu Supabase.");
            } else {
                alert("Erro ao salvar empresa e documentos: " + error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const navItems = [
        { id: 'basico', label: 'Dados Principais', icon: Building2, desc: 'Identificação e CNPJ' },
        { id: 'endereco', label: 'Localização', icon: MapPin, desc: 'CEP e Endereço' },
        { id: 'responsaveis', label: 'Responsáveis', icon: FileText, desc: 'Representantes' },
        { id: 'bancario', label: 'Dados Bancários', icon: Hash, desc: 'Finanças' },
        { id: 'documentos', label: 'Documentos', icon: FileText, desc: 'Anexos e Documentação' }
    ];

    const currentStep = activeTab === 'basico' ? 1 : activeTab === 'endereco' ? 2 : activeTab === 'responsaveis' ? 3 : activeTab === 'bancario' ? 4 : 5;

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-background/90 backdrop-blur-xl" />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-panel glass-elite w-full max-w-5xl h-[700px] rounded-[40px] shadow-2xl overflow-hidden relative z-10 border border-panel-border flex">

                            <aside className="w-80 bg-panel/30 dark:bg-white/5 backdrop-blur-md border-r border-panel-border p-10 flex flex-col justify-between">
                                <div className="space-y-12">
                                    <div className="space-y-2">
                                        <h2 className="text-3xl font-serif-premium text-foreground leading-tight font-bold italic lowercase first-letter:uppercase">Gestão de <br />Empresas</h2>
                                    </div>
                                    <nav className="space-y-4">
                                        {navItems.map((item) => (
                                            <button key={item.id} type="button" onClick={() => setActiveTab(item.id as TabType)}
                                                className={cn("w-full flex items-center gap-5 p-4 rounded-3xl transition-all", activeTab === item.id ? "bg-white/5 border border-panel-border" : "hover:bg-white/[0.02]")}>
                                                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-all", activeTab === item.id ? "bg-primary text-[#0B0B0C] shadow-[0_0_20px_rgba(255,255,255,0.1)]" : "bg-white/5 text-text-dim")}>
                                                    <item.icon className="w-5 h-5" />
                                                </div>
                                                <div className="text-left">
                                                    <div className={cn("text-xs font-bold uppercase tracking-widest", activeTab === item.id ? "text-foreground" : "text-text-dim")}>{item.label}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </nav>
                                </div>
                            </aside>

                            <div className="flex-1 flex flex-col bg-background">
                                <header className="p-10 pb-4 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        {[1, 2, 3, 4, 5].map((step) => (
                                            <div key={step} className={cn("w-10 h-10 rounded-full flex items-center justify-center font-black text-sm", currentStep >= step ? "bg-primary/20 text-primary border border-white/30" : "bg-white/5 text-accent")}>{step}</div>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <button onClick={onClose} className="w-12 h-12 flex items-center justify-center hover:bg-white/5 rounded-2xl transition-all text-text-dim"><X className="w-6 h-6" /></button>
                                    </div>
                                </header>

                                <form
                                    onSubmit={handleSubmit}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            const target = e.target as HTMLElement;
                                            if (target.tagName !== 'TEXTAREA' && target.tagName !== 'BUTTON') {
                                                e.preventDefault();
                                                if (activeTab === 'documentos') return; // Se o botão for "Salvar" no último passo, o handleSubmit cuida disso.

                                                const nextTabMap: Record<TabType, TabType> = {
                                                    basico: 'endereco',
                                                    endereco: 'responsaveis',
                                                    responsaveis: 'bancario',
                                                    bancario: 'documentos',
                                                    documentos: 'documentos'
                                                };
                                                setActiveTab(nextTabMap[activeTab]);
                                            }
                                        }
                                    }}
                                    className="flex-1 flex flex-col p-10 pt-4 overflow-hidden"
                                >
                                    <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
                                        {activeTab === 'basico' && (
                                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-10">
                                                <div className="space-y-4">
                                                    <h3 className="text-xl font-bold text-foreground uppercase tracking-tighter">Identificação Corporativa</h3>
                                                </div>

                                                <div className="grid grid-cols-2 gap-8">
                                                    <div className="flex gap-4 col-span-1">
                                                        <Input label="CÓDIGO" value={formData.codigo} readOnly colSpan="w-1/3" />
                                                        <div className="space-y-3 flex-1">
                                                            <label className="text-[10px] font-black text-text-dim uppercase tracking-widest">STATUS</label>
                                                            <select
                                                                value={formData.status || "Ativo"}
                                                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                                                className="w-full bg-black/5 dark:bg-white/5 border border-panel-border rounded-xl py-3 px-4 text-foreground text-[13px] outline-none focus:border-primary transition-all font-medium appearance-none cursor-pointer"
                                                            >
                                                                <option value="Ativo" className="bg-[#121212] text-white">Ativo</option>
                                                                <option value="Inativo" className="bg-[#121212] text-white">Inativo</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <Input label="Nome Fantasia" value={formData.nome_fantasia} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, nome_fantasia: e.target.value })} placeholder="Ex: Minha Imobiliária" required />
                                                    <Input label="Razão Social" value={formData.razao_social} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, razao_social: e.target.value })} placeholder="Ex: Gestão Imob Ltda" required />
                                                    <div className="space-y-3">
                                                        <label className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em]">CNPJ Oficial</label>
                                                        <input
                                                            required
                                                            value={formData.cnpj}
                                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                                const val = e.target.value.replace(/\D/g, "").slice(0, 14);
                                                                setFormData({ ...formData, cnpj: val });
                                                            }}
                                                            className="w-full bg-black/5 dark:bg-white/5 border border-panel-border rounded-xl py-3 px-4 text-foreground text-[13px] outline-none focus:border-primary transition-all font-medium"
                                                            placeholder="00.000.000/0001-00"
                                                        />
                                                    </div>



                                                    <div className="col-span-2 space-y-3 mt-4">
                                                        <label className="text-[10px] font-black text-text-dim uppercase tracking-widest">Observações Internas</label>
                                                        <textarea
                                                            value={formData.observacoes || ''}
                                                            onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                                                            placeholder="Adicione notas, históricos ou lembretes sobre essa empresa..."
                                                            className="w-full bg-black/5 dark:bg-white/5 border border-panel-border rounded-xl py-3 px-4 text-foreground text-[13px] outline-none focus:border-primary transition-all font-medium min-h-[100px] resize-y custom-scrollbar"
                                                        />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}

                                        {activeTab === 'endereco' && (
                                            <motion.div key="endereco" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-10">
                                                <div className="grid grid-cols-6 gap-8">
                                                    <div className="col-span-2 space-y-3">
                                                        <label className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em]">CEP</label>
                                                        <div className="relative">
                                                            <input required value={formData.cep} onChange={handleCepChange} className="w-full bg-black/5 dark:bg-white/5 border border-panel-border rounded-xl py-3 px-4 text-foreground text-[13px] outline-none focus:border-primary transition-all font-medium" />
                                                            {searchingCep && <Loader2 className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />}
                                                        </div>
                                                    </div>
                                                    <Input label="Logradouro" value={formData.logradouro} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, logradouro: e.target.value })} colSpan="col-span-4" required />

                                                    <Input label="Número" value={formData.numero} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, numero: e.target.value })} colSpan="col-span-2" required />
                                                    <Input label="Bairro" value={formData.bairro} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, bairro: e.target.value })} colSpan="col-span-2" required />
                                                    <Input label="Complemento" value={formData.complemento} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, complemento: e.target.value })} colSpan="col-span-2" placeholder="Ex: Sala 202, Bloco A" />

                                                    <Input label="Cidade" value={formData.cidade} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, cidade: e.target.value })} colSpan="col-span-4" required />
                                                    <Input label="Estado" value={formData.estado} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, estado: e.target.value })} colSpan="col-span-2" required />
                                                </div>
                                            </motion.div>
                                        )}

                                        {activeTab === 'responsaveis' && (
                                            <motion.div key="responsaveis" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-10">
                                                <div className="space-y-4">
                                                    <h3 className="text-xl font-bold text-foreground uppercase tracking-tighter">Responsáveis Legais</h3>
                                                    <p className="text-xs text-text-dim">Cadastre os representantes legais da empresa com os dados para emissão de contratos.</p>
                                                </div>

                                                <div className="space-y-10">
                                                    {responsaveis.map((resp, index) => (
                                                        <div key={resp.id} className="bg-white/5 border border-panel-border rounded-[32px] p-8 space-y-8 relative group">
                                                            {index > 0 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteResponsavel(index, resp.id, resp)}
                                                                    className="absolute top-6 right-6 w-8 h-8 rounded-full flex items-center justify-center text-rose-500 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100"
                                                                    title="Remover Responsável"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            )}

                                                            <div className="flex items-center gap-3 mb-2">
                                                                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-[#0B0B0C] text-[10px] font-black shadow-lg shadow-primary/10">{index + 1}</div>
                                                                <h4 className="text-[12px] font-black text-foreground uppercase tracking-widest">{index === 0 ? "Responsável Principal" : `Responsável Adicional`}</h4>
                                                            </div>

                                                            <div className="grid grid-cols-6 gap-6">
                                                                <Input label="Nome Completo" value={resp.nome} onChange={(e: any) => {
                                                                    const updated = [...responsaveis];
                                                                    updated[index].nome = e.target.value;
                                                                    setResponsaveis(updated);
                                                                }} colSpan="col-span-6" required />

                                                                <Input label="CPF" value={resp.cpf ? resp.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : ''} onChange={(e: any) => {
                                                                    const val = e.target.value.replace(/\D/g, "").slice(0, 11);
                                                                    const updated = [...responsaveis];
                                                                    updated[index].cpf = val;
                                                                    setResponsaveis(updated);
                                                                }} colSpan="col-span-2" placeholder="000.000.000-00" />

                                                                <Input label="RG" value={resp.rg || ''} onChange={(e: any) => {
                                                                    const updated = [...responsaveis];
                                                                    updated[index].rg = e.target.value;
                                                                    setResponsaveis(updated);
                                                                }} colSpan="col-span-2" />

                                                                <Input label="Órgão Emissor" value={resp.orgao_emissor || ''} onChange={(e: any) => {
                                                                    const updated = [...responsaveis];
                                                                    updated[index].orgao_emissor = e.target.value;
                                                                    setResponsaveis(updated);
                                                                }} colSpan="col-span-2" placeholder="Ex: SSP/SP" />

                                                                <Input label="Nacionalidade" value={resp.nacionalidade || ''} onChange={(e: any) => {
                                                                    const updated = [...responsaveis];
                                                                    updated[index].nacionalidade = e.target.value;
                                                                    setResponsaveis(updated);
                                                                }} colSpan="col-span-3" placeholder="Ex: Brasileiro(a)" />

                                                                <div className="col-span-3 space-y-3">
                                                                    <label className="text-[10px] font-black text-text-dim uppercase tracking-widest">Estado Civil</label>
                                                                    <select
                                                                        value={resp.estado_civil || ""}
                                                                        onChange={(e) => {
                                                                            const updated = [...responsaveis];
                                                                            updated[index].estado_civil = e.target.value;
                                                                            setResponsaveis(updated);
                                                                        }}
                                                                        className="w-full bg-black/5 dark:bg-white/5 border border-panel-border rounded-xl py-3 px-4 text-foreground text-[13px] outline-none focus:border-primary transition-all font-medium appearance-none cursor-pointer"
                                                                    >
                                                                        <option value="" disabled className="bg-[#121212] text-white/30">Selecione...</option>
                                                                        <option value="Solteiro(a)" className="bg-[#121212] text-white">Solteiro(a)</option>
                                                                        <option value="Casado(a)" className="bg-[#121212] text-white">Casado(a)</option>
                                                                        <option value="Divorciado(a)" className="bg-[#121212] text-white">Divorciado(a)</option>
                                                                        <option value="Viúvo(a)" className="bg-[#121212] text-white">Viúvo(a)</option>
                                                                        <option value="União Estável" className="bg-[#121212] text-white">União Estável</option>
                                                                    </select>
                                                                </div>

                                                                <div className="col-span-6 border-t border-panel-border pt-6 mt-2 relative">
                                                                    <h5 className="text-[10px] font-black text-primary uppercase tracking-widest absolute -top-2 bg-background pr-2">Endereço Residencial</h5>
                                                                </div>

                                                                <div className="col-span-2 space-y-3">
                                                                    <label className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em]">CEP</label>
                                                                    <div className="relative">
                                                                        <input value={resp.cep ? resp.cep.replace(/^(\d{5})(\d{3})$/, "$1-$2") : ''} onChange={async (e) => {
                                                                            const currentCep = e.target.value.replace(/\D/g, "").slice(0, 8);
                                                                            const updated = [...responsaveis];
                                                                            updated[index].cep = currentCep;
                                                                            setResponsaveis(updated);

                                                                            if (currentCep.length === 8) {
                                                                                setSearchingCep(true);
                                                                                try {
                                                                                    const res = await fetch(`https://viacep.com.br/ws/${currentCep}/json/`);
                                                                                    const data = await res.json();
                                                                                    if (!data.erro) {
                                                                                        const newArray = [...responsaveis];
                                                                                        newArray[index].logradouro = data.logradouro;
                                                                                        newArray[index].bairro = data.bairro;
                                                                                        newArray[index].cidade = data.localidade;
                                                                                        newArray[index].estado = data.uf;
                                                                                        setResponsaveis(newArray);
                                                                                    }
                                                                                } catch (err) { } finally { setSearchingCep(false); }
                                                                            }
                                                                        }} className="w-full bg-black/5 dark:bg-white/5 border border-panel-border rounded-xl py-3 px-4 text-foreground text-[13px] outline-none focus:border-primary transition-all font-medium pr-10" placeholder="00000-000" />
                                                                        {searchingCep && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />}
                                                                    </div>
                                                                </div>
                                                                <Input label="Logradouro" value={resp.logradouro || ''} onChange={(e: any) => {
                                                                    const updated = [...responsaveis];
                                                                    updated[index].logradouro = e.target.value;
                                                                    setResponsaveis(updated);
                                                                }} colSpan="col-span-4" />

                                                                <Input label="Número" value={resp.numero || ''} onChange={(e: any) => {
                                                                    const updated = [...responsaveis];
                                                                    updated[index].numero = e.target.value;
                                                                    setResponsaveis(updated);
                                                                }} colSpan="col-span-2" />
                                                                <Input label="Bairro" value={resp.bairro || ''} onChange={(e: any) => {
                                                                    const updated = [...responsaveis];
                                                                    updated[index].bairro = e.target.value;
                                                                    setResponsaveis(updated);
                                                                }} colSpan="col-span-2" />
                                                                <Input label="Complemento" value={resp.complemento || ''} onChange={(e: any) => {
                                                                    const updated = [...responsaveis];
                                                                    updated[index].complemento = e.target.value;
                                                                    setResponsaveis(updated);
                                                                }} colSpan="col-span-2" />

                                                                <Input label="Cidade" value={resp.cidade || ''} onChange={(e: any) => {
                                                                    const updated = [...responsaveis];
                                                                    updated[index].cidade = e.target.value;
                                                                    setResponsaveis(updated);
                                                                }} colSpan="col-span-4" />
                                                                <Input label="Estado" value={resp.estado || ''} onChange={(e: any) => {
                                                                    const updated = [...responsaveis];
                                                                    updated[index].estado = e.target.value;
                                                                    setResponsaveis(updated);
                                                                }} colSpan="col-span-2" />
                                                            </div>
                                                        </div>
                                                    ))}

                                                    <div className="pt-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setResponsaveis([...responsaveis, {
                                                                id: Math.random().toString(36).substr(2, 9),
                                                                nome: '',
                                                                nacionalidade: '', estado_civil: '', cpf: '', rg: '', orgao_emissor: '',
                                                                cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
                                                                arquivo: null, selfie: null, selfie_url: null, isNew: true
                                                            }])}
                                                            className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl border-2 border-dashed border-primary/30 text-[11px] font-black text-primary uppercase tracking-widest hover:bg-primary/5 transition-all"
                                                        >
                                                            <Plus className="w-4 h-4" /> Adicionar Outro Responsável Legal
                                                        </button>
                                                    </div>
                                                </div>
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
                                                            <div key={idx} className="bg-black/5 dark:bg-white/5 border border-panel-border rounded-[32px] p-8 space-y-6 relative group">
                                                                <button type="button" onClick={() => {
                                                                    const updated = formData.dados_bancarios.filter((_: any, i: number) => i !== idx);
                                                                    setFormData({ ...formData, dados_bancarios: updated });
                                                                }} className="absolute top-6 right-6 w-8 h-8 rounded-full flex items-center justify-center text-rose-500 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>

                                                                <div className="flex items-center gap-3 mb-2">
                                                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-[10px] font-black">{idx + 1}</div>
                                                                    <h4 className="text-[10px] font-black text-foreground uppercase tracking-[0.2em]">Dados da Conta</h4>
                                                                </div>

                                                                <div className="grid grid-cols-6 gap-6">
                                                                    <Input label="Banco" value={item.banco} onChange={(e: any) => {
                                                                        const updated = [...formData.dados_bancarios];
                                                                        updated[idx].banco = e.target.value;
                                                                        setFormData({ ...formData, dados_bancarios: updated });
                                                                    }} colSpan="col-span-3" />
                                                                    <Input label="Número Banco" value={item.num_banco} onChange={(e: any) => {
                                                                        const updated = [...formData.dados_bancarios];
                                                                        updated[idx].num_banco = e.target.value;
                                                                        setFormData({ ...formData, dados_bancarios: updated });
                                                                    }} colSpan="col-span-3" />

                                                                    <Input label="Agência" value={item.agencia} onChange={(e: any) => {
                                                                        const updated = [...formData.dados_bancarios];
                                                                        updated[idx].agencia = e.target.value;
                                                                        setFormData({ ...formData, dados_bancarios: updated });
                                                                    }} colSpan="col-span-2" />
                                                                    <Input label="Conta" value={item.conta} onChange={(e: any) => {
                                                                        const updated = [...formData.dados_bancarios];
                                                                        updated[idx].conta = e.target.value;
                                                                        setFormData({ ...formData, dados_bancarios: updated });
                                                                    }} colSpan="col-span-2" />

                                                                    <div className="col-span-2 space-y-2">
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
                                            <motion.div key="documentos" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-10 pb-10">
                                                <div className="space-y-4">
                                                    <h3 className="text-xl font-bold text-foreground uppercase tracking-tighter">Documentação Obrigatória</h3>
                                                    <p className="text-xs text-text-dim">Anexe os documentos necessários para a validação da unidade.</p>
                                                </div>

                                                {/* Contrato Social */}
                                                <div className="bg-white/[0.02] border border-panel-border rounded-3xl p-6 space-y-4">
                                                    <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Contrato Social (PDF/JPG)</label>
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex-1 relative min-w-0">
                                                            <input
                                                                type="file"
                                                                id="contratoSocial"
                                                                className="hidden"
                                                                accept=".pdf,.jpg,.jpeg,.png"
                                                                onChange={(e) => {
                                                                    const file = e.target.files?.[0];
                                                                    if (file && handleFileValidation(file)) {
                                                                        setContratoSocial(file);
                                                                    }
                                                                }}
                                                            />
                                                            <label htmlFor="contratoSocial" onClick={(e) => {
                                                                if (contratoSocial || initialData?.contrato_social_url) {
                                                                    e.preventDefault();
                                                                    openViewer(contratoSocial, initialData?.contrato_social_url, contratoSocial ? contratoSocial.name : 'Contrato Social', () => {
                                                                        if (contratoSocial) setContratoSocial(null);
                                                                        else handleDeleteFile('contrato', undefined, initialData?.contrato_social_url);
                                                                    });
                                                                }
                                                            }} className="w-full bg-black/5 dark:bg-white/5 border border-panel-border rounded-2xl py-4 px-6 text-accent text-[13px] flex items-center justify-between cursor-pointer hover:border-primary/50 transition-all">
                                                                <span className="flex-1 min-w-0 truncate pr-4 text-left">{contratoSocial ? contratoSocial.name : (initialData?.contrato_social_url ? "Arquivo já enviado" : "Selecionar arquivo...")}</span>
                                                                <Upload className="w-4 h-4 flex-shrink-0" />
                                                            </label>
                                                        </div>
                                                        {contratoSocial && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOCR(contratoSocial)}
                                                                disabled={ocrLoading}
                                                                className="p-3 rounded-[10px] bg-primary/20 text-primary hover:bg-primary hover:text-foreground transition-all border border-primary/20"
                                                                title="Escanear com OCR"
                                                            >
                                                                {ocrLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scan className="w-4 h-4" />}
                                                            </button>
                                                        )}
                                                        {(contratoSocial || (initialData && (initialData as any).contrato_social_url)) && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    if (contratoSocial) setContratoSocial(null);
                                                                    else handleDeleteFile('contrato', undefined, (initialData as any).contrato_social_url);
                                                                }}
                                                                className="p-3 rounded-[10px] bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-foreground transition-all border border-rose-500/20"
                                                                title="Remover arquivo"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Responsáveis - Uploads */}
                                                <div className="space-y-6">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Documentação dos Responsáveis</label>
                                                    </div>

                                                    <div className="space-y-4">
                                                        {responsaveis.map((resp, index) => (
                                                            <div key={resp.id} className="bg-white/[0.02] border border-panel-border rounded-3xl p-6 relative group">
                                                                {responsaveis.length > 1 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleDeleteResponsavel(index, resp.id, resp)}
                                                                        className="absolute -top-3 -right-3 w-8 h-8 bg-black border border-rose-500/30 text-rose-500 rounded-full flex items-center justify-center hover:bg-rose-500 hover:text-foreground transition-all shadow-xl z-20"
                                                                        title="Remover Responsável Completo"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                )}

                                                                <h4 className="text-[13px] font-black text-foreground uppercase tracking-widest mb-6">{resp.nome || (index === 0 ? "Responsável Principal" : `Responsável Adicional ${index}`)}</h4>

                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                                                    <div className="space-y-3">
                                                                        <label className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em]">RG / CNH</label>
                                                                        <div className="flex gap-4">
                                                                            <div className="flex-1 relative min-w-0">
                                                                                <input
                                                                                    type="file"
                                                                                    id={`resp-file-${resp.id}`}
                                                                                    className="hidden"
                                                                                    accept=".pdf,.jpg,.jpeg,.png"
                                                                                    onChange={(e) => {
                                                                                        const file = e.target.files?.[0];
                                                                                        if (file && handleFileValidation(file)) {
                                                                                            const newResp = [...responsaveis];
                                                                                            newResp[index].arquivo = file;
                                                                                            setResponsaveis(newResp);
                                                                                        }
                                                                                    }}
                                                                                />
                                                                                <label htmlFor={`resp-file-${resp.id}`} onClick={(e) => {
                                                                                    if (resp.arquivo || resp.documento_url) {
                                                                                        e.preventDefault();
                                                                                        openViewer(resp.arquivo, resp.documento_url, resp.arquivo ? resp.arquivo.name : 'Documento Responsável', () => {
                                                                                            if (resp.arquivo) {
                                                                                                const newResp = [...responsaveis];
                                                                                                newResp[index].arquivo = null;
                                                                                                setResponsaveis(newResp);
                                                                                            } else {
                                                                                                handleDeleteFile('responsavel', resp.id, resp.documento_url);
                                                                                            }
                                                                                        });
                                                                                    }
                                                                                }} className="w-full h-[54px] bg-black/5 dark:bg-white/5 border border-panel-border rounded-xl px-6 text-accent text-[13px] flex items-center justify-between cursor-pointer hover:border-primary/50 transition-all font-medium">
                                                                                    <span className="flex-1 min-w-0 truncate pr-4 text-left">{resp.arquivo ? resp.arquivo.name : (resp.documento_url ? "Arquivo já enviado" : "Anexar DOC")}</span>
                                                                                    <Upload className="w-4 h-4 flex-shrink-0" />
                                                                                </label>
                                                                            </div>
                                                                            {(resp.arquivo || resp.documento_url) && (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        if (resp.arquivo) {
                                                                                            const newResp = [...responsaveis];
                                                                                            newResp[index].arquivo = null;
                                                                                            setResponsaveis(newResp);
                                                                                        } else {
                                                                                            handleDeleteFile('responsavel', resp.id, resp.documento_url);
                                                                                        }
                                                                                    }}
                                                                                    className="h-[54px] w-[54px] flex items-center justify-center bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-foreground transition-all border border-rose-500/20 flex-shrink-0"
                                                                                    title="Remover DOC"
                                                                                >
                                                                                    <Trash2 className="w-4 h-4" />
                                                                                </button>
                                                                            )}
                                                                            {resp.arquivo && (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleOCR(resp.arquivo!)}
                                                                                    disabled={ocrLoading}
                                                                                    className="h-[54px] w-[54px] flex items-center justify-center bg-primary/20 text-primary rounded-xl hover:bg-primary hover:text-foreground transition-all border border-primary/20 flex-shrink-0"
                                                                                    title="Escanear com OCR"
                                                                                >
                                                                                    {ocrLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scan className="w-4 h-4" />}
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    <div className="space-y-3">
                                                                        <label className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em]">Selfie</label>
                                                                        <div className="flex gap-4">
                                                                            <div className="flex-1 relative min-w-0">
                                                                                <input
                                                                                    type="file"
                                                                                    id={`resp-selfie-${resp.id}`}
                                                                                    className="hidden"
                                                                                    accept=".pdf,.jpg,.jpeg,.png"
                                                                                    onChange={(e) => {
                                                                                        const file = e.target.files?.[0];
                                                                                        if (file && handleFileValidation(file)) {
                                                                                            const newResp = [...responsaveis];
                                                                                            newResp[index].selfie = file;
                                                                                            setResponsaveis(newResp);
                                                                                        }
                                                                                    }}
                                                                                />
                                                                                <label htmlFor={`resp-selfie-${resp.id}`} onClick={(e) => {
                                                                                    if (resp.selfie || resp.selfie_url) {
                                                                                        e.preventDefault();
                                                                                        openViewer(resp.selfie, resp.selfie_url, resp.selfie ? resp.selfie.name : 'Selfie Responsável', () => {
                                                                                            if (resp.selfie) {
                                                                                                const newResp = [...responsaveis];
                                                                                                newResp[index].selfie = null;
                                                                                                setResponsaveis(newResp);
                                                                                            } else {
                                                                                                handleDeleteFile('responsavel_selfie', resp.id, resp.selfie_url);
                                                                                            }
                                                                                        });
                                                                                    }
                                                                                }} className="w-full h-[54px] bg-black/5 dark:bg-white/5 border border-panel-border rounded-xl px-6 text-[13px] flex items-center justify-between cursor-pointer hover:border-accent/50 transition-all font-medium border border-accent/20 text-accent/50">
                                                                                    <span className="flex-1 min-w-0 truncate pr-4 text-left">{resp.selfie ? resp.selfie.name : (resp.selfie_url ? "Selfie já enviada" : "Anexar Selfie")}</span>
                                                                                    <Upload className="w-4 h-4 flex-shrink-0" />
                                                                                </label>
                                                                            </div>
                                                                            {(resp.selfie || resp.selfie_url) && (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        if (resp.selfie) {
                                                                                            const newResp = [...responsaveis];
                                                                                            newResp[index].selfie = null;
                                                                                            setResponsaveis(newResp);
                                                                                        } else {
                                                                                            handleDeleteFile('responsavel_selfie', resp.id, resp.selfie_url);
                                                                                        }
                                                                                    }}
                                                                                    className="h-[54px] w-[54px] flex items-center justify-center bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-foreground transition-all border border-rose-500/20 flex-shrink-0"
                                                                                    title="Remover Selfie"
                                                                                >
                                                                                    <Trash2 className="w-4 h-4" />
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </div>

                                    <AnimatePresence>
                                        {ocrResult && (
                                            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                                className="absolute bottom-32 inset-x-10 bg-primary rounded-[30px] p-6 shadow-2xl z-50 flex items-center justify-between border border-white/20 backdrop-blur-xl">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0"><Sparkles className="w-6 h-6 text-foreground" /></div>
                                                    <div>
                                                        <h4 className="text-sm font-black text-foreground uppercase italic leading-none">Dados Identificados!</h4>
                                                        <p className="text-blue-100 text-[9px] font-bold uppercase tracking-widest mt-1 opacity-80">Deseja preencher automaticamente?</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-4">
                                                    <button type="button" onClick={() => setOcrResult(null)} className="text-[10px] font-black text-foreground uppercase tracking-widest px-4">Recusar</button>
                                                    <button type="button" onClick={applyOCR} className="bg-white text-blue-600 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2 hover:scale-105 transition-all"><Wand2 className="w-4 h-4" /> Preencher Ficha</button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <footer className="pt-10 flex gap-6 mt-auto">
                                        <button type="button" onClick={onClose} className="px-10 py-5 rounded-2xl font-black text-[10px] text-accent hover:bg-white/5 uppercase tracking-[0.3em] transition-all border border-panel-border">Cancelar</button>
                                        {activeTab !== 'documentos' ? (
                                            <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); const tabs: TabType[] = ['basico', 'endereco', 'responsaveis', 'bancario', 'documentos']; const nextIdx = tabs.indexOf(activeTab) + 1; if (nextIdx < tabs.length) setActiveTab(tabs[nextIdx]); }} className="flex-1 bg-[#EAEAEA] text-[#0B0B0C] px-10 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] flex items-center justify-center gap-4 hover:scale-[1.02] active:scale-[0.98] transition-all">Próximo Passo <ChevronRight className="w-4 h-4" /></button>
                                        ) : (
                                            <button type="submit" disabled={loading} className="flex-1 bg-[#EAEAEA] text-[#0B0B0C] px-10 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] flex items-center justify-center gap-4 hover:scale-[1.02] active:scale-[0.98] transition-all">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Finalizar e Salvar <CheckCircle2 className="w-4 h-4" /></>}</button>
                                        )}
                                    </footer>
                                </form>
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
