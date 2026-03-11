"use client";

import { Sidebar } from "@/components/Sidebar";
import Link from "next/link";
import {
    Users,
    Home,
    FileText,
    Clock,
    ArrowUpRight,
    TrendingUp,
    Calendar,
    Mail,
    AlertCircle,
    Search,
    Loader2,
    Building2,
    UserSquare2,
    DollarSign
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { AlertDrawer } from "@/components/Dashboard/AlertDrawer";
import { ClientDetailsModal } from "@/components/Dashboard/ClientDetailsModal";
import { cn } from "@/lib/utils";

const dashboardCards = [
    { id: 'urgencias', label: "Urgências", icon: AlertCircle },
    { id: 'imoveis', label: "Total de Imóveis", icon: Home },
    { id: 'contratos', label: "Contratos", icon: FileText },
    { id: 'clientes', label: "Total de Clientes", icon: Users },
];

export default function DashboardPage() {
    const [counts, setCounts] = useState({
        clientes: 0,
        clientesAtivosCount: 0,
        imoveis: 0,
        imoveisAlugados: 0,
        imoveisDisponiveis: 0,
        ativos: 0,
        vencendo: 0,
        contratosTotal: 0,
        contratosPendentes: 0
    });

    const [iptuConfig, setIptuConfig] = useState({
        inicio: '15/01/2026',
        fim: '15/03/2026'
    });

    const [activeClientsList, setActiveClientsList] = useState<any[]>([]);
    const [selectedClient, setSelectedClient] = useState<any>(null);
    const [isClientDetailsOpen, setIsClientDetailsOpen] = useState(false);

    // Alert Hub State
    const [alertHub, setAlertHub] = useState({
        utility: [] as any[],
        upcoming: [] as any[],
        overdue: [] as any[]
    });

    const [drawer, setDrawer] = useState({
        isOpen: false,
        title: "",
        type: 'utility' as 'utility' | 'upcoming' | 'overdue' | 'clients',
        items: [] as any[]
    });

    // Search State
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        const delaySearch = setTimeout(() => {
            if (searchQuery.trim().length >= 2) {
                performSearch(searchQuery.trim());
            } else {
                setSearchResults([]);
                setIsSearching(false);
            }
        }, 500);

        return () => clearTimeout(delaySearch);
    }, [searchQuery]);

    async function performSearch(query: string) {
        setIsSearching(true);
        const upperQuery = query.toUpperCase();
        try {
            // Caso Especial: E-mail Enviado
            if (upperQuery === "E-MAIL ENVIADO" || upperQuery === "EMAIL ENVIADO" || upperQuery === "EMAILS ENVIADOS") {
                const { data: comms } = await supabase
                    .from('historico_comunicacoes')
                    .select('*, clientes(nome_completo), proprietarios(nome_completo)')
                    .order('created_at', { ascending: false });

                const results = (comms || []).map(item => ({
                    id: item.id,
                    type: 'Comunicação',
                    title: item.assunto,
                    subtitle: `Enviado para: ${item.clientes?.nome_completo || item.proprietarios?.nome_completo || 'N/A'} em ${new Date(item.created_at).toLocaleDateString('pt-BR')}`,
                    href: item.locatario_id ? `/clientes?id=${item.locatario_id}` : `/proprietarios?id=${item.proprietario_id}`,
                    icon: Mail
                }));
                setSearchResults(results);
                return;
            }

            const results: any[] = [];
            const digitsOnly = query.replace(/\D/g, "");
            const fuzzyQuery = digitsOnly.length >= 3 ? `%${digitsOnly.split('').join('%')}%` : null;

            // Clientes, Proprietários e Empresas (Filtros Numéricos)
            let clFilter = `nome_completo.ilike.%${query}%,documento.ilike.%${query}%,email.ilike.%${query}%,celular.ilike.%${query}%,telefone.ilike.%${query}%`;
            let prFilter = `nome_completo.ilike.%${query}%,documento.ilike.%${query}%,email.ilike.%${query}%,telefone.ilike.%${query}%`;
            let emFilter = `nome_fantasia.ilike.%${query}%,cnpj.ilike.%${query}%,email.ilike.%${query}%,telefone.ilike.%${query}%`;

            if (fuzzyQuery) {
                clFilter += `,documento.ilike.${fuzzyQuery},celular.ilike.${fuzzyQuery},telefone.ilike.${fuzzyQuery}`;
                prFilter += `,documento.ilike.${fuzzyQuery},telefone.ilike.${fuzzyQuery}`;
                emFilter += `,cnpj.ilike.${fuzzyQuery},telefone.ilike.${fuzzyQuery}`;
            }

            // Para parcelas, se for numérico, buscamos de forma mais ampla (A Vencer ou Recentes)
            let parcelQuery = supabase.from('parcelas')
                .select('id, transacao_id, data_vencimento, valor, status, transacoes(locatario_nome, codigo_transacao)');

            if (digitsOnly.length > 0) {
                parcelQuery = parcelQuery.or(`status.neq.Pago,data_vencimento.ilike.%${digitsOnly}%`).limit(200);
            } else if (query.length >= 3) {
                // Se for texto (ex: "Pago", "Atraso"), buscamos no status também
                parcelQuery = parcelQuery.or(`status.ilike.%${query}%,transacoes.locatario_nome.ilike.%${query}%`).limit(100);
            } else {
                parcelQuery = parcelQuery.limit(100);
            }

            const [cl, im, ct, al, pr, em, tr, pa] = await Promise.all([
                supabase.from('clientes').select('id, nome_completo, documento, email, celular, telefone').or(clFilter),
                supabase.from('imoveis').select('id, nome_identificacao, codigo_interno').or(`nome_identificacao.ilike.%${query}%,codigo_interno.ilike.%${query}%`),
                supabase.from('contratos').select('id, codigo_contrato').ilike('codigo_contrato', `%${query}%`),
                supabase.from('alugueis').select('id, codigo_interno').ilike('codigo_interno', `%${query}%`),
                supabase.from('proprietarios').select('id, nome_completo, documento, email, telefone').or(prFilter),
                supabase.from('empresas').select('id, nome_fantasia, cnpj, email, telefone').or(emFilter),
                supabase.from('transacoes').select('id, codigo_transacao, locatario_nome').or(`codigo_transacao.ilike.%${query}%,locatario_nome.ilike.%${query}%`),
                parcelQuery
            ]);

            // Transações
            (tr.data || []).forEach(item => results.push({
                id: item.id,
                type: 'Transação',
                title: `Transação ${item.codigo_transacao}`,
                subtitle: `Locatário: ${item.locatario_nome}`,
                href: `/financeiro?id=${item.id}`,
                icon: DollarSign
            }));

            // Parcelas (Busca Local Profunda)
            const processedParcelIds = new Set();
            (pa.data || []).forEach((p: any) => {
                if (processedParcelIds.has(p.id)) return;

                const valRaw = String(p.valor || '0');
                const valFormatted = valRaw.replace('.', ',');
                const valClean = valRaw.replace(/\D/g, ""); // "1500.00" -> "150000"
                const valSimple = valRaw.split('.')[0]; // "1500.00" -> "1500"

                const dateRaw = p.data_vencimento || ''; // YYYY-MM-DD
                const [y, m, d] = dateRaw.split('-');
                const dateBR = dateRaw ? `${d}/${m}/${y}` : ''; // DD/MM/YYYY
                const dateBRShort = `${d}${m}`; // DDMM
                const dateBRFull = `${d}${m}${y}`; // DDMMYYYY

                const status = String(p.status || '').toLowerCase();
                const searchLower = query.toLowerCase();

                // Match Conditions
                const matchesValue = (digitsOnly && (valClean.includes(digitsOnly) || valSimple === digitsOnly || valSimple.includes(digitsOnly))) || valFormatted.includes(query) || valRaw.includes(query);
                const matchesDate = (digitsOnly && (dateBRShort.includes(digitsOnly) || dateBRFull.includes(digitsOnly))) || dateRaw.includes(query) || dateBR.includes(query);
                const matchesStatus = status.includes(searchLower);
                const matchesText = p.transacoes?.locatario_nome?.toLowerCase().includes(searchLower) ||
                    p.transacoes?.codigo_transacao?.toLowerCase().includes(searchLower);

                if (matchesValue || matchesDate || matchesText || matchesStatus) {
                    processedParcelIds.add(p.id);
                    results.push({
                        id: p.id,
                        type: 'Parcela',
                        title: `Parcela - ${p.transacoes?.locatario_nome || 'Financeiro'}`,
                        subtitle: `Venc: ${dateBR || '---'} | Valor: R$ ${valFormatted} | Status: ${p.status || '---'}`,
                        href: `/financeiro?id=${p.id}`,
                        icon: DollarSign
                    });
                }
            });

            // Clientes
            (cl.data || []).forEach(item => {
                let subtitle = `Doc: ${item.documento}`;
                if (item.email?.toLowerCase().includes(query.toLowerCase())) {
                    subtitle = `E-mail: ${item.email}`;
                } else if (digitsOnly && item.celular?.replace(/\D/g, "").includes(digitsOnly)) {
                    subtitle = `WhatsApp: ${item.celular}`;
                } else if (digitsOnly && item.telefone?.replace(/\D/g, "").includes(digitsOnly)) {
                    subtitle = `Tel: ${item.telefone}`;
                } else if (digitsOnly && item.documento?.replace(/\D/g, "").includes(digitsOnly)) {
                    subtitle = `Doc: ${item.documento}`;
                }

                results.push({
                    id: item.id,
                    type: 'Cliente',
                    title: item.nome_completo,
                    subtitle,
                    href: `/clientes?id=${item.id}`,
                    icon: Users
                });
            });

            // Imóveis
            (im.data || []).forEach(item => results.push({
                id: item.id,
                type: 'Imóvel',
                title: item.nome_identificacao,
                subtitle: `Cód: ${item.codigo_interno}`,
                href: `/imoveis?id=${item.id}`,
                icon: Home
            }));

            // Contratos
            (ct.data || []).forEach(item => results.push({
                id: item.id,
                type: 'Contrato',
                title: `Contrato ${item.codigo_contrato}`,
                subtitle: 'Contrato de Locação',
                href: `/contratos?id=${item.id}`,
                icon: FileText
            }));

            // Aluguéis
            (al.data || []).forEach(item => results.push({
                id: item.id,
                type: 'Aluguel',
                title: `Gestão ${item.codigo_interno}`,
                subtitle: 'Painel de Aluguel',
                href: `/aluguel?id=${item.id}`,
                icon: Clock
            }));

            // Proprietários
            (pr.data || []).forEach(item => {
                let subtitle = `Doc: ${item.documento}`;
                if (item.email?.toLowerCase().includes(query.toLowerCase())) {
                    subtitle = `E-mail: ${item.email}`;
                } else if (digitsOnly && item.telefone?.replace(/\D/g, "").includes(digitsOnly)) {
                    subtitle = `Tel: ${item.telefone}`;
                } else if (digitsOnly && item.documento?.replace(/\D/g, "").includes(digitsOnly)) {
                    subtitle = `Doc: ${item.documento}`;
                }

                results.push({
                    id: item.id,
                    type: 'Proprietário',
                    title: item.nome_completo,
                    subtitle,
                    href: `/proprietarios?id=${item.id}`,
                    icon: UserSquare2
                });
            });

            // Empresas
            (em.data || []).forEach(item => {
                let subtitle = `CNPJ: ${item.cnpj}`;
                if (item.email?.toLowerCase().includes(query.toLowerCase())) {
                    subtitle = `E-mail: ${item.email}`;
                } else if (digitsOnly && item.telefone?.replace(/\D/g, "").includes(digitsOnly)) {
                    subtitle = `Tel: ${item.telefone}`;
                } else if (digitsOnly && item.cnpj?.replace(/\D/g, "").includes(digitsOnly)) {
                    subtitle = `CNPJ: ${item.cnpj}`;
                }

                results.push({
                    id: item.id,
                    type: 'Empresa',
                    title: item.nome_fantasia,
                    subtitle,
                    href: `/empresas?id=${item.id}`,
                    icon: Building2
                });
            });

            setSearchResults(results);
        } catch (error) {
            console.error('Erro na busca:', error);
        } finally {
            setIsSearching(false);
        }
    }

    useEffect(() => {
        fetchDashboardData();

        // Real-time subscriptions for all relevant tables
        const channel = supabase
            .channel('dashboard-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes' }, () => fetchDashboardData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'imoveis' }, () => fetchDashboardData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'alugueis' }, () => fetchDashboardData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'contratos' }, () => fetchDashboardData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'parcelas' }, () => fetchDashboardData())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    async function fetchDashboardData() {
        const [cl, im, al, pr, ct, conf] = await Promise.all([
            supabase.from('clientes').select('id', { count: 'exact' }),
            supabase.from('imoveis').select('id, status'),
            supabase.from('alugueis').select('id, status, troca_titularidade_cagepa, troca_titularidade_energisa, comprovante_cagepa_url, comprovante_energisa_url, codigo_interno, clientes(nome_completo, id), imoveis(nome_identificacao)'),
            supabase.from('parcelas').select('id, status, data_vencimento, valor, transacoes(contratos(clientes(nome_completo))), historico_comunicacoes(id)'),
            supabase.from('contratos').select('id, status, cliente_id, codigo_interno, codigo_contrato'),
            supabase.from('configuracoes').select('iptu_data_inicio, iptu_data_fim').order('created_at', { ascending: false }).limit(1).single()
        ]);

        // Helper to extract nested object from potentially array-like Supabase join result
        const extract = (obj: any) => Array.isArray(obj) ? obj[0] : obj;

        const allLeases = al.data || [];
        const activeLeases = allLeases.filter(l =>
            l.status === 'Em Vigência' ||
            l.status === 'Contrato Gerado' ||
            l.status === 'Aguardando Assinatura'
        );

        const allContracts = ct.data || [];
        const activeContracts = allContracts.filter(c => c.status === 'Em Vigência');
        const pendingContracts = allContracts.filter(c => c.status === 'Aguardando Assinatura');

        // Logic for Utility Alerts
        const utilityAlerts = activeLeases.filter(l =>
            !(l.troca_titularidade_cagepa && l.comprovante_cagepa_url) ||
            !(l.troca_titularidade_energisa && l.comprovante_energisa_url)
        ).map(l => {
            const cliente = extract(l.clientes);
            const imovel = extract(l.imoveis);

            const missingCagepa = !(l.troca_titularidade_cagepa && l.comprovante_cagepa_url);
            const missingEnergisa = !(l.troca_titularidade_energisa && l.comprovante_energisa_url);

            const cagepaStatus = !l.troca_titularidade_cagepa ? 'CAGEPA (Marcar)' : 'CAGEPA (Doc)';
            const energisaStatus = !l.troca_titularidade_energisa ? 'ENERGISA (Marcar)' : 'ENERGISA (Doc)';

            const statusParts = [];
            if (missingCagepa) statusParts.push(cagepaStatus);
            if (missingEnergisa) statusParts.push(energisaStatus);

            const contratoRelacionado = allContracts.find(c => c.codigo_interno === l.codigo_interno);
            const codigoDisplay = contratoRelacionado?.codigo_contrato ? `Contrato ${contratoRelacionado.codigo_contrato}` : `Contrato ${l.codigo_interno}`;

            return {
                id: l.id,
                title: cliente?.nome_completo || 'Cliente s/nome',
                description: `${codigoDisplay} - ${imovel?.nome_identificacao || 'Imóvel'}`,
                metadata: statusParts.join(' & '),
                href: `/aluguel?id=${l.id}`
            };
        });

        // Logic for Upcoming and Overdue
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const threeDaysLater = new Date(today);
        threeDaysLater.setDate(today.getDate() + 3);
        threeDaysLater.setHours(23, 59, 59, 999);

        const upcoming = (pr.data || []).filter(p =>
            (p.status === 'Pendente' || p.status === 'A Vencer') &&
            new Date(p.data_vencimento + 'T12:00:00') <= threeDaysLater &&
            new Date(p.data_vencimento + 'T12:00:00') >= today &&
            (!p.historico_comunicacoes || (Array.isArray(p.historico_comunicacoes) && p.historico_comunicacoes.length === 0))
        ).map(p => {
            const transacao = extract(p.transacoes);
            const contrato = extract(transacao?.contratos);
            const cliente = extract(contrato?.clientes);
            return {
                id: p.id,
                title: cliente?.nome_completo || 'Cliente s/nome',
                description: `Vencimento em ${new Date(p.data_vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}`,
                metadata: `Valor: R$ ${p.valor?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}`,
                href: `/financeiro?id=${p.id}`
            };
        });

        const overdue = (pr.data || []).filter(p => {
            if (p.status === 'Pago' || p.status === 'Pago e Juros') return false;
            if (p.status === 'Em Atraso' || p.status === 'Vencido') return true;

            // Fallback: check date manually if status is still 'Pendente' or 'A Vencer' but date is in the past
            const vencDate = new Date(p.data_vencimento + 'T00:00:00');
            return vencDate < today;
        }).map(p => {
            const transacao = extract(p.transacoes);
            const contrato = extract(transacao?.contratos);
            const cliente = extract(contrato?.clientes);
            return {
                id: p.id,
                title: cliente?.nome_completo || 'Cliente s/nome',
                description: `Vencido em ${new Date(p.data_vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}`,
                metadata: `Valor: R$ ${p.valor?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}`,
                href: `/financeiro?id=${p.id}`
            };
        });

        const totalImoveis = (im.data || []).length;
        const alugadosImoveis = (im.data || []).filter(i => {
            const s = String(i.status || '').toLowerCase().trim();
            return s === 'alugado' || s === 'indisponível' || s === 'ocupado';
        }).length;
        const disponiveisImoveis = totalImoveis - alugadosImoveis;

        // Logic for Clientes Ativos
        const clientIdsWithActiveLeases = activeLeases.map(l => extract(l.clientes)?.id).filter(Boolean);
        const uniqueActiveClientIds = Array.from(new Set(clientIdsWithActiveLeases));

        // Fetch detailed client info for those with active leases
        const { data: activeClientsData } = await supabase
            .from('clientes')
            .select(`
                id, 
                nome_completo, 
                documento_identidade_url,
                documento,
                rg,
                email,
                celular,
                cep,
                logradouro,
                numero,
                complemento,
                bairro,
                cidade,
                estado
            `)
            .in('id', uniqueActiveClientIds);

        // Map leases to their respective clients for the details modal
        const enrichedActiveClients = (activeClientsData || []).map(client => {
            const clientLease = activeLeases.find(l => extract(l.clientes)?.id === client.id);
            // Also find the contract for this client/lease if possible
            const clientContract = allContracts.find(c => c.cliente_id === client.id && c.status === 'Em Vigência');

            return {
                ...client,
                activeLease: {
                    ...clientLease,
                    contratos: clientContract
                }
            };
        });

        setActiveClientsList(enrichedActiveClients);

        setCounts({
            clientes: cl.count || 0,
            clientesAtivosCount: uniqueActiveClientIds.length,
            imoveis: im.data?.length || 0,
            imoveisAlugados: (im.data || []).filter(i => i.status === 'Alugado').length,
            imoveisDisponiveis: (im.data || []).filter(i => i.status === 'Disponível').length,
            ativos: activeContracts.length,
            vencendo: upcoming.length,
            contratosTotal: allContracts.length,
            contratosPendentes: pendingContracts.length
        });

        setAlertHub({
            utility: utilityAlerts,
            upcoming,
            overdue
        });

        if (conf.data) {
            setIptuConfig({
                inicio: conf.data.iptu_data_inicio || '15/01/2026',
                fim: conf.data.iptu_data_fim || '15/03/2026'
            });
        }
    }

    const urgencyCards = [
        { label: "Titularidades", count: alertHub.utility.length, type: 'utility' as const, color: "rose" },
        { label: "Vencimentos (3d)", count: alertHub.upcoming.length, type: 'upcoming' as const, color: "amber" },
        { label: "Inadimplência", count: alertHub.overdue.length, type: 'overdue' as const, color: "rose" },
    ];

    return (
        <div className="flex">
            <Sidebar />

            <main className="flex-1 md:ml-72 min-h-screen p-4 md:p-8 min-w-0 overflow-x-hidden">
                <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div>
                        <h1 className="text-3xl font-serif-premium font-bold text-foreground mb-2 lowercase first-letter:uppercase">Escritório Central</h1>
                        <p className="text-accent text-sm font-medium">Hub de operação em tempo real.</p>
                    </div>

                    <div className="flex-1 flex gap-4 items-center max-w-2xl">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-accent" />
                            <input
                                type="text"
                                placeholder="Buscar aluguel, imóvel, proprietário, contrato..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl py-3 pl-11 pr-4 text-sm text-foreground placeholder:text-accent focus:outline-none focus:border-black/10 dark:focus:border-white/20 transition-all font-outfit"
                            />
                            {isSearching && (
                                <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-accent animate-spin" />
                            )}
                        </div>

                        <button
                            onClick={async () => {
                                if (confirm('Deseja disparar os lembretes de e-mail agora para as cobranças próximas?')) {
                                    try {
                                        const res = await fetch('/api/send-reminders');
                                        const data = await res.json();
                                        if (data.success) {
                                            alert(`Sucesso! Processados: Aluguel (${data.processed.aluguel.length})`);
                                            fetchDashboardData();
                                        } else {
                                            alert(`Erro: ${data.error}`);
                                        }
                                    } catch (e) {
                                        alert('Erro ao conectar com a API');
                                    }
                                }
                            }}
                            className="btn-elite px-6 py-2 flex items-center gap-2 transition-all whitespace-nowrap">
                            <Mail className="w-4 h-4" />
                            Lembretes
                        </button>
                    </div>
                </header>

                {/* Modals & Drawers */}
                <AlertDrawer
                    isOpen={drawer.isOpen}
                    onClose={() => setDrawer(prev => ({ ...prev, isOpen: false }))}
                    title={drawer.title}
                    type={drawer.type as any}
                    items={drawer.items}
                    onItemClick={drawer.type === 'clients' ? (id) => {
                        const client = activeClientsList.find(c => c.id === id);
                        if (client) {
                            setSelectedClient(client);
                            setDrawer(prev => ({ ...prev, isOpen: false }));
                            setIsClientDetailsOpen(true);
                        }
                    } : undefined}
                />

                <ClientDetailsModal
                    isOpen={isClientDetailsOpen}
                    onClose={() => setIsClientDetailsOpen(false)}
                    client={selectedClient}
                />

                {/* Stats Grid or Search Results */}
                {searchQuery.trim().length >= 2 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-foreground">Resultados da Busca</h2>
                            <button
                                onClick={() => setSearchQuery("")}
                                className="text-accent text-sm hover:text-foreground transition-colors px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent dark:border-white/5 hover:border-black/10 dark:hover:border-white/10"
                            >
                                Limpar Busca
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            {isSearching ? (
                                <div className="glass-elite p-12 flex flex-col items-center justify-center gap-4">
                                    <Loader2 className="w-8 h-8 text-accent animate-spin" />
                                    <p className="text-accent text-sm">Buscando informações...</p>
                                </div>
                            ) : searchResults.length > 0 ? (
                                searchResults.map((result, idx) => (
                                    <Link
                                        key={`${result.type}-${result.id}-${idx}`}
                                        href={result.href}
                                        className="group glass-elite p-5 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-all hover:translate-x-1 border border-transparent dark:border-white/5 hover:border-black/10 dark:hover:border-white/10"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center border border-black/5 dark:border-white/10 group-hover:border-black/10 dark:group-hover:border-white/20 transition-all">
                                                <result.icon className="w-5 h-5 text-accent group-hover:text-primary dark:group-hover:text-white transition-colors" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-[8px] uppercase font-black text-accent tracking-widest leading-none">
                                                        {result.type}
                                                    </span>
                                                    <h3 className="text-[13px] font-bold text-foreground group-hover:text-primary dark:group-hover:text-white transition-colors">
                                                        {result.title}
                                                    </h3>
                                                </div>
                                                <p className="text-[11px] text-accent font-medium">{result.subtitle}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] text-accent opacity-0 group-hover:opacity-100 transition-opacity">Acessar registro</span>
                                            <ArrowUpRight className="w-5 h-5 text-accent opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                                        </div>
                                    </Link>
                                ))
                            ) : (
                                <div className="glass-elite p-12 flex flex-col items-center justify-center gap-4 text-center">
                                    <div className="w-16 h-16 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center mb-2">
                                        <Search className="w-8 h-8 text-accent opacity-20" />
                                    </div>
                                    <p className="text-foreground font-bold italic">Nenhum resultado encontrado para "{searchQuery}"</p>
                                    <p className="text-accent text-sm max-w-xs">Tente buscar por nomes, códigos de contratos, documentos ou endereços.</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                            {dashboardCards.map((card, i) => {
                                const hasAnyUrgency = alertHub.utility.length > 0 || alertHub.upcoming.length > 0 || alertHub.overdue.length > 0;

                                if (card.id === 'urgencias') {
                                    return (
                                        <motion.div
                                            key="urgency-hub"
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{
                                                opacity: 1,
                                                y: 0,
                                                borderColor: hasAnyUrgency ? 'rgba(244, 63, 94, 0.4)' : 'rgba(255, 255, 255, 0.08)',
                                                boxShadow: hasAnyUrgency ? '0 0 25px rgba(244, 63, 94, 0.15)' : 'none'
                                            }}
                                            transition={{ delay: i * 0.1 }}
                                            className="bg-panel md:glass-elite glow-top p-8 relative group overflow-hidden flex flex-col transition-all duration-300 md:hover:-translate-y-1 md:hover:bg-black/5 dark:md:hover:bg-white/10 border border-panel-border md:border-transparent rounded-2xl"
                                        >
                                            <div className="flex justify-between items-center mb-6 relative z-10">
                                                <div className="flex items-center gap-3">
                                                    <motion.div
                                                        animate={hasAnyUrgency ? {
                                                            scale: [1, 1.15, 1],
                                                            backgroundColor: ['rgba(244, 63, 94, 0.2)', 'rgba(244, 63, 94, 0.4)', 'rgba(244, 63, 94, 0.2)']
                                                        } : {}}
                                                        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                                                        className="w-10 h-10 rounded-2xl bg-rose-500/20 flex items-center justify-center relative border border-rose-500/30"
                                                    >
                                                        <card.icon className="w-5 h-5 text-rose-500 relative z-10" />
                                                        {hasAnyUrgency && (
                                                            <motion.div
                                                                animate={{ scale: [1, 1.8], opacity: [0.5, 0] }}
                                                                transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
                                                                className="absolute inset-0 rounded-2xl bg-rose-500/40"
                                                            />
                                                        )}
                                                    </motion.div>
                                                    <div className="label-premium text-[10px] text-rose-500 leading-tight">Urgências</div>
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-2 relative z-10">
                                                {urgencyCards.map((card) => (
                                                    <button
                                                        key={card.label}
                                                        onClick={() => setDrawer({
                                                            isOpen: true,
                                                            title: card.label,
                                                            type: card.type,
                                                            items: alertHub[card.type]
                                                        })}
                                                        className={cn(
                                                            "group/item relative flex items-center justify-between border px-3 py-2.5 rounded-xl transition-all md:hover:translate-x-[4px]",
                                                            card.count > 0
                                                                ? card.color === 'rose' ? 'bg-rose-500/10 border-rose-500/20 shadow-[0_4px_12px_rgba(244,63,94,0.15)]'
                                                                    : 'bg-amber-500/10 border-amber-500/20 shadow-[0_4px_12px_rgba(245,158,11,0.15)]'
                                                                : "bg-black/5 dark:bg-white/5 border-transparent md:dark:border-white/5 md:hover:border-black/10 dark:md:hover:border-white/10"
                                                        )}
                                                    >
                                                        <span className={cn(
                                                            "label-premium text-[9px] transition-colors",
                                                            card.count > 0
                                                                ? card.color === 'rose' ? 'text-rose-500' : 'text-amber-500'
                                                                : "text-accent group-hover/item:text-foreground"
                                                        )}>
                                                            {card.label}
                                                        </span>
                                                        <div className="flex items-center gap-3">
                                                            <span className={cn(
                                                                "text-sm font-black transition-transform group-hover/item:scale-110",
                                                                card.count > 0
                                                                    ? card.color === 'rose' ? 'text-rose-500' : 'text-amber-500'
                                                                    : "text-foreground"
                                                            )}>
                                                                {card.count}
                                                            </span>
                                                            {card.count > 0 && (
                                                                <div className="relative flex items-center justify-center w-2 h-2">
                                                                    <motion.div
                                                                        animate={{ scale: [1, 2.5], opacity: [0.6, 0] }}
                                                                        transition={{ repeat: Infinity, duration: 1.5 }}
                                                                        className={cn(
                                                                            "absolute w-full h-full rounded-full",
                                                                            card.color === 'rose' ? 'bg-rose-500' : 'bg-amber-500'
                                                                        )}
                                                                    />
                                                                    <div className={cn(
                                                                        "relative w-2 h-2 rounded-full shadow-lg",
                                                                        card.color === 'rose' ? 'bg-rose-500 shadow-rose-500/50' : 'bg-amber-500 shadow-amber-500/50'
                                                                    )} />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                        </motion.div>
                                    );
                                }

                                if (card.id === 'imoveis') {
                                    return (
                                        <motion.div
                                            key={card.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.1 }}
                                            className="bg-panel md:glass-elite p-8 relative group overflow-hidden h-full md:hover:bg-black/5 dark:md:hover:bg-white/10 transition-all duration-300 md:hover:-translate-y-1 border border-panel-border md:border-transparent rounded-2xl"
                                        >
                                            <div className="flex justify-between items-center mb-6 relative z-10">
                                                <div className="flex items-center gap-3">
                                                    <div className="relative flex items-center justify-center">
                                                        <div className="absolute inset-0 bg-white/10 blur-xl rounded-full" />
                                                        <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 relative z-10">
                                                            <card.icon className="w-5 h-5 text-accent" />
                                                        </div>
                                                    </div>
                                                    <div className="text-[10px] uppercase font-black tracking-[0.2em] text-accent leading-tight">Imóveis</div>
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-2 relative z-10 mb-6">
                                                {/* Registered Row */}
                                                <Link href="/imoveis" className="group/item relative flex items-center justify-between border px-3 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border-transparent dark:border-white/5 transition-all hover:translate-x-[4px] hover:bg-black/10 dark:hover:bg-white/10">
                                                    <span className="label-premium text-[9px] text-accent group-hover/item:text-foreground transition-colors lowercase first-letter:uppercase">Imóveis Cadastrados</span>
                                                    <span className="text-sm font-black text-foreground">{counts.imoveis}</span>
                                                </Link>

                                                {/* Alugados Row */}
                                                <Link href="/imoveis?status=Alugado" className="group/item relative flex items-center justify-between border px-3 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border-transparent dark:border-white/5 transition-all hover:translate-x-[4px] hover:bg-black/10 dark:hover:bg-white/10">
                                                    <span className="label-premium text-[9px] text-accent group-hover/item:text-foreground transition-colors">Alugados</span>
                                                    <span className="text-sm font-black text-foreground">{counts.imoveisAlugados}</span>
                                                </Link>

                                                {/* Disponíveis Row */}
                                                <Link href="/imoveis?status=Disponivel" className="group/item relative flex items-center justify-between border px-3 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border-transparent dark:border-white/5 transition-all hover:translate-x-[4px] hover:bg-black/10 dark:hover:bg-white/10">
                                                    <span className="label-premium text-[9px] text-accent group-hover/item:text-foreground transition-colors">Disponíveis</span>
                                                    <span className="text-sm font-black text-foreground">{counts.imoveisDisponiveis}</span>
                                                </Link>
                                            </div>

                                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                        </motion.div>
                                    );
                                }

                                if (card.id === 'contratos') {
                                    return (
                                        <Link
                                            key={card.id}
                                            href="/contratos"
                                            className="block"
                                        >
                                            <motion.div
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.1 }}
                                                className="bg-panel md:glass-elite p-8 relative group overflow-hidden h-full md:hover:bg-black/5 dark:md:hover:bg-white/10 transition-all duration-300 md:hover:-translate-y-1 border border-panel-border md:border-transparent rounded-2xl"
                                            >
                                                <div className="flex justify-between items-center mb-6 relative z-10">
                                                    <div className="flex items-center gap-3">
                                                        <div className="relative flex items-center justify-center">
                                                            <div className="absolute inset-0 bg-white/10 blur-xl rounded-full" />
                                                            <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 relative z-10">
                                                                <card.icon className="w-5 h-5 text-accent" />
                                                            </div>
                                                        </div>
                                                        <div className="text-[10px] uppercase font-black tracking-[0.2em] text-accent leading-tight">Contratos</div>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col gap-2 relative z-10 mb-6">
                                                    {/* Total Row */}
                                                    <div className="group/item relative flex items-center justify-between border px-3 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border-transparent dark:border-white/5 transition-all hover:translate-x-[4px]">
                                                        <span className="label-premium text-[9px] text-accent group-hover/item:text-foreground transition-colors">Total de Contratos</span>
                                                        <span className="text-sm font-black text-foreground">{counts.contratosTotal}</span>
                                                    </div>

                                                    {/* Ativos Row */}
                                                    <div className="group/item relative flex items-center justify-between border px-3 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border-transparent dark:border-white/5 transition-all hover:translate-x-[4px]">
                                                        <span className="label-premium text-[9px] text-accent group-hover/item:text-foreground transition-colors">Contratos Ativos</span>
                                                        <span className="text-sm font-black text-foreground">{counts.ativos}</span>
                                                    </div>

                                                    {/* Aguardando Assinatura Row */}
                                                    <div className={cn(
                                                        "group/item relative flex items-center justify-between border px-3 py-2.5 rounded-xl transition-all hover:translate-x-[4px]",
                                                        counts.contratosPendentes > 0
                                                            ? "bg-black/10 dark:bg-white/10 border-black/20 dark:border-white/20 shadow-[0_4px_12px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(255,255,255,0.05)]"
                                                            : "bg-black/5 dark:bg-white/5 border-transparent dark:border-white/5"
                                                    )}>
                                                        <span className={cn(
                                                            "label-premium text-[9px] transition-colors",
                                                            counts.contratosPendentes > 0 ? "text-primary dark:text-white" : "text-accent"
                                                        )}>Aguardando Assinatura</span>
                                                        <div className="flex items-center gap-3">
                                                            <span className={cn(
                                                                "text-sm font-black transition-colors",
                                                                counts.contratosPendentes > 0 ? "text-primary dark:text-white" : "text-foreground"
                                                            )}>{counts.contratosPendentes}</span>
                                                            {counts.contratosPendentes > 0 && (
                                                                <div className="relative flex items-center justify-center w-2 h-2">
                                                                    <motion.div
                                                                        animate={{ scale: [1, 2.5], opacity: [0.6, 0] }}
                                                                        transition={{ repeat: Infinity, duration: 1.5 }}
                                                                        className="absolute w-full h-full rounded-full bg-primary dark:bg-white"
                                                                    />
                                                                    <div className="relative w-2 h-2 rounded-full bg-primary dark:bg-white shadow-primary/50 dark:shadow-white/50 shadow-lg" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                            </motion.div>
                                        </Link>
                                    );
                                }

                                if (card.id === 'clientes') {
                                    return (
                                        <motion.div
                                            key={card.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.1 }}
                                            className="bg-panel md:glass-elite p-8 relative group overflow-hidden h-full md:hover:-translate-y-1 md:hover:bg-black/5 dark:md:hover:bg-white/10 transition-all duration-300 border border-panel-border md:border-transparent rounded-2xl"
                                        >
                                            <div className="flex justify-between items-center mb-6 relative z-10">
                                                <div className="flex items-center gap-3">
                                                    <div className="relative flex items-center justify-center">
                                                        <div className="absolute inset-0 bg-white/10 blur-xl rounded-full" />
                                                        <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 relative z-10">
                                                            <card.icon className="w-5 h-5 text-accent" />
                                                        </div>
                                                    </div>
                                                    <div className="text-[10px] uppercase font-black tracking-[0.2em] text-accent leading-tight">Clientes</div>
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-2 relative z-10">
                                                {/* Total Clients Row */}
                                                <Link
                                                    href="/clientes"
                                                    className="group/item relative flex items-center justify-between border px-3 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border-transparent dark:border-white/5 transition-all hover:translate-x-[4px] hover:bg-black/10 dark:hover:bg-white/10"
                                                >
                                                    <span className="label-premium text-[9px] text-accent group-hover/item:text-foreground transition-colors lowercase first-letter:uppercase">Total de Clientes</span>
                                                    <span className="text-sm font-black text-foreground">{counts.clientes}</span>
                                                </Link>

                                                {/* Active Clients Row */}
                                                <button
                                                    onClick={() => setDrawer({
                                                        isOpen: true,
                                                        title: "Clientes Ativos",
                                                        type: 'clients',
                                                        items: activeClientsList.map(c => ({
                                                            id: c.id,
                                                            title: c.nome_completo,
                                                            description: `Imóvel: ${c.activeLease?.imoveis?.nome_identificacao || 'N/A'}`,
                                                            metadata: `Contrato: ${c.activeLease?.contratos?.codigo_contrato || 'N/A'}`,
                                                            href: '#'
                                                        }))
                                                    })}
                                                    className="group/item relative flex items-center justify-between border px-3 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border-transparent dark:border-white/5 transition-all hover:translate-x-[4px]"
                                                >
                                                    <span className="label-premium text-[9px] text-accent group-hover/item:text-foreground transition-colors">Clientes Ativos</span>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-sm font-black text-foreground">{counts.clientesAtivosCount}</span>
                                                    </div>
                                                </button>
                                            </div>

                                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                        </motion.div>
                                    );
                                }
                            })}
                        </div>

                        {/* IPTU Alert - Visible based on DD/MM/YYYY format */}
                        {(() => {
                            const now = new Date();

                            // Parse "DD/MM/YYYY" configs
                            const parseDateBR = (str: string) => {
                                const [d, m, y] = str.split('/').map(Number);
                                if (!d || !m || !y) return null;
                                return new Date(y, m - 1, d);
                            };

                            const startDate = parseDateBR(iptuConfig.inicio);
                            const endDate = parseDateBR(iptuConfig.fim);

                            if (!startDate || !endDate) return null;

                            const isIPTUPeriod = now >= startDate && now <= endDate;

                            if (isIPTUPeriod) {
                                return (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{
                                            opacity: 1,
                                            y: 0,
                                            borderColor: ['rgba(244, 63, 94, 0.2)', 'rgba(244, 63, 94, 0.6)', 'rgba(244, 63, 94, 0.2)']
                                        }}
                                        transition={{
                                            borderColor: { repeat: Infinity, duration: 2, ease: "easeInOut" }
                                        }}
                                        className="w-full glass-elite bg-rose-500/5 dark:bg-rose-500/10 px-6 py-4 flex items-center justify-center gap-4 rounded-2xl border transition-all duration-300"
                                    >
                                        <motion.div
                                            animate={{
                                                scale: [1, 1.2, 1],
                                                opacity: [0.7, 1, 0.7]
                                            }}
                                            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                                        >
                                            <AlertCircle className="w-5 h-5 text-rose-500" />
                                        </motion.div>

                                        <span className="text-sm md:text-base font-black text-rose-500 uppercase tracking-widest">
                                            Pagamento de IPTU de todos imóveis
                                        </span>

                                        <motion.div
                                            animate={{
                                                scale: [1, 1.2, 1],
                                                opacity: [0.7, 1, 0.7]
                                            }}
                                            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                                        >
                                            <AlertCircle className="w-5 h-5 text-rose-500" />
                                        </motion.div>
                                    </motion.div>
                                );
                            }
                            return null;
                        })()}
                    </>
                )}
            </main >
        </div >
    );
}
