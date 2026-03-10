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
    User,
    Users,
    Mail
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { NovoClienteModal } from "@/components/NovoClienteModal";
import { DetalhesClienteModal } from "@/components/DetalhesClienteModal";
import { HistoricoEmailsModal } from "@/components/HistoricoEmailsModal";
import { cn } from "@/lib/utils";
import * as XLSX from 'xlsx';

export default function ClientesPage() {
    const [clientes, setClientes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedCliente, setSelectedCliente] = useState<any>(null);
    const [isEmailHistoryModalOpen, setIsEmailHistoryModalOpen] = useState(false);
    const [selectedEmailClient, setSelectedEmailClient] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("Todos os Status");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        fetchClientes();
    }, []);

    async function fetchClientes() {
        try {
            setLoading(true);
            setError(null);
            const { data, error } = await supabase
                .from('clientes')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (data) setClientes(data);
        } catch (err: any) {
            console.error("Erro ao buscar clientes:", err.message);
            setError("Não foi possível carregar os clientes.");
        } finally {
            setLoading(false);
        }
    }

    const handleCreate = () => {
        setSelectedCliente(null);
        setIsCreateModalOpen(true);
    };

    const handleOpenDetails = (cliente: any) => {
        setSelectedCliente(cliente);
        setIsDetailsModalOpen(true);
    };

    const handleOpenEdit = (cliente: any, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedCliente(cliente);
        setIsCreateModalOpen(true);
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm("Tem certeza que deseja excluir este cliente? Todos os dados, documentos, aluguéis e contratos vinculados serão removidos permanentemente.")) {
            try {
                const { data: cliente } = await supabase.from('clientes').select('*').eq('id', id).single();
                if (cliente) {
                    const { deleteStorageByUrls } = await import('@/lib/storageUtils');
                    await deleteStorageByUrls([
                        cliente.documento_identidade_url,
                        cliente.comprovante_residencia_url,
                        cliente.selfie_url,
                        cliente.documento_conjuge_url,
                    ]);
                }
                // Deletar representantes vinculados
                await supabase.from('cliente_representantes').delete().eq('cliente_id', id);
                // Deletar contratos vinculados e seus arquivos
                const { data: contratos } = await supabase.from('contratos').select('id, contrato_assinado_url').eq('cliente_id', id);
                if (contratos && contratos.length > 0) {
                    const { deleteStorageByUrls } = await import('@/lib/storageUtils');
                    await deleteStorageByUrls(contratos.map(c => c.contrato_assinado_url));
                    await supabase.from('contratos').delete().eq('cliente_id', id);
                }
                // Deletar aluguéis vinculados
                await supabase.from('alugueis').delete().eq('cliente_id', id);
                // Deletar o cliente
                const { error } = await supabase.from('clientes').delete().eq('id', id);
                if (error) throw error;
                fetchClientes();
            } catch (err: any) {
                alert("Erro ao excluir: " + err.message);
            }
        }
    };

    const formatId = (val: string, type: string) => {
        if (!val) return "-";
        const c = val.replace(/\D/g, "");
        if (type === "PF") return c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
        if (c.length === 14) return c.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
        return val;
    };

    const formatPhone = (value: string | undefined | null) => {
        if (!value) return "-";
        let val = value.replace(/\D/g, "");
        if (!val) return "-";
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

    const filteredClientes = clientes.filter(cliente => {
        const term = searchTerm.toLowerCase();
        const searchFields = [
            cliente.codigo_interno,
            cliente.nome_completo,
            cliente.nome_fantasia,
            cliente.razao_social,
            cliente.documento,
            cliente.rg,
            cliente.cnh,
            cliente.email,
            cliente.telefone,
            cliente.celular,
            cliente.logradouro,
            cliente.endereco,
            cliente.numero,
            cliente.complemento,
            cliente.bairro,
            cliente.cidade,
            cliente.estado,
            cliente.cep,
            cliente.tipo,
            cliente.profissao,
            cliente.empresa_trabalho,
            cliente.cargo_funcao,
            cliente.naturalidade,
            cliente.nacionalidade,
            cliente.estado_civil,
            cliente.sexo,
            cliente.conjuge_nome,
            cliente.conjuge_cpf,
        ];
        const matchesSearch = !term || searchFields.some(f => f?.toLowerCase().includes(term));

        const matchesStatus = statusFilter === "Todos os Status" ||
            (statusFilter === "Ativos" && cliente.status === "Ativo") ||
            (statusFilter === "Locatários" && cliente.papel !== 'Apenas Fiador') ||
            (statusFilter === "Fiadores" && (cliente.papel === 'Apenas Fiador' || cliente.papel === 'Locatário e Fiador'));

        return matchesSearch && matchesStatus;
    });

    // Gerar PDF / Imprimir fichas cadastrais dos clientes selecionados
    const handleExportPDF = async () => {
        if (selectedIds.size === 0) {
            alert('Selecione pelo menos um cliente para gerar PDF.');
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

        const selected = filteredClientes.filter(i => selectedIds.has(i.id));
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('N\u00e3o foi poss\u00edvel abrir a janela. Verifique se popups est\u00e3o permitidos.');
            return;
        }

        const logoHtml = logoUrl ? `<div class="header-logo"><img src="${logoUrl}" alt="Logo" /></div>` : '';
        const rodapeHtml = rodapeUrl ? `<div class="footer-img"><img src="${rodapeUrl}" alt="Rodap\u00e9" /></div>` : '';
        const formatBRL = (v: any) => v ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-';

        const fichas = selected.map(c => {
            const nome = c.tipo === 'PF' ? c.nome_completo : (c.nome_fantasia || c.razao_social || c.nome_completo);
            const dataNasc = c.data_nascimento ? new Date(c.data_nascimento).toLocaleDateString('pt-BR') : '-';
            const papel = c.papel || 'Locatário';

            let conjugeHtml = '';
            if (c.conjuge_nome) {
                conjugeHtml = `
                    <tr><td colspan="4" class="section-title">Cônjuge</td></tr>
                    <tr><th>Nome</th><td>${c.conjuge_nome || '-'}</td><th>CPF</th><td>${c.conjuge_cpf || '-'}</td></tr>
                    <tr><th>RG</th><td>${c.conjuge_rg || '-'} ${c.conjuge_orgao_expedidor ? '/ ' + c.conjuge_orgao_expedidor : ''}</td><th>Nasc.</th><td>${c.conjuge_data_nascimento || '-'}</td></tr>
                    <tr><th>Profissão</th><td>${c.conjuge_profissao || '-'}</td><th>Empresa</th><td>${c.conjuge_empresa || '-'}</td></tr>
                    <tr><th>Cargo</th><td>${c.conjuge_cargo || '-'}</td><th>Renda</th><td>${formatBRL(c.conjuge_renda)}</td></tr>
                `;
            }

            return `
                <div class="ficha">
                    ${logoHtml}
                    <h2>Ficha Cadastral do Cliente</h2>
                    <p class="codigo">${c.codigo_interno || '-'} — ${nome} (${papel})</p>
                    <table>
                        <tr><th>Código</th><td>${c.codigo_interno || '-'}</td><th>Tipo</th><td>${c.tipo || 'PF'} • ${papel}</td></tr>
                        <tr><th>Nome</th><td colspan="3">${c.nome_completo || '-'}</td></tr>
                        ${c.tipo === 'PJ' ? `<tr><th>Fantasia</th><td>${c.nome_fantasia || '-'}</td><th>Insc. Est.</th><td>${c.inscricao_estadual || '-'}</td></tr>` : ''}
                        <tr><th>CPF/CNPJ</th><td>${formatId(c.documento, c.tipo)}</td><th>RG</th><td>${c.rg || '-'} ${c.orgao_expedidor ? '/ ' + c.orgao_expedidor : ''}</td></tr>
                        <tr><th>CNH</th><td>${c.cnh || '-'}</td><th>E-mail</th><td>${c.email || '-'}</td></tr>
                        <tr><th>Celular</th><td>${formatPhone(c.celular)}</td><th>Telefone</th><td>${formatPhone(c.telefone)}</td></tr>
                        <tr><th>Nasc.</th><td>${c.data_nascimento || '-'}</td><th>Sexo</th><td>${c.sexo || '-'} / ${c.estado_civil || '-'}</td></tr>
                        <tr><th>Naturalidade</th><td>${c.naturalidade || '-'} / ${c.nacionalidade || '-'}</td><th>Filiação</th><td>${c.filiacao || '-'}</td></tr>

                        <tr><td colspan="4" class="section-title">Endereço</td></tr>
                        <tr><th>Logradouro</th><td>${c.logradouro || '-'}, ${c.numero || 'S/N'}${c.complemento ? ' (' + c.complemento + ')' : ''}</td><th>Bairro</th><td>${c.bairro || '-'}</td></tr>
                        <tr><th>Cidade/UF</th><td>${c.cidade || '-'} / ${c.estado || '-'}</td><th>CEP</th><td>${c.cep || '-'}</td></tr>
                        <tr><th>Tipo Resid.</th><td>${c.tipo_residencia || '-'}</td><th>Tempo / Vlr.</th><td>${c.tempo_residencia || '-'} / ${formatBRL(c.valor_aluguel)}</td></tr>

                        <tr><td colspan="4" class="section-title">Dados Profissionais</td></tr>
                        <tr><th>Profissão</th><td>${c.profissao || '-'}</td><th>Atividade</th><td>${c.atividade || '-'}</td></tr>
                        <tr><th>Empresa</th><td>${c.empresa_trabalho || '-'}</td><th>CNPJ</th><td>${c.empresa_cnpj || '-'}</td></tr>
                        <tr><th>Cargo</th><td>${c.cargo_funcao || '-'}</td><th>Admissão</th><td>${c.data_admissao || '-'}</td></tr>
                        <tr><th>Renda</th><td>${formatBRL(c.renda_principal)}</td><th>Outras</th><td>${formatBRL(c.outras_rendas)} ${c.num_dependentes ? '• ' + c.num_dependentes + ' dep.' : ''}</td></tr>

                        ${conjugeHtml}
                    </table>
                    ${rodapeHtml}
                </div>
            `;
        }).join('<div class="page-break"></div>');

        printWindow.document.write(`
            <!DOCTYPE html>
            <html><head><title>Ficha Cadastral - Clientes</title>
            <style>
                @page { size: A4; margin: 8mm 10mm; }
                body { font-family: Arial, sans-serif; font-size: 8pt; color: #111; margin: 0; padding: 0; }
                .ficha { margin-bottom: 0; }
                .header-logo { text-align: center; margin-bottom: 4px; }
                .header-logo img { max-height: 50px; max-width: 250px; object-fit: contain; }
                h2 { text-align: center; font-size: 11pt; margin: 2px 0; text-transform: uppercase; letter-spacing: 0.08em; }
                .codigo { text-align: center; font-size: 7pt; color: #666; margin: 1px 0 6px 0; }
                table { width: 100%; border-collapse: collapse; }
                th { background: #f5f5f5; padding: 3px 5px; text-align: left; font-size: 7pt; border: 1px solid #ccc; width: 13%; font-weight: 700; text-transform: uppercase; letter-spacing: 0.02em; color: #444; }
                td { padding: 3px 5px; border: 1px solid #ccc; font-size: 8pt; width: 37%; }
                .section-title { background: #e0e0e0; font-weight: 700; text-transform: uppercase; font-size: 7pt; letter-spacing: 0.04em; padding: 4px 5px; }
                .page-break { page-break-after: always; }
                .info { text-align: right; font-size: 6pt; color: #999; margin: 0 0 3px 0; }
                .footer-img { text-align: center; margin-top: 6px; }
                .footer-img img { max-height: 40px; max-width: 100%; object-fit: contain; }
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
        const dataToExport = filteredClientes.map(c => ({
            'C\u00f3digo': c.codigo_interno || '',
            'Tipo': c.tipo || 'PF',
            'Papel': c.papel || 'Locatário',
            'Cadastrado Por': c.cadastrado_por || '-',
            'Nome Completo': c.nome_completo || '',
            'Nome Fantasia': c.nome_fantasia || '',
            'Documento': c.documento || '',
            'RG': c.rg || '',
            'CNH': c.cnh || '',
            'E-mail': c.email || '',
            'Telefone': c.telefone || '',
            'Celular': c.celular || '',
            'Data Nasc.': c.data_nascimento || '',
            'Sexo': c.sexo || '',
            'Estado Civil': c.estado_civil || '',
            'Naturalidade': c.naturalidade || '',
            'Nacionalidade': c.nacionalidade || '',
            'Logradouro': c.logradouro || '',
            'N\u00famero': c.numero || '',
            'Complemento': c.complemento || '',
            'Bairro': c.bairro || '',
            'Cidade': c.cidade || '',
            'Estado': c.estado || '',
            'CEP': c.cep || '',
            'Tipo Resid\u00eancia': c.tipo_residencia || '',
            'Tempo Resid\u00eancia': c.tempo_residencia || '',
            'Profiss\u00e3o': c.profissao || '',
            'Empresa': c.empresa_trabalho || '',
            'Cargo': c.cargo_funcao || '',
            'Renda Principal': c.renda_principal ? `R$ ${Number(c.renda_principal).toFixed(2).replace('.', ',')}` : '',
            'Outras Rendas': c.outras_rendas ? `R$ ${Number(c.outras_rendas).toFixed(2).replace('.', ',')}` : '',
            'Dependentes': c.num_dependentes ?? '',
            'C\u00f4njuge Nome': c.conjuge_nome || '',
            'C\u00f4njuge CPF': c.conjuge_cpf || '',
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Clientes');

        const colWidths = Object.keys(dataToExport[0] || {}).map(key => ({
            wch: Math.max(key.length, ...dataToExport.map(row => String((row as any)[key] || '').length)) + 2
        }));
        ws['!cols'] = colWidths;

        XLSX.writeFile(wb, `clientes_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    return (
        <div className="flex">
            <Sidebar />

            <main className="flex-1 md:ml-72 min-h-screen p-4 md:p-8 min-w-0 overflow-x-hidden">
                <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-serif-premium font-bold text-foreground mb-2 lowercase first-letter:uppercase">Gestão de Clientes</h1>
                        <p className="text-accent text-sm font-medium">Controle centralizado de inquilinos e fiadores.</p>
                    </div>
                    <button
                        onClick={handleCreate}
                        className="btn-elite px-8 py-3 flex items-center gap-3 transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Novo Cliente
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
                            <option>Fiadores</option>
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
                                placeholder="Buscar clientes..."
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
                    {loading && clientes.length === 0 ? (
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
                                                checked={filteredClientes.length > 0 && selectedIds.size === filteredClientes.length}
                                                onChange={(e) => {
                                                    if (e.target.checked) setSelectedIds(new Set(filteredClientes.map(c => c.id)));
                                                    else setSelectedIds(new Set());
                                                }}
                                            />
                                        </th>
                                        <th className="px-6 py-2 label-premium text-[10px] text-accent text-center align-middle">Código</th>
                                        <th className="px-6 py-2 label-premium text-[10px] text-accent align-middle">Nome & Papel</th>
                                        <th className="px-6 py-2 label-premium text-[10px] text-accent text-center align-middle">Identificação</th>
                                        <th className="px-6 py-2 label-premium text-[10px] text-accent text-center align-middle">Contato</th>
                                        <th className="px-6 py-2 label-premium text-[10px] text-accent text-right pr-10 align-middle">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-panel-border text-[13px] text-foreground">
                                    {filteredClientes.length === 0 ? (
                                        <tr><td colSpan={6} className="px-6 py-32 text-center text-accent italic">Nenhum registro encontrado.</td></tr>
                                    ) : (
                                        filteredClientes.map((cliente, i) => (
                                            <motion.tr
                                                key={cliente.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.03 }}
                                                onClick={() => handleOpenDetails(cliente)}
                                                className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer group h-[36px]"
                                            >
                                                <td className="px-6 py-2 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 rounded border-panel-border bg-transparent cursor-pointer"
                                                        checked={selectedIds.has(cliente.id)}
                                                        onChange={(e) => {
                                                            const newSelected = new Set(selectedIds);
                                                            if (e.target.checked) newSelected.add(cliente.id);
                                                            else newSelected.delete(cliente.id);
                                                            setSelectedIds(newSelected);
                                                        }}
                                                    />
                                                </td>
                                                <td className="px-6 py-2 text-center align-middle">
                                                    <span className="text-[13px] font-bold text-foreground w-16 inline-block text-center">{cliente.codigo_interno || '-----'}</span>
                                                </td>
                                                <td className="px-6 py-2 align-middle">
                                                    <div className="flex flex-col justify-center h-full">
                                                        <span className="font-semibold text-foreground truncate max-w-[250px]">{cliente.tipo === 'PF' ? cliente.nome_completo : cliente.nome_fantasia}</span>
                                                        <span className={cn("label-premium text-[9px] leading-none mt-0.5", (cliente.papel === 'Apenas Fiador' || cliente.papel === 'Locatário e Fiador') ? "text-accent" : "text-accent")}>
                                                            {cliente.tipo} • {cliente.papel || 'Locatário'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-2 text-center align-middle">
                                                    <span className="text-[13px] text-foreground font-medium">{formatId(cliente.documento, cliente.tipo)}</span>
                                                </td>
                                                <td className="px-6 py-2 text-center align-middle">
                                                    {cliente.celular ? (
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-accent font-bold">{formatPhone(cliente.celular)}</span>
                                                        </div>
                                                    ) : <span className="text-accent">-</span>}
                                                </td>
                                                <td className="px-6 py-2 text-right pr-6 align-middle" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center justify-end gap-1 h-full">
                                                        <button
                                                            onClick={(e) => handleOpenEdit(cliente, e)}
                                                            className="w-7 h-7 flex items-center justify-center rounded-lg text-accent hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                                                            title="Editar"
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => handleDelete(cliente.id, e)}
                                                            className="w-7 h-7 flex items-center justify-center rounded-lg text-rose-500/70 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                                                            title="Excluir"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedEmailClient(cliente);
                                                                setIsEmailHistoryModalOpen(true);
                                                            }}
                                                            className="w-7 h-7 flex items-center justify-center rounded-lg text-accent hover:text-primary hover:bg-primary/10 transition-all"
                                                            title="Histórico de E-mails"
                                                        >
                                                            <Mail className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleOpenDetails(cliente); }}
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

                <NovoClienteModal
                    isOpen={isCreateModalOpen}
                    initialData={selectedCliente}
                    onClose={() => setIsCreateModalOpen(false)}
                    onSuccess={fetchClientes}
                />

                <DetalhesClienteModal
                    isOpen={isDetailsModalOpen}
                    cliente={selectedCliente}
                    onClose={() => setIsDetailsModalOpen(false)}
                />

                <HistoricoEmailsModal
                    isOpen={isEmailHistoryModalOpen}
                    cliente={selectedEmailClient}
                    tipo="locatario"
                    onClose={() => setIsEmailHistoryModalOpen(false)}
                />
            </main>
        </div>
    );
}

