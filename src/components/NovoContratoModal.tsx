"use client";

import { X, Loader2, FileText, CheckCircle2, User, Building2, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify, List, ListOrdered, UploadCloud, Trash2, AlertTriangle, AlertCircle, UserPlus, FileSignature, Save, Plus, Calendar, DollarSign, Calculator } from "lucide-react";
import { convertToWebP, processPDF } from "@/lib/documentProcessor";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { formatBRL, parseBRL } from "@/lib/utils";
import { logAction } from "@/lib/logUtils";
import { supabaseStorage } from "@/lib/supabaseStorage";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: any;
    isReadOnly?: boolean;
}

const RichTextEditor = ({ value, onChange, placeholder, disabled }: any) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const [isMounted, setIsMounted] = useState(false);

    // Track the internal value to prevent cursor jumping
    const lastHtml = useRef("");

    useEffect(() => {
        setIsMounted(true);
        if (editorRef.current && value !== undefined && value !== lastHtml.current) {
            editorRef.current.innerHTML = value;
            lastHtml.current = value;
        }
    }, [value]);

    const exec = (command: string, value?: string) => {
        document.execCommand(command, false, value);
        if (editorRef.current) {
            const html = editorRef.current.innerHTML;
            lastHtml.current = html;
            onChange(html);
        }
        editorRef.current?.focus();
    };

    const handleInput = () => {
        if (editorRef.current) {
            const html = editorRef.current.innerHTML;
            lastHtml.current = html;
            onChange(html);
        }
    };

    return (
        <div className="bg-background border border-panel-border rounded-2xl overflow-hidden shadow-inner flex flex-col focus-within:border-primary transition-colors">
            {/* Toolbar */}
            <div className="bg-panel border-b border-panel-border p-1.5 flex flex-wrap items-center gap-1 shrink-0">
                <div className="flex items-center gap-0.5 border-r border-panel-border pr-2 mr-1">
                    <button type="button" onClick={() => exec('bold')} className="w-8 h-8 flex items-center justify-center rounded hover:bg-black/5 dark:hover:bg-white/5 text-foreground/80 hover:text-foreground transition-colors" title="Negrito"><Bold className="w-4 h-4" /></button>
                    <button type="button" onClick={() => exec('italic')} className="w-8 h-8 flex items-center justify-center rounded hover:bg-black/5 dark:hover:bg-white/5 text-foreground/80 hover:text-foreground transition-colors" title="Itálico"><Italic className="w-4 h-4" /></button>
                    <button type="button" onClick={() => exec('underline')} className="w-8 h-8 flex items-center justify-center rounded hover:bg-black/5 dark:hover:bg-white/5 text-foreground/80 hover:text-foreground transition-colors" title="Sublinhado"><Underline className="w-4 h-4" /></button>
                </div>

                <div className="flex items-center gap-0.5 border-r border-panel-border pr-2 mr-1">
                    <button type="button" onClick={() => exec('justifyLeft')} className="w-8 h-8 flex items-center justify-center rounded hover:bg-black/5 dark:hover:bg-white/5 text-foreground/80 hover:text-foreground transition-colors" title="Alinhar à Esquerda"><AlignLeft className="w-4 h-4" /></button>
                    <button type="button" onClick={() => exec('justifyCenter')} className="w-8 h-8 flex items-center justify-center rounded hover:bg-black/5 dark:hover:bg-white/5 text-foreground/80 hover:text-foreground transition-colors" title="Centralizar"><AlignCenter className="w-4 h-4" /></button>
                    <button type="button" onClick={() => exec('justifyRight')} className="w-8 h-8 flex items-center justify-center rounded hover:bg-black/5 dark:hover:bg-white/5 text-foreground/80 hover:text-foreground transition-colors" title="Alinhar à Direita"><AlignRight className="w-4 h-4" /></button>
                    <button type="button" onClick={() => exec('justifyFull')} className="w-8 h-8 flex items-center justify-center rounded hover:bg-black/5 dark:hover:bg-white/5 text-foreground/80 hover:text-foreground transition-colors" title="Justificar"><AlignJustify className="w-4 h-4" /></button>
                </div>

                <div className="flex items-center gap-0.5">
                    <button type="button" onClick={() => exec('insertUnorderedList')} className="w-8 h-8 flex items-center justify-center rounded hover:bg-black/5 dark:hover:bg-white/5 text-foreground/80 hover:text-foreground transition-colors" title="Lista com Marcadores"><List className="w-4 h-4" /></button>
                    <button type="button" onClick={() => exec('insertOrderedList')} className="w-8 h-8 flex items-center justify-center rounded hover:bg-black/5 dark:hover:bg-white/5 text-foreground/80 hover:text-foreground transition-colors" title="Lista Numerada"><ListOrdered className="w-4 h-4" /></button>
                </div>
            </div>

            {/* Editor Area */}
            <div
                ref={editorRef}
                contentEditable={!disabled}
                className={cn(
                    "p-6 text-[13px] font-medium text-foreground outline-none min-h-[300px] font-sans leading-relaxed break-words whitespace-pre-wrap empty:before:content-[attr(data-placeholder)] empty:before:text-text-dim",
                    disabled && "opacity-70 bg-black/5 dark:bg-white/5 cursor-not-allowed"
                )}
                onInput={handleInput}
                onBlur={handleInput}
                data-placeholder={placeholder}
                style={{ WebkitUserModify: disabled ? 'read-only' : 'read-write', textAlign: 'justify' }}
            />
        </div>
    );
};

function numeroPorExtenso(n: number) {
    const unidades = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
    const dezenas = ['', 'dez', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
    const especiais = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];

    if (n < 10) return unidades[n];
    if (n >= 10 && n < 20) return especiais[n - 10];
    if (n >= 20 && n < 100) {
        const d = Math.floor(n / 10);
        const u = n % 10;
        return dezenas[d] + (u > 0 ? ' e ' + unidades[u] : '');
    }
    return n.toString();
}

function dataPorExtenso(dateStr: string) {
    if (!dateStr) return "";
    const date = new Date(dateStr + 'T12:00:00');
    const dia = date.getDate();
    const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const mes = meses[date.getMonth()];
    const ano = date.getFullYear();

    return `${dia.toString().padStart(2, '0')} (${numeroPorExtenso(dia)}) de ${mes} de ${ano}`;
}

