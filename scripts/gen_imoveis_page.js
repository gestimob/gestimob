const fs = require('fs');

const pageContent = `"use client";

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
    Building2,
    Home,
    MapPin
} from "lucide-react";
import { motion } from "framer-motion";
import { NovoImovelModal } from "@/components/NovoImovelModal";
import { DetalhesImovelModal } from "@/components/DetalhesImovelModal";
import { cn } from "@/lib/utils";

export default function ImoveisPage() {
    const [imoveis, setImoveis] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedImovel, setSelectedImovel] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("Todos os Status");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        fetchImoveis();
    }, []);

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
        if (confirm("Tem certeza que deseja excluir este imóvel?")) {
            try {
                const { error } = await supabase.from('imoveis').delete().eq('id', id);
                if (error) throw error;
                fetchImoveis();
            } catch (err: any) {
                alert("Erro ao excluir: " + err.message);
            }
        }
    };

    const filteredImoveis = imoveis.filter(imovel => {
        const matchesSearch = imovel.codigo_interno?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            imovel.endereco?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            imovel.bairro?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            imovel.tipo?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === "Todos os Status" ||
            (statusFilter === "Ativos" && imovel.status === "Ativo") ||
            (statusFilter === "Inativos" && imovel.status === "Inativo");

        return matchesSearch && matchesStatus;
    });

    return (
        <div className="flex">
            <Sidebar />

            <main className="flex-1 md:ml-72 min-h-screen p-8">
                <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground mb-2 font-serif-premium tracking-tight">Gestão de Imóveis</h1>
                        <p className="text-accent text-sm font-medium">Controle e cadastro completo das propriedades.</p>
                    </div>
                    <button
                        onClick={() => {
                            setSelectedImovel(null);
                            setIsCreateModalOpen(true);
                        }}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 rounded-[10px] font-black text-[10px] uppercase tracking-[0.3em] transition-all shadow-[0_0_40px_var(--primary-glow)] flex items-center gap-3 w-fit"
                    >
                        <Plus className="w-4 h-4" />
                        Novo Imóvel
                    </button>
                </header>

                {/* Filter and Control Bar */}
                <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4 border border-panel-border bg-panel p-2 rounded-2xl">
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
                        <select className="h-9 px-3 rounded-lg border border-transparent hover:border-panel-border bg-transparent text-[13px] font-medium text-foreground focus:outline-none focus:border-panel-border transition-all cursor-pointer">
                            <option>Todas as Localidades</option>
                            <option>Residencial</option>
                            <option>Comercial</option>
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
                        <button className="h-9 px-3 flex items-center gap-2 rounded-lg border border-panel-border bg-transparent text-[13px] font-medium text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-all shrink-0">
                            <FileText className="w-3.5 h-3.5 text-accent" /> Export PDF
                        </button>
                        <button className="h-9 px-3 flex items-center gap-2 rounded-lg border border-panel-border bg-transparent text-[13px] font-medium text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-all shrink-0">
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

                <div className="bg-panel border border-panel-border rounded-2xl overflow-hidden shadow-sm">
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
                                        <th className="px-6 py-2 text-[10px] font-black text-accent uppercase tracking-[0.2em] text-center align-middle">Código</th>
                                        <th className="px-6 py-2 text-[10px] font-black text-accent uppercase tracking-[0.2em] align-middle">Imóvel & Tipo</th>
                                        <th className="px-6 py-2 text-[10px] font-black text-accent uppercase tracking-[0.2em] align-middle">Bairro</th>
                                        <th className="px-6 py-2 text-[10px] font-black text-accent uppercase tracking-[0.2em] align-middle">Proprietário</th>
                                        <th className="px-6 py-2 text-[10px] font-black text-accent uppercase tracking-[0.2em] align-middle text-right pr-6">Aluguel / Cond.</th>
                                        <th className="px-6 py-2 text-[10px] font-black text-accent uppercase tracking-[0.2em] text-right pr-10 align-middle">Ações</th>
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
                                                className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer group h-[36px]"
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
                                                    <span className="font-mono text-[13px] font-bold text-foreground tracking-tighter w-16 inline-block text-center">#{imovel.codigo_interno || '-----'}</span>
                                                </td>
                                                <td className="px-6 py-2 align-middle">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center shrink-0">
                                                            <Building2 className="w-3.5 h-3.5 text-primary" />
                                                        </div>
                                                        <div className="flex flex-col justify-center h-full max-w-[200px]">
                                                            <span className="font-semibold text-foreground truncate">{imovel.endereco?.split(',')[0] || 'Endereço não informado'}</span>
                                                            <span className="text-[10px] text-accent uppercase tracking-widest font-black leading-none truncate">{imovel.tipo} • {imovel.tipo_aluguel || 'Residencial'}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-2 align-middle max-w-[150px] truncate">{imovel.bairro || '-'}</td>
                                                <td className="px-6 py-2 align-middle max-w-[150px] truncate">{imovel.proprietarios?.nome_completo || '-'}</td>
                                                <td className="px-6 py-2 text-right pr-6 align-middle">
                                                    <div className="flex flex-col items-end h-full justify-center">
                                                        <span className="font-semibold text-emerald-500">R$ {Number(imovel.valor_aluguel || 0).toLocaleString('pt-br', { minimumFractionDigits: 2 })}</span>
                                                        <span className="text-[10px] text-accent font-bold uppercase tracking-widest leading-none">Cond. R$ {Number(imovel.valor_condominio || 0).toLocaleString('pt-br', { minimumFractionDigits: 2 })}</span>
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
`;

fs.writeFileSync('c:/Sites/Gestimob_App/src/app/imoveis/page.tsx', pageContent);

`;
