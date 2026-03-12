"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Save, Upload, Image as ImageIcon, FileText, Trash2, UserPlus, Lock, Mail, Shield, User, Loader2, List, Calendar, Database } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { compressAndConvertToWebP } from "@/lib/imageUtils";
import { logAction } from "@/lib/logUtils";
import { supabaseStorage } from "@/lib/supabaseStorage";

const applyDateMask = (value: string) => {
    let val = value.replace(/\D/g, "");
    if (val.length > 8) val = val.slice(0, 8);

    if (val.length <= 2) return val;
    if (val.length <= 4) return `${val.slice(0, 2)}/${val.slice(2)}`;
    return `${val.slice(0, 2)}/${val.slice(2, 4)}/${val.slice(4, 8)}`;
};

export default function ConfiguracoesPage() {
    const [loading, setLoading] = useState(false);
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [rodapeUrl, setRodapeUrl] = useState<string | null>(null);
    const [heroBgDesktopUrl, setHeroBgDesktopUrl] = useState<string | null>(null);
    const [heroBgMobileUrl, setHeroBgMobileUrl] = useState<string | null>(null);
    const [rodapeTexto, setRodapeTexto] = useState("");
    const [configId, setConfigId] = useState<string | null>(null);
    const [iptuDataInicio, setIptuDataInicio] = useState("15/01/2026");
    const [iptuDataFim, setIptuDataFim] = useState("15/03/2026");
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Profile State
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

    // User Creation State
    const [newUserName, setNewUserName] = useState('');
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserRole, setNewUserRole] = useState<'admin' | 'operador'>('operador');
    const [isCreatingUser, setIsCreatingUser] = useState(false);

    // Logs State
    const [actionLogs, setActionLogs] = useState<any[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);

    useEffect(() => {
        fetchSettings();

        const fetchUserProfile = async (session: any) => {
            if (session?.user) {
                const { data } = await supabase
                    .from('profile')
                    .select('role')
                    .eq('id', session.user.id)
                    .single();
                if (data) {
                    setCurrentUserRole(data.role);
                    if (data.role === 'admin') {
                        fetchActionLogs();
                    }
                }
            } else {
                setCurrentUserRole(null);
            }
        };

        // Listen to auth state changes to ensure we have the session even if it loads a bit later
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            fetchUserProfile(session);
        });

        // Initial fetch just in case the event doesn't fire immediately
        supabase.auth.getSession().then(({ data: { session } }) => {
            fetchUserProfile(session);
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('configuracoes')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (data) {
            setConfigId(data.id);
            setLogoUrl(data.logo_url);
            setRodapeUrl(data.rodape_url);
            setHeroBgDesktopUrl(data.hero_bg_desktop_url);
            setHeroBgMobileUrl(data.hero_bg_mobile_url);
            setRodapeTexto(data.rodape_texto || "");
            setIptuDataInicio(data.iptu_data_inicio || "15/01/2026");
            setIptuDataFim(data.iptu_data_fim || "15/03/2026");
        }
        setLoading(false);
    };

    const fetchActionLogs = async () => {
        setLoadingLogs(true);
        try {
            const { data, error } = await supabase
                .from('action_logs')
                .select(`
                    id,
                    action,
                    details,
                    created_at,
                    profile:user_id(email)
                `)
                .order('created_at', { ascending: false })
                .limit(100);

            if (data) {
                // Filtra para remover logs do usuário específico conforme solicitado
                const filteredLogs = data.filter(log => (log.profile as any)?.email !== 'pedro@pedro.com');
                setActionLogs(filteredLogs);
            }
        } catch (error) {
            console.error('Erro ao buscar logs:', error);
        } finally {
            setLoadingLogs(false);
        }
    };

    const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'rodape' | 'heroDesktop' | 'heroMobile') => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setLoading(true);
            setMessage({ type: 'success', text: `Comprimindo ${type}...` });

            // Comprime e converte para WebP
            const webpBlob = await compressAndConvertToWebP(file);
            const webpFile = new File([webpBlob], `${type}_${Date.now()}.webp`, { type: 'image/webp' });

            // Upload para o Supabase Storage
            const fileName = `${Date.now()}_${type}.webp`;
            const { data, error } = await supabaseStorage.storage
                .from('configuracoes')
                .upload(fileName, webpFile);

            if (error) throw error;

            // Pega a URL pública
            const { data: { publicUrl } } = supabaseStorage.storage
                .from('configuracoes')
                .getPublicUrl(fileName);

            if (type === 'logo') {
                setLogoUrl(publicUrl);
            } else if (type === 'rodape') {
                setRodapeUrl(publicUrl);
            } else if (type === 'heroDesktop') {
                setHeroBgDesktopUrl(publicUrl);
            } else if (type === 'heroMobile') {
                setHeroBgMobileUrl(publicUrl);
            }
            setMessage({ type: 'success', text: 'Upload realizado com sucesso!' });
        } catch (error: any) {
            console.error('Erro no upload:', error);
            setMessage({ type: 'error', text: `Erro ao carregar ${type}: ` + error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const payload = {
                logo_url: logoUrl,
                rodape_url: rodapeUrl,
                hero_bg_desktop_url: heroBgDesktopUrl,
                hero_bg_mobile_url: heroBgMobileUrl,
                rodape_texto: rodapeTexto,
                iptu_data_inicio: iptuDataInicio,
                iptu_data_fim: iptuDataFim,
                updated_at: new Date().toISOString()
            };

            let error;
            if (configId) {
                const { error: updateError } = await supabase
                    .from('configuracoes')
                    .update(payload)
                    .eq('id', configId);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('configuracoes')
                    .insert([payload]);
                error = insertError;
            }

            if (error) throw error;
            setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' });
            alert("Configurações salvas com sucesso!");

            await logAction('Atualizou Configurações', 'Alterou identidade visual ou rodapé do sistema.');
        } catch (error: any) {
            console.error('Erro ao salvar:', error);
            setMessage({ type: 'error', text: 'Erro ao salvar configurações' });
        } finally {
            setLoading(false);
            setTimeout(() => setMessage(null), 3000);
        }
    };

    const handleDeleteImage = (type: 'logo' | 'rodape' | 'heroDesktop' | 'heroMobile') => {
        if (type === 'logo') setLogoUrl(null);
        else if (type === 'rodape') setRodapeUrl(null);
        else if (type === 'heroDesktop') setHeroBgDesktopUrl(null);
        else if (type === 'heroMobile') setHeroBgMobileUrl(null);
        setMessage({ type: 'success', text: 'Imagem removida da visualização. Salve para confirmar.' });
        setTimeout(() => setMessage(null), 2000);
    };

    const handleDownloadBackup = async () => {
        setLoading(true);
        setMessage({ type: 'success', text: 'Iniciando geração do backup... Isso pode levar alguns minutos.' });
        try {
            const response = await fetch('/api/backup');
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Falha ao gerar backup');
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const timestamp = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
            a.download = `Backup_Gestimob_${timestamp}.zip`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            
            setMessage({ type: 'success', text: 'Backup baixado com sucesso!' });
            await logAction('Gerou Backup', 'Baixou arquivo compactado com todos os dados e arquivos do sistema.');
        } catch (error: any) {
            console.error('Erro no backup:', error);
            setMessage({ type: 'error', text: 'Erro ao baixar backup: ' + error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreatingUser(true);
        setMessage(null);

        try {
            const { data: { session } } = await supabase.auth.getSession();

            const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-user`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    email: newUserEmail,
                    password: newUserPassword,
                    role: newUserRole,
                    nome: newUserName
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Erro ao criar usuário');
            }

            setMessage({ type: 'success', text: `Usuário (${newUserRole}) criado com sucesso!` });

            await logAction('Criou Novo Usuário', `Email: ${newUserEmail} | Permissão: ${newUserRole}`);

            setNewUserName('');
            setNewUserEmail('');
            setNewUserPassword('');

        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setIsCreatingUser(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-background text-foreground font-sans">
            <Sidebar />
            <main className="flex-1 md:ml-72 p-8">
                <div className="max-w-4xl mx-auto">
                    <header className="mb-10">
                        <h1 className="text-4xl font-serif-premium font-bold tracking-tight lowercase first-letter:uppercase">Configurações do Sistema</h1>
                        <p className="text-accent mt-2">Gerencie a identidade visual e informações do sistema.</p>
                    </header>

                    {message && (
                        <div className={`p-4 rounded-xl mb-6 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 ${message.type === 'success' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
                            }`}>
                            <div className={`w-2 h-2 rounded-full ${message.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
                            {message.text}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Seção Logo */}
                        <div className="bg-panel glass-elite p-8 border border-panel-border shadow-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                    <ImageIcon className="w-5 h-5" />
                                </div>
                                <h2 className="text-xl font-bold">Identidade Visual</h2>
                            </div>

                            <p className="text-sm text-accent mb-6 leading-relaxed">
                                A logo será utilizada nos contratos e cabeçalhos do sistema. Recomendamos fundo transparente.
                            </p>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-accent block mb-2 px-1">Logo Principal</label>
                                <div className="relative group h-24 bg-black/5 dark:bg-white/5 rounded-xl border-2 border-dashed border-panel-border flex items-center justify-center overflow-hidden transition-all hover:border-primary/50">
                                    {logoUrl ? (
                                        <img src={logoUrl} alt="Logo" className="h-full w-full object-contain p-2" />
                                    ) : (
                                        <div className="flex items-center gap-3 text-accent text-xs font-black uppercase tracking-widest">
                                            <Upload className="w-4 h-4" />
                                            Clique para upload da logo
                                        </div>
                                    )}
                                    <label className="absolute inset-0 cursor-pointer flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleUploadImage(e, 'logo')} disabled={loading} />
                                        <div className="flex items-center gap-2 text-white">
                                            <Upload className="w-4 h-4" />
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-white">Alterar Logo</span>
                                        </div>
                                    </label>
                                </div>
                                {logoUrl && (
                                    <button
                                        onClick={() => handleDeleteImage('logo')}
                                        className="w-full text-center mt-2 text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-600 transition-colors"
                                    >
                                        excluir logo
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Seção Rodapé */}
                        <div className="bg-panel glass-elite p-8 border border-panel-border shadow-sm flex flex-col">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-500">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <h2 className="text-xl font-bold">Informações Adicionais</h2>
                            </div>

                            <p className="text-sm text-accent mb-6 leading-relaxed">
                                Defina a imagem que aparecerá no rodapé dos documentos gerados.
                            </p>

                            <div className="space-y-6">

                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-accent block mb-2 px-1">Imagem do Rodapé</label>
                                    <div className="relative group h-24 bg-black/5 dark:bg-white/5 rounded-xl border-2 border-dashed border-panel-border flex items-center justify-center overflow-hidden transition-all hover:border-teal-500/50">
                                        {rodapeUrl ? (
                                            <img src={rodapeUrl} alt="Rodapé" className="h-full w-full object-contain p-2" />
                                        ) : (
                                            <div className="flex items-center gap-3 text-accent text-xs font-black uppercase tracking-widest">
                                                <Upload className="w-4 h-4" />
                                                Clique aqui para upload do rodapé
                                            </div>
                                        )}
                                        <label className="absolute inset-0 cursor-pointer flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleUploadImage(e, 'rodape')} disabled={loading} />
                                            <div className="flex items-center gap-2 text-white">
                                                <Upload className="w-4 h-4" />
                                                <span className="text-[10px] font-bold uppercase tracking-widest">Upload Rodapé</span>
                                            </div>
                                        </label>
                                    </div>
                                    {rodapeUrl && (
                                        <button
                                            onClick={() => handleDeleteImage('rodape')}
                                            className="w-full text-center mt-2 text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-600 transition-colors"
                                        >
                                            excluir imagem do rodapé
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Seção Backgrounds Hero */}
                        <div className="md:col-span-2 bg-panel glass-elite p-8 border border-panel-border shadow-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                    <ImageIcon className="w-5 h-5" />
                                </div>
                                <h2 className="text-xl font-bold">Backgrounds da Landing Page</h2>
                            </div>

                            <p className="text-sm text-accent mb-6 leading-relaxed">
                                Personalize as imagens de fundo da página inicial. Recomenda-se imagens de alta resolução (WebP).
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-accent block mb-2 px-1">Versão Desktop (1920x1080+)</label>
                                    <div className="relative group h-40 bg-black/5 dark:bg-white/5 rounded-xl border-2 border-dashed border-panel-border flex items-center justify-center overflow-hidden transition-all hover:border-indigo-500/50">
                                        {heroBgDesktopUrl ? (
                                            <img src={heroBgDesktopUrl} alt="Background Desktop" className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="flex flex-col items-center gap-2 text-accent text-xs font-black uppercase tracking-widest">
                                                <Upload className="w-5 h-5" />
                                                <span>Upload Desktop</span>
                                            </div>
                                        )}
                                        <label className="absolute inset-0 cursor-pointer flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleUploadImage(e, 'heroDesktop')} disabled={loading} />
                                            <div className="flex items-center gap-2 text-white">
                                                <Upload className="w-4 h-4" />
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-white">Alterar Desktop</span>
                                            </div>
                                        </label>
                                    </div>
                                    {heroBgDesktopUrl && (
                                        <button
                                            onClick={() => handleDeleteImage('heroDesktop')}
                                            className="w-full text-center mt-2 text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-600 transition-colors"
                                        >
                                            remover imagem
                                        </button>
                                    )}
                                </div>

                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-accent block mb-2 px-1">Versão Mobile (Vertical)</label>
                                    <div className="relative group h-40 bg-black/5 dark:bg-white/5 rounded-xl border-2 border-dashed border-panel-border flex items-center justify-center overflow-hidden transition-all hover:border-indigo-500/50">
                                        {heroBgMobileUrl ? (
                                            <img src={heroBgMobileUrl} alt="Background Mobile" className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="flex flex-col items-center gap-2 text-accent text-xs font-black uppercase tracking-widest">
                                                <Upload className="w-5 h-5" />
                                                <span>Upload Mobile</span>
                                            </div>
                                        )}
                                        <label className="absolute inset-0 cursor-pointer flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleUploadImage(e, 'heroMobile')} disabled={loading} />
                                            <div className="flex items-center gap-2 text-white">
                                                <Upload className="w-4 h-4" />
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-white">Alterar Mobile</span>
                                            </div>
                                        </label>
                                    </div>
                                    {heroBgMobileUrl && (
                                        <button
                                            onClick={() => handleDeleteImage('heroMobile')}
                                            className="w-full text-center mt-2 text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-600 transition-colors"
                                        >
                                            remover imagem
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Seção IPTU (Apenas Admin) */}
                    {currentUserRole === 'admin' && (
                        <div className="mt-8 bg-panel glass-elite p-8 border border-panel-border shadow-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                                    <Calendar className="w-5 h-5" />
                                </div>
                                <h2 className="text-xl font-bold">Lembrete de IPTU</h2>
                            </div>

                            <p className="text-sm text-accent mb-6 leading-relaxed">
                                Defina o período em que o lembrete de pagamento do IPTU deve aparecer no Dashboard (ex: 15/01 a 15/03).
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-black/5 dark:bg-white/5 p-6 rounded-2xl border border-panel-border">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-accent block px-1">Exibir a partir de (Dia/Mês/Ano)</label>
                                    <input
                                        type="text"
                                        placeholder="DD/MM/AAAA (ex: 15/01/2026)"
                                        value={iptuDataInicio}
                                        onChange={e => setIptuDataInicio(applyDateMask(e.target.value))}
                                        className="w-full bg-background border border-panel-border rounded-xl py-3 px-4 text-[13px] focus:outline-none focus:border-rose-500 transition-colors"
                                    />
                                    <p className="text-[10px] text-accent/60 pl-1 italic">Use o formato Dia/Mês/Ano (ex: 15/01/2026)</p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-accent block px-1">Ocultar após (Dia/Mês/Ano)</label>
                                    <input
                                        type="text"
                                        placeholder="DD/MM/AAAA (ex: 15/03/2026)"
                                        value={iptuDataFim}
                                        onChange={e => setIptuDataFim(applyDateMask(e.target.value))}
                                        className="w-full bg-background border border-panel-border rounded-xl py-3 px-4 text-[13px] focus:outline-none focus:border-rose-500 transition-colors"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end mt-6">
                                <button
                                    onClick={handleSave}
                                    disabled={loading}
                                    className="btn-elite px-6 py-2 flex items-center gap-2 text-xs"
                                >
                                    {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                    Registrar Período
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Secão de Usuários (Apenas Admin) */}
                    {currentUserRole === 'admin' && (
                        <div className="mt-8 bg-panel glass-elite p-8 border border-panel-border shadow-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                    <UserPlus className="w-5 h-5" />
                                </div>
                                <h2 className="text-xl font-bold">Gestão de Usuários</h2>
                            </div>

                            <p className="text-sm text-accent mb-6 leading-relaxed">
                                Crie novos acessos para a plataforma. Operadores têm acesso reduzido. Admins têm acesso total.
                            </p>

                            <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-black/5 dark:bg-white/5 p-6 rounded-2xl border border-panel-border">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-accent block px-1">Nome</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-accent" />
                                        <input
                                            required
                                            value={newUserName}
                                            onChange={e => setNewUserName(e.target.value)}
                                            className="w-full bg-background border border-panel-border rounded-xl py-3 pl-11 pr-5 text-[13px] focus:outline-none focus:border-primary transition-colors"
                                            placeholder="Nome completo"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-accent block px-1">E-mail</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-accent" />
                                        <input
                                            required
                                            type="email"
                                            value={newUserEmail}
                                            onChange={e => setNewUserEmail(e.target.value)}
                                            className="w-full bg-background border border-panel-border rounded-xl py-3 pl-11 pr-5 text-[13px] focus:outline-none focus:border-primary transition-colors"
                                            placeholder="admin@imobiliaria.com"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-accent block px-1">Senha Privisória</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-accent" />
                                        <input
                                            required
                                            type="password"
                                            value={newUserPassword}
                                            onChange={e => setNewUserPassword(e.target.value)}
                                            className="w-full bg-background border border-panel-border rounded-xl py-3 pl-11 pr-5 text-[13px] focus:outline-none focus:border-primary transition-colors"
                                            placeholder="••••••"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-accent block px-1">Permissão (Role)</label>
                                    <div className="relative">
                                        <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-accent" />
                                        <select
                                            value={newUserRole}
                                            onChange={e => setNewUserRole(e.target.value as 'admin' | 'operador')}
                                            className="w-full bg-background border border-panel-border rounded-xl py-3 pl-11 pr-5 text-[13px] focus:outline-none focus:border-primary transition-colors cursor-pointer appearance-none"
                                        >
                                            <option value="operador">Operador</option>
                                            <option value="admin">Administrador</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="md:col-span-2 flex justify-end mt-2">
                                    <button
                                        type="submit"
                                        disabled={isCreatingUser}
                                        className="btn-elite px-8 py-3 flex items-center gap-2 transition-all disabled:opacity-50"
                                    >
                                        {isCreatingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                                        Criar Conta
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Seção Log de Ações (Apenas Admin) */}
                    {currentUserRole === 'admin' && (
                        <>
                            <div className="mt-8 bg-panel glass-elite p-8 border border-panel-border shadow-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                                        <Database className="w-5 h-5" />
                                    </div>
                                    <h2 className="text-xl font-bold">Segurança e Backup</h2>
                                </div>

                                <p className="text-sm text-accent mb-6 leading-relaxed">
                                    Baixe um arquivo compactado (.zip) contendo todas as planilhas de dados (Excel) e os anexos (Documentos, Fotos) salvos no servidor.
                                </p>

                                <div className="bg-black/5 dark:bg-white/5 p-6 rounded-2xl border border-panel-border flex flex-col md:flex-row items-center justify-between gap-4">
                                    <div className="flex items-center gap-4 text-accent">
                                        <div className="p-3 bg-blue-500/5 rounded-full">
                                            <Shield className="w-6 h-6 text-blue-500" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-foreground">Backup Completo</h3>
                                            <p className="text-[10px] uppercase font-black tracking-widest">Planilhas XLSX + Anexos ZIP</p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleDownloadBackup}
                                        disabled={loading}
                                        className="btn-elite px-6 py-3 flex items-center gap-2 text-xs bg-blue-500 hover:bg-blue-600 border-none shadow-blue-500/20"
                                    >
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                                        Baixar Backup (.zip)
                                    </button>
                                </div>
                            </div>

                            <div className="mt-8 bg-panel glass-elite p-8 border border-panel-border shadow-sm">
                                <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                                        <List className="w-5 h-5" />
                                    </div>
                                    <h2 className="text-xl font-bold">Log de Ações (Auditoria)</h2>
                                </div>
                                <button onClick={fetchActionLogs} disabled={loadingLogs} className="text-xs font-bold text-accent hover:text-foreground transition-colors">
                                    Atualizar Logs
                                </button>
                            </div>

                            <p className="text-sm text-accent mb-6 leading-relaxed">
                                Histórico das últimas 100 ações críticas realizadas no sistema.
                            </p>

                            <div className="bg-black/5 dark:bg-white/5 rounded-2xl border border-panel-border overflow-hidden">
                                {loadingLogs ? (
                                    <div className="flex justify-center py-10">
                                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                    </div>
                                ) : actionLogs.length === 0 ? (
                                    <div className="text-center py-10 text-accent font-medium text-sm">
                                        Nenhum log registrado ainda.
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto max-h-[480px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="sticky top-0 z-20 bg-[#161617] dark:bg-[#121213] shadow-sm">
                                                <tr className="border-b border-panel-border text-[10px] uppercase font-black tracking-widest text-accent">
                                                    <th className="px-4 py-2 font-black">Data/Hora</th>
                                                    <th className="px-4 py-2 font-black">Usuário</th>
                                                    <th className="px-4 py-2 font-black">Ação</th>
                                                    <th className="px-4 py-2 font-black">Detalhes</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-xs">
                                                {actionLogs.map((log) => (
                                                    <tr key={log.id} className="border-b border-panel-border/50 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                                        <td className="px-4 py-2 whitespace-nowrap text-accent/80">
                                                            <div className="flex items-center gap-2">
                                                                <Calendar className="w-3 h-3" />
                                                                {new Date(log.created_at).toLocaleString('pt-BR')}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2 font-bold text-foreground">
                                                            {log.profile?.email || 'Usuário Deletado'}
                                                        </td>
                                                        <td className="px-4 py-2 font-black text-primary">
                                                            {log.action}
                                                        </td>
                                                        <td className="px-4 py-2 text-accent max-w-[300px] truncate" title={log.details}>
                                                            {log.details || '---'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                        </>
                    )}

                    <div className="mt-10 flex justify-end">
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="btn-elite px-10 py-4 rounded-2xl text-sm flex items-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shadow-xl"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Save className="w-5 h-5" />
                            )}
                            Salvar Configurações
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
