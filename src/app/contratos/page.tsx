"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";
import {
    Search,
    Plus,
    Edit2,
    Trash2,
    Loader2,
    AlertCircle,
    MoreHorizontal,
    Filter,
    FileText,
    Download,
    Printer
} from "lucide-react";
import { motion } from "framer-motion";
import { NovoContratoModal } from "@/components/NovoContratoModal";
import { DetalhesContratoModal } from "@/components/DetalhesContratoModal";
import { cn } from "@/lib/utils";
import * as XLSX from 'xlsx';

export default function ContratosPage() {
    const [contratos, setContratos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedContrato, setSelectedContrato] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("Todos os Status");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [userRole, setUserRole] = useState<string | null>(null);

    useEffect(() => {
        fetchContratos();

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

    async function fetchContratos() {
        try {
            setLoading(true);
            setError(null);
            const { data, error } = await supabase
                .from('contratos')
                .select(`
                    *,
                    clientes(nome_completo),
                    imoveis(
                        *,
                        proprietarios(*),
                        empresas(*)
                    ),
                    proprietarios(*)
                `)
                .not('codigo_contrato', 'is', null)
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (data) setContratos(data);
        } catch (err: any) {
            console.error("Erro ao buscar contratos:", err.message);
            setError("Não foi possível carregar os contratos.");
        } finally {
            setLoading(false);
        }
    }

    const handleCreate = () => {
        setSelectedContrato(null);
        setIsCreateModalOpen(true);
    };

    const handleView = (contrato: any) => {
        setSelectedContrato(contrato);
        setIsViewModalOpen(true);
    };

    const handleOpenEdit = (contrato: any, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedContrato(contrato);
        setIsCreateModalOpen(true);
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm("Tem certeza que deseja excluir este contrato? O contrato assinado e todos os dados serão removidos permanentemente.")) {
            try {
                const { data: contrato } = await supabase.from('contratos').select('contrato_assinado_url').eq('id', id).single();
                if (contrato?.contrato_assinado_url) {
                    const { deleteStorageByUrls } = await import('@/lib/storageUtils');
                    await deleteStorageByUrls([contrato.contrato_assinado_url]);
                }
                const { error } = await supabase.from('contratos').delete().eq('id', id);
                if (error) throw error;
                fetchContratos();
            } catch (err: any) {
                alert("Erro ao excluir: " + err.message);
            }
        }
    };

    const filteredContratos = contratos.filter(contrato => {
        const matchesSearch = (contrato.codigo_contrato?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
            (contrato.codigo_interno?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
            contrato.clientes?.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            contrato.imoveis?.endereco?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === "Todos os Status" ||
            contrato.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    // Exportar contratos selecionados para impressão/PDF
    const handleExportPDF = () => {
        if (selectedIds.size === 0) {
            alert('Selecione pelo menos um contrato para imprimir.');
            return;
        }

        const selected = filteredContratos.filter(c => selectedIds.has(c.id));
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Não foi possível abrir a janela de impressão. Verifique se popups estão permitidos.');
            return;
        }

        const rows = selected.map(c => `
            <tr>
                <td>${c.codigo_contrato || c.codigo_interno || '---'}</td>
                <td>
                    ${c.imoveis?.nome_identificacao || c.imoveis?.logradouro || c.imoveis?.endereco?.split(',')[0] || '-'}
                    ${!c.imoveis?.nome_identificacao && c.imoveis?.numero ? `, ${c.imoveis.numero}` : ''}
                    <br/><small>${c.clientes?.nome_completo || '-'}</small>
                </td>
                <td style="text-align:center">${c.status || '-'}</td>
                <td style="text-align:center">${c.data_inicio ? new Date(c.data_inicio).toLocaleDateString('pt-BR') : '-'}</td>
                <td style="text-align:center">${c.data_contrato ? new Date(c.data_contrato).toLocaleDateString('pt-BR') : c.created_at ? new Date(c.created_at).toLocaleDateString('pt-BR') : '-'}</td>
            </tr>
        `).join('');

        printWindow.document.write(`
            <!DOCTYPE html>
            <html><head><title>Contratos - Listagem</title>
            <style>
                @page { size: A4 landscape; margin: 15mm; }
                body { font-family: Arial, sans-serif; font-size: 10pt; color: #111; }
                h2 { text-align: center; margin-bottom: 15px; font-size: 14pt; }
                table { width: 100%; border-collapse: collapse; }
                th { background: #222; color: white; padding: 6px 10px; text-align: left; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.05em; }
                td { padding: 6px 10px; border-bottom: 1px solid #ddd; font-size: 10pt; vertical-align: top; }
                small { color: #666; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.05em; }
                .info { text-align: right; font-size: 8pt; color: #999; margin-bottom: 10px; }
            </style>
            </head><body>
                <h2>Gestão de Contratos</h2>
                <p class="info">${selected.length} contrato(s) selecionado(s) — ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                <table>
                    <thead>
                        <tr>
                            <th>Código</th>
                            <th>Imóvel / Cliente</th>
                            <th style="text-align:center">Status</th>
                            <th style="text-align:center">Data Inicial</th>
                            <th style="text-align:center">Data Contrato</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </body></html>
        `);
        printWindow.document.close();

        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
            if (!isMobile) printWindow.close();
        }, 300);
    };

    // Exportar listagem para Excel
    const handleExportExcel = () => {
        const dataToExport = filteredContratos.map(c => ({
            'Código': c.codigo_contrato || c.codigo_interno || '',
            'Imóvel': c.imoveis?.nome_identificacao || c.imoveis?.logradouro || c.imoveis?.endereco?.split(',')[0] || '',
            'Cliente': c.clientes?.nome_completo || '',
            'Status': c.status || '',
            'Data Inicial': c.data_inicio ? new Date(c.data_inicio).toLocaleDateString('pt-BR') : '',
            'Data Contrato': c.data_contrato ? new Date(c.data_contrato).toLocaleDateString('pt-BR') : c.created_at ? new Date(c.created_at).toLocaleDateString('pt-BR') : '',
            'Data Final': c.data_fim ? new Date(c.data_fim).toLocaleDateString('pt-BR') : '',
            'Valor Aluguel': c.valor_aluguel ? `R$ ${Number(c.valor_aluguel).toFixed(2).replace('.', ',')}` : '',
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Contratos');

        // Ajustar largura das colunas
        const colWidths = Object.keys(dataToExport[0] || {}).map(key => ({
            wch: Math.max(key.length, ...dataToExport.map(row => String((row as any)[key] || '').length)) + 2
        }));
        ws['!cols'] = colWidths;

        XLSX.writeFile(wb, `contratos_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    return (
        <div className="flex">
            <Sidebar />

            <main className="flex-1 md:ml-72 min-h-screen p-8 overflow-hidden">
                <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-serif-premium font-bold text-foreground mb-2 lowercase first-letter:uppercase">Gestão de Contratos</h1>
                        <p className="text-accent text-sm font-medium">Controle jurídico e financeiro das locações.</p>
                    </div>
                    <button
                        onClick={handleCreate}
                        className="btn-elite px-8 py-3 flex items-center gap-3 transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Novo Contrato
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
                            <option>Todos os Status</option>
                            <option>Aguardando Assinatura</option>
                            <option>Em Vigência</option>
                            <option>Finalizado</option>
                            <option>Cancelado</option>
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
                                placeholder="Buscar contratos..."
                                className="w-full h-9 bg-transparent border border-panel-border rounded-lg pl-9 pr-4 text-[13px] text-foreground focus:outline-none focus:border-primary transition-all placeholder:text-accent"
                            />
                        </div>
                        <button
                            onClick={handleExportPDF}
                            className="h-9 px-3 flex items-center gap-2 rounded-lg border border-panel-border bg-transparent text-[13px] font-medium text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-all shrink-0"
                        >
                            <FileText className="w-3.5 h-3.5 text-accent" /> Imprimir
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
                            <table className="w-full text-left border-collapse whitespace-nowrap min-w-0">
                                <thead>
                                    <tr className="bg-black/5 dark:bg-white/5 border-b border-panel-border h-9">
                                        <th className="px-3 py-2 w-10 text-center align-middle">
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
                                        <th className="px-3 py-2 text-[10px] font-black text-accent uppercase tracking-[0.15em] text-center align-middle">Código</th>
                                        <th className="px-3 py-2 text-[10px] font-black text-accent uppercase tracking-[0.15em] align-middle">Imóvel & Cliente</th>
                                        <th className="px-3 py-2 text-[10px] font-black text-accent uppercase tracking-[0.15em] text-center align-middle">Status</th>
                                        <th className="px-3 py-2 text-[10px] font-black text-accent uppercase tracking-[0.15em] text-center align-middle">Data Inicial</th>
                                        <th className="px-3 py-2 text-[10px] font-black text-accent uppercase tracking-[0.15em] text-center align-middle">Data Contrato</th>
                                        <th className="px-3 py-2 text-[10px] font-black text-accent uppercase tracking-[0.15em] text-right pr-4 align-middle">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-panel-border text-[13px] text-foreground">
                                    {filteredContratos.length === 0 ? (
                                        <tr><td colSpan={7} className="px-6 py-32 text-center text-accent italic">Nenhum registro encontrado.</td></tr>
                                    ) : (
                                        filteredContratos.map((contrato, i) => (
                                            <motion.tr
                                                key={contrato.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.03 }}
                                                onClick={() => handleView(contrato)}
                                                className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors group h-[36px] cursor-pointer"
                                            >
                                                <td className="px-3 py-2 text-center align-middle" onClick={(e) => e.stopPropagation()}>
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
                                                <td className="px-3 py-2 text-center align-middle">
                                                    <span className="text-[13px] font-bold text-foreground min-w-[50px] inline-block text-center">
                                                        {contrato.codigo_contrato || contrato.codigo_interno || '-----'}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 align-middle">
                                                    <div className="flex flex-col justify-center h-full">
                                                        <span className="font-semibold text-foreground truncate max-w-[200px]">
                                                            {contrato.imoveis?.nome_identificacao || contrato.imoveis?.logradouro || contrato.imoveis?.endereco?.split(',')[0] || 'Imóvel não associado'}
                                                            {!contrato.imoveis?.nome_identificacao && contrato.imoveis?.numero && `, ${contrato.imoveis.numero}`}
                                                        </span>
                                                        <span className="text-[9px] uppercase tracking-widest font-black leading-none mt-0.5 text-accent truncate max-w-[200px]">
                                                            {contrato.clientes?.nome_completo || 'Sem Inquilino'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2 text-center align-middle">
                                                    <span className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded",
                                                        contrato.status === "Em Vigência" ? "bg-accent/10 text-accent" :
                                                            contrato.status === "Finalizado" ? "bg-black/10 dark:bg-white/10 text-primary dark:text-white" :
                                                                contrato.status === "Aguardando Assinatura" ? "bg-amber-500/10 text-amber-500" :
                                                                    "bg-rose-500/10 text-rose-500"
                                                    )}>
                                                        {contrato.status}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 text-center align-middle">
                                                    <span className="text-[13px] text-accent font-medium">
                                                        {contrato.data_inicio ? new Date(contrato.data_inicio).toLocaleDateString('pt-BR') : '-'}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 text-center align-middle">
                                                    <span className="text-[13px] text-accent font-medium">
                                                        {contrato.data_contrato ? new Date(contrato.data_contrato).toLocaleDateString('pt-BR') : contrato.created_at ? new Date(contrato.created_at).toLocaleDateString('pt-BR') : '-'}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 text-right pr-3 align-middle" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center justify-end gap-0.5 h-full">
                                                        <button
                                                            onClick={(e) => handleOpenEdit(contrato, e)}
                                                            className="w-7 h-7 flex items-center justify-center rounded-lg text-accent hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                                                            title={contrato.status === 'Finalizado' ? "Visualizar" : "Editar"}
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
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
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleView(contrato); }}
                                                            className="w-7 h-7 flex items-center justify-center rounded-lg text-accent hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                                                            title="Imprimir"
                                                        >
                                                            <Printer className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleView(contrato); }}
                                                            className="w-7 h-7 flex items-center justify-center rounded-lg text-primary hover:text-primary hover:bg-primary/10 transition-all"
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

                <NovoContratoModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    onSuccess={fetchContratos}
                    initialData={isCreateModalOpen ? selectedContrato : null}
                    isReadOnly={selectedContrato?.status === 'Finalizado'}
                />

                <DetalhesContratoModal
                    isOpen={isViewModalOpen}
                    contrato={selectedContrato}
                    onClose={() => setIsViewModalOpen(false)}
                />
            </main>
        </div>
    );
}
