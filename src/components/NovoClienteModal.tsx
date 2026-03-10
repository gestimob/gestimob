"use client";

import { X, Loader2, MapPin, User, FileText, ChevronRight, CheckCircle2, Hash, Plus, Trash2, Upload, UserCheck, Briefcase, Heart, Fingerprint, PlusCircle, Building2, Banknote, ShieldCheck, Scan, Sparkles, Wand2 } from "lucide-react";
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

const maskPhone = (value: string) => {
    let val = value.replace(/\D/g, "");
    if (!val) return "";
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

const formatBRL = (val: number | string) => {
    if (val === undefined || val === null) return "";
    const numericVal = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(numericVal)) return "";
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numericVal);
};

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: any;
}

type TabType = 'basico' | 'representantes' | 'profissional' | 'endereco' | 'conjuge' | 'referencias' | 'bens' | 'documentos';

const Input = ({ label, value, onChange, placeholder, type = "text", colSpan = "col-span-1", readOnly = false }: {
    label: string, value: any, onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void, placeholder?: string, type?: string, colSpan?: string, readOnly?: boolean
}) => (
    <div className={cn("space-y-2", colSpan)}>
        <label className="text-[10px] font-black text-text-dim uppercase tracking-widest">{label}</label>
        <input type={type} value={value || ""} onChange={onChange} readOnly={readOnly}
            className="w-full bg-panel/50 border border-panel-border rounded-xl py-3 px-5 text-foreground text-[13px] outline-none focus:border-primary transition-all font-medium" placeholder={placeholder} />
    </div>
);

const CurrencyInput = ({ label, value, onChange, colSpan = "col-span-1" }: {
    label: string, value: any, onChange: (val: number) => void, colSpan?: string
}) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/\D/g, "");
        if (!val) {
            onChange(0);
            return;
        }
        onChange(parseFloat(val) / 100);
    };

    return (
        <div className={cn("space-y-2", colSpan)}>
            <label className="text-[10px] font-black text-text-dim uppercase tracking-widest">{label}</label>
            <input type="text" value={formatBRL(value)} onChange={handleChange}
                className="w-full bg-panel/50 border border-panel-border rounded-xl py-3 px-5 text-foreground text-[13px] outline-none focus:border-primary transition-all font-medium" />
        </div>
    );
};

const Select = ({ label, value, onChange, options, colSpan = "col-span-1" }: {
    label: string, value: any, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void, options: { label: string, value: string }[], colSpan?: string
}) => (
    <div className={cn("space-y-2", colSpan)}>
        <label className="text-[10px] font-black text-text-dim uppercase tracking-widest">{label}</label>
        <select value={value || ""} onChange={onChange}
            className="w-full bg-panel/50 border border-panel-border rounded-xl py-3 px-5 text-foreground text-[13px] outline-none focus:border-primary transition-all font-medium">
            {options.map((o, idx) => <option key={`${o.label}-${idx}`} value={o.value} className="bg-[#121212] text-white">{o.label}</option>)}
        </select>
    </div>
);

const initialFormState = {
    codigo_interno: "", nome_completo: "", nome_fantasia: "", tipo: "PF", documento: "", email: "", telefone: "", celular: "",
    sexo: "", data_nascimento: "", tipo_identidade: "RG", rg: "", cnh: "", orgao_expedidor: "", cnh_orgao_expedidor: "", filiacao: "", naturalidade: "", nacionalidade: "",
    estado_civil: "Solteiro", grau_instrucao: "", num_dependentes: 0, papel: "Locatário", status: "Ativo",
    cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "",
    tipo_residencia: "", valor_aluguel: 0, tempo_residencia: "",
    profissao: "", atividade: "", empresa_trabalho: "", empresa_cnpj: "", cargo_funcao: "", data_admissao: "",
    telefone_rh: "", ramal_profissional: "", fax_profissional: "", email_profissional: "",
    renda_principal: 0, outras_rendas: 0, origem_outras_rendas: "",
    conjuge_nome: "", conjuge_rg: "", conjuge_orgao_expedidor: "", conjuge_data_nascimento: "", conjuge_filiacao: "",
    conjuge_cpf: "", conjuge_naturalidade: "", conjuge_nacionalidade: "", conjuge_profissao: "", conjuge_atividade: "",
    conjuge_empresa: "", conjuge_cargo: "", conjuge_data_admissao: "", conjuge_endereco: "", conjuge_bairro: "",
    conjuge_cidade: "", conjuge_uf: "", conjuge_cep: "", conjuge_telefone: "", conjuge_ramal: "", conjuge_celular: "",
    conjuge_renda: 0, conjuge_outras_rendas: 0, conjuge_origem_outras_rendas: "",
    inscricao_estadual: "", data_abertura: "",
    pessoa_contato: "", pessoa_contato_tel: "", pessoa_contato_fax: "",
    pessoa_contato_fortaleza: "", pessoa_contato_fortaleza_tel: "", pessoa_contato_fortaleza_fax: "", pessoa_contato_fortaleza_email: "",
    predio_empresa: "", predio_valor_aluguel: 0,
    bens_outros_valor: 0, cadastrado_por: "", comprovante_renda_url: ""
};

