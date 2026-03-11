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
    Mail,
    Copy
} from "lucide-react";
import { motion } from "framer-motion";
import { NovoProprietarioModal } from "@/components/NovoProprietarioModal";
import { DetalhesProprietarioModal } from "@/components/DetalhesProprietarioModal";
import { HistoricoEmailsModal } from "@/components/HistoricoEmailsModal";
import { cn } from "@/lib/utils";
import * as XLSX from 'xlsx';

export default function ProprietariosPage() {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [selectedDetailsItem, setSelectedDetailsItem] = useState<any>(null);
    const [isEmailHistoryModalOpen, setIsEmailHistoryModalOpen] = useState(false);
    const [selectedEmailClient, setSelectedEmailClient] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("Todos os Status");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        try {
            setLoading(true);
            setError(null);
            const { data, error } = await supabase
                .from('proprietarios')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (data) setItems(data);
        } catch (err: any) {
            console.error("Erro ao buscar proprietários:", err.message);
            setError("Não foi possível carregar os proprietários.");
        } finally {
            setLoading(false);
        }
    }

    const handleCreate = () => {
        setSelectedItem(null);
        setIsCreateModalOpen(true);
    };

    const handleOpenEdit = (item: any, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedItem(item);
        setIsCreateModalOpen(true);
    };

    const handleDuplicate = (item: any, e: React.MouseEvent) => {
        e.stopPropagation();
        const { id, created_at, updated_at, documento_identidade_url, documento_selfie_url, codigo_interno, ...rest } = item;
        setSelectedItem({ ...rest, codigo_interno: '' });
        setIsCreateModalOpen(true);
    };

    const handleOpenDetails = (item: any) => {
        setSelectedDetailsItem(item);
        setIsDetailsModalOpen(true);
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm("Tem certeza que deseja excluir este proprietário? Todos os dados e documentos vinculados serão removidos permanentemente.")) {
            try {
                const { data: prop } = await supabase.from('proprietarios').select('*').eq('id', id).single();
                if (prop) {
                    const { deleteStorageByUrls } = await import('@/lib/storageUtils');
                    await deleteStorageByUrls([
                        prop.documento_identidade_url,
                        prop.documento_selfie_url,
                    ]);
                }
                const { error } = await supabase.from('proprietarios').delete().eq('id', id);
                if (error) throw error;
                fetchData();
            } catch (err: any) {
                alert("Erro ao excluir: " + err.message);
            }
        }
    };

    const formatId = (val: string) => {
        if (!val) return "-";
        const c = val.replace(/\D/g, "");
        if (c.length === 11) return c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
        if (c.length === 14) return c.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
        return val;
    };

    const formatPhone = (val: string) => {
        if (!val) return "-";
        const c = val.replace(/\D/g, "");
        if (c.length === 11) return c.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
        return val;
    };

    const filteredItems = items.filter(item => {
        const term = searchTerm.toLowerCase();
        const searchFields = [
            item.codigo_interno,
            item.nome_completo,
            item.documento,
            item.email,
            item.telefone,
            item.celular,
            item.logradouro,
            item.endereco,
            item.numero,
            item.complemento,
            item.bairro,
            item.cidade,
            item.estado,
            item.cep,
            item.tipo,
        ];
        const matchesSearch = !term || searchFields.some(f => f?.toLowerCase().includes(term));

        const matchesStatus = statusFilter === "Todos os Status" ||
            (statusFilter === "Ativos" && (item.status === "Ativo" || !item.status)) ||
            (statusFilter === "Inativos" && item.status === "Inativo");

        return matchesSearch && matchesStatus;
    });

    // Gerar PDF / Imprimir fichas cadastrais dos proprietários selecionados
    const handleExportPDF = async () => {
        if (selectedIds.size === 0) {
            alert('Selecione pelo menos um proprietário para gerar PDF.');
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

        const selected = filteredItems.filter(i => selectedIds.has(i.id));
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Não foi possível abrir a janela. Verifique se popups estão permitidos.');
            return;
        }

        const logoHtml = logoUrl ? `<div class="header-logo"><img src="${logoUrl}" alt="Logo" /></div>` : '';
        const rodapeHtml = rodapeUrl ? `<div class="footer-img"><img src="${rodapeUrl}" alt="Rodapé" /></div>` : '';

        const fichas = selected.map(p => {
            const endCompleto = `${p.logradouro || ''}${p.numero ? ', ' + p.numero : ''}${p.complemento ? ' (' + p.complemento + ')' : ''}`;
            const rawBanco = p.dados_bancarios ? (typeof p.dados_bancarios === 'string' ? JSON.parse(p.dados_bancarios) : p.dados_bancarios) : null;
            const banco = Array.isArray(rawBanco) ? rawBanco[0] : rawBanco;

            return `
                <div class="ficha">
                    ${logoHtml}
                    <h2>Ficha Cadastral do Proprietário</h2>
                    <p class="codigo">${p.codigo_interno || '-'} — ${p.nome_completo || '-'}</p>
                    <table>
                        <tr><th>Código</th><td>${p.codigo_interno || '-'}</td><th>Tipo</th><td>${p.tipo || 'PF'}</td></tr>
                        <tr><th>Nome Completo</th><td colspan="3">${p.nome_completo || '-'}</td></tr>
                        <tr><th>Documento</th><td>${formatId(p.documento)}</td><th>E-mail</th><td>${p.email || '-'}</td></tr>
                        <tr><th>Telefone</th><td>${formatPhone(p.telefone || p.celular)}</td><th>Celular</th><td>${formatPhone(p.celular || '')}</td></tr>
                        <tr><th>Logradouro</th><td>${p.logradouro || '-'}</td><th>Número</th><td>${p.numero || '-'}</td></tr>
                        <tr><th>Complemento</th><td>${p.complemento || '-'}</td><th>Bairro</th><td>${p.bairro || '-'}</td></tr>
                        <tr><th>Cidade</th><td>${p.cidade || '-'}</td><th>Estado</th><td>${p.estado || '-'}</td></tr>
                        <tr><th>CEP</th><td colspan="3">${p.cep || '-'}</td></tr>
                        ${banco ? `
                        <tr><td colspan="4" style="background:#f0f0f0;font-weight:700;text-transform:uppercase;font-size:9pt;letter-spacing:0.05em;padding:8px 10px">Dados Bancários</td></tr>
                        <tr><th>Banco</th><td>${banco.num_banco ? banco.num_banco + ' - ' : ''}${banco.banco || '-'}</td><th>Agência</th><td>${banco.agencia || '-'}</td></tr>
                        <tr><th>Conta</th><td>${banco.conta || '-'}</td><th>Tipo Conta</th><td>${banco.tipo_conta || '-'}</td></tr>
                        <tr><th>PIX</th><td colspan="3">${banco.chave_pix || banco.pix || '-'}</td></tr>
                        ` : ''}
                    </table>
                    ${rodapeHtml}
                </div>
            `;
        }).join('<div class="page-break"></div>');

        printWindow.document.write(`
            <!DOCTYPE html>
            <html><head><title>Ficha Cadastral - Proprietários</title>
            <style>
                @page { size: A4; margin: 15mm; }
                body { font-family: Arial, sans-serif; font-size: 10pt; color: #111; }
                .ficha { margin-bottom: 20px; }
                .header-logo { text-align: center; margin-bottom: 10px; }
                .header-logo img { max-height: 80px; max-width: 300px; object-fit: contain; }
                h2 { text-align: center; font-size: 14pt; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.1em; }
                .codigo { text-align: center; font-size: 9pt; color: #666; margin-bottom: 15px; }
                table { width: 100%; border-collapse: collapse; }
                th { background: #f5f5f5; padding: 6px 10px; text-align: left; font-size: 9pt; border: 1px solid #ddd; width: 15%; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; color: #444; }
                td { padding: 6px 10px; border: 1px solid #ddd; font-size: 10pt; width: 35%; }
                .page-break { page-break-after: always; }
                .info { text-align: right; font-size: 8pt; color: #999; margin-bottom: 10px; }
                .footer-img { text-align: center; margin-top: 20px; }
                .footer-img img { max-height: 60px; max-width: 100%; object-fit: contain; }
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
        const dataToExport = filteredItems.map(p => {
            const rawBanco = p.dados_bancarios ? (typeof p.dados_bancarios === 'string' ? JSON.parse(p.dados_bancarios) : p.dados_bancarios) : null;
            const banco = Array.isArray(rawBanco) ? rawBanco[0] : rawBanco;

            return {
                'Código': p.codigo_interno || '',
                'Nome Completo': p.nome_completo || '',
                'Tipo': p.tipo || 'PF',
                'Documento': p.documento || '',
                'E-mail': p.email || '',
                'Telefone': p.telefone || '',
                'Celular': p.celular || '',
                'Logradouro': p.logradouro || '',
                'Número': p.numero || '',
                'Complemento': p.complemento || '',
                'Bairro': p.bairro || '',
                'Cidade': p.cidade || '',
                'Estado': p.estado || '',
                'CEP': p.cep || '',
                'Banco': banco?.banco || '',
                'Nº Banco': banco?.num_banco || '',
                'Agência': banco?.agencia || '',
                'Conta': banco?.conta || '',
                'Tipo Conta': banco?.tipo_conta || '',
                'Chave PIX': banco?.chave_pix || banco?.pix || '',
            };
        });

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Proprietários');

        const colWidths = Object.keys(dataToExport[0] || {}).map(key => ({
            wch: Math.max(key.length, ...dataToExport.map(row => String((row as any)[key] || '').length)) + 2
        }));
        ws['!cols'] = colWidths;

        XLSX.writeFile(wb, `proprietarios_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    return (
        <div className="flex">
            <Sidebar />

            <main className="flex-1 md:ml-72 min-h-screen p-4 md:p-8 min-w-0 overflow-x-hidden">
                <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-serif-premium font-bold text-foreground mb-2 lowercase first-letter:uppercase">Gestão de Proprietários</h1>
                        <p className="text-accent text-sm font-medium">Controle os donos de imóveis da carteira.</p>
                    </div>
                    <button
                        onClick={handleCreate}
                        className="btn-elite px-8 py-3 flex items-center gap-3 transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Novo Proprietário
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
                            <option>Ativos</option>
                            <option>Inativos</option>
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
                                placeholder="Buscar proprietários..."
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
                    {loading && items.length === 0 ? (
                        <div className="p-32 flex flex-col items-center gap-6 text-accent">
                            <Loader2 className="w-12 h-12 text-primary animate-spin" />
                            <p className="text-xs uppercase tracking-[0.4em] font-black">Sincronizando...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse whitespace-nowrap">
                                <thead>
                                    <tr className="bg-black/5 dark:bg-white/5 border-b border-panel-border h-9">
                                        <th className="px-6 py-2 w-12 text-center align-middle">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded border-panel-border bg-transparent cursor-pointer"
                                                checked={filteredItems.length > 0 && selectedIds.size === filteredItems.length}
                                                onChange={(e) => {
                                                    if (e.target.checked) setSelectedIds(new Set(filteredItems.map(i => i.id)));
                                                    else setSelectedIds(new Set());
                                                }}
                                            />
                                        </th>
                                        <th className="px-6 py-2 text-[10px] font-black text-accent uppercase tracking-[0.2em] text-center align-middle">Código</th>
                                        <th className="px-6 py-2 text-[10px] font-black text-accent uppercase tracking-[0.2em] align-middle">Nome Completo</th>
                                        <th className="px-6 py-2 text-[10px] font-black text-accent uppercase tracking-[0.2em] text-center align-middle">Identificação</th>
                                        <th className="px-6 py-2 text-[10px] font-black text-accent uppercase tracking-[0.2em] text-center align-middle">Contato</th>
                                        <th className="px-6 py-2 text-[10px] font-black text-accent uppercase tracking-[0.2em] text-right pr-10 align-middle">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-panel-border text-[13px] text-foreground">
                                    {filteredItems.length === 0 ? (
                                        <tr><td colSpan={6} className="px-6 py-32 text-center text-accent italic">Nenhum registro encontrado.</td></tr>
                                    ) : (
                                        filteredItems.map((item, i) => (
                                            <motion.tr
                                                key={item.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.03 }}
                                                onClick={() => handleOpenDetails(item)}
                                                className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors group h-[36px] cursor-pointer"
                                            >
                                                <td className="px-6 py-2 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 rounded border-panel-border bg-transparent cursor-pointer"
                                                        checked={selectedIds.has(item.id)}
                                                        onChange={(e) => {
                                                            const newSelected = new Set(selectedIds);
                                                            if (e.target.checked) newSelected.add(item.id);
                                                            else newSelected.delete(item.id);
                                                            setSelectedIds(newSelected);
                                                        }}
                                                    />
                                                </td>
                                                <td className="px-6 py-2 text-center align-middle">
                                                    <span className="text-[13px] font-bold text-foreground w-16 inline-block text-center">{item.codigo_interno || '-----'}</span>
                                                </td>
                                                <td className="px-6 py-2 align-middle">
                                                    <div className="flex flex-col justify-center h-full">
                                                        <span className="font-semibold text-foreground truncate max-w-[250px]">{item.nome_completo}</span>
                                                        <span className="text-[9px] uppercase tracking-widest font-black leading-none mt-0.5 text-accent truncate">
                                                            {item.email || 'Sem e-mail'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-2 text-center align-middle">
                                                    <span className="text-[13px] text-foreground font-medium">{formatId(item.documento)}</span>
                                                </td>
                                                <td className="px-6 py-2 text-center align-middle">
                                                    {item.celular || item.telefone ? (
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-foreground font-bold">{formatPhone(item.celular || item.telefone)}</span>
                                                        </div>
                                                    ) : <span className="text-accent">-</span>}
                                                </td>
                                                <td className="px-6 py-2 text-right pr-6 align-middle" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center justify-end gap-1 h-full">
                                                        <button
                                                            onClick={(e) => handleOpenEdit(item, e)}
                                                            className="w-7 h-7 flex items-center justify-center rounded-lg text-accent hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                                                            title="Editar"
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => handleDuplicate(item, e)}
                                                            className="w-7 h-7 flex items-center justify-center rounded-lg text-accent hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                                                            title="Duplicar"
                                                        >
                                                            <Copy className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => handleDelete(item.id, e)}
                                                            className="w-7 h-7 flex items-center justify-center rounded-lg text-rose-500/70 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                                                            title="Excluir"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedEmailClient(item);
                                                                setIsEmailHistoryModalOpen(true);
                                                            }}
                                                            className="w-7 h-7 flex items-center justify-center rounded-lg text-accent hover:text-primary hover:bg-primary/10 transition-all"
                                                            title="Histórico de E-mails"
                                                        >
                                                            <Mail className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleOpenDetails(item); }}
                                                            className="w-7 h-7 flex items-center justify-center rounded-lg text-primary hover:text-primary hover:bg-primary/10 transition-all ml-1"
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

                <NovoProprietarioModal
                    isOpen={isCreateModalOpen}
                    initialData={selectedItem}
                    onClose={() => setIsCreateModalOpen(false)}
                    onSuccess={fetchData}
                />

                <DetalhesProprietarioModal
                    isOpen={isDetailsModalOpen}
                    proprietario={selectedDetailsItem}
                    onClose={() => setIsDetailsModalOpen(false)}
                />

                <HistoricoEmailsModal
                    isOpen={isEmailHistoryModalOpen}
                    cliente={selectedEmailClient}
                    tipo="proprietario"
                    onClose={() => setIsEmailHistoryModalOpen(false)}
                />
            </main>
        </div>
    );
}