function writeLongNum(n: number): string {
    if (n === 0) return 'zero';
    const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
    const dezenas = ['', 'dez', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
    const especiais = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
    const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

    if (n === 100) return 'cem';

    let parts = [];
    if (n >= 1000) {
        const mil = Math.floor(n / 1000);
        if (mil === 1) parts.push('mil');
        else parts.push(writeLongNum(mil) + ' mil');
        n %= 1000;
    }
    if (n >= 100) {
        parts.push(centenas[Math.floor(n / 100)]);
        n %= 100;
    }
    if (n >= 20) {
        parts.push(dezenas[Math.floor(n / 10)]);
        n %= 10;
    } else if (n >= 10) {
        parts.push(especiais[n - 10]);
        n = 0;
    }
    if (n > 0) parts.push(unidades[n]);
    return parts.filter(Boolean).join(' e ');
}

function valorPorExtenso(val: number) {
    if (!val) return "Zero reais";
    const reais = Math.floor(val);
    const centavos = Math.round((val - reais) * 100);
    const extensoReais = writeLongNum(reais);
    const extensoCentavos = centavos > 0 ? ` e ${writeLongNum(centavos)} centavos` : "";
    return `${extensoReais} ${reais === 1 ? "real" : "reais"}${extensoCentavos}`;
}

function addMonths(dateStr: string, months: number) {
    if (!dateStr || !months) return "";
    const date = new Date(dateStr + 'T12:00:00');
    date.setMonth(date.getMonth() + months);
    return date.toISOString().split('T')[0];
}

const dataBR = (d: string) => d ? d.split('-').reverse().join('/') : "";

function maskCPF(cpf: string) {
    if (!cpf) return "N/A";
    const clean = cpf.replace(/\D/g, "");
    if (clean.length !== 11) return cpf;
    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

function maskCNPJ(cnpj: string) {
    if (!cnpj) return "N/A";
    const clean = cnpj.replace(/\D/g, "");
    if (clean.length !== 14) return cnpj;
    return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}

function maskCEP(cep: string) {
    if (!cep) return "N/A";
    const clean = cep.replace(/\D/g, "");
    if (clean.length !== 8) return cep;
    return clean.replace(/(\d{5})(\d{3})/, "$1-$2");
}

function maskDocumento(doc: string) {
    if (!doc) return "N/A";
    const clean = doc.replace(/\D/g, "");
    if (clean.length === 11) return maskCPF(clean);
    if (clean.length === 14) return maskCNPJ(clean);
    return doc;
}

function maskPIX(key: string) {
    if (!key) return "";
    const clean = key.replace(/\D/g, "");
    if (clean.length === 11 || clean.length === 14) return maskDocumento(clean);
    return key;
}

function adj(gender: string, masc: string, fem: string) {
    return (gender?.toLowerCase() === 'feminino' || gender?.toLowerCase() === 'mulher') ? fem : masc;
}
// const formatBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v); // Already imported from @/lib/utils

export function NovoContratoModal({ isOpen, onClose, onSuccess, initialData, isReadOnly }: ModalProps) {
    const [loading, setLoading] = useState(false);
    const [alugueis, setAlugueis] = useState<any[]>([]);
    const [selectedAluguelId, setSelectedAluguelId] = useState("");
    const [selectedData, setSelectedData] = useState<any>(null);
    const [allClientes, setAllClientes] = useState<any[]>([]);
    const [allProprietarios, setAllProprietarios] = useState<any[]>([]);
    const [allEmpresas, setAllEmpresas] = useState<any[]>([]);

    const [cabecalhoText, setCabecalhoText] = useState("");
    const [partesText, setPartesText] = useState("");
    const [negocioJuridicoText, setNegocioJuridicoText] = useState("");
    const [objetoLocacaoText, setObjetoLocacaoText] = useState("");
    const [objetivoFinalidadeText, setObjetivoFinalidadeText] = useState("");
    const [prazoLocacaoText, setPrazoLocacaoText] = useState("");
    const [precoLocacaoText, setPrecoLocacaoText] = useState("");
    const [clausulasGeraisText, setClausulasGeraisText] = useState("");
    const [assinaturasText, setAssinaturasText] = useState("");
    const [rodapeText, setRodapeText] = useState("");
    const [selectedBankAccounts, setSelectedBankAccounts] = useState<any[]>([]);
    const [isBankModalOpen, setIsBankModalOpen] = useState(false);
    const [availableBankAccounts, setAvailableBankAccounts] = useState<any[]>([]);
    const [nextContractCode, setNextContractCode] = useState("");
    const [arquivoContrato, setArquivoContrato] = useState<File | null>(null);
    const [existingContratoUrl, setExistingContratoUrl] = useState<string | null>(null);
    const [finalizarContrato, setFinalizarContrato] = useState(false);
    const [showSaveAlert, setShowSaveAlert] = useState(false);
    const [showFinalizarConfirm, setShowFinalizarConfirm] = useState(false);
    const [confirmCodigoInput, setConfirmCodigoInput] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleToggleFinalizar = (checked: boolean) => {
        if (checked) {
            // Exibir painel de confirmação em vez de marcar imediatamente
            setShowFinalizarConfirm(true);
            setConfirmCodigoInput("");
        } else {
            setFinalizarContrato(false);
            setShowFinalizarConfirm(false);
        }
    };

    const handleConfirmarFinalizar = () => {
        const codigoEsperado = nextContractCode || initialData?.codigo_contrato || "";
        if (confirmCodigoInput.trim().toUpperCase() === codigoEsperado.toUpperCase()) {
            setFinalizarContrato(true);
            setShowFinalizarConfirm(false);
        } else {
            alert(`Código incorreto. Digite exatamente "${codigoEsperado}" para confirmar.`);
        }
    };

    const fetchNextContractCode = async () => {
        try {
            const { data } = await supabase
                .from('contratos')
                .select('codigo_contrato')
                .not('codigo_contrato', 'is', null)
                .order('created_at', { ascending: false })
                .limit(1);

            let nextNum = 1;
            if (data && data.length > 0 && data[0].codigo_contrato) {
                const match = data[0].codigo_contrato.match(/\d+/);
                if (match) nextNum = parseInt(match[0], 10) + 1;
            }
            return `C-${String(nextNum).padStart(4, '0')}`;
        } catch (e) {
            return `C-${Math.floor(Math.random() * 9000) + 1000}`;
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadAlugueis();
            if (initialData?.id) {
                // Modo edição: carrega textos salvos
                setCabecalhoText(initialData.cabecalho_contrato || "");
                setPartesText(initialData.texto_partes || "");
                setNegocioJuridicoText(initialData.negocio_juridico || "");
                setObjetoLocacaoText(initialData.objeto_locacao || "");
                setObjetivoFinalidadeText(initialData.objetivo_finalidade || "");
                setPrazoLocacaoText(initialData.prazo_locacao || "");
                setPrecoLocacaoText(initialData.preco_locacao || "");
                setClausulasGeraisText(initialData.clausulas_gerais || "");
                setAssinaturasText(initialData.texto_assinaturas || "");
                setRodapeText(initialData.texto_rodape || "");
                setNextContractCode(initialData.codigo_contrato || "");
                setExistingContratoUrl(initialData.contrato_assinado_url || null);
                setArquivoContrato(null);
                setFinalizarContrato(false);
                setShowSaveAlert(false);
                // Popula selectedData e selectedAluguelId para que o conteúdo seja exibido
                setSelectedData(initialData);
                setSelectedAluguelId(initialData.id || "");
            } else if (initialData) {
                // Modo duplicação: gera novo código e limpa textos para regeneração
                setCabecalhoText("");
                setPartesText("");
                setNegocioJuridicoText("");
                setObjetoLocacaoText("");
                setObjetivoFinalidadeText("");
                setPrazoLocacaoText("");
                setPrecoLocacaoText("");
                setClausulasGeraisText("");
                setAssinaturasText("");
                setRodapeText("");
                setExistingContratoUrl(null);
                setArquivoContrato(null);
                setFinalizarContrato(false);
                setShowSaveAlert(false);
                setSelectedData(null);
                setSelectedAluguelId("");
                fetchNextContractCode().then(code => setNextContractCode(code));
            } else {
                // Modo novo cadastro
                setSelectedAluguelId("");
                setSelectedData(null);
                setCabecalhoText("");
                setPartesText("");
                setNegocioJuridicoText("");
                setObjetoLocacaoText("");
                setObjetivoFinalidadeText("");
                setPrazoLocacaoText("");
                setPrecoLocacaoText("");
                setClausulasGeraisText("");
                setAssinaturasText("");
                setRodapeText("");
                fetchNextContractCode().then(code => setNextContractCode(code));
            }
        }
    }, [isOpen, initialData]);

    useEffect(() => {
        if (selectedBankAccounts.length > 0 && selectedData) {
            updatePrecoTextWithBanks(selectedData, selectedBankAccounts);
        }
    }, [selectedBankAccounts]);

    const updatePrecoTextWithBanks = (selected: any, banks: any[]) => {
        const valorBase = selected.valor_aluguel || 0;
        let valorMensalDesc = "";

        if (selected.tipo_reajuste === "Fixo") {
            const arr = selected.reajustes_fixos || [];
            if (arr.length > 0) {
                valorMensalDesc = arr.map((p: any, i: number) =>
                    `${i > 0 && i === arr.length - 1 ? ' e ' : (i > 0 ? ', ' : '')}no período de ${dataBR(p.inicio)} à ${dataBR(p.final)} será de ${formatBRL(p.valor)} (${valorPorExtenso(p.valor)})`
                ).join("");
            } else {
                const p1 = `no período de ${dataBR(selected.rf_p1_inicio)} à ${dataBR(selected.rf_p1_final)} será de ${formatBRL(selected.rf_p1_valor)} (${valorPorExtenso(selected.rf_p1_valor)})`;
                const p2 = selected.rf_p2_valor ? `, no período de ${dataBR(selected.rf_p2_inicio)} à ${dataBR(selected.rf_p2_final)} será de ${formatBRL(selected.rf_p2_valor)} (${valorPorExtenso(selected.rf_p2_valor)})` : "";
                const p3 = selected.rf_p3_valor ? ` e no período de ${dataBR(selected.rf_p3_inicio)} à ${dataBR(selected.rf_p3_final)} será de ${formatBRL(selected.rf_p3_valor)} (${valorPorExtenso(selected.rf_p3_valor)})` : "";
                valorMensalDesc = `${p1}${p2}${p3}`;
            }
        } else {
            if (selected.tipo_pagamento_condominio === "Único") {
                const aluguel = selected.valor_aluguel || 0;
                const condo = selected.valor_condominio || 0;
                const total = aluguel + condo;
                valorMensalDesc = `de ${formatBRL(aluguel)} (${valorPorExtenso(aluguel)}) correspondente ao aluguel mensal, acrescido de ${formatBRL(condo)} (${valorPorExtenso(condo)}) correspondente ao condomínio, totalizando o valor de ${formatBRL(total)} (${valorPorExtenso(total)}) mensal`;
            } else {
                valorMensalDesc = `de ${formatBRL(valorBase)} (${valorPorExtenso(valorBase)}) mensal`;
            }
        }

        const totalMeses = selected.duracao_meses || 0;
        const diaPagamento = selected.data_vencimento ? new Date(selected.data_vencimento + 'T12:00:00').getDate() : (selected.data_inicio ? new Date(selected.data_inicio + 'T12:00:00').getDate() : 1);
        const diaExtenso = numeroPorExtenso(diaPagamento);

        const rawImovel = selected.imoveis;
        const imovelObj = Array.isArray(rawImovel) ? rawImovel[0] : (rawImovel || {});
        const locador = selected.proprietarios || selected.empresas || imovelObj.proprietarios || imovelObj.empresas || {};

        const bankLines = banks.map(acc => {
            const ownerPart = acc.ownerName ? ` em nome de ${acc.ownerName}` : ` em nome de ${locador.nome_completo || locador.nome_fantasia}`;
            return `${acc.banco} (Nº ${acc.num_banco}) AG ${acc.agencia} ${acc.tipo_conta === 'Poupança' ? 'CP' : 'CC'} ${acc.conta} ou via PIX na chave ${maskPIX(acc.chave_pix)}${ownerPart}`;
        }).join(" ou ");

        const bankAccountText = `ao <b>LOCADOR(A)</b>, mediante quitação dos boletos bancários, sendo realizado todo dia ${diaPagamento < 10 ? '0' + diaPagamento : diaPagamento} (${diaExtenso}) de cada mês, fornecidos pela LOCADORA ou depósito na CONTA CORRENTE DO BANCO ${banks.length > 0 ? bankLines : "em nome do LOCADOR"}.`;

        // Cláusula 7.5 - Garantia Caução (se aplicável)
        let garantiaClause = '';
        if (selected.tipo_garantia === 'Caução') {
            const caucaoValor = selected.caucao_valor || 0;
            const caucaoQtd = selected.caucao_quantidade || 0;
            garantiaClause = `<br><div style="text-align: justify"><b>7.5 - DA GARANTIA LOCATÍCIA (CAUÇÃO):</b> Para garantia do fiel cumprimento de todas as obrigações assumidas neste contrato, especialmente o pagamento dos aluguéis, encargos locatícios, multas contratuais, danos ao imóvel e demais obrigações legais e contratuais, o LOCATÁRIO entrega neste ato ao LOCADOR, a título de caução, a quantia de <b>${formatBRL(caucaoValor)} (${valorPorExtenso(caucaoValor)})</b>, correspondente a <b>${caucaoQtd} (${numeroPorExtenso(caucaoQtd)}) ${caucaoQtd === 1 ? 'mês' : 'meses'}</b> de aluguel, nos termos do art. 37 e art. 38 da Lei nº 8.245/91.</div>`;
        }

        const newPreco = `<div><b>7- PREÇO DA LOCAÇÃO:</b></div><br><div><b>7.1- VALOR MENSAL:</b> O aluguel mensal, livremente convencionado entre as partes será dado da seguinte forma: ${valorMensalDesc}.</div><br><div><b>7.2 - DIA E LOCAL DE PAGAMENTO:</b> O aluguel mensal correspondente aos ${totalMeses} (${numeroPorExtenso(totalMeses)}) meses deste contrato, será pago ${bankAccountText}</div><br><div><b>7.3- ATRASO NO PAGAMENTO:</b> Ocorrendo a hipótese do <b>LOCATÁRIO(A)</b> atrasar o pagamento do aluguel, pagará o aludido aluguel acrescido de juros moratórios calculados à razão de 0,33% (zero vírgula trinta e três por cento) pro rata die.</div><br><div><b>7.4- MULTA MORATÓRIA:</b> Na hipótese do <b>LOCATÁRIO(A)</b> atrasar o pagamento do aluguel, pagá-lo-á acrescido de multa moratória de 2% (dois por cento), calculada sobre o total do débito, acrescido, ainda, pelas despesas administrativas porventura havidas para cobrança, bem como honorários advocatícios (20%). Faculta-se ao <b>LOCADOR(A)</b> a possibilidade de cobrarem a multa moratória, bem como a mora e despesas ao final do prazo contratual.</div>${garantiaClause}`;
        setPrecoLocacaoText(newPreco);
    };

    async function loadAlugueis() {
        const [clientsRes, propsRes, compsRes] = await Promise.all([
            supabase.from('clientes').select('*, cliente_representantes(*)'),
            supabase.from('proprietarios').select('*'),
            supabase.from('empresas').select('*, empresa_responsaveis(*)')
        ]);
        
        if (clientsRes.data) setAllClientes(clientsRes.data);
        if (propsRes.data) setAllProprietarios(propsRes.data);
        if (compsRes.data) setAllEmpresas(compsRes.data);

        let query = supabase
            .from('alugueis')
            .select(`
                *,
                clientes(id, nome_completo, documento, tipo, logradouro, numero, complemento, bairro, cidade, estado, cep, telefone, email, papel, cliente_representantes(*)),
                imoveis(
                    id, codigo_interno, tipo, logradouro, numero, complemento, bairro, cidade, estado, cep, 
                    area_m2, quartos, suites, banheiros, vagas, nome_identificacao, endereco, valor_aluguel, valor_condominio,
                    proprietarios(id, nome_completo, documento, logradouro, numero, complemento, bairro, cidade, estado, cep, dados_bancarios),
                    empresas(id, nome_fantasia, razao_social, cnpj, logradouro, numero, complemento, bairro, cidade, estado, cep, dados_bancarios, responsavel_legal, empresa_responsaveis(nome, nacionalidade, estado_civil, cpf, rg, orgao_emissor, logradouro, numero, complemento, bairro, cidade, estado, cep))
                ),
                proprietarios(id, nome_completo, documento, logradouro, numero, complemento, bairro, cidade, estado, cep, dados_bancarios)
            `)
            .order('created_at', { ascending: false });

        if (initialData?.id) {
            query = query.or(`status.eq."Preparação de Contrato",status.eq."Para Contrato",id.eq.${initialData.id}`);
        } else {
            query = query.or(`status.eq."Preparação de Contrato",status.eq."Para Contrato"`);
        }

        const { data, error } = await query;
        if (error) {
            console.error("Erro ao carregar alugéis para contrato:", error.message);
        }
        if (data) {
            setAlugueis(data);
            if (initialData) {
                const found = data.find(d => d.id === initialData.id);
                if (found) handleSelectAluguel(initialData.id, data, clientsRes.data || []);
            }
        }
    }

    const handleSelectAluguel = async (val: string, items: any[] = alugueis, clientsList: any[] = allClientes, propsList: any[] = allProprietarios, compsList: any[] = allEmpresas) => {
        setSelectedAluguelId(val);
        const selected = items.find(a => a.id === val);
        setSelectedData(selected || null);
        const currentBanks = selected && selected.contas_bancarias && Array.isArray(selected.contas_bancarias) && selected.contas_bancarias.length > 0 
            ? selected.contas_bancarias 
            : [];
            
        if (currentBanks.length > 0) {
            setSelectedBankAccounts(currentBanks);
        } else {
            setSelectedBankAccounts([]);
        }

        if (selected) {
            // 1. Objeto da Locação
            if (selected.objeto_locacao && selected.objeto_locacao.trim() !== "" && !selected.objeto_locacao.includes("I-N/A")) {
                setObjetoLocacaoText(selected.objeto_locacao);
            } else {
                const rawImovel = selected.imoveis;
                const imovel = Array.isArray(rawImovel) ? rawImovel[0] : (rawImovel || {});
                const street = imovel.logradouro || (imovel.endereco ? imovel.endereco.split(',')[0] : '');
                const localizacao = `${street}${imovel.numero ? ', n° ' + imovel.numero : ', n° S/N'}${imovel.complemento ? ' (' + imovel.complemento + ')' : ''}, ${imovel.bairro || ''}, ${imovel.cidade || ''} - ${imovel.estado || ''}, CEP ${imovel.cep || ''}`;

                let caracteristicas = [];
                if (imovel.area_m2) caracteristicas.push(`${imovel.area_m2}m²`);
                if (imovel.quartos) caracteristicas.push(`${imovel.quartos} quartos`);
                if (imovel.suites) caracteristicas.push(`${imovel.suites} suítes`);
                if (imovel.banheiros) caracteristicas.push(`${imovel.banheiros} banheiros`);
                if (imovel.vagas) caracteristicas.push(`${imovel.vagas} vagas`);

                const charStr = caracteristicas.length > 0 ? ` (${caracteristicas.join(', ')})` : '';
                const defaultObjeto = `<div style="text-align: justify"><b>3 - OBJETO DA LOCAÇÃO:</b></div><br><div style="text-align: justify"><b>3.1- IDENTIFICAÇÃO DO IMÓVEL:</b> O objeto do presente contrato de locação é o <b>${imovel.nome_identificacao || imovel.tipo || 'imóvel'}</b>${charStr} (Código: <b>${imovel.codigo_interno || 'N/A'}</b>), localizado na ${localizacao}, de propriedade do <b>LOCADOR(A)</b>.</div>`;
                setObjetoLocacaoText(defaultObjeto);
            }

            // 2. Negócio Jurídico
            if (selected.negocio_juridico) {
                setNegocioJuridicoText(selected.negocio_juridico);
            } else {
                const defaultNegocio = `<div style="text-align: justify"><b>2- NEGÓCIO JURÍDICO:</b></div><br><div style="text-align: justify"><b>2.1- LOCAÇÃO:</b> O <b>LOCADOR(A)</b>, neste ato, na melhor forma e para todos os efeitos de direito, aluga ao <b>LOCATÁRIO(A)</b>, o imóvel a seguir identificado, regendo-se a locação pelas disposições constantes no presente contrato, pela Lei 8.245 de 18 de outubro de 1991 e, em suas omissões, pelas normas contidas no Código Civil e no Código de Processo Civil e demais dispositivos legais pertinentes.</div>`;
                setNegocioJuridicoText(defaultNegocio);
            }

            // 3. Código do Contrato - Só reaproveita se estiver editando ou se for um código de contrato válido (C-)
            if (selected.codigo_contrato && (initialData || selected.codigo_contrato.startsWith('C-'))) {
                setNextContractCode(selected.codigo_contrato);
            } else {
                const code = await fetchNextContractCode();
                setNextContractCode(code);
            }

            // 4. Objetivo e Finalidade
            if (selected.objetivo_finalidade) {
                setObjetivoFinalidadeText(selected.objetivo_finalidade);
            } else {
                const isComercial = selected.finalidade_aluguel?.toLowerCase() === 'comercial';
                const finalidadeLabel = isComercial ? 'COMERCIAL' : 'RESIDENCIAL';
                const finalidadeDesc = isComercial ? 'prestação de serviços de natureza comercial' : 'residência';

                const defaultObjetivo = `<div style="text-align: justify"><b>4 - OBJETIVO E OBJETO DE CONTRATO</b></div><br><div style="text-align: justify"><b>4.1-</b> O presente contrato tem por objetivo formalizar as condições mediantes as quais o <b>LOCADOR(A)</b> dá em locação ao <b>LOCATÁRIO(A)</b> o imóvel de sua propriedade, retro locado.</div><br><div style="text-align: justify"><b>5 - FINALIDADE DA LOCAÇÃO:</b></div><br><div style="text-align: justify"><b>5.1- ${finalidadeLabel}:</b> O imóvel locado tem a finalidade exclusiva de <b>${finalidadeDesc}</b>, sendo expressamente vedada a sua utilização para quaisquer outras finalidades, não podendo ser mudada sua destinação sem o consentimento expresso do <b>LOCADOR(A)</b>. Da mesma forma, não poderá ser sublocado a terceiros, cedido, emprestado, gratuita ou onerosamente, no todo ou em parte, sob pena de rescisão antecipada e consequente extinção da locação, independentemente de notificação judicial ou extrajudicial.</div>`;
                setObjetivoFinalidadeText(defaultObjetivo);
            }

            // 5. Prazo da Locação
            if (selected.prazo_locacao) {
                setPrazoLocacaoText(selected.prazo_locacao);
            } else {
                const prazo = selected.duracao_meses || 0;
                const dataInicioStr = selected.data_inicio;
                let dataFimStr = selected.data_fim;

                if (!dataFimStr && dataInicioStr && prazo) {
                    dataFimStr = addMonths(dataInicioStr, prazo);
                }

                const prazoExtenso = numeroPorExtenso(prazo);
                const inicioExtenso = dataPorExtenso(dataInicioStr);
                const fimExtenso = dataPorExtenso(dataFimStr);

                const defaultPrazo = `<div style="text-align: justify"><b>6 - PRAZO DA LOCAÇÃO:</b></div><br><div style="text-align: justify"><b>6.1- DETERMINADO:</b> A presente locação é pactuada pelo <b>prazo determinado de ${prazo} (${prazoExtenso}) meses</b>, iniciando-se no dia <b>${inicioExtenso}</b> e terminando no dia <b>${fimExtenso}</b>. O <b>LOCATÁRIO(A)</b> declaram ter recebido o imóvel da presente locação em condições de uso, reparado em toda sua extensão e dependências, no que concerne ao revestimento das paredes, pinturas, vidros, portas, fechaduras, dobradiças, instalações elétricas, hidráulicas e sanitárias, obrigando-se a restituí-lo nas mesmas condições.</div><br><div style="text-align: justify"><b>6.2- DEVOLUÇÃO DO IMÓVEL:</b> Findo o prazo da locação convencionado no subitem anterior, o <b>LOCATÁRIO(A)</b> se obriga, independentemente de notificação, aviso ou interpelação, judicial ou extrajudicial, a devolver ao <b>LOCADOR(A)</b> o imóvel inteiramente desocupado, constituindo-se o não cumprimento do disposto na presente cláusula, in infração contratual, ressalvando a hipótese de renovação consensual deste instrumento na forma prevista em lei.</div><br><div style="text-align: justify"><b>6.3- PRORROGAÇÃO DA LOCAÇÃO:</b> Findo o prazo ajustado, se o <b>LOCATÁRIO(A)</b> continuar no uso do imóvel por mais de 30 (trinta) dias, sem oposição do <b>LOCADOR(A)</b>, presumir-se-á prorrogada a locação por prazo determinado e por igual período, devendo o valor do aluguel ser ajustado em conformidade com o mercado, mantidas as demais cláusulas e condições do contrato, inclusive quanto ao índice de reajuste e sua periodicidade.</div><br><div style="text-align: justify"><b>6.4- OPOSIÇÃO DO LOCADOR(A)</b>: A oposição mencionada no subitem anterior, quanto à prorrogação da locação, efetivar-se-á pelo simples ajuizamento de ação de despejo ou ainda, por qualquer manifestação extrajudicial inequívoca do <b>LOCADOR(A)</b> nesse sentido.</div><br><div style="text-align: justify"><b>6.5- DENÚNCIA DO CONTRATO (Resilição contratual):</b> O <b>LOCATÁRIO(A)</b> poderá denunciar o contrato, desde que, com antecedência mínima de 30 (trinta) dias, comunique ao <b>LOCADOR(A)</b> sua intenção, ficando estabelecido em comum acordo, a não aplicação da multa na ocasião da denúncia do contrato seja em 12 (doze) ou 24 (vinte e quatro) meses. Durante o prazo entre a denúncia e a efetiva entrega do imóvel, o <b>LOCADOR(A)</b> fica autorizado a expor o mesmo à nova locação, inclusive com aposição de placas com dimensões, padronização e local para afixação previamente convencionados, e visitas com horários pré-estabelecidos.</div>`;
                setPrazoLocacaoText(defaultPrazo);
            }

            // 6. Cabeçalho
            if (selected.cabecalho_contrato) {
                setCabecalhoText(selected.cabecalho_contrato);
            } else {
                const isComercial = selected.finalidade_aluguel?.toLowerCase() === 'comercial';
                const typeText = isComercial ? 'COMERCIAL' : 'RESIDENCIAL';
                const defaultCabecalho = `<div style="text-align: justify"><b>INSTRUMENTO PARTICULAR DE CONTRATO DE LOCAÇÃO DE BEM IMÓVEL URBANO DE NATUREZA ${typeText}, ENTRE AS PARTES E NA FORMA QUE ABAIXO MELHOR SE DECLARA.</b></div><br><div style="text-align: justify">Pelo presente instrumento particular, as partes, adiante nomeadas e qualificadas, têm, entre si, justas e acordadas, um <b>CONTRATO DE LOCAÇÃO DE BEM IMÓVEL URBANO DE NATUREZA ${typeText}</b>, mediante as cláusulas e condições seguintes, que, de modo recíproco, outorgam, estipulam e aceitam:</div>`;
                setCabecalhoText(defaultCabecalho);
            }

            // 7. Partes
            if (selected.texto_partes) {
                setPartesText(selected.texto_partes);
            } else {
                const rawImovel = selected.imoveis;
                const imovelObj = Array.isArray(rawImovel) ? rawImovel[0] : (rawImovel || {});

                // Obter todos os proprietários ativos (principal + secundários que devem constar no contrato)
                const activeOwners: any[] = [];
                if (selected.impresso_no_contrato !== false) {
                    const primary = selected.proprietarios || selected.empresas || imovelObj.proprietarios || imovelObj.empresas || {};
                    if (primary && (primary.nome_completo || primary.nome_fantasia || primary.razao_social)) {
                        activeOwners.push(primary);
                    }
                }

                if (selected.proprietarios_secundarios && Array.isArray(selected.proprietarios_secundarios)) {
                    selected.proprietarios_secundarios.forEach((sec: any) => {
                        if (sec.no_contrato !== false) {
                            const owner = (sec.tipo === 'PF' ? propsList : compsList).find(p => p.id === sec.id);
                            if (owner) activeOwners.push(owner);
                        }
                    });
                }

                const locadoresBlocks = activeOwners.map(locador => {
                    const locadorNome = locador.nome_completo || locador.nome_fantasia || locador.razao_social || 'N/A';
                    const locadorDoc = maskDocumento(locador.documento || locador.cnpj || 'N/A');
                    const locadorAddress = `${locador.logradouro || ''}${locador.numero ? ', n° ' + locador.numero : ''}${locador.complemento ? ' (' + locador.complemento + ')' : ''}${locador.bairro ? ', ' + locador.bairro : ''}, ${locador.cidade || ''} - ${locador.estado || ''}${locador.cep ? ', CEP ' + maskCEP(locador.cep) : ''}`;

                    let representanteText = '';
                    let representanteLabel = 'representante legal';
                    if (locador.empresa_responsaveis && locador.empresa_responsaveis.length > 0) {
                        representanteText = locador.empresa_responsaveis.map((r: any) => {
                            const gender = r.sexo || 'Masculino';
                            const enderecoCompl = `${r.logradouro || ''}${r.numero ? ', n° ' + r.numero : ''}${r.complemento ? ' (' + r.complemento + ')' : ''}${r.bairro ? ', ' + r.bairro : ''}, ${r.cidade || ''} - ${r.estado || ''}${r.cep ? ', CEP ' + maskCEP(r.cep) : ''}`;
                            return `<b>${r.nome}</b>, ${r.nacionalidade || (gender === 'Feminino' ? 'brasileira' : 'brasileiro')}, ${r.estado_civil || 'estado civil não informado'}, ${adj(gender, 'portador', 'portadora')} do RG nº ${r.rg || 'N/A'} ${r.orgao_emissor || 'N/A'} e ${adj(gender, 'inscrito', 'inscrita')} no CPF sob o nº ${maskCPF(r.cpf)}, ${adj(gender, 'residente e domiciliado', 'residente e domiciliada')} em ${enderecoCompl || 'Endereço não informado'}`;
                        }).join(' e ');
                        if (locador.empresa_responsaveis.length > 1) representanteLabel = 'representantes legais';
                        representanteText = `, ${representanteLabel} ${representanteText}`;
                    } else if (locador.responsavel_legal) {
                        representanteText = `, representante legal <b>${locador.responsavel_legal}</b>`;
                    }

                    return `<b>${locadorNome}</b>, inscrito sob o ${locador.cnpj ? 'CNPJ' : 'CPF'} nº ${locadorDoc}, situado/domiciliado em ${locadorAddress || 'Endereço não informado'}${representanteText}`;
                }).join("; e, ");

                const locadorText = `<div style="text-align: justify"><b>1.1 – LOCADOR(ES):</b> Como <b>LOCADOR(ES)</b>, forma pela qual serão doravante, no presente instrumento, abreviadamente designado, ${locadoresBlocks}.</div>`;

                const locatId = selected.cliente_id;
                const locatObj = clientsList.find((c: any) => c.id === locatId) || selected.clientes || {};
                const locatAddress = `${locatObj.logradouro || ''}${locatObj.numero ? ', n° ' + locatObj.numero : ''}${locatObj.complemento ? ' (' + locatObj.complemento + ')' : ''}${locatObj.bairro ? ', ' + locatObj.bairro : ''}, ${locatObj.cidade || ''} - ${locatObj.estado || ''}${locatObj.cep ? ', CEP ' + maskCEP(locatObj.cep) : ''}`;

                let locatRepText = '';
                if (locatObj.tipo === 'PJ' && locatObj.cliente_representantes && locatObj.cliente_representantes.length > 0) {
                    const reps = locatObj.cliente_representantes.map((r: any) => {
                        const gender = r.sexo || 'Masculino';
                        const endereco = `${r.endereco_residencial || ''}${r.numero ? ', n° ' + r.numero : ''}${r.complemento ? ' (' + r.complemento + ')' : ''}${r.bairro ? ', ' + r.bairro : ''}, ${r.cidade || ''} - ${r.uf || ''}${r.cep ? ', CEP ' + maskCEP(r.cep) : ''}`;
                        return `<b>${r.nome_completo}</b>, ${r.nacionalidade || (gender === 'Feminino' ? 'brasileira' : 'brasileiro')}, ${r.estado_civil || 'estado civil não informado'}, ${r.profissao || 'profissão não informada'}, ${adj(gender, 'portador', 'portadora')} do RG nº ${r.rg || r.identidade || 'N/A'} ${r.orgao_emissor || r.orgao_expedidor || ''}, ${adj(gender, 'inscrito', 'inscrita')} no CPF sob o nº ${maskCPF(r.cpf)}, ${adj(gender, 'residente e domiciliado', 'residente e domiciliada')} em ${endereco}`;
                    }).join(' e ');
                    const repLabel = locatObj.cliente_representantes.length > 1 ? 'pelos seus representantes' : 'pelo seu representante';
                    locatRepText = `, neste ato representada ${repLabel} ${reps}`;
                }
                
                const locatSedeText = locatObj.tipo === 'PJ' ? 'com sede' : 'residente e domiciliado';

                const locatText = `<div style="text-align: justify"><b>1.2 – LOCATÁRIO(A):</b> Como <b>LOCATÁRIO(A)</b>, forma pela qual será doravante, no presente instrumento, abreviadamente designado, <b>${locatObj.nome_completo || 'N/A'}</b>, inscrito no CPF/CNPJ sob o nº ${maskDocumento(locatObj.documento || 'N/A')}, ${locatSedeText} em ${locatAddress || 'Endereço não informado'}${locatRepText}. Contato ${locatObj.telefone || ''}, e-mail: ${locatObj.email || ''}</div>`;

                let fiadText = "";
                if (selected.tipo_garantia === "Fiador") {
                    let fiadoresObjs: any[] = [];
                    if (locatObj.papel === 'Apenas Fiador' || locatObj.papel === 'Locatário e Fiador') fiadoresObjs.push(locatObj);
                    if (Array.isArray(selected.fiadores_ids) && selected.fiadores_ids.length > 0) {
                        const explicitFiadores = selected.fiadores_ids.map((id: string) => clientsList.find(c => c.id === id)).filter(Boolean);
                        fiadoresObjs = [...fiadoresObjs, ...explicitFiadores];
                    }
                    fiadoresObjs = fiadoresObjs.filter((f, index, self) => index === self.findIndex((t) => t.id === f.id));

                    if (fiadoresObjs.length > 0) {
                        const fiadoresStr = fiadoresObjs.map((f: any) => {
                            const fAddress = `${f.logradouro || ''}${f.numero ? ', n° ' + f.numero : ''}${f.complemento ? ' (' + f.complemento + ')' : ''}${f.bairro ? ', ' + f.bairro : ''}, ${f.cidade || ''} - ${f.estado || ''}${f.cep ? ', CEP ' + maskCEP(f.cep) : ''}`;
                            
                            let fRepText = '';
                            if (f.tipo === 'PJ' && f.cliente_representantes && f.cliente_representantes.length > 0) {
                                const reps = f.cliente_representantes.map((r: any) => {
                                    const gender = r.sexo || 'Masculino';
                                    const rAddress = `${r.endereco_residencial || ''}${r.numero ? ', n° ' + r.numero : ''}${r.complemento ? ' (' + r.complemento + ')' : ''}${r.bairro ? ', ' + r.bairro : ''}, ${r.cidade || ''} - ${r.uf || ''}${r.cep ? ', CEP ' + maskCEP(r.cep) : ''}`;
                                    return `<b>${r.nome_completo}</b>, ${r.nacionalidade || (gender === 'Feminino' ? 'brasileira' : 'brasileiro')}, ${r.estado_civil || 'estado civil não informado'}, ${r.profissao || 'profissão não informada'}, ${adj(gender, 'portador', 'portadora')} do RG nº ${r.rg || r.identidade || 'N/A'} ${r.orgao_emissor || r.orgao_expedidor || ''}, ${adj(gender, 'inscrito', 'inscrita')} no CPF sob o nº ${maskCPF(r.cpf)}, ${adj(gender, 'residente e domiciliado', 'residente e domiciliada')} em ${rAddress}`;
                                }).join(' e ');
                                const repLabel = f.cliente_representantes.length > 1 ? 'pelos seus representantes' : 'pelo seu representante';
                                fRepText = `, neste ato representada ${repLabel} ${reps}`;
                            }

                            const extraInfo = [f.nacionalidade, f.estado_civil, f.profissao].filter(Boolean).join(', ');
                            const extraInfoStr = extraInfo ? `, ${extraInfo}` : '';
                            return `<b>${f.nome_completo}</b>${extraInfoStr}, inscrito no CPF/CNPJ sob o nº ${maskDocumento(f.documento || 'N/A')}, residente e domiciliado em ${fAddress}${fRepText}`;
                        }).join(" e ");
                        fiadText = `<br><div style="text-align: justify"><b>1.3 – FIADOR(ES):</b> Como <b>FIADOR(ES)</b>, forma pela qual será doravante, no presente instrumento, abreviadamente designado, ${fiadoresStr}.</div>`;
                    }
                }

                const defaultPartes = `<div style="text-align: justify"><b>1 – PARTES:</b></div><br>${locadorText}<br>${locatText}${fiadText}`;
                setPartesText(defaultPartes);
            }
            // 8. Preço da Locação
            if (selected.preco_locacao) {
                setPrecoLocacaoText(selected.preco_locacao);
            } else {
                const valorBase = selected.valor_aluguel || 0;
                let valorMensalDesc = "";

                if (selected.tipo_reajuste === "Fixo") {
                    const arr = selected.reajustes_fixos || [];
                    if (arr.length > 0) {
                        valorMensalDesc = arr.map((p: any, i: number) =>
                            `${i > 0 && i === arr.length - 1 ? ' e ' : (i > 0 ? ', ' : '')}no período de ${dataBR(p.inicio)} à ${dataBR(p.final)} será de ${formatBRL(p.valor)} (${valorPorExtenso(p.valor)})`
                        ).join("");
                    } else {
                        const p1 = `no período de ${dataBR(selected.rf_p1_inicio)} à ${dataBR(selected.rf_p1_final)} será de ${formatBRL(selected.rf_p1_valor)} (${valorPorExtenso(selected.rf_p1_valor)})`;
                        const p2 = selected.rf_p2_valor ? `, no período de ${dataBR(selected.rf_p2_inicio)} à ${dataBR(selected.rf_p2_final)} será de ${formatBRL(selected.rf_p2_valor)} (${valorPorExtenso(selected.rf_p2_valor)})` : "";
                        const p3 = selected.rf_p3_valor ? ` e no período de ${dataBR(selected.rf_p3_inicio)} à ${dataBR(selected.rf_p3_final)} será de ${formatBRL(selected.rf_p3_valor)} (${valorPorExtenso(selected.rf_p3_valor)})` : "";
                        valorMensalDesc = `${p1}${p2}${p3}`;
                    }
                } else {
                    if (selected.tipo_pagamento_condominio === "Único") {
                        const aluguel = selected.valor_aluguel || 0;
                        const condo = selected.valor_condominio || 0;
                        const total = aluguel + condo;
                        valorMensalDesc = `de ${formatBRL(aluguel)} (${valorPorExtenso(aluguel)}) correspondente ao aluguel mensal, acrescido de ${formatBRL(condo)} (${valorPorExtenso(condo)}) correspondente ao condomínio, totalizando o valor de ${formatBRL(total)} (${valorPorExtenso(total)}) mensal`;
                    } else {
                        valorMensalDesc = `de ${formatBRL(valorBase)} (${valorPorExtenso(valorBase)}) mensal`;
                    }
                }

                const totalMeses = selected.duracao_meses || 0;
                const diaPagamento = selected.data_vencimento ? new Date(selected.data_vencimento + 'T12:00:00').getDate() : (selected.data_inicio ? new Date(selected.data_inicio + 'T12:00:00').getDate() : 1);
                const diaExtenso = numeroPorExtenso(diaPagamento);

                const rawImovel = selected.imoveis;
                const imovelObj = Array.isArray(rawImovel) ? rawImovel[0] : (rawImovel || {});
                const locador = selected.proprietarios || selected.empresas || imovelObj.proprietarios || imovelObj.empresas || {};

                let bankAccountText = `ao <b>LOCADOR(A)</b>, mediante quitação dos boletos bancários, sendo realizado todo dia ${diaPagamento < 10 ? '0' + diaPagamento : diaPagamento} (${diaExtenso}) de cada mês, fornecidos pela LOCADORA ou depósitos na Conta Corrente do BANCO SICREDI 748 AG 2201 CONTA 39868-6 ou via PIX no CNPJ 07.869.501/0001-58 em no nome de RR IMOBILIÁRIA LTDA.`;

                // Reunir todas as contas bancárias de todos os proprietários ativos
                const allAccounts: any[] = [];
                const activeOwnersForBanks: any[] = [];
                if (selected.impresso_no_contrato !== false) {
                    const primary = selected.proprietarios || selected.empresas || imovelObj.proprietarios || imovelObj.empresas || {};
                    if (primary && (primary.nome_completo || primary.nome_fantasia || primary.razao_social)) {
                        activeOwnersForBanks.push(primary);
                    }
                }
                if (selected.proprietarios_secundarios && Array.isArray(selected.proprietarios_secundarios)) {
                    selected.proprietarios_secundarios.forEach((sec: any) => {
                        if (sec.no_contrato !== false) {
                            const owner = (sec.tipo === 'PF' ? propsList : compsList).find(p => p.id === sec.id);
                            if (owner) activeOwnersForBanks.push(owner);
                        }
                    });
                }

                activeOwnersForBanks.forEach(owner => {
                    const ownerName = owner.nome_completo || owner.nome_fantasia || owner.razao_social || 'N/A';
                    if (owner.dados_bancarios && Array.isArray(owner.dados_bancarios)) {
                        owner.dados_bancarios.forEach((acc: any) => {
                            allAccounts.push({ ...acc, ownerName, ownerId: owner.id });
                        });
                    }
                });

                if (currentBanks.length > 0) {
                    const bankLines = currentBanks.map((acc: any) => {
                        const ownerPart = acc.ownerName ? ` em nome de ${acc.ownerName}` : ` em nome de ${locador.nome_completo || locador.nome_fantasia}`;
                        return `${acc.banco} (Nº ${acc.num_banco}) AG ${acc.agencia} ${acc.tipo_conta === 'Poupança' ? 'CP' : 'CC'} ${acc.conta} ou via PIX na chave ${maskPIX(acc.chave_pix)}${ownerPart}`;
                    }).join(" ou ");
                    bankAccountText = `ao <b>LOCADOR(A)</b>, mediante quitação dos boletos bancários, sendo realizado todo dia ${diaPagamento < 10 ? '0' + diaPagamento : diaPagamento} (${diaExtenso}) de cada mês, fornecidos pela LOCADORA ou depósito na CONTA CORRENTE DO BANCO ${bankLines}.`;
                } else if (allAccounts.length > 0) {
                    // Fallback para quando o aluguel não tem contas salvas no contrato
                    if (allAccounts.length === 1) {
                        const acc = allAccounts[0];
                        setSelectedBankAccounts([acc]);
                        const ownerPart = acc.ownerName ? ` em nome de ${acc.ownerName}` : ` em nome de ${locador.nome_completo || locador.nome_fantasia}`;
                        const bankLine = `${acc.banco} (Nº ${acc.num_banco}) AG ${acc.agencia} ${acc.tipo_conta === 'Poupança' ? 'CP' : 'CC'} ${acc.conta} ou via PIX na chave ${maskPIX(acc.chave_pix)}${ownerPart}`;
                        bankAccountText = `ao <b>LOCADOR(A)</b>, mediante quitação dos boletos bancários, sendo realizado todo dia ${diaPagamento < 10 ? '0' + diaPagamento : diaPagamento} (${diaExtenso}) de cada mês, fornecidos pela LOCADORA ou depósito na CONTA CORRENTE DO BANCO ${bankLine}.`;
                    } else {
                        setAvailableBankAccounts(allAccounts);
                        setIsBankModalOpen(true);
                    }
                }

                // Cláusula 7.5 - Garantia (Caução ou nenhuma, dependendo do tipo)
                let garantiaClause = '';
                if (selected.tipo_garantia === 'Caução') {
                    const caucaoValor = selected.caucao_valor || 0;
                    const caucaoQtd = selected.caucao_quantidade || 0;
                    garantiaClause = `<br><div style="text-align: justify"><b>7.5 - DA GARANTIA LOCATÍCIA (CAUÇÃO):</b> Para garantia do fiel cumprimento de todas as obrigações assumidas neste contrato, especialmente o pagamento dos aluguéis, encargos locatícios, multas contratuais, danos ao imóvel e demais obrigações legais e contratuais, o LOCATÁRIO entrega neste ato ao LOCADOR, a título de caução, a quantia de <b>${formatBRL(caucaoValor)} (${valorPorExtenso(caucaoValor)})</b>, correspondente a <b>${caucaoQtd} (${numeroPorExtenso(caucaoQtd)}) ${caucaoQtd === 1 ? 'mês' : 'meses'}</b> de aluguel, nos termos do art. 37 e art. 38 da Lei nº 8.245/91.</div>`;
                }

                const defaultPreco = `<div style="text-align: justify"><b>7- PREÇO DA LOCAÇÃO:</b></div><br><div style="text-align: justify"><b>7.1- VALOR MENSAL:</b> O aluguel mensal, livremente convencionado entre as partes será dado da seguinte forma: ${valorMensalDesc}.</div><br><div style="text-align: justify"><b>7.2 - DIA E LOCAL DE PAGAMENTO:</b> O aluguel mensal correspondente aos ${totalMeses} (${numeroPorExtenso(totalMeses)}) meses deste contrato, será pago ${bankAccountText}</div><br><div style="text-align: justify"><b>7.3- ATRASO NO PAGAMENTO:</b> Ocorrendo a hipótese do <b>LOCATÁRIO(A)</b> atrasar o pagamento do aluguel, pagará o aludido aluguel acrescido de juros moratórios calculados à razão de 0,33% (zero vírgula trinta e três por cento) pro rata die.</div><br><div style="text-align: justify"><b>7.4- MULTA MORATÓRIA:</b> Na hipótese do <b>LOCATÁRIO(A)</b> atrasar o pagamento do aluguel, pagá-lo-á acrescido de multa moratória de 2% (dois por cento), calculada sobre o total do débito, acrescido, ainda, pelas despesas administrativas porventura havidas para cobrança, bem como honorários advocatícios (20%). Faculta-se ao <b>LOCADOR(A)</b> a possibilidade de cobrarem a multa moratória, bem como a mora e despesas ao final do prazo contratual.</div>${garantiaClause}`;
                setPrecoLocacaoText(defaultPreco);
            }

            // 9. Cláusulas Gerais
            if (selected.clausulas_gerais) {
                setClausulasGeraisText(selected.clausulas_gerais);
            } else {
                // Cláusula 14 de FIANÇA só aparece se tipo_garantia for Fiador
                const fiancaClause = selected.tipo_garantia === 'Fiador' ? `<br><div style="text-align: justify"><b>14- FIANÇA:</b></div><br><div style="text-align: justify"><b>14.1- RENÚNCIA AO BENEFÍCIO DE ORDEM. RESPONSÁVEIS SOLIDÁRIOS:</b> Como FIADORES e principal pagadores, solidariamente responsável com o LOCATÁRIO(A) e com ele coobrigado até a entrega das respectivas chaves, independente de notificação judicial ou extrajudicial, obrigando-se expressamente pela observância e cumprimento de todas as cláusulas e condições, com renúncia ao benefício de ordem estatuído no código civil brasileiro artigo 827 par. único e exonerando-se dos benefícios do art. 835 do mesmo diploma legal acima citado, responsabilizando-se expressamente pelo pagamento dos aluguéis e dos reajustes, por custas judiciais e honorários advocatícios, no caso de intervenção profissional, mesmo que seja em ação de despejo contra o LOCATÁRIO(A) e para a qual não tenha sido intimada, e, ainda, por este mesmo instrumento, constitui os FIADORES, designados no item 1.3 supra, solidária e principais pagadores, como seus procuradores, com a cláusula ad judicia, para receberem citações, contestarem ações, confessarem transigirem e constituírem advogado para quaisquer ações que se relacionem com o contrato de que se cuida.</div>` : '';

                const defaultClausulas = `<div style="text-align: justify"><b>8- OBRIGAÇÕES DOS CONTRATANTES:</b></div><br><div style="text-align: justify"><b>8.1- OBRIGAÇÕES DO LOCADOR(A):</b> São obrigações do LOCADOR(A):<br>a) Garantir, durante o tempo da locação, o uso pacífico do imóvel;<br>b) Manter, durante a locação, a forma e o destino do imóvel;<br>c) Responder pelos vícios anteriores ao presente contrato de locação, bem como pela situação em que o imóvel foi entregue ao LOCATÁRIO(A), como bom, perfeito e valioso;<br>d) Fornecer ao LOCATÁRIO(A) recibo descriminado das importâncias por estas pagas.</div><br><div style="text-align: justify"><b>8.2- OBRIGAÇÕES DO LOCATÁRIO(A):</b> São obrigações do LOCATÁRIO(A):<br>a) Pagar durante toda a locação, além do aluguel mensal reajustado, as despesas com energia elétrica (ENERGISA), água encanada e tratada (CAGEPA) que deverá ser efetuada a troca de titularidade para o locatário como usuário, durante o período de locação do imóvel e o IPTU e TCR que manterão as respectivas inscrições no estado em que se encontram, ou seja, em nomes do LOCADOR(A), cujos comprovantes exibirá ao LOCADOR(A) mensalmente ou sempre que solicitado, ficando ao LOCATÁRIO(A) alertada que a ausência de pagamento, além de implicar em descumprimento de cláusula contratual, consequente extinção da locação e reparação dos danos materiais decorrentes, ocasionará danos morais indenizáveis ao LOCADOR(A), à vista de suas inadimplências que não deram causa, a ser arbitrado pela autoridade competente em ação indenizatória.<br>b) Manter o imóvel em boas condições de manutenção, devendo zelar sempre pelas boas condições de higiene e limpeza, com todos os seus aparelhos, instalações, torneiras, pias, banheiros, ralos, fazendo por sua própria conta todos os consertos e reparos, bem como as substituições de peças necessárias por outras da mesma qualidade, de tal maneira, que, findo ou rescindindo este contrato, esteja em condições de ser imediatamente utilizado, sem ônus para o LOCADOR(A);<br>c) Observar e fazer com que seja respeitada a boa utilização da locação, em estreita observância à legislação e normas exaradas pelo poder público;<br>d) Manter o mesmo quadro social de sua empresa enquanto durar a locação;<br>e) Utilizar como fachada unicamente seus símbolos, logomarca, nome empresarial ou de fantasia;<br>f) Reparar quaisquer estragos, danos ou prejuízos causados ao imóvel ou a terceiros, por seus prepostos ou terceiros que o visitem, em decorrência do uso da coisa locada;<br>g) Satisfazer todas as exigências dos poderes públicos em relação a fatos que der causa;<br>h) Permitir vistoria do imóvel pelos LOCADOR(A) ou seu mandatário, a qual deverá ser comunicada com uma antecedência mínima de 48 (quarenta e oito) horas.</div><br><div style="text-align: justify"><b>9- BENFEITORIAS:</b></div><br><div style="text-align: justify"><b>9.1- AUTORIZAÇÃO DA LOCADOR(A)A:</b> O LOCATÁRIO(A) poderá fazer as benfeitorias de qualquer natureza no imóvel, desde que expressamente autorizadas pelo LOCADOR(A).</div><br><div style="text-align: justify"><b>9.2- INCORPORAÇÃO DAS BENFEITORIAS:</b> As benfeitorias de qualquer natureza, úteis, necessárias ou meramente voluptuárias, pretéritas ou futuras, ficarão incorporadas ao imóvel, sem que caiba ao LOCATÁRIO(A) qualquer direito de compensação, indenização ou retenção.</div><br><div style="text-align: justify"><b>10- SUBLOCAÇÃO:</b></div><br><div style="text-align: justify"><b>10.1- CONSENTIMENTO PRÉVIO:</b> O LOCATÁRIO(A) não poderá sublocar o imóvel sem expressa (por escrito) e prévia autorização do LOCADOR(A).</div><br><div style="text-align: justify"><b>10.2 – SUBLOCAÇÃO EXCLUSIVAMENTE PARCIAL:</b> Mesmo na hipótese de expressa e prévia autorização (por escrito) do LOCADOR(A) para a sublocação do imóvel, necessariamente essa será parcial, limitando-se a 30% da área total do imóvel local, e deverá o respectivo contrato seguir o exato modelo constante do Anexo I deste instrumento (Contrato de Sublocação Parcial de Imóvel Comercial).</div><br><div style="text-align: justify"><b>11- BENEFÍCIO EM FAVOR DO LOCATÁRIO(A):</b></div><br><div style="text-align: justify"><b>11.1- TOLERÂNCIA:</b> Se o LOCADOR(A), por si ou preposto, admitirem quaisquer benefícios em favor do LOCATÁRIO(A) no cumprimento das obrigações contratuais, esse comportamento será tido como mera tolerância, não importando em novação ou alteração do contrato, que permanecerá íntegro e em pleno vigor.</div><br><div style="text-align: justify"><b>12- EXTINÇÃO DA LOCAÇÃO:</b></div><br><div style="text-align: justify"><b>12.1- HIPÓTESES DA EXTINÇÃO:</b><br>Este contrato extinguir-se-á, automaticamente, nos seguintes casos:<br>a) Desapropriação total ou parcial do imóvel;<br>b) Término do prazo contratual;<br>c) Recebimento das chaves pelo LOCADOR(A).<br>d) Hipótese do item 6.5.</div><br><div style="text-align: justify"><b>12.2- A NÃO EXTINÇÃO DA LOCAÇÃO:</b><br>a) Expirado o prazo do presente contrato, previsto na cláusula já referida, e convindo ao LOCATÁRIO(A) dar continuidade à locação, desde que com a expressa concordância do LOCADOR(A), ficará assegurado ao mesmo, automaticamente, a prorrogação deste contrato, nos termos do item 6.3, devendo ser mantidas todas as cláusulas do aludido ajuste ora firmado${selected.tipo_garantia === 'Fiador' ? ', devendo, ainda, serem renovadas a FIANÇA pela atual FIADORA' : ''};<br>b) De igual modo, não convindo ao LOCADOR(A) a prorrogação, fica assegurado aos mesmos a retomada do imóvel.</div><br><div style="text-align: justify"><b>12.3- DESAPROPRIAÇÃO:</b> No caso de desapropriação do imóvel locado, fica o LOCADOR(A) desobrigados do pagamento de qualquer indenização.</div><br><div style="text-align: justify"><b>13- RESCISÃO DA LOCAÇÃO:</b></div><br><div style="text-align: justify"><b>13.1- HIPÓTESES DA RESCISÃO:</b> Considerar-se-á rescindido o presente contrato, de pleno direito, independentemente de notificação judicial ou extrajudicial, nos seguintes casos:<br>a) Pelo atraso no pagamento do aluguel mensal e encargos da locação;<br>b) Incêndio, sinistro, ou outro evento que impeça a utilização normal do imóvel, devendo os LOCATÁRIO(A) continuar pagando aos LOCADOR(A) os aluguéis até o recebimento por este da indenização por parte do seguro referido contra incêndio que desejar contratar.<br>c) Infração contratual ou legal.</div>${fiancaClause}<br><div style="text-align: justify"><b>${selected.tipo_garantia === 'Fiador' ? '15' : '14'}- COMUNICAÇÕES:</b></div><br><div style="text-align: justify"><b>${selected.tipo_garantia === 'Fiador' ? '15' : '14'}.1- FORMA DE COMUNICAÇÃO ENTRE AS PARTES:</b> As comunicações entre as partes serão feitas de forma que comprovem inequivocamente sua efetivação, sendo válido, entre elas, telegrama com pedido de confirmação carta registrada com Aviso de Recebimento (AR), ou carta entregue pessoalmente com recebido de recebimento contendo data e assinatura do LOCATÁRIO(A) ou de um seu preposto, morador ou trabalhador do imóvel locado.</div><br><div style="text-align: justify"><b>${selected.tipo_garantia === 'Fiador' ? '16' : '15'}- REGRAS PROCESSUAIS CONVENCIONAIS:</b></div><br><div style="text-align: justify"><b>${selected.tipo_garantia === 'Fiador' ? '16' : '15'}.1- CITAÇÕES, INTIMAÇÕES OU NOTIFICAÇÕES:</b> Todas as citações, intimações ou notificações, em processos fundados, decorrentes ou consequentes do presente contrato, poderão ser efetivadas mediante correspondência com aviso de recebimento ou pelas demais formas previstas no Código de Processo Civil, e deverão ser encaminhados, precipuamente, ao endereço das partes descrito nos prolegômenos.</div><br><div style="text-align: justify"><b>${selected.tipo_garantia === 'Fiador' ? '17' : '16'} – AUTORIZAÇÃO PARA MUDANÇA DE TITULARIDADE DE CONTAS DE CONSUMO:</b> O LOCATÁRIO(A) autoriza, através deste instrumento, a mudança de titularidade, ligação, religação ou cancelamento de contrato pelo LOCADOR(A) das contas de consumo de energia e água junto às concessionárias de serviço público competentes (ENERGISA e CAGEPA), passando essas a serem de total responsabilidade do LOCATÁRIO(A).</div><br><div style="text-align: justify"><b>${selected.tipo_garantia === 'Fiador' ? '18' : '17'}- FORO:</b></div><br><div style="text-align: justify"><b>${selected.tipo_garantia === 'Fiador' ? '18' : '17'}.1- ELEIÇÃO:</b> Com expressa renúncia de qualquer outro, por mais privilegiado que seja, e independentemente do domicilio atual ou futuro dos contratantes, fica eleito o Foro da Comarca de João Pessoa, Estado da Paraíba, para processar e julgar qualquer procedimento que decorra, direta ou indiretamente, do presente contrato.</div>`;
                setClausulasGeraisText(defaultClausulas);
            }

            // 10. Página de Assinaturas
            if (selected.texto_assinaturas) {
                setAssinaturasText(selected.texto_assinaturas);
            } else {
                const rawImovel = selected.imoveis;
                const imovelObj = Array.isArray(rawImovel) ? rawImovel[0] : (rawImovel || {});
                
                // Proprietários Ativos para Assinaturas
                const activeOwners: any[] = [];
                if (selected.impresso_no_contrato !== false) {
                    const primary = selected.proprietarios || selected.empresas || imovelObj.proprietarios || imovelObj.empresas || {};
                    if (primary && (primary.nome_completo || primary.nome_fantasia || primary.razao_social)) {
                        activeOwners.push(primary);
                    }
                }
                if (selected.proprietarios_secundarios && Array.isArray(selected.proprietarios_secundarios)) {
                    selected.proprietarios_secundarios.forEach((sec: any) => {
                        if (sec.no_contrato !== false) {
                            const owner = (sec.tipo === 'PF' ? propsList : compsList).find(p => p.id === sec.id);
                            if (owner) activeOwners.push(owner);
                        }
                    });
                }

                // Helper: gera uma célula de assinatura
                const sigCell = (nome: string, papel: string) =>
                    `<td style="text-align: center; vertical-align: top; padding: 15px 10px; width: 50%;">________________________________<br><b>${nome}</b><br>${papel}</td>`;

                // Locadores
                const locadorNames = activeOwners.map(loc => loc.nome_completo || loc.nome_fantasia || loc.razao_social || 'N/A');

                const locatId = selected.cliente_id;
                const locatObj = clientsList.find((c: any) => c.id === locatId) || selected.clientes || {};
                const locatNome = locatObj.nome_completo || 'N/A';

                // Fiadores
                let fiadoresObjs: any[] = [];
                if (selected.tipo_garantia === "Fiador") {
                    if (locatObj.papel === 'Apenas Fiador' || locatObj.papel === 'Locatário e Fiador') fiadoresObjs.push(locatObj);
                    if (Array.isArray(selected.fiadores_ids) && selected.fiadores_ids.length > 0) {
                        const explicitFiadores = selected.fiadores_ids.map((id: string) => clientsList.find(c => c.id === id)).filter(Boolean);
                        fiadoresObjs = [...fiadoresObjs, ...explicitFiadores];
                    }
                    fiadoresObjs = fiadoresObjs.filter((f, index, self) => index === self.findIndex((t) => t.id === f.id));
                }

                const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
                const hoje = new Date();
                const dataExtensoHoje = `${hoje.getDate().toString().padStart(2, '0')} de ${meses[hoje.getMonth()]} de ${hoje.getFullYear()}`;

                // Montar linhas lado a lado usando tabela HTML
                let sigRows = '';

                // Linha 1: Locador(es) + Locatário lado a lado
                // Se houver mais de um locador, empilha locadores na coluna esquerda
                if (locadorNames.length <= 1) {
                    sigRows += `<tr>${sigCell(locadorNames[0] || 'N/A', 'LOCADOR(A)')}${sigCell(locatNome, 'LOCATÁRIO(A)')}</tr>`;
                } else {
                    // Primeiro locador + locatário
                    sigRows += `<tr>${sigCell(locadorNames[0], 'LOCADOR(A)')}${sigCell(locatNome, 'LOCATÁRIO(A)')}</tr>`;
                    // Demais locadores em pares
                    for (let i = 1; i < locadorNames.length; i += 2) {
                        if (i + 1 < locadorNames.length) {
                            sigRows += `<tr>${sigCell(locadorNames[i], 'LOCADOR(A)')}${sigCell(locadorNames[i + 1], 'LOCADOR(A)')}</tr>`;
                        } else {
                            sigRows += `<tr>${sigCell(locadorNames[i], 'LOCADOR(A)')}<td></td></tr>`;
                        }
                    }
                }

                // Fiadores em pares lado a lado
                if (fiadoresObjs.length > 0) {
                    for (let i = 0; i < fiadoresObjs.length; i += 2) {
                        const f1 = fiadoresObjs[i];
                        const f2 = fiadoresObjs[i + 1];
                        if (f2) {
                            sigRows += `<tr>${sigCell(f1.nome_completo, 'FIADOR(A)')}${sigCell(f2.nome_completo, 'FIADOR(A)')}</tr>`;
                        } else {
                            sigRows += `<tr>${sigCell(f1.nome_completo, 'FIADOR(A)')}<td></td></tr>`;
                        }
                    }
                }

                // Testemunhas sempre lado a lado
                sigRows += `<tr><td style="text-align: center; vertical-align: top; padding: 15px 10px; width: 50%;">________________________________<br>Nome: JOSUÊNIA V. F. ALVES<br>CPF: 073.193.704-09<br><b>TESTEMUNHA</b></td><td style="text-align: center; vertical-align: top; padding: 15px 10px; width: 50%;">________________________________<br>Nome:<br>CPF:<br><b>TESTEMUNHA</b></td></tr>`;

                const signaturesTable = `<table style="width: 100%; border-collapse: collapse;">${sigRows}</table>`;

                const defaultAssinaturas = `<div style="text-align: justify">E por estarem, assim, justas e acordadas, assinam o presente instrumento em 02 (duas) vias de igual teor e forma e para um mesmo fim, juntamente com 02 (duas) testemunhas que a tudo estiveram presentes, para que surta os efeitos legais.</div><br><div style="text-align: center">João Pessoa, ${dataExtensoHoje}.</div><br><br>${signaturesTable}`;
                setAssinaturasText(defaultAssinaturas);
            }

            // 11. Rodapé do Contrato - Auto-preenche com nome e endereço do imóvel
            if (selected.texto_rodape) {
                setRodapeText(selected.texto_rodape);
            } else {
                const rawImovel = selected.imoveis;
                const imovelObj = Array.isArray(rawImovel) ? rawImovel[0] : (rawImovel || {});
                const nomeImovel = imovelObj.nome_identificacao || imovelObj.tipo || 'Imóvel';
                const street = imovelObj.logradouro || (imovelObj.endereco ? imovelObj.endereco.split(',')[0] : '');
                const enderecoCompleto = `${street}${imovelObj.numero ? ', nº ' + imovelObj.numero : ''}${imovelObj.complemento ? ', ' + imovelObj.complemento : ''}, ${imovelObj.bairro || ''}, ${imovelObj.cidade || ''} – ${imovelObj.estado || ''}`;
                const defaultRodape = `<div style="text-align: center; font-size: 9pt;">VISTO: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; LOCADOR &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; LOCATÁRIO</div><div style="text-align: center; font-size: 9pt;">${nomeImovel} - ${enderecoCompleto}</div>`;
                setRodapeText(defaultRodape);
            }
        } else {
            setCabecalhoText("");
            setPartesText("");
            setNegocioJuridicoText("");
            setObjetoLocacaoText("");
            setObjetivoFinalidadeText("");
            setPrazoLocacaoText("");
            setPrecoLocacaoText("");
            setClausulasGeraisText("");
            setRodapeText("");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAluguelId) {
            alert("Selecione um Aluguel Primeiramente.");
            return;
        }

        setLoading(true);
        try {
            // Processar upload do contrato assinado
            let contratoAssinadoUrl = existingContratoUrl;

            if (arquivoContrato) {
                let fToUpload: Blob = arquivoContrato;
                let fName = `contrato_assinado_${Date.now()} `;

                if (arquivoContrato.type === 'application/pdf') {
                    const res = await processPDF(arquivoContrato);
                    fToUpload = res.blob;
                    fName += '.pdf';
                } else if (arquivoContrato.type.startsWith('image/')) {
                    fToUpload = await convertToWebP(arquivoContrato);
                    fName += '.webp';
                }

                const codigoRef = nextContractCode || 'sem_codigo';
                const { data: uploadData, error: upError } = await supabaseStorage.storage
                    .from('documentos')
                    .upload(`contratos / ${codigoRef}/${fName}`, fToUpload, { upsert: true });

                if (upError) throw upError;

                const { data: pubData } = supabaseStorage.storage
                    .from('documentos')
                    .getPublicUrl(uploadData.path);

                contratoAssinadoUrl = pubData.publicUrl;
            }

            // Determinar status baseado no upload e finalizar
            const temArquivoAssinado = !!contratoAssinadoUrl;
            let statusContrato = 'Aguardando Assinatura';
            let statusAluguel: string | null = null;
            let statusImovel: string | null = null;

            if (finalizarContrato && temArquivoAssinado) {
                statusContrato = 'Finalizado';
                statusAluguel = 'Finalizado';
                statusImovel = 'Disponível';
            } else if (temArquivoAssinado) {
                statusContrato = 'Em Vigência';
                statusAluguel = 'Em Vigência';
                statusImovel = 'Alugado';
            }

            const payload: any = {
                cabecalho_contrato: cabecalhoText,
                texto_partes: partesText,
                negocio_juridico: negocioJuridicoText,
                objeto_locacao: objetoLocacaoText,
                objetivo_finalidade: objetivoFinalidadeText,
                prazo_locacao: prazoLocacaoText,
                preco_locacao: precoLocacaoText,
                clausulas_gerais: clausulasGeraisText,
                texto_assinaturas: assinaturasText,
                texto_rodape: rodapeText,
                codigo_contrato: nextContractCode,
                status: statusContrato,
                contrato_assinado_url: contratoAssinadoUrl
            };

            // Sincronizar campos do aluguel para o contrato
            const fieldsToCopy = [
                'codigo_interno', 'cliente_id', 'proprietario_id', 'imovel_id',
                'data_inicio', 'duracao_meses', 'valor_aluguel',
                'finalidade_aluguel', 'tipo_reajuste', 'tempo_reajuste_fixo',
                'rf_p1_inicio', 'rf_p1_final', 'rf_p1_valor',
                'rf_p2_inicio', 'rf_p2_final', 'rf_p2_valor',
                'rf_p3_inicio', 'rf_p3_final', 'rf_p3_valor',
                'tipo_garantia', 'fiadores_ids', 'caucao_quantidade', 'caucao_valor',
                'data_vencimento', 'valor_condominio', 'tipo_pagamento_condominio',
                'valor_total_aluguel_condominio', 'proprietarios_secundarios', 'impresso_no_contrato'
            ];

            if (selectedData) {
                fieldsToCopy.forEach(f => {
                    if (selectedData[f] !== undefined) {
                        payload[f] = selectedData[f];
                    }
                });
            }

            let contratoId = initialData?.id;
            const locatarioNome = selectedData.clientes?.nome_completo || 'N/A';

            if (initialData?.id) {
                // Editando um contrato já existente
                const { error } = await supabase
                    .from('contratos')
                    .update(payload)
                    .eq('id', initialData.id);
                if (error) throw error;
                await logAction('Atualizou Contrato', `Código: ${initialData.codigo_contrato} | Locatário: ${locatarioNome}`);

                // Atualizar status do aluguel e imóvel se necessário
                if (statusAluguel && initialData.codigo_interno) {
                    await supabase
                        .from('alugueis')
                        .update({ status: statusAluguel })
                        .eq('codigo_interno', initialData.codigo_interno);
                }
                if (statusImovel && initialData.imovel_id) {
                    await supabase
                        .from('imoveis')
                        .update({ status: statusImovel })
                        .eq('id', initialData.imovel_id);
                }
            } else {
                const { data: newContrato, error: insertError } = await supabase
                    .from('contratos')
                    .insert([payload])
                    .select('id, codigo_contrato')
                    .single();

                if (insertError) throw insertError;
                contratoId = newContrato.id;

                await logAction('Criou Contrato', `Código: ${newContrato.codigo_contrato} | Locatário: ${locatarioNome}`);

                // Atualizar aluguel
                const aluguelUpdate: any = { status: statusAluguel || 'Contrato Gerado' };
                await supabase
                    .from('alugueis')
                    .update(aluguelUpdate)
                    .eq('id', selectedAluguelId);

                // Atualizar imóvel se necessário
                if (statusImovel && selectedData?.imovel_id) {
                    await supabase
                        .from('imoveis')
                        .update({ status: statusImovel })
                        .eq('id', selectedData.imovel_id);
                }
            }

            // --- AUTO-GERAÇÃO FINANCEIRO ---
            const wasVigencia = initialData?.status === 'Em Vigência';
            const isVigencia = statusContrato === 'Em Vigência';

            if (isVigencia && !wasVigencia && contratoId) {
                // Obter dados base para gerar a transação
                const baseData = selectedData || initialData;
                const duracao = baseData.duracao_meses || 1;
                let valorBase = baseData.valor_aluguel || 0;

                // Tentar recuperar reajustes_fixos do aluguel caso não esteja no baseData
                let reajustesArr = baseData.reajustes_fixos;
                if ((!reajustesArr || reajustesArr.length === 0) && baseData.codigo_interno) {
                    const { data: aluguelData } = await supabase.from('alugueis').select('reajustes_fixos').eq('codigo_interno', baseData.codigo_interno).single();
                    if (aluguelData && aluguelData.reajustes_fixos) {
                        reajustesArr = aluguelData.reajustes_fixos;
                    }
                }

                // Se o pagamento do condomínio for unificado, o valor da parcela financeira deve ser a soma
                if (baseData.tipo_pagamento_condominio === 'Único') {
                    valorBase = baseData.valor_total_aluguel_condominio || (valorBase + (baseData.valor_condominio || 0));
                }

                // Gerar T-Code sequencial
                let tCode = "T-0001";
                const { data: lastT } = await supabase
                    .from('transacoes')
                    .select('codigo_transacao')
                    .not('codigo_transacao', 'is', null)
                    .order('created_at', { ascending: false })
                    .limit(1);

                if (lastT && lastT.length > 0 && lastT[0].codigo_transacao) {
                    const match = lastT[0].codigo_transacao.match(/T-(\d+)/);
                    if (match) {
                        const nextNum = parseInt(match[1], 10) + 1;
                        tCode = `T-${nextNum.toString().padStart(4, '0')}`;
                    }
                }

                const { data: transacao, error: tError } = await supabase
                    .from('transacoes')
                    .insert([{
                        codigo_transacao: tCode,
                        contrato_id: contratoId,
                        aluguel_codigo: baseData.codigo_interno,
                        contrato_codigo: nextContractCode || baseData.codigo_contrato,
                        locatario_nome: baseData.clientes?.nome_completo || 'Desconhecido',
                        quantidade_parcelas: duracao,
                        valor_parcela: valorBase,
                        tipo_reajuste: baseData.tipo_reajuste
                    }])
                    .select()
                    .single();

                if (!tError && transacao) {
                    const parcelasToInsert = [];
                    const dataRef = new Date((baseData.data_vencimento || baseData.data_inicio || new Date().toISOString().slice(0, 10)) + 'T00:00:00');

                    for (let i = 1; i <= duracao; i++) {
                        // O primeiro vencimento (i=1) é a dataRef. Os seguintes são incrementados mensalmente.
                        const vencimento = new Date(dataRef);
                        vencimento.setMonth(vencimento.getMonth() + (i - 1));

                        let valorParcela = valorBase;

                        // Se for reajuste Fixo, verifica os períodos
                        if (baseData.tipo_reajuste === 'Fixo') {
                            if (reajustesArr && Array.isArray(reajustesArr) && reajustesArr.length > 0) {
                                for (const p of reajustesArr) {
                                    const pInicio = p.inicio ? new Date(p.inicio + 'T00:00:00') : null;
                                    const pFinal = p.final ? new Date(p.final + 'T00:00:00') : null;
                                    if (pInicio && pFinal && vencimento >= pInicio && vencimento <= pFinal) {
                                        valorParcela = p.valor;
                                        break;
                                    }
                                }
                            } else {
                                const p1_inicio = baseData.rf_p1_inicio ? new Date(baseData.rf_p1_inicio + 'T00:00:00') : null;
                                const p1_final = baseData.rf_p1_final ? new Date(baseData.rf_p1_final + 'T00:00:00') : null;
                                const p2_inicio = baseData.rf_p2_inicio ? new Date(baseData.rf_p2_inicio + 'T00:00:00') : null;
                                const p2_final = baseData.rf_p2_final ? new Date(baseData.rf_p2_final + 'T00:00:00') : null;
                                const p3_inicio = baseData.rf_p3_inicio ? new Date(baseData.rf_p3_inicio + 'T00:00:00') : null;
                                const p3_final = baseData.rf_p3_final ? new Date(baseData.rf_p3_final + 'T00:00:00') : null;

                                if (p1_inicio && p1_final && vencimento >= p1_inicio && vencimento <= p1_final) valorParcela = baseData.rf_p1_valor;
                                else if (p2_inicio && p2_final && vencimento >= p2_inicio && vencimento <= p2_final) valorParcela = baseData.rf_p2_valor;
                                else if (p3_inicio && p3_final && vencimento >= p3_inicio && vencimento <= p3_final) valorParcela = baseData.rf_p3_valor;
                            }
                        }

                        parcelasToInsert.push({
                            transacao_id: transacao.id,
                            numero_parcela: i,
                            data_vencimento: vencimento.toISOString().slice(0, 10),
                            valor: valorParcela,
                            status: 'A Vencer'
                        });
                    }

                    if (parcelasToInsert.length > 0) {
                        await supabase.from('parcelas').insert(parcelasToInsert);
                    }
                }
            }

            onSuccess();
            onClose();
        } catch (error: any) {
            alert("Erro ao salvar contrato: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence mode="wait">
            {isOpen && (
                <motion.div
                    key="modal-overlay-wrapper"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                >
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-background/90 backdrop-blur-xl"
                    />

                    <motion.div
                        key="modal-content"
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="bg-panel glass-elite w-full max-w-5xl h-[650px] max-h-[90vh] rounded-[48px] shadow-2xl relative z-10 border border-panel-border flex flex-col overflow-hidden font-sans"
                    >

                        <header className="px-10 py-8 flex justify-between items-center bg-gradient-to-b from-black/5 dark:from-white/5 to-transparent border-b border-panel-border shrink-0">
                            <div className="flex items-end gap-4">
                                <div>
                                    <div className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-1">Elaboração Documental</div>
                                    <h3 className="text-3xl font-serif-premium font-bold text-foreground uppercase italic tracking-tighter leading-none lowercase first-letter:uppercase">
                                        {isReadOnly ? "Visualizar Contrato" : (initialData ? "Editar Contrato" : "Novo Contrato")}
                                    </h3>
                                </div>
                            </div>
                            <button onClick={onClose} className="w-10 h-10 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full flex items-center justify-center text-accent transition-all border border-panel-border"><X className="w-5 h-5" /></button>
                        </header>

                        <form id="contrato-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-10">

                            {/* Aluguel Selector */}
                            {!initialData && (
                                <div className="space-y-4 bg-black/[0.02] dark:bg-white/[0.02] p-8 rounded-[32px] border border-panel-border">
                                    <h4 className="text-[10px] font-black text-accent uppercase tracking-[0.2em] flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-primary" /> 1. Vincular Aluguel
                                    </h4>
                                    <select
                                        value={selectedAluguelId}
                                        onChange={(e) => handleSelectAluguel(e.target.value, alugueis, allClientes)}
                                        disabled={isReadOnly}
                                        className={cn(
                                            "w-full bg-background border border-panel-border rounded-xl h-12 px-5 text-foreground text-[13px] outline-none focus:border-primary transition-all font-bold cursor-pointer",
                                            isReadOnly && "opacity-70 cursor-not-allowed"
                                        )}
                                    >
                                        <option key="default" value="">Selecione um Aluguel Gerado...</option>
                                        {alugueis.map(a => (
                                            <option key={a.id} value={a.id}>
                                                Ref {a.codigo_interno || 'S/N'} • Imóvel: {a.imoveis?.nome_identificacao || a.imoveis?.logradouro || a.imoveis?.endereco?.split(',')[0]} • Locatário: {a.clientes?.nome_completo?.split(' ')[0]}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {selectedData && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-10">

                                    {/* Identificadores de Código */}
                                    <div className="grid grid-cols-3 gap-10">
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-black text-accent uppercase tracking-widest">Número do Contrato</p>
                                            <div className="h-9 px-5 bg-background border border-panel-border rounded-xl flex items-center">
                                                <span className="text-[13px] font-bold text-foreground">
                                                    {nextContractCode}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-black text-accent uppercase tracking-widest text-center">Data do Contrato</p>
                                            <div className="h-9 px-5 bg-background border border-panel-border rounded-xl flex items-center justify-center">
                                                <span className="text-[13px] font-bold text-foreground">
                                                    {initialData?.created_at
                                                        ? new Date(initialData.created_at).toLocaleDateString('pt-BR')
                                                        : new Date().toLocaleDateString('pt-BR')}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-black text-accent uppercase tracking-widest text-right">Número do Aluguel</p>
                                            <div className="h-9 px-5 bg-background border border-panel-border rounded-xl flex items-center justify-end">
                                                <span className="text-[13px] font-bold text-foreground">
                                                    {selectedData.codigo_interno}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Overview Boxes */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                                        <div className="bg-background border border-panel-border rounded-2xl p-4 md:p-6 shadow-sm flex items-start gap-3 md:gap-4">
                                            <div className="w-8 h-8 md:w-10 md:h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                                                <User className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="text-[8px] md:text-[9px] font-black text-accent uppercase tracking-widest mb-1">Locatário (Cliente)</p>
                                                <p className="text-[12px] md:text-[13px] font-bold text-foreground truncate">{selectedData.clientes?.nome_completo || 'N/A'}</p>
                                            </div>
                                        </div>

                                        <div className="bg-background border border-panel-border rounded-2xl p-4 md:p-6 shadow-sm flex items-start gap-3 md:gap-4">
                                            <div className="w-8 h-8 md:w-10 md:h-10 bg-accent/10 rounded-xl flex items-center justify-center shrink-0">
                                                <User className="w-4 h-4 md:w-5 md:h-5 text-accent" />
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="text-[8px] md:text-[9px] font-black text-accent uppercase tracking-widest mb-1">Locador (Proprietário)</p>
                                                <p className="text-[12px] md:text-[13px] font-bold text-foreground truncate">
                                                    {(() => {
                                                        const target = initialData || selectedData;
                                                        const imovelObj = Array.isArray(target.imoveis) ? target.imoveis[0] : (target.imoveis || {});

                                                        // 1. Tentar proprietário direto no contrato
                                                        // 2. Tentar empresa direta no contrato
                                                        // 3. Tentar proprietário do imóvel -> empresa
                                                        const loc = target.proprietarios || target.empresas ||
                                                            imovelObj.proprietarios || imovelObj.empresas;

                                                        const name = loc?.nome_completo || loc?.nome_fantasia || loc?.razao_social;

                                                        return name || 'N/A';
                                                    })()}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="bg-background border border-panel-border rounded-2xl p-4 md:p-6 shadow-sm flex items-start gap-3 md:gap-4 sm:col-span-2 md:col-span-1">
                                            <div className="w-8 h-8 md:w-10 md:h-10 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
                                                <Building2 className="w-4 h-4 md:w-5 md:h-5 text-white" />
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="text-[8px] md:text-[9px] font-black text-accent uppercase tracking-widest mb-1">Finalidade</p>
                                                <p className="text-[12px] md:text-[13px] font-bold text-foreground uppercase truncate">{selectedData.finalidade_aluguel || 'Residencial'}</p>
                                            </div>
                                        </div>
                                    </div>


                                    {/* Upload Contrato Assinado */}
                                    <div className="bg-black/[0.02] dark:bg-white/[0.02] p-6 rounded-[32px] border border-panel-border space-y-4">
                                        <h4 className="text-[10px] font-black text-accent uppercase tracking-[0.2em] flex items-center gap-2">
                                            <UploadCloud className="w-4 h-4 text-primary" /> Upload do Contrato Assinado
                                        </h4>
                                        <p className="text-xs text-text-dim">Anexe o contrato assinado (PDF ou imagem). Ao salvar com o arquivo, o status será alterado para Vigente.</p>

                                        <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-4">
                                            <div className="flex-1 min-w-0">
                                                {!arquivoContrato && !existingContratoUrl ? (
                                                    <div onClick={() => !isReadOnly && fileInputRef.current?.click()}
                                                        className={cn(
                                                            "h-24 bg-black/[0.02] dark:bg-white/[0.02] border-2 border-dashed border-panel-border rounded-2xl flex flex-col items-center justify-center gap-2 transition-all group px-4 text-center",
                                                            !isReadOnly ? "cursor-pointer hover:border-primary" : "cursor-not-allowed"
                                                        )}>
                                                        <UploadCloud className="w-6 h-6 text-accent group-hover:text-primary transition-colors" />
                                                        <span className="text-xs font-bold text-foreground">
                                                            {isReadOnly ? "Nenhum arquivo anexado" : "Clique para anexar o contrato assinado..."}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-between gap-3">
                                                        <div className="flex items-center gap-3 overflow-hidden">
                                                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0"><CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-primary" /></div>
                                                            <div className="overflow-hidden">
                                                                <div className="text-xs md:text-sm font-bold text-foreground truncate">{arquivoContrato?.name || "Contrato Assinado Anexado"}</div>
                                                                <div className="text-[9px] md:text-[10px] text-accent uppercase font-black">{arquivoContrato ? 'Pronto para Upload' : 'Documento Salvo na Nuvem'}</div>
                                                            </div>
                                                        </div>
                                                        {!isReadOnly && (
                                                            <button type="button" onClick={() => { setArquivoContrato(null); setExistingContratoUrl(null); setShowSaveAlert(false); }}
                                                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all shrink-0">
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.pdf" onChange={(e) => {
                                                    if (e.target.files && e.target.files[0]) {
                                                        setArquivoContrato(e.target.files[0]);
                                                        setShowSaveAlert(true);
                                                    }
                                                }} />
                                            </div>

                                            {/* Finalizar Contrato - só aparece se tem arquivo */}
                                            {(arquivoContrato || existingContratoUrl) && (
                                                <label className="flex items-center justify-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 cursor-pointer hover:bg-amber-500/20 transition-all sm:shrink-0 h-24 sm:h-auto">
                                                    <input type="checkbox" checked={finalizarContrato} onChange={(e) => handleToggleFinalizar(e.target.checked)}
                                                        className="w-4 h-4 rounded accent-amber-500" />
                                                    <span className="text-[10px] md:text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider">Finalizar Contrato</span>
                                                </label>
                                            )}
                                        </div>


                                        {/* Painel de confirmação para finalizar */}
                                        {showFinalizarConfirm && (
                                            <div className="flex flex-col gap-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4">
                                                <div className="flex items-start gap-3">
                                                    <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="text-sm font-black text-rose-600 dark:text-rose-400">Atenção: Esta ação é irreversível!</p>
                                                        <p className="text-xs text-rose-500/80 mt-1">Ao finalizar o cadastro, não será mais possível qualquer edição. Você tem certeza?</p>
                                                        <p className="text-xs font-bold text-rose-600 dark:text-rose-400 mt-2">Para confirmar, digite o número do contrato: <span className="font-black">{nextContractCode || initialData?.codigo_contrato}</span></p>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col sm:flex-row items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={confirmCodigoInput}
                                                        onChange={(e) => setConfirmCodigoInput(e.target.value)}
                                                        placeholder={`Digite ${nextContractCode || initialData?.codigo_contrato}`}
                                                        className="w-full sm:flex-1 h-12 sm:h-10 px-4 bg-background border border-rose-500/40 rounded-xl text-sm font-bold text-foreground outline-none focus:border-rose-500 transition-all"
                                                        onKeyDown={(e) => e.key === 'Enter' && handleConfirmarFinalizar()}
                                                        autoFocus
                                                    />
                                                    <div className="flex w-full sm:w-auto gap-2">
                                                        <button type="button" onClick={handleConfirmarFinalizar}
                                                            className="flex-1 sm:flex-none h-12 sm:h-10 px-4 bg-rose-500 text-white text-[10px] font-black uppercase rounded-xl hover:bg-rose-600 transition-all">
                                                            Confirmar
                                                        </button>
                                                        <button type="button" onClick={() => { setShowFinalizarConfirm(false); setConfirmCodigoInput(""); }}
                                                            className="flex-1 sm:flex-none h-12 sm:h-10 px-4 bg-black/5 dark:bg-white/5 text-accent text-[10px] font-black uppercase rounded-xl hover:bg-black/10 dark:hover:bg-white/10 transition-all">
                                                            Cancelar
                                                        </button>
                                                    </div>
                                                </div>

                                            </div>
                                        )}

                                        {showSaveAlert && (
                                            <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                                                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                                                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">Arquivo selecionado! Clique em "Salvar Contrato" para confirmar o upload.</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Text Content Editor */}
                                    <div className="bg-black/[0.02] dark:bg-white/[0.02] p-4 md:p-8 rounded-[32px] border border-panel-border space-y-4 md:space-y-6">

                                        <h4 className="text-[10px] font-black text-accent uppercase tracking-[0.2em] flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-primary" /> 2. Cabeçalho do Contrato
                                        </h4>
                                        <p className="text-xs text-text-dim">Edite o texto de apresentação do contrato. Utilize a barra de ferramentas para formatar o texto conforme desejado para a impressão.</p>

                                        <RichTextEditor
                                            value={cabecalhoText}
                                            onChange={setCabecalhoText}
                                            placeholder="Digite ou edite o documento principal..."
                                            disabled={isReadOnly}
                                        />
                                    </div>

                                    {/* Partes Editor */}
                                    <div className="bg-black/[0.02] dark:bg-white/[0.02] p-4 md:p-8 rounded-[32px] border border-panel-border space-y-4 md:space-y-6">

                                        <h4 className="text-[10px] font-black text-accent uppercase tracking-[0.2em] flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-primary" /> 3. Identificação das Partes
                                        </h4>
                                        <p className="text-xs text-text-dim">Revise os dados exportados automaticamente e ajuste qualquer termo relacionado a Locadores, Locatários e Fiadores.</p>

                                        <RichTextEditor
                                            value={partesText}
                                            onChange={setPartesText}
                                            placeholder="Identificação das partes do contrato..."
                                            disabled={isReadOnly}
                                        />
                                    </div>

                                    {/* Negócio Jurídico Editor */}
                                    <div className="bg-black/[0.02] dark:bg-white/[0.02] p-4 md:p-8 rounded-[32px] border border-panel-border space-y-4 md:space-y-6">

                                        <h4 className="text-[10px] font-black text-accent uppercase tracking-[0.2em] flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-primary" /> 4. Negócio Jurídico
                                        </h4>
                                        <p className="text-xs text-text-dim">Descreva as condições jurídicas e regulamentações do contrato.</p>

                                        <RichTextEditor
                                            value={negocioJuridicoText}
                                            onChange={setNegocioJuridicoText}
                                            placeholder="Descreva o negócio jurídico..."
                                            disabled={isReadOnly}
                                        />
                                    </div>

                                    {/* Objeto da Locação Editor */}
                                    <div className="bg-black/[0.02] dark:bg-white/[0.02] p-4 md:p-8 rounded-[32px] border border-panel-border space-y-4 md:space-y-6">

                                        <h4 className="text-[10px] font-black text-accent uppercase tracking-[0.2em] flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-primary" /> 5. Objeto da Locação
                                        </h4>
                                        <p className="text-xs text-text-dim">Descreva o imóvel objeto do contrato e sua localização.</p>

                                        <RichTextEditor
                                            value={objetoLocacaoText}
                                            onChange={setObjetoLocacaoText}
                                            placeholder="Descreva o objeto da locação..."
                                            disabled={isReadOnly}
                                        />
                                    </div>

                                    {/* Objetivo e Finalidade Editor */}
                                    <div className="bg-black/[0.02] dark:bg-white/[0.02] p-4 md:p-8 rounded-[32px] border border-panel-border space-y-4 md:space-y-6">

                                        <h4 className="text-[10px] font-black text-accent uppercase tracking-[0.2em] flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-primary" /> 6. Objetivo e Finalidade da Locação
                                        </h4>
                                        <p className="text-xs text-text-dim">Revise o objetivo do contrato e a finalidade de uso do imóvel.</p>

                                        <RichTextEditor
                                            value={objetivoFinalidadeText}
                                            onChange={setObjetivoFinalidadeText}
                                            placeholder="Descreva o objetivo e a finalidade..."
                                            disabled={isReadOnly}
                                        />
                                    </div>

                                    {/* Prazo da Locação Editor */}
                                    <div className="bg-black/[0.02] dark:bg-white/[0.02] p-4 md:p-8 rounded-[32px] border border-panel-border space-y-4 md:space-y-6">

                                        <h4 className="text-[10px] font-black text-accent uppercase tracking-[0.2em] flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-primary" /> 7. Prazo da Locação
                                        </h4>
                                        <p className="text-xs text-text-dim">Revise os prazos, datas de início/fim e as cláusulas de prorrogação e devolução.</p>

                                        <RichTextEditor
                                            value={prazoLocacaoText}
                                            onChange={setPrazoLocacaoText}
                                            placeholder="Detalhamento do prazo da locação..."
                                            disabled={isReadOnly}
                                        />
                                    </div>

                                    {/* Preço da Locação Editor */}
                                    <div className="bg-black/[0.02] dark:bg-white/[0.02] p-4 md:p-8 rounded-[32px] border border-panel-border space-y-4 md:space-y-6">

                                        <h4 className="text-[10px] font-black text-accent uppercase tracking-[0.2em] flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-primary" /> 8. Preço da Locação
                                        </h4>
                                        <p className="text-xs text-text-dim">Revise os valores mensais, períodos de reajuste fixo e dados bancários para pagamento.</p>

                                        <RichTextEditor
                                            value={precoLocacaoText}
                                            onChange={setPrecoLocacaoText}
                                            placeholder="Detalhamento do preço e condições de pagamento..."
                                            disabled={isReadOnly}
                                        />
                                    </div>

                                    {/* Cláusulas Gerais Editor */}
                                    <div className="bg-black/[0.02] dark:bg-white/[0.02] p-4 md:p-8 rounded-[32px] border border-panel-border space-y-4 md:space-y-6">

                                        <h4 className="text-[10px] font-black text-accent uppercase tracking-[0.2em] flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-primary" /> 9. Obrigações e Cláusulas Gerais
                                        </h4>
                                        <p className="text-xs text-text-dim">Revise as obrigações das partes, benfeitorias, regras de sublocação, rescisão e foro.</p>

                                        <RichTextEditor
                                            value={clausulasGeraisText}
                                            onChange={setClausulasGeraisText}
                                            placeholder="Cláusulas gerais e obrigações..."
                                            disabled={isReadOnly}
                                        />
                                    </div>

                                    {/* Página de Assinaturas Editor */}
                                    <div className="bg-black/[0.02] dark:bg-white/[0.02] p-4 md:p-8 rounded-[32px] border border-panel-border space-y-4 md:space-y-6">

                                        <h4 className="text-[10px] font-black text-accent uppercase tracking-[0.2em] flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-primary" /> 10. Página de Assinaturas
                                        </h4>
                                        <p className="text-xs text-text-dim">Revise as linhas de assinatura para Locador, Locatário, Fiadores e Testemunhas.</p>

                                        <RichTextEditor
                                            value={assinaturasText}
                                            onChange={setAssinaturasText}
                                            placeholder="Local para assinaturas..."
                                            disabled={isReadOnly}
                                        />
                                    </div>

                                    {/* Rodapé do Contrato Editor */}
                                    <div className="bg-black/[0.02] dark:bg-white/[0.02] p-4 md:p-8 rounded-[32px] border border-panel-border space-y-4 md:space-y-6">

                                        <h4 className="text-[10px] font-black text-accent uppercase tracking-[0.2em] flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-primary" /> 11. Rodapé do Contrato
                                        </h4>
                                        <p className="text-xs text-text-dim">Texto que aparecerá acima da imagem do rodapé em todas as páginas. Preenche automaticamente com o endereço do imóvel.</p>

                                        <RichTextEditor
                                            value={rodapeText}
                                            onChange={setRodapeText}
                                            placeholder="Endereço do imóvel para o rodapé..."
                                            disabled={isReadOnly}
                                        />
                                    </div>

                                </motion.div>
                            )}

                        </form>

                        <footer className="p-6 md:p-10 border-t border-panel-border bg-panel/30 dark:bg-white/5 backdrop-blur-md flex flex-col sm:flex-row items-stretch sm:items-center gap-4 shrink-0">
                            <div className="flex-1 hidden sm:block" />
                            {!isReadOnly ? (
                                <button type="submit" form="contrato-form" disabled={loading} className="bg-[#EAEAEA] dark:bg-primary text-[#0B0B0C] dark:text-background px-6 sm:px-12 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.4em] flex items-center justify-center gap-3 sm:gap-4 transition-all hover:scale-[1.02] sm:hover:scale-[1.05] shadow-xl">
                                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                    <Save className="w-4 h-4" /> Finalizar Documento
                                </button>
                            ) : (
                                <button type="button" onClick={onClose} className="bg-panel border border-panel-border text-foreground px-6 sm:px-12 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.4em] flex items-center justify-center gap-3 sm:gap-4 transition-all hover:scale-[1.02] sm:hover:scale-[1.05] shadow-xl">
                                    Fechar Visualização
                                </button>
                            )}
                        </footer>

                    </motion.div>
                </motion.div>
            )}

            {isBankModalOpen && (
                <motion.div
                    key="bank-modal-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[110] flex items-center justify-center p-4"
                >
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsBankModalOpen(false)} className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
                    <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="bg-panel w-full max-w-md rounded-[32px] shadow-2xl relative z-[120] border border-panel-border overflow-hidden p-8 space-y-6">

                        <div className="space-y-2">
                            <div className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">Configuração de Pagamento</div>
                            <h4 className="text-xl font-black text-foreground uppercase italic tracking-tighter">Selecionar Contas</h4>
                            <p className="text-xs text-text-dim font-medium">Escolha as contas bancárias que aparecerão no contrato.</p>
                        </div>

                        <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                            <button key="all-banks" onClick={() => { setSelectedBankAccounts(availableBankAccounts); setIsBankModalOpen(false); }}
                                className="w-full p-4 rounded-2xl border border-panel-border hover:border-primary transition-all text-left group bg-black/5 dark:bg-white/5">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[11px] font-black uppercase italic tracking-widest text-primary">Usar Todas</span>
                                    <div className="w-4 h-4 rounded-full border border-primary group-hover:bg-primary" />
                                </div>
                                <p className="text-[10px] text-text-dim font-bold uppercase tracking-widest leading-tight">Vincular todas as {availableBankAccounts.length} contas cadastradas.</p>
                            </button>

                            {availableBankAccounts.map((acc, idx) => (
                                <button key={idx} onClick={() => { setSelectedBankAccounts([acc]); setIsBankModalOpen(false); }}
                                    className="w-full p-4 rounded-2xl border border-panel-border hover:border-primary transition-all text-left group bg-black/5 dark:bg-white/5">
                                    <div className="flex justify-between items-center mb-1">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[11px] font-black uppercase italic tracking-widest text-foreground">{acc.banco}</span>
                                            {acc.ownerName && (
                                                <span className="text-[9px] font-bold uppercase tracking-wider text-primary/70">{acc.ownerName}</span>
                                            )}
                                        </div>
                                        <div className="w-4 h-4 rounded-full border border-panel-border group-hover:bg-primary shrink-0 ml-2" />
                                    </div>
                                    <p className="text-[10px] text-text-dim font-bold uppercase tracking-widest leading-tight mt-1.5">AG {acc.agencia} • {acc.tipo_conta} {acc.conta}</p>
                                </button>
                            ))}
                        </div>

                        <button onClick={() => setIsBankModalOpen(false)} className="w-full py-4 rounded-xl font-black text-[10px] text-accent hover:bg-black/5 dark:hover:bg-white/5 uppercase tracking-[0.3em] transition-all border border-panel-border">Fechar</button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
