"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";
import {
    Building2,
    Search,
    Plus,
    Edit2,
    Trash2,
    Loader2,
    AlertCircle,
    Eye,
    Hash,
    MoreHorizontal,
    Filter,
    FileText,
    Download
} from "lucide-react";
import { motion } from "framer-motion";
import { NovaEmpresaModal } from "@/components/NovaEmpresaModal";
import { DetalhesEmpresaModal } from "@/components/DetalhesEmpresaModal";
import * as XLSX from 'xlsx';

export default function EmpresasPage() {
    const [empresas, setEmpresas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedEmpresa, setSelectedEmpresa] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("Todos os Status");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        fetchEmpresas();
    }, []);

    async function fetchEmpresas() {
        try {
            setLoading(true);
            setError(null);
            const { data, error } = await supabase
                .from('empresas')
                .select('*, empresa_responsaveis(nome)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (data) setEmpresas(data);
        } catch (err: any) {
            console.error("Erro ao buscar empresas:", err.message);
            setError("Não foi possível carregar as empresas.");
        } finally {
            setLoading(false);
        }
    }

    const handleOpenDetails = (empresa: any) => {
        setSelectedEmpresa(empresa);
        setIsDetailsModalOpen(true);
    };

    const handleOpenEdit = (empresa: any, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedEmpresa(empresa);
        setIsCreateModalOpen(true);
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm("Tem certeza que deseja excluir esta empresa? Todos os dados, documentos e responsáveis vinculados serão removidos permanentemente.")) {
            try {
                const { data: empresa } = await supabase.from('empresas').select('*').eq('id', id).single();
                const { data: responsaveis } = await supabase.from('empresa_responsaveis').select('*').eq('empresa_id', id);
                const { deleteStorageByUrls } = await import('@/lib/storageUtils');
                // Deletar contrato social da empresa
                if (empresa?.contrato_social_url) {
                    await deleteStorageByUrls([empresa.contrato_social_url]);
                }
                // Deletar documentos dos responsáveis
                if (responsaveis && responsaveis.length > 0) {
                    const respUrls = responsaveis.flatMap(r => [r.documento_url, r.selfie_url]);
                    await deleteStorageByUrls(respUrls);
                    await supabase.from('empresa_responsaveis').delete().eq('empresa_id', id);
                }
                const { error } = await supabase.from('empresas').delete().eq('id', id);
                if (error) throw error;
                fetchEmpresas();
            } catch (err: any) {
                alert("Erro ao excluir: " + err.message);
            }
        }
    };

    const formatCNPJ = (cnpj: string) => {
        const cleaned = (cnpj || "").replace(/\D/g, "");
        return cleaned.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
    };

    const filteredEmpresas = empresas.filter(emp => {
        const term = searchTerm.toLowerCase();
        const responsaveis = emp.empresa_responsaveis?.map((r: any) => r.nome).join(' ') || '';
        const searchFields = [
            emp.codigo,
            emp.nome_fantasia,
            emp.razao_social,
            emp.cnpj,
            emp.logradouro,
            emp.endereco,
            emp.numero,
            emp.complemento,
            emp.bairro,
            emp.cidade,
            emp.estado,
            emp.cep,
            emp.responsavel_legal,
            emp.cadastrado_por,
            emp.observacoes,
            responsaveis,
        ];
        const matchesSearch = !term || searchFields.some(f => f?.toLowerCase().includes(term));

        const matchesStatus = statusFilter === "Todos os Status" ||
            (statusFilter === "Ativas" && emp.status === "Ativo") ||
            (statusFilter === "Inativas" && emp.status === "Inativo");

        return matchesSearch && matchesStatus;
    });

    // Gerar PDF / Imprimir fichas cadastrais das empresas selecionadas
    const handleExportPDF = async () => {
        if (selectedIds.size === 0) {
            alert('Selecione pelo menos uma empresa para gerar PDF.');
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
            if (config) {
                logoUrl = config.logo_url || '';
                rodapeUrl = config.rodape_url || '';
            }
        } catch (e) { }

        const selected = filteredEmpresas.filter(i => selectedIds.has(i.id));
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('N\u00e3o foi poss\u00edvel abrir a janela. Verifique se popups est\u00e3o permitidos.');
            return;
        }

        const logoHtml = logoUrl ? `<div class="header-logo"><img src="${logoUrl}" alt="Logo" /></div>` : '';
        const rodapeHtml = rodapeUrl ? `<div class="footer-img"><img src="${rodapeUrl}" alt="Rodap\u00e9" /></div>` : '';

        const fichas = selected.map(emp => {
            const rawBanco = emp.dados_bancarios ? (typeof emp.dados_bancarios === 'string' ? JSON.parse(emp.dados_bancarios) : emp.dados_bancarios) : null;
            const banco = Array.isArray(rawBanco) ? rawBanco[0] : rawBanco;
            const responsaveis = emp.empresa_responsaveis?.map((r: any) => r.nome).join(', ') || emp.responsavel_legal || '-';

            return `
                <div class="ficha">
                    ${logoHtml}
                    <h2>Ficha Cadastral da Empresa</h2>
                    <p class="codigo">${emp.codigo || '-'} \u2014 ${emp.nome_fantasia || '-'}</p>
                    <table>
                        <tr><th>C\u00f3digo</th><td>${emp.codigo || '-'}</td><th>Status</th><td>${emp.status || 'Ativo'}</td></tr>
                        <tr><th>Nome Fantasia</th><td colspan="3">${emp.nome_fantasia || '-'}</td></tr>
                        <tr><th>Raz\u00e3o Social</th><td colspan="3">${emp.razao_social || '-'}</td></tr>
                        <tr><th>CNPJ</th><td>${formatCNPJ(emp.cnpj)}</td><th>Resp. Legal</th><td>${responsaveis}</td></tr>

                        <tr><td colspan="4" class="section-title">Endere\u00e7o</td></tr>
                        <tr><th>Logradouro</th><td>${emp.logradouro || '-'}, ${emp.numero || 'S/N'}${emp.complemento ? ' (' + emp.complemento + ')' : ''}</td><th>Bairro</th><td>${emp.bairro || '-'}</td></tr>
                        <tr><th>Cidade/UF</th><td>${emp.cidade || '-'} / ${emp.estado || '-'}</td><th>CEP</th><td>${emp.cep || '-'}</td></tr>

                        ${banco ? `
                        <tr><td colspan="4" class="section-title">Dados Banc\u00e1rios</td></tr>
                        <tr><th>Banco</th><td>${banco.num_banco ? banco.num_banco + ' - ' : ''}${banco.banco || '-'}</td><th>Ag\u00eancia</th><td>${banco.agencia || '-'}</td></tr>
                        <tr><th>Conta</th><td>${banco.conta || '-'}</td><th>Tipo Conta</th><td>${banco.tipo_conta || '-'}</td></tr>
                        <tr><th>PIX</th><td colspan="3">${banco.chave_pix || banco.pix || '-'}</td></tr>
                        ` : ''}

                        ${emp.observacoes ? `
                        <tr><td colspan="4" class="section-title">Observa\u00e7\u00f5es</td></tr>
                        <tr><td colspan="4">${emp.observacoes}</td></tr>
                        ` : ''}
                    </table>
                    ${rodapeHtml}
                </div>
            `;
        }).join('<div class="page-break"></div>');

        printWindow.document.write(`
            <!DOCTYPE html>
            <html><head><title>Ficha Cadastral - Empresas</title>
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
            return new Promise<void>((resolve) => {
                img.onload = () => resolve();
                img.onerror = () => resolve();
            });
        });
        await Promise.all(imagePromises);

        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
            if (!isMobile) printWindow.close();
        }, 300);
    };

    // Exportar listagem para Excel
    const handleExportExcel = () => {
        const dataToExport = filteredEmpresas.map(emp => {
            const rawBanco = emp.dados_bancarios ? (typeof emp.dados_bancarios === 'string' ? JSON.parse(emp.dados_bancarios) : emp.dados_bancarios) : null;
            const banco = Array.isArray(rawBanco) ? rawBanco[0] : rawBanco;
            const responsaveis = emp.empresa_responsaveis?.map((r: any) => r.nome).join(', ') || emp.responsavel_legal || '';

            return {
                'C\u00f3digo': emp.codigo || '',
                'Nome Fantasia': emp.nome_fantasia || '',
                'Raz\u00e3o Social': emp.razao_social || '',
                'CNPJ': emp.cnpj || '',
                'Status': emp.status || 'Ativo',
                'Respons\u00e1vel Legal': responsaveis,
                'Logradouro': emp.logradouro || '',
                'N\u00famero': emp.numero || '',
                'Complemento': emp.complemento || '',
                'Bairro': emp.bairro || '',
                'Cidade': emp.cidade || '',
                'Estado': emp.estado || '',
                'CEP': emp.cep || '',
                'Banco': banco?.banco || '',
                'N\u00ba Banco': banco?.num_banco || '',
                'Ag\u00eancia': banco?.agencia || '',
                'Conta': banco?.conta || '',
                'Tipo Conta': banco?.tipo_conta || '',
                'Chave PIX': banco?.chave_pix || banco?.pix || '',
                'Observa\u00e7\u00f5es': emp.observacoes || '',
                'Cadastrado por': emp.cadastrado_por || '',
            };
        });

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Empresas');

        const colWidths = Object.keys(dataToExport[0] || {}).map(key => ({
            wch: Math.max(key.length, ...dataToExport.map(row => String((row as any)[key] || '').length)) + 2
        }));
        ws['!cols'] = colWidths;

        XLSX.writeFile(wb, `empresas_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    return (
        <div className="flex">
            <Sidebar />

            <main className="flex-1 md:ml-72 min-h-screen p-4 md:p-8 min-w-0 overflow-x-hidden">
                <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-serif-premium font-bold text-foreground mb-2 lowercase first-letter:uppercase">Gestão de Empresas</h1>
                        <p className="text-accent text-sm font-medium">Controle total sobre as unidades do grupo.</p>
                    </div>
                    <button
                        onClick={() => {
                            setSelectedEmpresa(null);
                            setIsCreateModalOpen(true);
                        }}
                        className="btn-elite px-8 py-3 flex items-center gap-3 transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Nova Unidade
                    </button>
                </header>

                {/* Filter and Control Bar */}
                <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4 border border-panel-border bg-panel/50 glass-elite p-4">
                    {/* Left Filters */}
                    <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="h-9 px-3 rounded-lg border border-transparent hover:border-panel-border bg-transparent text-[13px] font-medium text-foreground focus:outline-none focus:border-panel-border transition-all cursor-pointer"
                        >
                            <option>Todos os Status</option>
                            <option>Ativas</option>
                            <option>Inativas</option>
                        </select>
                        <div className="w-px h-5 bg-panel-border" />
                        <select className="h-9 px-3 rounded-lg border border-transparent hover:border-panel-border bg-transparent text-[13px] font-medium text-foreground focus:outline-none focus:border-panel-border transition-all cursor-pointer">
                            <option>Todas as Localidades</option>
                            <option>São Paulo</option>
                            <option>Rio de Janeiro</option>
                        </select>
                        <div className="w-px h-5 bg-panel-border" />
                        <button className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-accent hover:text-foreground transition-all shrink-0">
                            <Filter className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Right Controls */}
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <div className="relative flex-1 md:w-56">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-accent" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Pesquisar empresas..."
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
                    {loading && empresas.length === 0 ? (
                        <div className="p-32 flex flex-col items-center gap-6 text-accent">
                            <Loader2 className="w-12 h-12 text-primary animate-spin" />
                            <p className="text-xs uppercase tracking-[0.4em] font-black">Sincronizando...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse whitespace-nowrap">
                                <thead>
                                    <tr className="bg-black/5 dark:bg-white/5 border-b border-panel-border h-9">
                                        <th className="px-6 py-2 w-12 text-center">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded border-panel-border bg-transparent cursor-pointer"
                                                checked={filteredEmpresas.length > 0 && selectedIds.size === filteredEmpresas.length}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedIds(new Set(filteredEmpresas.map(emp => emp.id)));
                                                    } else {
                                                        setSelectedIds(new Set());
                                                    }
                                                }}
                                            />
                                        </th>
                                        <th className="px-6 py-2 label-premium text-[10px] text-accent align-middle">Código</th>
                                        <th className="px-6 py-2 label-premium text-[10px] text-accent align-middle">Nome da Empresa</th>
                                        <th className="px-6 py-2 label-premium text-[10px] text-accent align-middle">CNPJ</th>
                                        <th className="px-6 py-2 label-premium text-[10px] text-accent align-middle hidden md:table-cell">Responsável Legal</th>
                                        <th className="px-6 py-2 label-premium text-[10px] text-accent text-right pr-10 align-middle">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-panel-border">
                                    {filteredEmpresas.length === 0 ? (
                                        <tr><td colSpan={6} className="px-6 py-32 text-center text-accent italic">Nenhum registro.</td></tr>
                                    ) : (
                                        filteredEmpresas.map((empresa, i) => (
                                            <motion.tr
                                                key={empresa.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.03 }}
                                                onClick={() => handleOpenDetails(empresa)}
                                                className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer group"
                                            >
                                                <td className="px-6 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 rounded border-panel-border bg-transparent cursor-pointer"
                                                        checked={selectedIds.has(empresa.id)}
                                                        onChange={(e) => {
                                                            const newSelected = new Set(selectedIds);
                                                            if (e.target.checked) {
                                                                newSelected.add(empresa.id);
                                                            } else {
                                                                newSelected.delete(empresa.id);
                                                            }
                                                            setSelectedIds(newSelected);
                                                        }}
                                                    />
                                                </td>
                                                <td className="px-6 py-2 text-[13px] text-foreground">{empresa.codigo}</td>
                                                <td className="px-6 py-2 text-[13px] font-semibold text-foreground">{empresa.nome_fantasia}</td>
                                                <td className="px-6 py-2 text-[13px] text-foreground">{formatCNPJ(empresa.cnpj)}</td>

                                                <td className="px-6 py-2 text-[13px] text-foreground hidden md:table-cell">
                                                    {empresa.empresa_responsaveis?.length > 1
                                                        ? empresa.empresa_responsaveis.map((r: any) => r.nome.split(' ')[0]).join(' | ')
                                                        : empresa.empresa_responsaveis?.[0]?.nome || empresa.responsavel_legal || "-"}
                                                </td>

                                                <td className="px-6 py-2 text-right pr-6" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button
                                                            onClick={(e) => handleOpenEdit(empresa, e)}
                                                            className="w-8 h-8 flex items-center justify-center rounded-lg text-accent hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                                                            title="Editar"
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => handleDelete(empresa.id, e)}
                                                            className="w-8 h-8 flex items-center justify-center rounded-lg text-rose-500/70 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                                                            title="Excluir"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleOpenDetails(empresa); }}
                                                            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all ml-1"
                                                            title="Ver Detalhes"
                                                        >
                                                            <MoreHorizontal className="w-4 h-4" />
                                                        </button>
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

                <NovaEmpresaModal
                    isOpen={isCreateModalOpen}
                    initialData={selectedEmpresa}
                    onClose={() => setIsCreateModalOpen(false)}
                    onSuccess={fetchEmpresas}
                />

                <DetalhesEmpresaModal
                    isOpen={isDetailsModalOpen}
                    empresa={selectedEmpresa}
                    onClose={() => setIsDetailsModalOpen(false)}
                />
            </main>
        </div>
    );
}
