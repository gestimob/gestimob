"use client";

import { useState, useEffect, Suspense } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useSearchParams } from "next/navigation";
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
    Building2,
    Home,
    MapPin,
    Printer
} from "lucide-react";
import { motion } from "framer-motion";
import { NovoImovelModal } from "@/components/NovoImovelModal";
import { DetalhesImovelModal } from "@/components/DetalhesImovelModal";
import { cn } from "@/lib/utils";
import * as XLSX from 'xlsx';

export default function ImoveisPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen bg-background items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        }>
            <ImoveisContent />
        </Suspense>
    );
}

function ImoveisContent() {
    const [imoveis, setImoveis] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedImovel, setSelectedImovel] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("Todos os Status");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const searchParams = useSearchParams();
    const statusParam = searchParams.get('status');

    useEffect(() => {
        if (statusParam === 'Alugado') setStatusFilter('Alugado');
        else if (statusParam === 'Disponivel') setStatusFilter('Disponível');
        fetchImoveis();
    }, [statusParam]);

    async function fetchImoveis() {
        try {
            setLoading(true);
            setError(null);
            const { data, error } = await supabase
                .from('imoveis')
                .select('*, empresas(nome_fantasia), proprietarios(nome_completo)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (data) setImoveis(data);
        } catch (err: any) {
            console.error("Erro ao buscar imóveis:", err.message);
            setError("Não foi possível carregar os imóveis.");
        } finally {
            setLoading(false);
        }
    }

    const handleOpenDetails = (imovel: any) => {
        setSelectedImovel(imovel);
        setIsDetailsModalOpen(true);
    };

    const handleOpenEdit = (imovel: any, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedImovel(imovel);
        setIsCreateModalOpen(true);
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm("Tem certeza que deseja excluir este imóvel? Todos os dados, arquivos, aluguéis e contratos vinculados serão removidos permanentemente.")) {
            try {
                // Buscar dados do imóvel para limpar storage
                const { data: imovel } = await supabase.from('imoveis').select('*').eq('id', id).single();
                if (imovel) {
                    const { deleteStorageByUrls, deleteStorageFolder } = await import('@/lib/storageUtils');
                    // Deletar fotos, matrícula e boleto IPTU do storage
                    const urls = [...(imovel.fotos_urls || []), imovel.arquivo_matricula_url, imovel.iptu_pdf_url];
                    await deleteStorageByUrls(urls);
                }
                // Deletar contratos vinculados e seus arquivos
                const { data: contratos } = await supabase.from('contratos').select('id, contrato_assinado_url').eq('imovel_id', id);
                if (contratos && contratos.length > 0) {
                    const { deleteStorageByUrls } = await import('@/lib/storageUtils');
                    await deleteStorageByUrls(contratos.map(c => c.contrato_assinado_url));
                    await supabase.from('contratos').delete().eq('imovel_id', id);
                }
                // Deletar aluguéis vinculados
                await supabase.from('alugueis').delete().eq('imovel_id', id);
                // Deletar o imóvel
                const { error } = await supabase.from('imoveis').delete().eq('id', id);
                if (error) throw error;
                fetchImoveis();
            } catch (err: any) {
                alert("Erro ao excluir: " + err.message);
            }
        }
    };

    const filteredImoveis = imoveis.filter(imovel => {
        const term = searchTerm.toLowerCase();
        const searchFields = [
            imovel.codigo_interno,
            imovel.nome_identificacao,
            imovel.logradouro,
            imovel.endereco,
            imovel.numero,
            imovel.complemento,
            imovel.bairro,
            imovel.cidade,
            imovel.estado,
            imovel.cep,
            imovel.tipo,
            imovel.tipo_aluguel,
            imovel.andar_imovel,
            imovel.inscricao_iptu,
            imovel.num_matricula,
            imovel.num_energisa,
            imovel.num_cagepa,
            imovel.proprietarios?.nome_completo,
            imovel.empresas?.nome_fantasia,
            imovel.status,
            imovel.valor_aluguel?.toString(),
            imovel.valor_condominio?.toString(),
            imovel.area_m2?.toString(),
            imovel.quartos?.toString(),
        ];
        const matchesSearch = !term || searchFields.some(f => f?.toLowerCase().includes(term));

        const matchesStatus = statusFilter === "Todos os Status" ||
            (statusFilter === "Disponível" && (imovel.status === "Disponível" || !imovel.status)) ||
            (statusFilter === "Alugado" && imovel.status === "Alugado") ||
            (statusFilter === "Inativo" && imovel.status === "Inativo");

        return matchesSearch && matchesStatus;
    });

    // Gerar PDF / Imprimir fichas cadastrais dos imóveis selecionados
    const handleExportPDF = async () => {
        if (selectedIds.size === 0) {
            alert('Selecione pelo menos um imóvel para gerar PDF.');
            return;
        }

        // Buscar configurações (logo + rodapé)
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
        } catch (e) { /* sem config, sem logo */ }

        const selected = filteredImoveis.filter(i => selectedIds.has(i.id));
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Não foi possível abrir a janela. Verifique se popups estão permitidos.');
            return;
        }

        const logoHtml = logoUrl ? `<div class="header-logo"><img src="${logoUrl}" alt="Logo" /></div>` : '';
        const rodapeHtml = rodapeUrl ? `<div class="footer-img"><img src="${rodapeUrl}" alt="Rodapé" /></div>` : '';

        const fichas = selected.map(im => {
            const proprietario = im.proprietarios?.nome_completo || im.empresas?.nome_fantasia || '-';
            const enderecoCompleto = `${im.logradouro || im.endereco?.split(',')[0] || ''}${im.numero ? ', ' + im.numero : ''}${im.complemento ? ' (' + im.complemento + ')' : ''}`;
            const formatBRL = (v: any) => v ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-';

            return `
                <div class="ficha">
                    ${logoHtml}
                    <h2>Ficha Cadastral do Imóvel</h2>
                    <p class="codigo">${im.codigo_interno || '-'} — ${im.nome_identificacao || enderecoCompleto}</p>
                    <table>
                        <tr><th>Código</th><td>${im.codigo_interno || '-'}</td><th>Status</th><td>${im.status || 'Disponível'}</td></tr>
                        <tr><th>Nome / Identificação</th><td colspan="3">${im.nome_identificacao || '-'}</td></tr>
                        <tr><th>Logradouro</th><td>${im.logradouro || '-'}</td><th>Número</th><td>${im.numero || '-'}</td></tr>
                        <tr><th>Complemento</th><td>${im.complemento || '-'}</td><th>Andar</th><td>${im.andar_imovel || '-'}</td></tr>
                        <tr><th>Bairro</th><td>${im.bairro || '-'}</td><th>Cidade</th><td>${im.cidade || '-'}</td></tr>
                        <tr><th>Estado</th><td>${im.estado || '-'}</td><th>CEP</th><td>${im.cep || '-'}</td></tr>
                        <tr><th>Tipo</th><td>${im.tipo || '-'}</td><th>Finalidade</th><td>${im.tipo_aluguel || '-'}</td></tr>
                        <tr><th>Área (m²)</th><td>${im.area_m2 || '-'}</td><th>Quartos</th><td>${im.quartos || '-'}</td></tr>
                        <tr><th>Suítes</th><td>${im.suites || '-'}</td><th>Banheiros</th><td>${im.banheiros || '-'}</td></tr>
                        <tr><th>Vagas</th><td>${im.vagas || '-'}</td><th>Proprietário</th><td>${proprietario}</td></tr>
                        <tr><th>Aluguel</th><td>${formatBRL(im.valor_aluguel)}</td><th>Condomínio</th><td>${formatBRL(im.valor_condominio)}</td></tr>
                        <tr><th>Inscrição IPTU</th><td>${im.inscricao_iptu || '-'} ${im.iptu_vencimento ? ` (Venc: ${new Date(im.iptu_vencimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })})` : ''}</td><th>Nº Matrícula</th><td>${im.num_matricula || '-'}</td></tr>
                        <tr><th>Nº Energisa</th><td>${im.num_energisa || '-'}</td><th>Nº Cagepa</th><td>${im.num_cagepa || '-'}</td></tr>
                    </table>
                    ${rodapeHtml}
                </div>
            `;
        }).join('<div class="page-break"></div>');

        printWindow.document.write(`
            <!DOCTYPE html>
            <html><head><title>Ficha Cadastral - Imóveis</title>
            <style>
                @page { size: A4; margin: 15mm; }
                body { font-family: Arial, sans-serif; font-size: 10pt; color: #111; }
                .ficha { margin-bottom: 20px; position: relative; }
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

        // Aguardar imagens carregarem antes de imprimir
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
        const dataToExport = filteredImoveis.map(im => ({
            'Código': im.codigo_interno || '',
            'Nome': im.nome_identificacao || '',
            'Logradouro': im.logradouro || '',
            'Número': im.numero || '',
            'Complemento': im.complemento || '',
            'Bairro': im.bairro || '',
            'Cidade': im.cidade || '',
            'Estado': im.estado || '',
            'CEP': im.cep || '',
            'Tipo': im.tipo || '',
            'Finalidade': im.tipo_aluguel || '',
            'Status': im.status || 'Disponível',
            'Área m²': im.area_m2 || '',
            'Quartos': im.quartos || '',
            'Suítes': im.suites || '',
            'Banheiros': im.banheiros || '',
            'Vagas': im.vagas || '',
            'Aluguel': im.valor_aluguel ? `R$ ${Number(im.valor_aluguel).toFixed(2).replace('.', ',')}` : '',
            'Condomínio': im.valor_condominio ? `R$ ${Number(im.valor_condominio).toFixed(2).replace('.', ',')}` : '',
            'IPTU': im.valor_iptu ? `R$ ${Number(im.valor_iptu).toFixed(2).replace('.', ',')}` : '',
            'Proprietário': im.proprietarios?.nome_completo || im.empresas?.nome_fantasia || '',
            'Inscrição IPTU': `${im.inscricao_iptu || ''}${im.iptu_vencimento ? ` (Venc: ${new Date(im.iptu_vencimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })})` : ''}`.trim(),
            'Nº Matrícula': im.num_matricula || '',
            'Nº Energisa': im.num_energisa || '',
            'Nº Cagepa': im.num_cagepa || '',
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Imóveis');

        const colWidths = Object.keys(dataToExport[0] || {}).map(key => ({
            wch: Math.max(key.length, ...dataToExport.map(row => String((row as any)[key] || '').length)) + 2
        }));
        ws['!cols'] = colWidths;

        XLSX.writeFile(wb, `imoveis_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    return (
        <div className="flex">
            <Sidebar />

            <main className="flex-1 md:ml-72 min-h-screen p-4 md:p-8 min-w-0 overflow-x-hidden">
                <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-serif-premium font-bold text-foreground mb-2 lowercase first-letter:uppercase">Gestão de Imóveis</h1>
                        <p className="text-accent text-sm font-medium">Controle e cadastro completo das propriedades.</p>
                    </div>
                    <button
                        onClick={() => {
                            setSelectedImovel(null);
                            setIsCreateModalOpen(true);
                        }}
                        className="btn-elite px-8 py-3 flex items-center gap-3 transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Novo Imóvel
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
                            <option>Disponível</option>
                            <option>Alugado</option>
                            <option>Inativo</option>
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
                                placeholder="Buscar imóveis..."
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
                    {loading && imoveis.length === 0 ? (
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
                                                checked={filteredImoveis.length > 0 && selectedIds.size === filteredImoveis.length}
                                                onChange={(e) => {
                                                    if (e.target.checked) setSelectedIds(new Set(filteredImoveis.map(i => i.id)));
                                                    else setSelectedIds(new Set());
                                                }}
                                            />
                                        </th>
                                        <th className="px-6 py-2 label-premium text-[10px] text-accent text-center align-middle">Código</th>
                                        <th className="px-6 py-2 label-premium text-[10px] text-accent align-middle">Imóvel & Tipo</th>
                                        <th className="px-6 py-2 label-premium text-[10px] text-accent align-middle">Bairro</th>
                                        <th className="px-6 py-2 label-premium text-[10px] text-accent align-middle">Proprietário</th>
                                        <th className="px-6 py-2 label-premium text-[10px] text-accent text-right pr-6">Aluguel / Cond.</th>
                                        <th className="px-6 py-2 label-premium text-[10px] text-accent text-right pr-10 align-middle">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-panel-border text-[13px] text-foreground">
                                    {filteredImoveis.length === 0 ? (
                                        <tr><td colSpan={7} className="px-6 py-32 text-center text-accent italic">Nenhum registro encontrado.</td></tr>
                                    ) : (
                                        filteredImoveis.map((imovel, i) => (
                                            <motion.tr
                                                key={imovel.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.03 }}
                                                onClick={() => handleOpenDetails(imovel)}
                                                className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer group h-[36px]"
                                            >
                                                <td className="px-6 py-2 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 rounded border-panel-border bg-transparent cursor-pointer"
                                                        checked={selectedIds.has(imovel.id)}
                                                        onChange={(e) => {
                                                            const newSelected = new Set(selectedIds);
                                                            if (e.target.checked) newSelected.add(imovel.id);
                                                            else newSelected.delete(imovel.id);
                                                            setSelectedIds(newSelected);
                                                        }}
                                                    />
                                                </td>
                                                <td className="px-6 py-2 text-center align-middle">
                                                    <span className="text-[13px] font-bold text-foreground w-16 inline-block text-center">{imovel.codigo_interno || '-----'}</span>
                                                </td>
                                                <td className="px-6 py-2 align-middle">
                                                    <div className="flex items-center gap-3 h-full">
                                                        <div className="flex flex-col justify-center h-full max-w-[250px]">
                                                            <span className="font-semibold text-foreground truncate" title={imovel.endereco}>
                                                                {imovel.nome_identificacao || imovel.logradouro || imovel.endereco?.split(',')[0] || 'Imóvel sem identificação'}
                                                                {!imovel.nome_identificacao && imovel.numero && `, ${imovel.numero}`}
                                                                {!imovel.nome_identificacao && imovel.complemento && ` (${imovel.complemento})`}
                                                            </span>
                                                            <span className="label-premium text-[10px] text-accent leading-none truncate mt-0.5">{imovel.tipo} • {imovel.tipo_aluguel || 'Residencial'}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-2 align-middle max-w-[150px] truncate">{imovel.bairro || '-'}</td>
                                                <td className="px-6 py-2 align-middle max-w-[150px] truncate">{imovel.proprietarios?.nome_completo || imovel.empresas?.nome_fantasia || '-'}</td>
                                                <td className="px-6 py-2 text-right pr-6 align-middle">
                                                    <div className="flex flex-col items-end h-full justify-center">
                                                        <span className="font-semibold text-accent">R$ {Number(imovel.valor_aluguel || 0).toLocaleString('pt-br', { minimumFractionDigits: 2 })}</span>
                                                        <span className="label-premium text-[10px] text-accent leading-none">Cond. R$ {Number(imovel.valor_condominio || 0).toLocaleString('pt-br', { minimumFractionDigits: 2 })}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-2 text-right pr-6 align-middle" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center justify-end gap-1 h-full">
                                                        <button
                                                            onClick={(e) => handleOpenEdit(imovel, e)}
                                                            className="w-7 h-7 flex items-center justify-center rounded-lg text-accent hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                                                            title="Editar"
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => handleDelete(imovel.id, e)}
                                                            className="w-7 h-7 flex items-center justify-center rounded-lg text-rose-500/70 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                                                            title="Excluir"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleOpenDetails(imovel); }}
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

                <NovoImovelModal
                    isOpen={isCreateModalOpen}
                    initialData={selectedImovel}
                    onClose={() => setIsCreateModalOpen(false)}
                    onSuccess={fetchImoveis}
                />

                <DetalhesImovelModal
                    isOpen={isDetailsModalOpen}
                    imovel={selectedImovel}
                    onClose={() => setIsDetailsModalOpen(false)}
                />
            </main>
        </div>
    );
}
