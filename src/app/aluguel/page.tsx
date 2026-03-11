"use client";

import { useState, useEffect, Suspense } from "react";
import { Sidebar } from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";
import { Search, Plus, Edit2, Trash2, Loader2, AlertCircle, MoreHorizontal, Filter, FileText, Download, Copy } from "lucide-react";
import { motion } from "framer-motion";
import { useSearchParams, useRouter } from "next/navigation";
import { NovoAluguelModal } from "@/components/NovoAluguelModal";
import { cn } from "@/lib/utils";
import * as XLSX from 'xlsx';

export default function AluguelPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen bg-background items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        }>
            <AluguelContent />
        </Suspense>
    );
}

function AluguelContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const deepLinkId = searchParams.get('id');

    const [contratos, setContratos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedContrato, setSelectedContrato] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("Todos os Status");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [userRole, setUserRole] = useState<string | null>(null);

    useEffect(() => {
        fetchAlugueis();

        const fetchUserProfile = async (session: any) => {
            if (session?.user) {
                const { data } = await supabase
                    .from('profile')
                    .select('role')
                    .eq('id', session.user.id)
                    .single();
                if (data) {
                    setUserRole(data.role);
                }
            } else {
                setUserRole(null);
            }
        };

        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            fetchUserProfile(session);
        });

        supabase.auth.getSession().then(({ data: { session } }) => {
            fetchUserProfile(session);
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        if (contratos.length > 0 && deepLinkId) {
            const found = contratos.find(c => c.id === deepLinkId);
            if (found) {
                setSelectedContrato(found);
                setIsCreateModalOpen(true);
            }
        }
    }, [contratos, deepLinkId]);

    async function fetchAlugueis() {
        try {
            setLoading(true);
            setError(null);
            const { data, error } = await supabase
                .from('alugueis')
                .select('*, clientes(id, nome_completo), imoveis(id, endereco, nome_identificacao, logradouro, numero, bairro, cidade, estado, proprietarios(id, nome_completo), empresas(id, nome_fantasia)), proprietarios(id, nome_completo)')
                .order('codigo_interno', { ascending: false });

            if (error) throw error;
            if (data) setContratos(data);
        } catch (err: any) {
            console.error("Erro ao buscar aluguéis:", err.message);
            setError("Não foi possível carregar os aluguéis.");
        } finally {
            setLoading(false);
        }
    }

    const handleCreate = () => {
        setSelectedContrato(null);
        setIsCreateModalOpen(true);
    };

    const handleOpenEdit = (contrato: any, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedContrato(contrato);
        setIsCreateModalOpen(true);
    };

    const handleDuplicate = (contrato: any, e: React.MouseEvent) => {
        e.stopPropagation();
        const { id, created_at, updated_at, codigo_interno, codigo_contrato, clientes, imoveis, proprietarios, cagepa_url, energisa_url, comprovante_cagepa_url, comprovante_energisa_url, ...rest } = contrato;
        setSelectedContrato({ ...rest, codigo_interno: '', codigo_contrato: '', status: 'Preparação de Contrato', comprovante_cagepa_url: '', comprovante_energisa_url: '' });
        setIsCreateModalOpen(true);
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm("Tem certeza que deseja excluir permanentemente este registro de aluguel? O contrato vinculado também será removido.")) {
            try {
                // Buscar aluguel para obter codigo_interno
                const { data: aluguel } = await supabase.from('alugueis').select('codigo_interno').eq('id', id).single();
                if (aluguel?.codigo_interno) {
                    // Buscar e deletar contrato vinculado
                    const { data: contratos } = await supabase.from('contratos').select('id, contrato_assinado_url').eq('codigo_interno', aluguel.codigo_interno);
                    if (contratos && contratos.length > 0) {
                        const { deleteStorageByUrls } = await import('@/lib/storageUtils');
                        await deleteStorageByUrls(contratos.map(c => c.contrato_assinado_url));
                        await supabase.from('contratos').delete().eq('codigo_interno', aluguel.codigo_interno);
                    }
                }
                const { error } = await supabase.from('alugueis').delete().eq('id', id);
                if (error) throw error;
                fetchAlugueis();
            } catch (err: any) {
                alert("Erro ao excluir: " + err.message);
            }
        }
    };

    const statusOptions = [
        "Todos os Status",
        "Preparação de Contrato",
        "Contrato Gerado",
        "Aguardando Assinatura",
        "Em Vigência",
        "Finalizado",
        "Cancelado",
    ];

    const getStatusStyle = (status: string) => {
        switch (status) {
            case "Preparação de Contrato": return "bg-amber-500/10 text-amber-500";
            case "Contrato Gerado": return "bg-purple-500/10 text-purple-500";
            case "Aguardando Assinatura": return "bg-orange-500/10 text-orange-500";
            case "Em Vigência": return "bg-accent/10 text-accent";
            case "Finalizado": return "bg-black/10 dark:bg-white/10 text-primary dark:text-white";
            case "Cancelado": return "bg-rose-500/10 text-rose-500";
            default: return "bg-gray-500/10 text-gray-500";
        }
    };

    // Busca inteligente em todos os campos relevantes
    const filteredContratos = contratos.filter(contrato => {
        const term = searchTerm.toLowerCase();
        const proprietarioNome = contrato.proprietarios?.nome_completo || contrato.imoveis?.empresas?.nome_fantasia || contrato.imoveis?.proprietarios?.nome_completo || '';
        const empresaNome = contrato.imoveis?.empresas?.nome_fantasia || '';
        const searchFields = [
            contrato.codigo_interno,
            contrato.codigo_contrato,
            contrato.status,
            contrato.clientes?.nome_completo,
            contrato.imoveis?.nome_identificacao,
            contrato.imoveis?.logradouro,
            contrato.imoveis?.endereco,
            contrato.imoveis?.numero,
            contrato.imoveis?.bairro,
            contrato.imoveis?.cidade,
            contrato.imoveis?.estado,
            proprietarioNome,
            empresaNome,
            contrato.tipo_reajuste,
            contrato.finalidade_aluguel,
            contrato.tipo_garantia,
            contrato.negocio_juridico,
            contrato.data_inicio,
            String(contrato.valor_aluguel || ''),
            String(contrato.duracao_meses || ''),
        ];
        const matchesSearch = !term || searchFields.some(f => f?.toLowerCase().includes(term));

        const matchesStatus = statusFilter === "Todos os Status" ||
            contrato.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const formatCurrency = (val: any) => {
        return `R$ ${Number(val || 0).toLocaleString('pt-br', { minimumFractionDigits: 2 })}`;
    };

    const formatDate = (d: string | null) => {
        if (!d) return '-';
        try {
            return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR');
        } catch { return d; }
    };

    // Gerar PDF — Ficha do Contrato de Aluguel
    const handleExportPDF = async () => {
        if (selectedIds.size === 0) {
            alert('Selecione pelo menos um contrato para gerar PDF.');
            return;
        }

        let logoUrl = '';
        let rodapeUrl = '';
        try {
            const { data: config } = await supabase
                .from('configuracoes')
                .select('logo_url, rodape_url')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            if (config) { logoUrl = config.logo_url || ''; rodapeUrl = config.rodape_url || ''; }
        } catch (e) { }

        const selected = filteredContratos.filter(i => selectedIds.has(i.id));
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        const printWindow = window.open('', '_blank');
        if (!printWindow) { alert('Não foi possível abrir a janela. Verifique se popups estão permitidos.'); return; }

        const logoHtml = logoUrl ? `<div class="header-logo"><img src="${logoUrl}" alt="Logo" /></div>` : '';
        const rodapeHtml = rodapeUrl ? `<div class="footer-img"><img src="${rodapeUrl}" alt="Rodapé" /></div>` : '';

        const fichas = selected.map(c => {
            const propNome = c.proprietarios?.nome_completo || c.imoveis?.empresas?.nome_fantasia || c.imoveis?.proprietarios?.nome_completo || '-';
            const imovelNome = c.imoveis?.nome_identificacao || c.imoveis?.logradouro || c.imoveis?.endereco?.split(',')[0] || '-';
            const imovelEnd = `${c.imoveis?.logradouro || '-'}, ${c.imoveis?.numero || 'S/N'} — ${c.imoveis?.bairro || ''} — ${c.imoveis?.cidade || ''}/${c.imoveis?.estado || ''}`;

            return `
                <div class="ficha">
                    ${logoHtml}
                    <h2>Ficha do Contrato de Aluguel</h2>
                    <p class="codigo">${c.codigo_interno || c.codigo_contrato || '-'}</p>
                    <table>
                        <tr><th>Código</th><td>${c.codigo_interno || '-'}</td><th>Status</th><td>${c.status || '-'}</td></tr>
                        <tr><th>Locatário</th><td colspan="3">${c.clientes?.nome_completo || '-'}</td></tr>
                        <tr><th>Imóvel</th><td colspan="3">${imovelNome}</td></tr>
                        <tr><th>Endereço</th><td colspan="3">${imovelEnd}</td></tr>
                        <tr><th>Proprietário</th><td colspan="3">${propNome}</td></tr>

                        <tr><td colspan="4" class="section-title">Condições do Contrato</td></tr>
                        <tr><th>Início</th><td>${formatDate(c.data_inicio)}</td><th>Duração</th><td>${c.duracao_meses ? c.duracao_meses + ' meses' : '-'}</td></tr>
                        <tr><th>Valor Aluguel</th><td>${formatCurrency(c.valor_aluguel)}</td><th>Condomínio</th><td>${formatCurrency(c.valor_condominio)}</td></tr>
                        <tr><th>Finalidade</th><td>${c.finalidade_aluguel || '-'}</td><th>Tipo Reajuste</th><td>${c.tipo_reajuste || '-'}${c.tempo_reajuste_fixo ? ' (' + c.tempo_reajuste_fixo + ' meses)' : ''}</td></tr>
                        <tr><th>Garantia</th><td>${c.tipo_garantia || '-'}</td><th>Negócio</th><td>${c.negocio_juridico || '-'}</td></tr>
                        ${c.caucao_valor ? `<tr><th>Caução</th><td colspan="3">${c.caucao_quantidade || '-'} parcela(s) — ${formatCurrency(c.caucao_valor)}</td></tr>` : ''}

                        ${(c.reajustes_fixos && c.reajustes_fixos.length > 0) ? `
                        <tr><td colspan="4" class="section-title">Reajuste Fixo</td></tr>
                        ${c.reajustes_fixos.map((p: any, i: number) => `<tr><th>Período ${i + 1}</th><td colspan="3">${p.inicio || '-'} a ${p.final || '-'}: ${formatCurrency(p.valor)}</td></tr>`).join('')}
                        ` : (c.rf_p1_valor ? `
                        <tr><td colspan="4" class="section-title">Reajuste Fixo</td></tr>
                        <tr><th>Período 1</th><td>${c.rf_p1_inicio || '-'} a ${c.rf_p1_final || '-'}: ${formatCurrency(c.rf_p1_valor)}</td>
                            <th>Período 2</th><td>${c.rf_p2_inicio || '-'} a ${c.rf_p2_final || '-'}: ${formatCurrency(c.rf_p2_valor)}</td></tr>
                        ${c.rf_p3_valor ? `<tr><th>Período 3</th><td colspan="3">${c.rf_p3_inicio || '-'} a ${c.rf_p3_final || '-'}: ${formatCurrency(c.rf_p3_valor)}</td></tr>` : ''}
                        ` : '')}
                    </table>
                    ${rodapeHtml}
                </div>
            `;
        }).join('<div class="page-break"></div>');

        printWindow.document.write(`
            <!DOCTYPE html>
            <html><head><title>Ficha - Contratos de Aluguel</title>
            <style>
                @page { size: A4; margin: 10mm; }
                body { font-family: Arial, sans-serif; font-size: 9pt; color: #111; margin: 0; }
                .ficha { margin-bottom: 10px; }
                .header-logo { text-align: center; margin-bottom: 6px; }
                .header-logo img { max-height: 60px; max-width: 250px; object-fit: contain; }
                h2 { text-align: center; font-size: 12pt; margin: 3px 0; text-transform: uppercase; letter-spacing: 0.08em; }
                .codigo { text-align: center; font-size: 8pt; color: #666; margin: 2px 0 10px 0; }
                table { width: 100%; border-collapse: collapse; }
                th { background: #f5f5f5; padding: 4px 6px; text-align: left; font-size: 8pt; border: 1px solid #ccc; width: 14%; font-weight: 700; text-transform: uppercase; letter-spacing: 0.02em; color: #444; }
                td { padding: 4px 6px; border: 1px solid #ccc; font-size: 9pt; width: 36%; }
                .section-title { background: #e0e0e0; font-weight: 700; text-transform: uppercase; font-size: 8pt; letter-spacing: 0.04em; padding: 5px 6px; }
                .page-break { page-break-after: always; }
                .info { text-align: right; font-size: 7pt; color: #999; margin: 0 0 4px 0; }
                .footer-img { text-align: center; margin-top: 10px; }
                .footer-img img { max-height: 45px; max-width: 100%; object-fit: contain; }
            </style>
            </head><body>
                <p class="info">Gerado em ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                ${fichas}
            </body></html>
        `);
        printWindow.document.close();

        const images = printWindow.document.querySelectorAll('img');
        const imagePromises = Array.from(images).map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise<void>((resolve) => { img.onload = () => resolve(); img.onerror = () => resolve(); });
        });
        await Promise.all(imagePromises);

        setTimeout(() => { printWindow.focus(); printWindow.print(); if (!isMobile) printWindow.close(); }, 300);
    };

    // Exportar listagem para Excel
    const handleExportExcel = () => {
        const dataToExport = filteredContratos.map(c => {
            const propNome = c.proprietarios?.nome_completo || c.imoveis?.empresas?.nome_fantasia || c.imoveis?.proprietarios?.nome_completo || '';
            const baseExport = {
                'Código': c.codigo_interno || '',
                'Código Contrato': c.codigo_contrato || '',
                'Status': c.status || '',
                'Locatário': c.clientes?.nome_completo || '',
                'Imóvel': c.imoveis?.nome_identificacao || c.imoveis?.logradouro || '',
                'Endereço': c.imoveis?.logradouro || '',
                'Número': c.imoveis?.numero || '',
                'Bairro': c.imoveis?.bairro || '',
                'Cidade': c.imoveis?.cidade || '',
                'Estado': c.imoveis?.estado || '',
                'Proprietário': propNome,
                'Data Início': c.data_inicio || '',
                'Duração (meses)': c.duracao_meses || '',
                'Valor Aluguel': c.valor_aluguel ? formatCurrency(c.valor_aluguel) : '',
                'Condomínio': c.valor_condominio ? formatCurrency(c.valor_condominio) : '',
                'Finalidade': c.finalidade_aluguel || '',
                'Tipo Reajuste': c.tipo_reajuste || '',
                'Tempo Reajuste Fixo': c.tempo_reajuste_fixo || '',
                'Tipo Garantia': c.tipo_garantia || '',
                'Caução Qtd': c.caucao_quantidade || '',
                'Caução Valor': c.caucao_valor ? formatCurrency(c.caucao_valor) : '',
                'Negócio Jurídico': c.negocio_juridico || '',
            };

            const rfExport: any = {};
            const rfArr = c.reajustes_fixos || [];
            if (rfArr.length > 0) {
                rfArr.forEach((p: any, i: number) => {
                    rfExport[`Período ${i + 1}`] = `${p.inicio}-${p.final}: ${formatCurrency(p.valor)}`;
                });
            } else {
                if (c.rf_p1_valor) rfExport['Período 1'] = `${c.rf_p1_inicio}-${c.rf_p1_final}: ${formatCurrency(c.rf_p1_valor)}`;
                if (c.rf_p2_valor) rfExport['Período 2'] = `${c.rf_p2_inicio}-${c.rf_p2_final}: ${formatCurrency(c.rf_p2_valor)}`;
                if (c.rf_p3_valor) rfExport['Período 3'] = `${c.rf_p3_inicio}-${c.rf_p3_final}: ${formatCurrency(c.rf_p3_valor)}`;
            }

            return { ...baseExport, ...rfExport };
        });

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Alugueis');

        const colWidths = Object.keys(dataToExport[0] || {}).map(key => ({
            wch: Math.max(key.length, ...dataToExport.map(row => String((row as any)[key] || '').length)) + 2
        }));
        ws['!cols'] = colWidths;

        XLSX.writeFile(wb, `alugueis_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    return (
        <div className="flex">
            <Sidebar />

            <main className="flex-1 md:ml-72 min-h-screen p-4 md:p-8 min-w-0 overflow-x-hidden">
                <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-serif-premium font-bold text-foreground mb-2 lowercase first-letter:uppercase">Controle de Aluguéis</h1>
                        <p className="text-accent text-sm font-medium">Gestão de contratos vigentes e pendências.</p>
                    </div>
                    <button
                        onClick={handleCreate}
                        className="btn-elite px-6 py-3 flex items-center gap-3 transition-all shrink-0"
                    >
                        <Plus className="w-4 h-4" />
                        Novo Aluguel
                    </button>
                </header>

                {/* Filter and Control Bar */}
                <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4 border border-panel-border bg-panel dark:bg-panel/50 glass-elite p-4">
                    <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="h-9 px-3 rounded-lg border border-transparent hover:border-panel-border bg-transparent text-[13px] font-medium text-foreground focus:outline-none focus:border-panel-border transition-all cursor-pointer"
                        >
                            {statusOptions.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                        <div className="w-px h-5 bg-panel-border" />
                        <button className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-accent hover:text-foreground transition-all shrink-0">
                            <Filter className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <div className="relative flex-1 md:w-56">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-accent" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar aluguéis..."
                                className="w-full h-9 bg-transparent border border-panel-border rounded-lg pl-9 pr-4 text-[13px] text-foreground focus:outline-none focus:border-primary transition-all placeholder:text-accent"
                            />
                        </div>
                        <button
                            onClick={handleExportPDF}
                            className="h-9 px-3 flex items-center gap-2 rounded-lg border border-panel-border bg-transparent text-[13px] font-medium text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-all shrink-0"
                        >
                            <FileText className="w-3.5 h-3.5 text-accent" /> Gerar PDF
                        </button>
                        <button
                            onClick={handleExportExcel}
                            className="h-9 px-3 flex items-center gap-2 rounded-lg border border-panel-border bg-transparent text-[13px] font-medium text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-all shrink-0"
                        >
                            <Download className="w-3.5 h-3.5 text-accent" /> Export Excel
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="mb-8 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-400">
                        <AlertCircle className="w-5 h-5" />
                        <span className="text-sm font-medium">{error}</span>
                    </div>
                )}

                <div className="bg-panel border border-panel-border glass-elite overflow-hidden shadow-sm">
                    {loading && contratos.length === 0 ? (
                        <div className="p-32 flex flex-col items-center gap-6 text-accent">
                            <Loader2 className="w-12 h-12 text-primary animate-spin" />
                            <p className="text-xs uppercase tracking-[0.4em] font-black">Sincronizando...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse whitespace-nowrap">
                                <thead>
                                    <tr className="bg-black/5 dark:bg-white/5 border-b border-panel-border h-9">
                                        <th className="px-4 py-2 w-12 text-center align-middle">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded border-panel-border bg-transparent cursor-pointer"
                                                checked={filteredContratos.length > 0 && selectedIds.size === filteredContratos.length}
                                                onChange={(e) => {
                                                    if (e.target.checked) setSelectedIds(new Set(filteredContratos.map(c => c.id)));
                                                    else setSelectedIds(new Set());
                                                }}
                                            />
                                        </th>
                                        <th className="px-6 py-2 label-premium text-[10px] text-accent text-center align-middle">Cód.</th>
                                        <th className="px-6 py-2 label-premium text-[10px] text-accent align-middle">Cliente / Contrato</th>
                                        <th className="px-6 py-2 label-premium text-[10px] text-accent align-middle">Imóvel</th>
                                        <th className="px-6 py-2 label-premium text-[10px] text-accent text-center align-middle">Status</th>
                                        <th className="px-4 py-2 text-[10px] font-black text-accent uppercase tracking-[0.2em] text-center align-middle">Valor</th>
                                        <th className="px-6 py-2 label-premium text-[10px] text-accent text-right pr-10 align-middle">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-panel-border text-[13px] text-foreground">
                                    {filteredContratos.length === 0 ? (
                                        <tr><td colSpan={9} className="px-6 py-32 text-center text-accent italic">Nenhum registro encontrado.</td></tr>
                                    ) : (
                                        filteredContratos.map((contrato, i) => (
                                            <motion.tr
                                                key={contrato.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.03 }}
                                                onClick={(e) => handleOpenEdit(contrato, e)}
                                                className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors group cursor-pointer"
                                            >
                                                <td className="px-4 py-2 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 rounded border-panel-border bg-transparent cursor-pointer"
                                                        checked={selectedIds.has(contrato.id)}
                                                        onChange={(e) => {
                                                            const newSelected = new Set(selectedIds);
                                                            if (e.target.checked) newSelected.add(contrato.id);
                                                            else newSelected.delete(contrato.id);
                                                            setSelectedIds(newSelected);
                                                        }}
                                                    />
                                                </td>
                                                <td className="px-4 py-2 text-center align-middle">
                                                    <span className="text-[13px] font-bold text-foreground">{contrato.codigo_interno || '-----'}</span>
                                                </td>
                                                <td className="px-4 py-2 align-middle">
                                                    <div className="flex flex-col justify-center">
                                                        <span className="font-semibold text-foreground truncate max-w-[280px]">
                                                            {contrato.clientes?.nome_completo || 'Sem Inquilino'}
                                                        </span>
                                                        <span className="text-[9px] uppercase tracking-widest font-black leading-none mt-0.5 text-accent truncate max-w-[280px]">
                                                            Início: {formatDate(contrato.data_inicio)}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2 align-middle">
                                                    <div className="flex flex-col justify-center">
                                                        <span className="font-semibold text-foreground truncate max-w-[280px]">
                                                            {contrato.imoveis?.nome_identificacao || contrato.imoveis?.logradouro || contrato.imoveis?.endereco?.split(',')[0] || 'Imóvel não associado'}
                                                            {!contrato.imoveis?.nome_identificacao && contrato.imoveis?.numero && `, ${contrato.imoveis.numero}`}
                                                        </span>
                                                        <span className="text-[9px] uppercase tracking-widest font-black leading-none mt-0.5 text-accent truncate max-w-[280px]">
                                                            Prop: {contrato.proprietarios?.nome_completo || contrato.imoveis?.empresas?.nome_fantasia || contrato.imoveis?.proprietarios?.nome_completo || '-'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2 text-center align-middle">
                                                    <span className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded whitespace-nowrap",
                                                        getStatusStyle(contrato.status)
                                                    )}>
                                                        {contrato.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2 text-center align-middle font-bold text-accent">
                                                    {formatCurrency(contrato.valor_aluguel)}
                                                </td>
                                                <td className="px-4 py-2 text-right pr-4 align-middle" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button
                                                            onClick={(e) => handleOpenEdit(contrato, e)}
                                                            className="w-7 h-7 flex items-center justify-center rounded-lg text-accent hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                                                            title={contrato.status === 'Finalizado' ? "Visualizar" : "Editar"}
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => handleDuplicate(contrato, e)}
                                                            className="w-7 h-7 flex items-center justify-center rounded-lg text-accent hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                                                            title="Duplicar"
                                                        >
                                                            <Copy className="w-3.5 h-3.5" />
                                                        </button>
                                                        {(contrato.status !== 'Finalizado' || userRole === 'admin') && (
                                                            <button
                                                                onClick={(e) => handleDelete(contrato.id, e)}
                                                                className="w-7 h-7 flex items-center justify-center rounded-lg text-rose-500/70 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                                                                title="Excluir"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <NovoAluguelModal
                    isOpen={isCreateModalOpen}
                    initialData={selectedContrato}
                    isReadOnly={selectedContrato?.status === 'Finalizado'}
                    onClose={() => setIsCreateModalOpen(false)}
                    onSuccess={() => {
                        fetchAlugueis();
                        if (deepLinkId) {
                            alert("Titularidade atualizada com sucesso! Retornando ao Dashboard.");
                            router.push('/dashboard');
                        }
                    }}
                />
            </main>
        </div>
    );
}