export function NovoClienteModal({ isOpen, onClose, onSuccess, initialData }: ModalProps) {
    const [loading, setLoading] = useState(false);
    const [searchingCep, setSearchingCep] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('basico');
    const [step, setStep] = useState(0);

    const [formData, setFormData] = useState<any>(initialFormState);

    const [representantes, setRepresentantes] = useState<any[]>([
        { id: 'temp-' + Date.now(), nome_completo: "", cpf: "", rg: "", cargo_funcao: "", ligacao_empresa: "Sócio" }
    ]);

    const [docIdentidade, setDocIdentidade] = useState<File | null>(null);
    const [compResidencia, setCompResidencia] = useState<File | null>(null);
    const [docConjuge, setDocConjuge] = useState<File | null>(null);
    const [compRenda, setCompRenda] = useState<File | null>(null);
    const [selfie, setSelfie] = useState<File | null>(null);

    const [ocrLoading, setOcrLoading] = useState(false);
    const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);

    const isPF = formData.tipo === 'PF';
    const showConjugeTab = isPF && (formData.estado_civil === 'Casado' || formData.estado_civil === 'União estável');
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

    const [viewerData, setViewerData] = useState<{ url: string | null; name: string; onDelete?: () => void }>({ url: null, name: '' });

    const openViewer = (file: File | null, url: string | null, name: string, deleteKey: string, fileSetter: any) => {
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
                    fileSetter(null);
                } else if (url && deleteKey) {
                    handleDeleteFile(deleteKey as any, url);
                }
            }
        });
    };

    const handleIdInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const masked = maskCpfCnpj(e.target.value);
        const raw = masked.replace(/\D/g, "");
        setFormData({ ...formData, documento: masked, tipo: raw.length > 11 ? "PJ" : "PF" });
    };

    const fetchNextCode = async () => {
        try {
            const { data, error } = await supabase
                .from('clientes')
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

            return `C-${String(nextCode).padStart(4, '0')}`;
        } catch (error) {
            console.error("Erro ao gerar próximo código cliente:", error);
            const rnd = Math.floor(Math.random() * 9000) + 1000;
            return `C-${rnd}`;
        }
    };

    useEffect(() => {
        const initForm = async () => {
            if (isOpen) {
                if (initialData) {
                    setFormData({ ...initialData });
                    setStep(1);
                    if (initialData.tipo === 'PJ') {
                        const { data } = await supabase.from('cliente_representantes').select('*').eq('cliente_id', initialData.id);
                        if (data && data.length > 0) setRepresentantes(data);
                    }
                } else {
                    const nextCode = await fetchNextCode();
                    const { data: { user } } = await supabase.auth.getUser();
                    const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Sistema";

                    setFormData({ ...initialFormState, codigo_interno: nextCode, cadastrado_por: userName });
                    setDocIdentidade(null);
                    setCompResidencia(null);
                    setDocConjuge(null);
                    setCompRenda(null);
                    setSelfie(null);
                    setOcrResult(null);
                    setRepresentantes([
                        { id: 'temp-' + Date.now(), nome_completo: "", cpf: "", rg: "", cargo_funcao: "", ligacao_empresa: "Sócio" }
                    ]);
                    setStep(0);
                    setActiveTab('basico');
                }
            }
        };
        initForm();
    }, [initialData, isOpen]);

    const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const cep = e.target.value.replace(/\D/g, "").slice(0, 8);
        setFormData((p: any) => ({ ...p, cep }));
        if (cep.length === 8) {
            setSearchingCep(true);
            try {
                const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                const data = await res.json();
                if (!data.erro) setFormData((p: any) => ({ ...p, logradouro: data.logradouro, bairro: data.bairro, cidade: data.localidade, estado: data.uf }));
            } catch (e) { console.error(e); } finally { setSearchingCep(false); }
        }
    };

    const addRepresentante = () => {
        setRepresentantes([...representantes, { id: 'temp-' + Date.now(), nome_completo: "", cpf: "", rg: "", cargo_funcao: "", ligacao_empresa: "Sócio" }]);
    };

    const handleDeleteFile = async (type: 'identidade' | 'residencia' | 'conjuge' | 'selfie' | 'renda', url: string) => {
        if (!confirm("Deseja realmente excluir este arquivo?")) return;

        try {
            const pathParts = url.split('/documentos/');
            if (pathParts.length < 2) return;

            const rawPath = pathParts[1].split('?')[0];
            const storagePath = decodeURIComponent(rawPath);

            const { error: storageError } = await supabaseStorage.storage
                .from('documentos')
                .remove([storagePath]);

            if (storageError) throw storageError;

            const fieldMap = {
                identidade: 'documento_identidade_url',
                residencia: 'comprovante_residencia_url',
                conjuge: 'documento_conjuge_url',
                selfie: 'selfie_url',
                renda: 'comprovante_renda_url'
            };

            const dbField = fieldMap[type];

            if (initialData?.id) {
                await supabase.from('clientes').update({ [dbField]: null }).eq('id', initialData.id);
            }

            setFormData((prev: any) => ({ ...prev, [dbField]: null }));

            if (type === 'identidade') setDocIdentidade(null);
            if (type === 'residencia') setCompResidencia(null);
            if (type === 'conjuge') setDocConjuge(null);
            if (type === 'renda') setCompRenda(null);
            if (type === 'selfie') setSelfie(null);

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
            alert("Erro ao processar OCR. Tente novamente.");
        } finally {
            setOcrLoading(false);
        }
    };

    const applyOCR = () => {
        if (!ocrResult) return;
        const { extractedData } = ocrResult;
        const newData = { ...formData };

        if (extractedData.name) {
            if (isPF) newData.nome_completo = extractedData.name;
            else newData.razao_social = extractedData.name;
        }

        // Smarter doc filling: Update type if we find a clear match
        if (extractedData.cnpj) {
            newData.documento = maskCpfCnpj(extractedData.cnpj);
            newData.tipo = "PJ";
            if (!newData.razao_social && extractedData.name) newData.razao_social = extractedData.name;
        } else if (extractedData.cpf) {
            newData.documento = maskCpfCnpj(extractedData.cpf);
            newData.tipo = "PF";
            if (!newData.nome_completo && extractedData.name) newData.nome_completo = extractedData.name;
        }

        if (extractedData.rg) newData.rg = extractedData.rg;

        // Match dates if possible
        if (extractedData.dates && extractedData.dates.length > 0) {
            // Heuristic: oldest date is likely birth date
            const sortedDates = [...extractedData.dates].sort((a, b) => {
                const da = new Date(a.split('/').reverse().join('-'));
                const db = new Date(b.split('/').reverse().join('-'));
                return da.getTime() - db.getTime();
            });
            newData.data_nascimento = sortedDates[0].split('/').reverse().join('-');
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

        if (isPF) {
            if (!formData.nome_completo || !formData.documento) {
                alert("Por favor, preencha o Nome Completo e CPF na aba 'Dados Principais'.");
                setActiveTab('basico');
                return;
            }
        } else {
            if (!formData.nome_completo || !formData.documento || !formData.nome_fantasia) {
                alert("Por favor, preencha a Razão Social, CNPJ e Nome Fantasia na aba 'Dados Principais'.");
                setActiveTab('basico');
                return;
            }
        }

        if (!formData.cep || !formData.logradouro || !formData.numero || !formData.cidade || !formData.estado) {
            alert("Por favor, preencha o CEP e Endereço obrigatórios na aba 'Localização'.");
            setActiveTab('endereco');
            return;
        }

        setLoading(true);
        try {
            let finalData = { ...formData };

            // Sanitize empty strings to null for database compatibility (especially for dates)
            Object.keys(finalData).forEach(key => {
                if (finalData[key] === "") finalData[key] = null;
            });

            // Remove campos que não existem no banco de dados para evitar erros de schema cache
            delete finalData.tipo_identidade;

            if (!initialData?.id && !finalData.cadastrado_por) {
                const { data: { user } } = await supabase.auth.getUser();
                finalData.cadastrado_por = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Sistema";
            }

            let clienteId = initialData?.id;
            if (initialData?.id) {
                const { error } = await supabase.from('clientes').update(finalData).eq('id', initialData.id);
                if (error) throw error;
            } else {
                const { data, error } = await supabase.from('clientes').insert([finalData]).select().single();
                if (error) throw error;
                clienteId = data.id;
            }

            // Representantes logic
            if (formData.tipo === 'PJ') {
                await supabase.from('cliente_representantes').delete().eq('cliente_id', clienteId);
                const repsToInsert = representantes.map(({ id, ...rest }) => ({ ...rest, cliente_id: clienteId }));
                await supabase.from('cliente_representantes').insert(repsToInsert);
            }

            const uploadDoc = async (file: File, prefix: string, dbField: string) => {
                let fToUpload: Blob | File = file;
                let fName = `${prefix}_${Date.now()}`;
                if (file.type.startsWith('image/')) { fToUpload = await convertToWebP(file); fName += '.webp'; }
                else { const res = await processPDF(file); fToUpload = res.blob; fName += '.pdf'; }
                const { data: up } = await supabaseStorage.storage.from('documentos').upload(`clientes/${clienteId}/${fName}`, fToUpload);
                const { data: { publicUrl } } = supabaseStorage.storage.from('documentos').getPublicUrl(up!.path);
                await supabase.from('clientes').update({ [dbField]: publicUrl }).eq('id', clienteId);
            };

            if (docIdentidade) await uploadDoc(docIdentidade, 'identidade', 'documento_identidade_url');
            if (compResidencia) await uploadDoc(compResidencia, 'residencia', 'comprovante_residencia_url');
            if (docConjuge && showConjugeTab) await uploadDoc(docConjuge, 'conjuge', 'documento_conjuge_url');
            if (compRenda) await uploadDoc(compRenda, 'renda', 'comprovante_renda_url');
            if (selfie) await uploadDoc(selfie, 'selfie', 'selfie_url');

            onSuccess();
            onClose();
        } catch (error: any) { alert(error.message); } finally { setLoading(false); }
    };

    const navItems = isPF ? [
        { id: 'basico', label: 'Dados Pessoais', icon: User, desc: 'Identificação' },
        { id: 'profissional', label: 'Profissional', icon: Briefcase, desc: 'Trabalho e Renda' },
        { id: 'endereco', label: 'Residencial', icon: MapPin, desc: 'Localização' },
        ...(showConjugeTab ? [{ id: 'conjuge', label: 'Cônjuge', icon: Heart, desc: 'Parceiro(a)' }] : []),
        { id: 'documentos', label: 'Documentos', icon: FileText, desc: 'Arquivos' },
    ] : [
        { id: 'basico', label: 'Dados Empresa', icon: Building2, desc: 'Fiscal e Contatos' },
        { id: 'representantes', label: 'Representantes', icon: ShieldCheck, desc: 'Sócios e Diretores' },
        { id: 'referencias', label: 'Referências', icon: Banknote, desc: 'Bancos e Outros' },
        { id: 'bens', label: 'Bens e Ativos', icon: Hash, desc: 'Imóveis e Carros' },
        { id: 'documentos', label: 'Documentos', icon: FileText, desc: 'Legal e Anexos' },
    ];

    const currentStep = navItems.findIndex(i => i.id === activeTab) + 1;

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-background/90 backdrop-blur-xl" />

                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-panel glass-elite w-full max-w-6xl h-[90vh] md:h-[650px] rounded-[32px] md:rounded-[48px] shadow-2xl relative z-10 border border-panel-border flex flex-col md:flex-row overflow-hidden">

                            {step === 0 ? (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center p-8 md:p-12 space-y-6">
                                    <div className="text-center space-y-3">
                                        <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-600/30"><Fingerprint className="text-[#0B0B0C] w-6 h-6" /></div>
                                        <h2 className="text-2xl font-serif-premium font-bold text-foreground italic tracking-tighter uppercase lowercase first-letter:uppercase">Identificação</h2>
                                        <p className="text-text-dim font-bold uppercase tracking-[0.2em] text-[8px]">CPF / CNPJ do Novo Cliente</p>
                                    </div>
                                    <form onSubmit={async (e) => {
                                        e.preventDefault();
                                        const rawDoc = formData.documento.replace(/\D/g, "");
                                        if (rawDoc.length < 11) return;

                                        // Verificar se já existe
                                        try {
                                            setLoading(true);

                                            // Verificar na tabela clientes
                                            const { data: clienteExistente } = await supabase
                                                .from('clientes')
                                                .select('id, nome_completo, nome_fantasia, tipo, is_fiador, documento')
                                                .or(`documento.eq.${rawDoc},documento.eq.${formData.documento}`)
                                                .limit(1);

                                            if (clienteExistente && clienteExistente.length > 0) {
                                                const c = clienteExistente[0];
                                                const nome = c.tipo === 'PJ' ? (c.nome_fantasia || c.nome_completo) : c.nome_completo;
                                                const papel = c.is_fiador ? 'Fiador' : 'Locatário';
                                                alert(`⚠️ CPF/CNPJ já cadastrado!\n\nCliente: ${nome}\nTipo: ${c.tipo} • ${papel}\nDocumento: ${formData.documento}`);
                                                setLoading(false);
                                                return;
                                            }

                                            // Verificar na tabela proprietarios
                                            const { data: propExistente } = await supabase
                                                .from('proprietarios')
                                                .select('id, nome_completo, tipo, documento')
                                                .or(`documento.eq.${rawDoc},documento.eq.${formData.documento}`)
                                                .limit(1);

                                            if (propExistente && propExistente.length > 0) {
                                                const p = propExistente[0];
                                                alert(`⚠️ CPF/CNPJ já cadastrado como Proprietário!\n\nProprietário: ${p.nome_completo}\nTipo: ${p.tipo || 'PF'}\nDocumento: ${formData.documento}`);
                                                setLoading(false);
                                                return;
                                            }

                                            setLoading(false);
                                            setStep(1);
                                        } catch (err) {
                                            console.error("Erro ao verificar documento:", err);
                                            setLoading(false);
                                            setStep(1);
                                        }
                                    }} className="w-full max-w-[320px] space-y-4">
                                        <input autoFocus value={formData.documento} onChange={handleIdInput} placeholder="000.000.000-00"
                                            className="w-full bg-black/5 dark:bg-white/5 border border-panel-border rounded-2xl py-4 px-6 text-xl font-bold text-center text-foreground focus:outline-none focus:border-primary transition-all placeholder:text-text-dim" />
                                        <button type="submit" disabled={formData.documento.replace(/\D/g, "").length < 11 || loading}
                                            className="w-full bg-primary text-[#0B0B0C] py-4 rounded-2xl font-black text-[9px] uppercase tracking-[0.3em] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-10 shadow-2xl flex items-center justify-center gap-2">
                                            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Verificando...</> : 'Continuar para Ficha'}
                                        </button>
                                    </form>
                                </motion.div>
                            ) : (
                                <>
                                    <aside className="w-full md:w-64 bg-panel/30 dark:bg-white/5 border-b md:border-b-0 md:border-r border-panel-border flex flex-col shrink-0 overflow-hidden">
                                        <div className="p-4 md:p-8 md:pb-4">
                                            <div className="flex items-center gap-4 mb-2 md:mb-4">
                                                <div className="w-10 h-10 md:w-12 md:h-12 bg-primary rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 shadow-xl shadow-blue-600/30"><User className="text-[#0B0B0C] w-5 h-5 md:w-6 md:h-6" /></div>
                                                <div>
                                                    <h2 className="text-lg md:text-xl font-serif-premium font-bold text-foreground italic tracking-tighter uppercase leading-none lowercase first-letter:uppercase">Ficha</h2>
                                                    <h2 className="text-lg md:text-xl font-serif-premium font-bold text-foreground italic tracking-tighter uppercase leading-none lowercase first-letter:uppercase">Cadastral</h2>
                                                </div>
                                            </div>
                                            <div className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-lg inline-block">
                                                <span className="text-[8px] md:text-[10px] font-black text-primary uppercase tracking-widest">{isPF ? 'Pessoa Física' : 'Pessoa Jurídica'}</span>
                                            </div>
                                        </div>

                                        <nav className="flex md:flex-col overflow-x-auto md:overflow-x-visible p-4 md:p-8 md:pt-0 gap-2 md:gap-3 scrollbar-hide">
                                            {navItems.map((item) => (
                                                <button key={item.id} onClick={() => setActiveTab(item.id as TabType)}
                                                    className={cn("flex-none md:w-full flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl md:rounded-2xl transition-all border",
                                                        activeTab === item.id ? "bg-panel border-panel-border shadow-sm md:scale-105 pointer-events-none" : "hover:bg-black/5 dark:hover:bg-white/5 border-transparent text-text-dim hover:text-foreground")}>
                                                    <div className={cn("w-8 h-8 md:w-9 md:h-9 rounded-lg md:rounded-xl flex items-center justify-center transition-all shrink-0",
                                                        activeTab === item.id ? "bg-primary text-[#0B0B0C]" : "bg-black/5 dark:bg-white/5 text-text-dim")}>
                                                        <item.icon className="w-4 h-4" />
                                                    </div>
                                                    <div className="text-left font-black">
                                                        <div className={cn("text-[9px] md:text-[10px] uppercase tracking-widest whitespace-nowrap", activeTab === item.id ? "text-foreground" : "text-text-dim")}>{item.label}</div>
                                                    </div>
                                                </button>
                                            ))}
                                        </nav>

                                        <div className="p-8 pt-4">
                                            {/* Removed Matrícula Interna from here */}
                                        </div>
                                    </aside>

                                    <div className="flex-1 flex flex-col bg-panel/50 dark:bg-transparent min-w-0">
                                        <header className="px-6 md:px-10 py-4 md:py-6 flex justify-between items-center bg-gradient-to-b from-black/5 dark:from-white/5 to-transparent border-b border-panel-border shrink-0">
                                            <div>
                                                <div className="text-[9px] md:text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-1">Etapa {currentStep}/{navItems.length}</div>
                                                <h3 className="text-xl md:text-2xl font-serif-premium font-bold text-foreground uppercase italic tracking-tighter lowercase first-letter:uppercase">{navItems.find(i => i.id === activeTab)?.label}</h3>
                                            </div>
                                            <button onClick={onClose} className="w-8 h-8 md:w-10 md:h-10 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full flex items-center justify-center text-accent transition-all border border-panel-border"><X className="w-6 h-6" /></button>
                                        </header>

                                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10">
                                            <AnimatePresence mode="wait">
                                                {activeTab === 'basico' && (
                                                    <motion.div key="basico" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                                                        <Input label="Código" value={formData.codigo_interno} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, codigo_interno: e.target.value })} placeholder="AUTO" colSpan="col-span-1" />
                                                        <Input label={isPF ? "Nome Completo" : "Razão Social"} value={formData.nome_completo} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, nome_completo: e.target.value })} colSpan="col-span-1 md:col-span-3" />

                                                        {!isPF && (
                                                            <>
                                                                <Input label="CNPJ" value={formData.documento} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, documento: e.target.value })} colSpan="col-span-1 md:col-span-1" />
                                                                <Input label="Nome Fantasia" value={formData.nome_fantasia} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, nome_fantasia: e.target.value })} colSpan="col-span-1 md:col-span-2" />
                                                                <Input label="Insc. Estadual" value={formData.inscricao_estadual} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, inscricao_estadual: e.target.value })} colSpan="col-span-1 md:col-span-1" />
                                                                <CurrencyInput label="Valor R$" value={formData.valor_aluguel} onChange={(val: number) => setFormData({ ...formData, valor_aluguel: val })} colSpan="col-span-1" />
                                                                <Input label="Pessoa de Contato" value={formData.pessoa_contato} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, pessoa_contato: e.target.value })} colSpan="col-span-1 md:col-span-2" />
                                                                <Input label="FONE CONTATO" value={formData.pessoa_contato_tel} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, pessoa_contato_tel: maskPhone(e.target.value) })} colSpan="col-span-1" />
                                                                <Input label="FAX CONTATO" value={formData.pessoa_contato_fax} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, pessoa_contato_fax: maskPhone(e.target.value) })} colSpan="col-span-1" />
                                                                <Input label="Telefone Filial" value={formData.pessoa_contato_fortaleza_tel} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, pessoa_contato_fortaleza_tel: maskPhone(e.target.value) })} colSpan="col-span-1" />
                                                                <Input label="Fax Filial" value={formData.pessoa_contato_fortaleza_fax} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, pessoa_contato_fortaleza_fax: maskPhone(e.target.value) })} colSpan="col-span-1" />
                                                                <Select label="Prédio Empresa" value={formData.predio_empresa} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, predio_empresa: e.target.value })} options={[{ label: '...', value: '' }, { label: 'Próprio', value: 'Próprio' }, { label: 'Alugado', value: 'Alugado' }]} colSpan="col-span-1" />
                                                                <CurrencyInput label="Valor R$" value={formData.predio_valor_aluguel} onChange={(val: number) => setFormData({ ...formData, predio_valor_aluguel: val })} colSpan="col-span-1" />
                                                                <CurrencyInput label="Renda Mensal Empresa" value={formData.renda_principal} onChange={(val: number) => setFormData({ ...formData, renda_principal: val })} colSpan="col-span-2" />
                                                            </>
                                                        )}

                                                        {isPF && (
                                                            <>
                                                                <Input label="CPF" value={formData.documento} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, documento: e.target.value })} colSpan="col-span-1" />
                                                                <Select label="Sexo" value={formData.sexo} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, sexo: e.target.value })} options={[{ label: 'Selecione', value: '' }, { label: 'Masculino', value: 'Masculino' }, { label: 'Feminino', value: 'Feminino' }]} colSpan="col-span-1" />
                                                                <Input label="Nascimento" value={formData.data_nascimento} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, data_nascimento: e.target.value })} type="date" colSpan="col-span-1 md:col-span-1" />

                                                                <Input label="Identidade (RG)" value={formData.rg} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, rg: e.target.value })} colSpan="col-span-1" />
                                                                <Input label="Órgão" value={formData.orgao_expedidor} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, orgao_expedidor: e.target.value })} colSpan="col-span-1" />
                                                                <Input label="CNH" value={formData.cnh} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, cnh: e.target.value })} colSpan="col-span-1" />
                                                                <Input label="Órgão CNH" value={formData.cnh_orgao_expedidor} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, cnh_orgao_expedidor: e.target.value })} colSpan="col-span-1" />
                                                                <Select label="Estado Civil" value={formData.estado_civil} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, estado_civil: e.target.value })} options={[{ label: 'Solteiro', value: 'Solteiro' }, { label: 'Casado', value: 'Casado' }, { label: 'União estável', value: 'União estável' }, { label: 'Divorciado', value: 'Divorciado' }, { label: 'Viúvo', value: 'Viúvo' }]} colSpan="col-span-1" />
                                                                <Input label="N. Dependentes" value={formData.num_dependentes} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, num_dependentes: e.target.value })} type="number" colSpan="col-span-1" />
                                                                <Input label="Naturalidade" value={formData.naturalidade} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, naturalidade: e.target.value })} colSpan="col-span-1" />
                                                                <Input label="Nacionalidade" value={formData.nacionalidade} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, nacionalidade: e.target.value })} colSpan="col-span-1" />
                                                                <Input label="Mãe / Pai" value={formData.filiacao} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, filiacao: e.target.value })} colSpan="col-span-2 md:col-span-4" />
                                                            </>
                                                        )}

                                                        <Input label="WhatsApp / Cel" value={formData.celular} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, celular: maskPhone(e.target.value) })} colSpan="col-span-1" />
                                                        <Input label="Telefone Fixo" value={formData.telefone} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, telefone: maskPhone(e.target.value) })} colSpan="col-span-1" />
                                                        <Input label="E-mail Principal" value={formData.email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, email: e.target.value })} type="email" colSpan="col-span-2 md:col-span-2" />
                                                        <Select label="Status" value={formData.status || 'Ativo'} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, status: e.target.value })} options={[{ label: 'Ativo', value: 'Ativo' }, { label: 'Inativo', value: 'Inativo' }]} colSpan="col-span-1" />
                                                        <Select label="Papel Cliente" value={formData.papel || 'Locatário'} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, papel: e.target.value })} options={[{ label: 'Locatário', value: 'Locatário' }, { label: 'Locatário e Fiador', value: 'Locatário e Fiador' }, { label: 'Apenas Fiador', value: 'Apenas Fiador' }]} colSpan="col-span-1 md:col-span-1" />
                                                    </motion.div>
                                                )}

                                                {activeTab === 'representantes' && !isPF && (
                                                    <motion.div key="reps" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                                                        <div className="flex items-center justify-between">
                                                            <h4 className="text-xs font-black text-text-dim uppercase tracking-widest">Representantes Legais</h4>
                                                            <button type="button" onClick={addRepresentante} className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest hover:text-foreground transition-all"><PlusCircle className="w-4 h-4" /> Novo Representante</button>
                                                        </div>
                                                        <div className="space-y-4">
                                                            {representantes.map((rep, idx) => (
                                                                <div key={rep.id} className="p-4 md:p-8 bg-black/5 dark:bg-white/5 border border-panel-border rounded-2xl md:rounded-[32px] grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 relative group">
                                                                    <div className="absolute top-4 md:top-8 right-4 md:right-8 text-[8px] md:text-xs text-text-dim">REP #{idx + 1}</div>
                                                                    <div className="col-span-2 md:col-span-2 space-y-2">
                                                                        <label className="text-[10px] font-black text-text-dim uppercase">Nome Completo</label>
                                                                        <input value={rep.nome_completo} onChange={e => { const r = [...representantes]; r[idx].nome_completo = e.target.value; setRepresentantes(r); }} className="w-full bg-panel/50 border border-panel-border rounded-xl py-3 px-5 text-foreground text-[13px] outline-none" />
                                                                    </div>
                                                                    <div className="col-span-1 md:col-span-1 space-y-2">
                                                                        <label className="text-[10px] font-black text-text-dim uppercase">CPF</label>
                                                                        <input value={rep.cpf} onChange={e => { const r = [...representantes]; r[idx].cpf = e.target.value; setRepresentantes(r); }} className="w-full bg-panel/50 border border-panel-border rounded-xl py-3 px-5 text-foreground text-[13px] outline-none" />
                                                                    </div>
                                                                    <div className="col-span-1 md:col-span-1 space-y-2">
                                                                        <label className="text-[10px] font-black text-text-dim uppercase">Ligação</label>
                                                                        <select value={rep.ligacao_empresa} onChange={e => { const r = [...representantes]; r[idx].ligacao_empresa = e.target.value; setRepresentantes(r); }} className="w-full bg-panel/50 border border-panel-border rounded-xl py-3 px-5 text-foreground text-[13px] outline-none">
                                                                            <option value="Sócio">Sócio</option><option value="Procurador">Procurador</option><option value="Diretor">Diretor</option>
                                                                        </select>
                                                                    </div>
                                                                    {representantes.length > 1 && <button onClick={() => setRepresentantes(representantes.filter(r => r.id !== rep.id))} className="absolute -top-3 -right-3 w-8 h-8 bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all border border-rose-500/20"><Trash2 className="w-4 h-4" /></button>}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </motion.div>
                                                )}

                                                {activeTab === 'profissional' && isPF && (
                                                    <motion.div key="pro" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                                                        <Input label="Profissão" value={formData.profissao} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, profissao: e.target.value })} colSpan="col-span-1" />
                                                        <Input label="Atividade" value={formData.atividade} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, atividade: e.target.value })} colSpan="col-span-1 md:col-span-3" />
                                                        <Input label="Empresa Atual" value={formData.empresa_trabalho} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, empresa_trabalho: e.target.value })} colSpan="col-span-2 md:col-span-3" />
                                                        <Input label="Cargo" value={formData.cargo_funcao} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, cargo_funcao: e.target.value })} colSpan="col-span-1" />
                                                        <Input label="Admissão" value={formData.data_admissao} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, data_admissao: e.target.value })} type="date" colSpan="col-span-1 md:col-span-1" />
                                                        <CurrencyInput label="Renda Principal (R$)" value={formData.renda_principal} onChange={(val: number) => setFormData({ ...formData, renda_principal: val })} colSpan="col-span-1" />
                                                        <CurrencyInput label="Outras Rendas (R$)" value={formData.outras_rendas} onChange={(val: number) => setFormData({ ...formData, outras_rendas: val })} colSpan="col-span-1" />
                                                        <Input label="Origem Outras" value={formData.origem_outras_rendas} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, origem_outras_rendas: e.target.value })} colSpan="col-span-2 md:col-span-2" />
                                                    </motion.div>
                                                )}

                                                {activeTab === 'endereco' && (
                                                    <motion.div key="end" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="grid grid-cols-2 md:grid-cols-6 gap-4 md:gap-6">
                                                        <div className="col-span-1 md:col-span-2 space-y-2">
                                                            <label className="text-[10px] font-black text-text-dim uppercase tracking-widest">CEP</label>
                                                            <div className="relative">
                                                                <input value={formData.cep || ""} onChange={handleCepChange} className="w-full bg-panel/50 border border-panel-border rounded-xl py-3 px-5 text-foreground text-xs outline-none focus:border-primary transition-all font-medium" />
                                                                {searchingCep && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />}
                                                            </div>
                                                        </div>
                                                        <Input label="Logradouro" value={formData.logradouro} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, logradouro: e.target.value })} colSpan="col-span-1 md:col-span-4" />
                                                        <Input label="Número" value={formData.numero} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, numero: e.target.value })} colSpan="col-span-1" />
                                                        <Input label="Bairro" value={formData.bairro} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, bairro: e.target.value })} colSpan="col-span-1 md:col-span-2" />
                                                        <Input label="Cidade" value={formData.cidade} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, cidade: e.target.value })} colSpan="col-span-1 md:col-span-2" />
                                                        <Input label="Estado" value={formData.estado} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, estado: e.target.value })} colSpan="col-span-1" />
                                                        <Select label="Residência" value={formData.tipo_residencia} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, tipo_residencia: e.target.value })} colSpan="col-span-1 md:col-span-2" options={[{ label: '...', value: '' }, { label: 'Própria', value: 'Própria' }, { label: 'Alugada', value: 'Alugada' }, { label: 'Financiada', value: 'Financiada' }, { label: 'Com parentes', value: 'Com parentes' }]} />
                                                        {formData.tipo_residencia === 'Alugada' && <CurrencyInput label="Valor Aluguel" value={formData.valor_aluguel} onChange={(val: number) => setFormData({ ...formData, valor_aluguel: val })} colSpan="col-span-1 md:col-span-2" />}
                                                    </motion.div>
                                                )}

                                                {!isPF && activeTab === 'referencias' && (
                                                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                                                        <div className="grid grid-cols-2 gap-8">
                                                            <div className="space-y-4">
                                                                <h5 className="text-[10px] font-black text-primary uppercase tracking-widest">Bancárias / Conta</h5>
                                                                <div className="space-y-4 p-4 md:p-6 bg-black/[0.02] dark:bg-white/[0.02] border border-panel-border rounded-2xl md:rounded-3xl">
                                                                    <Input label="Banco" value={formData.banco_ref} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, banco_ref: e.target.value })} colSpan="col-span-1" />
                                                                    <div className="grid grid-cols-2 gap-4">
                                                                        <Input label="Agência" value={formData.agencia_ref} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, agencia_ref: e.target.value })} colSpan="col-span-1" />
                                                                        <Input label="Conta" value={formData.conta_ref} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, conta_ref: e.target.value })} colSpan="col-span-1" />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="space-y-4">
                                                                <h5 className="text-[10px] font-black text-primary uppercase tracking-widest">Comerciais / Imobiliárias</h5>
                                                                <div className="space-y-4 p-4 md:p-6 bg-black/[0.02] dark:bg-white/[0.02] border border-panel-border rounded-2xl md:rounded-3xl">
                                                                    <Input label="Empresa/Imob" value={formData.comercial_ref} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, comercial_ref: e.target.value })} colSpan="col-span-1" />
                                                                    <Input label="Fone" value={formData.comercial_tel} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, comercial_tel: maskPhone(e.target.value) })} colSpan="col-span-1" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )}

                                                {!isPF && activeTab === 'bens' && (
                                                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                                                        <div className="grid grid-cols-2 gap-8">
                                                            <div className="space-y-4">
                                                                <h5 className="text-[10px] font-black text-primary uppercase tracking-widest">Imóveis</h5>
                                                                <div className="space-y-4 p-4 md:p-6 bg-black/5 dark:bg-white/5 border border-panel-border rounded-2xl md:rounded-3xl">
                                                                    <Input label="Endereço Imóvel" value={formData.imovel_ref_end} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, imovel_ref_end: e.target.value })} colSpan="col-span-1" />
                                                                    <CurrencyInput label="Valor Estimado" value={formData.imovel_ref_val} onChange={(val: number) => setFormData({ ...formData, imovel_ref_val: val })} colSpan="col-span-1" />
                                                                </div>
                                                            </div>
                                                            <div className="space-y-4">
                                                                <h5 className="text-[10px] font-black text-primary uppercase tracking-widest">Veículos</h5>
                                                                <div className="space-y-4 p-4 md:p-6 bg-black/5 dark:bg-white/5 border border-panel-border rounded-2xl md:rounded-3xl">
                                                                    <div className="grid grid-cols-2 gap-4">
                                                                        <Input label="Marca/Placa" value={formData.veiculo_ref_placa} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, veiculo_ref_placa: e.target.value })} colSpan="col-span-1" />
                                                                        <CurrencyInput label="Valor R$" value={formData.veiculo_ref_val} onChange={(val: number) => setFormData({ ...formData, veiculo_ref_val: val })} colSpan="col-span-1" />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <CurrencyInput label="Outros Bens (R$)" value={formData.bens_outros_valor} onChange={(val: number) => setFormData({ ...formData, bens_outros_valor: val })} colSpan="col-span-1 md:col-span-1" />
                                                    </motion.div>
                                                )}

                                                {isPF && showConjugeTab && activeTab === 'conjuge' && (
                                                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                                                        <Input label="Nome Cônjuge" value={formData.conjuge_nome} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, conjuge_nome: e.target.value })} colSpan="col-span-2 md:col-span-3" />
                                                        <Input label="Nascimento" value={formData.conjuge_data_nascimento} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, conjuge_data_nascimento: e.target.value })} type="date" colSpan="col-span-1 md:col-span-1" />
                                                        <Input label="CPF Cônjuge" value={formData.conjuge_cpf} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, conjuge_cpf: e.target.value })} colSpan="col-span-1" />
                                                        <Input label="Profissão" value={formData.conjuge_profissao} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, conjuge_profissao: e.target.value })} colSpan="col-span-1" />
                                                        <CurrencyInput label="Renda Mensal" value={formData.conjuge_renda} onChange={(val: number) => setFormData({ ...formData, conjuge_renda: val })} colSpan="col-span-1" />
                                                        <Input label="WhatsApp" value={formData.conjuge_celular} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, conjuge_celular: maskPhone(e.target.value) })} colSpan="col-span-1" />
                                                    </motion.div>
                                                )}

                                                {activeTab === 'documentos' && (
                                                    <motion.div key="doc" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                                                        className={cn("grid gap-4 md:gap-6 pb-10",
                                                            showConjugeTab ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
                                                        )}>

                                                        {/* Selfie Box First */}
                                                        <div className="p-8 bg-black/[0.02] dark:bg-white/[0.02] border border-panel-border rounded-[40px] space-y-6 flex flex-col items-center border-white/20">
                                                            <h4 className="text-xs font-black text-white uppercase italic tracking-widest text-center">Selfie / Foto</h4>
                                                            <input type="file" id="uSelf" className="hidden" accept=".jpg,.jpeg,.png,.pdf" onChange={e => {
                                                                const file = e.target.files?.[0];
                                                                if (file && handleFileValidation(file)) {
                                                                    setSelfie(file);
                                                                }
                                                            }} />
                                                            <label htmlFor="uSelf" onClick={(e) => { if (selfie || formData.selfie_url) { e.preventDefault(); openViewer(selfie, formData.selfie_url, selfie ? selfie.name : 'Selfie', 'selfie', setSelfie); } }} className="w-full h-32 border-2 border-dashed border-accent/20 rounded-[32px] flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-accent transition-all font-black text-[10px] uppercase text-accent/50 tracking-widest text-center px-4">
                                                                <Upload className="w-6 h-6 mb-2" /> {selfie ? selfie.name : (formData.selfie_url ? "Arquivo já enviado" : "Anexar Selfie")}
                                                            </label>
                                                            {(selfie || formData.selfie_url) && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        if (selfie) setSelfie(null);
                                                                        else if (formData.selfie_url) handleDeleteFile('selfie', formData.selfie_url);
                                                                    }}
                                                                    className="absolute -top-3 -right-3 w-8 h-8 bg-black border border-rose-500/30 text-rose-500 rounded-full flex items-center justify-center hover:bg-rose-500 hover:text-foreground transition-all shadow-xl z-20">
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>

                                                        <div className="p-8 bg-black/5 dark:bg-white/5 border border-panel-border rounded-[40px] space-y-6 flex flex-col items-center group relative">
                                                            <h4 className="text-xs font-black text-foreground uppercase italic tracking-widest text-center">{isPF ? "RG / CNH" : "Contrato Social"}</h4>
                                                            <input type="file" id="uId" className="hidden" accept=".jpg,.jpeg,.png,.pdf" onChange={e => {
                                                                const file = e.target.files?.[0];
                                                                if (file && handleFileValidation(file)) setDocIdentidade(file);
                                                            }} />
                                                            <label htmlFor="uId" onClick={(e) => { if (docIdentidade || formData.documento_identidade_url) { e.preventDefault(); openViewer(docIdentidade, formData.documento_identidade_url, docIdentidade ? docIdentidade.name : 'Identidade', 'identidade', setDocIdentidade); } }} className="w-full h-32 border-2 border-dashed border-panel-border rounded-[32px] flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-white transition-all font-black text-[10px] uppercase text-text-dim tracking-widest text-center px-4">
                                                                <Upload className="w-6 h-6 mb-2" /> {docIdentidade ? docIdentidade.name : (formData.documento_identidade_url ? "Arquivo já enviado" : (isPF ? "Anexar RG / CNH" : "Anexar Contrato"))}
                                                            </label>
                                                            {(docIdentidade || formData.documento_identidade_url) && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        if (docIdentidade) setDocIdentidade(null);
                                                                        else if (formData.documento_identidade_url) handleDeleteFile('identidade', formData.documento_identidade_url);
                                                                    }}
                                                                    className="absolute -top-3 -right-3 w-8 h-8 bg-black border border-rose-500/30 text-rose-500 rounded-full flex items-center justify-center hover:bg-rose-500 hover:text-foreground transition-all shadow-xl z-20">
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            )}

                                                            {docIdentidade && (
                                                                <button onClick={() => handleOCR(docIdentidade)} disabled={ocrLoading}
                                                                    className="absolute -bottom-4 bg-primary text-[#0B0B0C] px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2 hover:scale-105 transition-all disabled:opacity-50">
                                                                    {ocrLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Scan className="w-3 h-3" />}
                                                                    {ocrLoading ? "Lendo..." : "Escanear Documento"}
                                                                </button>
                                                            )}
                                                        </div>

                                                        {isPF && showConjugeTab && (
                                                            <div className="p-8 bg-black/[0.02] dark:bg-white/[0.02] border border-panel-border rounded-[40px] space-y-6 flex flex-col items-center border-primary/20 relative group">
                                                                <h4 className="text-xs font-black text-primary uppercase italic tracking-widest text-center">RG / CNH Cônjuge</h4>
                                                                <input type="file" id="uConj" className="hidden" accept=".jpg,.jpeg,.png,.pdf" onChange={e => {
                                                                    const file = e.target.files?.[0];
                                                                    if (file && handleFileValidation(file)) setDocConjuge(file);
                                                                }} />
                                                                <label htmlFor="uConj" onClick={(e) => { if (docConjuge || formData.documento_conjuge_url) { e.preventDefault(); openViewer(docConjuge, formData.documento_conjuge_url, docConjuge ? docConjuge.name : 'Documento Conjuge', 'conjuge', setDocConjuge); } }} className="w-full h-32 border-2 border-dashed border-primary/20 rounded-[32px] flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-white transition-all font-black text-[10px] uppercase text-primary/50 tracking-widest text-center px-4">
                                                                    <Upload className="w-6 h-6 mb-2" /> {docConjuge ? docConjuge.name : (formData.documento_conjuge_url ? "Arquivo já enviado" : "Anexar RG / CNH Cônjuge")}
                                                                </label>
                                                                {(docConjuge || formData.documento_conjuge_url) && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            if (docConjuge) setDocConjuge(null);
                                                                            else if (formData.documento_conjuge_url) handleDeleteFile('conjuge', formData.documento_conjuge_url);
                                                                        }}
                                                                        className="absolute -top-3 -right-3 w-8 h-8 bg-black border border-rose-500/30 text-rose-500 rounded-full flex items-center justify-center hover:bg-rose-500 hover:text-foreground transition-all shadow-xl z-20">
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                )}

                                                                {docConjuge && (
                                                                    <button onClick={() => handleOCR(docConjuge)} disabled={ocrLoading}
                                                                        className="absolute -bottom-4 bg-primary text-[#0B0B0C] px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2 hover:scale-105 transition-all disabled:opacity-50">
                                                                        {ocrLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Scan className="w-3 h-3" />}
                                                                        {ocrLoading ? "Lendo..." : "Escanear Documento"}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}

                                                        <div className="p-8 bg-black/[0.02] dark:bg-white/[0.02] border border-panel-border rounded-[40px] space-y-6 flex flex-col items-center border-primary/20 relative group">
                                                            <h4 className="text-xs font-black text-primary uppercase italic tracking-widest text-center">Comprovante de Renda</h4>
                                                            <input type="file" id="uRenda" className="hidden" accept=".jpg,.jpeg,.png,.pdf" onChange={e => {
                                                                const file = e.target.files?.[0];
                                                                if (file && handleFileValidation(file)) setCompRenda(file);
                                                            }} />
                                                            <label htmlFor="uRenda" onClick={(e) => { if (compRenda || formData.comprovante_renda_url) { e.preventDefault(); openViewer(compRenda, formData.comprovante_renda_url, compRenda ? compRenda.name : 'Comprovante Renda', 'renda', setCompRenda); } }} className="w-full h-32 border-2 border-dashed border-primary/20 rounded-[32px] flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-white transition-all font-black text-[10px] uppercase text-primary/50 tracking-widest text-center px-4">
                                                                <Upload className="w-6 h-6 mb-2" /> {compRenda ? compRenda.name : (formData.comprovante_renda_url ? "Arquivo já enviado" : "Anexar Comprovante Renda")}
                                                            </label>
                                                            {(compRenda || formData.comprovante_renda_url) && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        if (compRenda) setCompRenda(null);
                                                                        else if (formData.comprovante_renda_url) handleDeleteFile('renda', formData.comprovante_renda_url);
                                                                    }}
                                                                    className="absolute -top-3 -right-3 w-8 h-8 bg-black border border-rose-500/30 text-rose-500 rounded-full flex items-center justify-center hover:bg-rose-500 hover:text-foreground transition-all shadow-xl z-20">
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>

                                                        <div className="p-8 bg-black/[0.02] dark:bg-white/[0.02] border border-panel-border rounded-[40px] space-y-6 flex flex-col items-center">
                                                            <h4 className="text-xs font-black text-foreground uppercase italic tracking-widest text-center">Endereço / Outros</h4>
                                                            <input type="file" id="uRes" className="hidden" accept=".jpg,.jpeg,.png,.pdf" onChange={e => {
                                                                const file = e.target.files?.[0];
                                                                if (file && handleFileValidation(file)) setCompResidencia(file);
                                                            }} />
                                                            <label htmlFor="uRes" onClick={(e) => { if (compResidencia || formData.comprovante_residencia_url) { e.preventDefault(); openViewer(compResidencia, formData.comprovante_residencia_url, compResidencia ? compResidencia.name : 'Comprovante Endereço', 'residencia', setCompResidencia); } }} className="w-full h-32 border-2 border-dashed border-white/10 rounded-[32px] flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-white transition-all font-black text-[10px] uppercase text-text-dim tracking-widest text-center px-4">
                                                                <Upload className="w-6 h-6 mb-2" /> {compResidencia ? compResidencia.name : (formData.comprovante_residencia_url ? "Arquivo já enviado" : "Anexar Comprovante")}
                                                            </label>
                                                            {(compResidencia || formData.comprovante_residencia_url) && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        if (compResidencia) setCompResidencia(null);
                                                                        else if (formData.comprovante_residencia_url) handleDeleteFile('residencia', formData.comprovante_residencia_url);
                                                                    }}
                                                                    className="absolute -top-3 -right-3 w-8 h-8 bg-black border border-rose-500/30 text-rose-500 rounded-full flex items-center justify-center hover:bg-rose-500 hover:text-foreground transition-all shadow-xl z-20">
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            {/* OCR Result Overlay */}
                                            <AnimatePresence>
                                                {ocrResult && (
                                                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                                                        className="absolute inset-x-10 bottom-32 bg-primary rounded-[32px] p-8 shadow-2xl z-50 flex flex-col md:flex-row items-center justify-between gap-6 border border-white/20 backdrop-blur-xl">
                                                        <div className="flex items-center gap-5">
                                                            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shrink-0"><Sparkles className="w-7 h-7 text-foreground" /></div>
                                                            <div>
                                                                <h4 className="text-lg font-black text-foreground uppercase italic leading-none">Dados Identificados!</h4>
                                                                <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest mt-1 opacity-80">Encontramos informações que podem preencher o formulário.</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex bg-white/10 rounded-2xl p-4 gap-6 overflow-x-auto">
                                                            {ocrResult.extractedData.name && <div className="shrink-0"><span className="block text-[8px] font-black text-blue-200 uppercase">Nome</span><span className="text-xs font-bold text-foreground uppercase">{ocrResult.extractedData.name}</span></div>}
                                                            {(ocrResult.extractedData.cpf || ocrResult.extractedData.cnpj) && <div className="shrink-0"><span className="block text-[8px] font-black text-blue-200 uppercase">Documento</span><span className="text-xs font-bold text-foreground">{ocrResult.extractedData.cpf || ocrResult.extractedData.cnpj}</span></div>}
                                                            {ocrResult.extractedData.rg && <div className="shrink-0"><span className="block text-[8px] font-black text-blue-200 uppercase">RG</span><span className="text-xs font-bold text-foreground">{ocrResult.extractedData.rg}</span></div>}
                                                        </div>
                                                        <div className="flex gap-3">
                                                            <button onClick={() => setOcrResult(null)} className="px-6 py-3 rounded-xl text-[10px] font-black text-foreground uppercase tracking-widest hover:bg-black/10 dark:hover:bg-white/10 transition-all">Descartar</button>
                                                            <button onClick={applyOCR} className="bg-white text-blue-600 px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-all flex items-center gap-2"><Wand2 className="w-4 h-4" /> Preencher Ficha</button>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        <footer className="p-6 md:p-10 border-t border-panel-border bg-panel/50 dark:bg-transparent flex items-center shrink-0">
                                            <div className="flex gap-3 md:gap-4">
                                                <button type="button" onClick={() => {
                                                    const prev = navItems[navItems.findIndex(i => i.id === activeTab) - 1];
                                                    if (prev) setActiveTab(prev.id as TabType);
                                                    else setStep(0);
                                                }} className="px-4 md:px-8 py-3 md:py-4 rounded-xl font-black text-[9px] md:text-[10px] text-accent hover:bg-black/5 dark:hover:bg-white/5 uppercase tracking-[0.2em] md:tracking-[0.3em] transition-all border border-panel-border">Voltar</button>
                                            </div>
                                            <div className="flex-1" />
                                            <div className="flex gap-3 md:gap-4">
                                                {activeTab !== navItems[navItems.length - 1].id ? (
                                                    <button type="button" onClick={() => {
                                                        const next = navItems[navItems.findIndex(i => i.id === activeTab) + 1];
                                                        if (next) setActiveTab(next.id as TabType);
                                                    }} className="btn-elite px-4 md:px-10 py-3 md:py-4 flex items-center gap-2 md:gap-4 transition-all text-[9px] md:text-sm font-black uppercase tracking-widest group">Próximo <ChevronRight className="w-4 h-4" /></button>
                                                ) : (
                                                    <button type="submit" disabled={loading} className="btn-elite px-4 md:px-10 py-3 md:py-4 flex items-center gap-2 md:gap-4 transition-all disabled:opacity-50 text-[9px] md:text-sm font-black uppercase tracking-widest group">
                                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Finalizar <CheckCircle2 className="w-4 h-4" /></>}
                                                    </button>
                                                )}
                                            </div>
                                        </footer>
                                    </div>
                                </>
                            )}
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
