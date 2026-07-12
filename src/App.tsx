import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Landmark,
  FileText,
  Plus,
  Trash2,
  Settings,
  Download,
  Printer,
  Calculator,
  User,
  MapPin,
  ChevronDown,
  ChevronUp,
  Info,
  Coins,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Sliders,
  UserCheck,
  Users,
  RefreshCw,
  HelpCircle,
  Pencil
} from "lucide-react";

import { BemCadastrado, ConfigCustas, ClienteDados, ItemAdicional } from "./types";
import {
  ATOS_FIXOS_PR,
  DEFAULT_VRC_RATE,
  DEFAULT_FUNDS_CONFIG,
  calcularVrcEscrituraValor
} from "./data/tabelaPR";
import { calcularResultados, formatarMoeda, formatarVrc, formatarTaxaVrc } from "./utils/calculator";
import { gerarPdfCliente } from "./utils/pdfGenerator";

export default function App() {
  // --- ESTADO ---
  const [bens, setBens] = useState<BemCadastrado[]>([]);

  const [config, setConfig] = useState<ConfigCustas>(() => {
    try {
      const saved = localStorage.getItem("tabelionato_digital_config");
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          vrcRate: parsed.vrcRate !== undefined ? parsed.vrcRate : DEFAULT_VRC_RATE,
          funarpenPct: parsed.funarpenPct !== undefined ? parsed.funarpenPct : DEFAULT_FUNDS_CONFIG.funarpenPct,
          fadepPct: parsed.fadepPct !== undefined ? parsed.fadepPct : DEFAULT_FUNDS_CONFIG.fadepPct,
          issPct: parsed.issPct !== undefined ? parsed.issPct : DEFAULT_FUNDS_CONFIG.issPct,
          funrejusPct: parsed.funrejusPct !== undefined ? parsed.funrejusPct : DEFAULT_FUNDS_CONFIG.funrejusPct,
          tetoFunrejusReais: parsed.tetoFunrejusReais !== undefined ? parsed.tetoFunrejusReais : DEFAULT_FUNDS_CONFIG.tetoFunrejusReais,
          taxaSeloFixoReais: parsed.taxaSeloFixoReais !== undefined ? parsed.taxaSeloFixoReais : DEFAULT_FUNDS_CONFIG.taxaSeloFixoReais,
          taxaDistribReais: parsed.taxaDistribReais !== undefined ? parsed.taxaDistribReais : DEFAULT_FUNDS_CONFIG.taxaDistribReais
        };
      }
    } catch (e) {
      console.error("Erro ao ler do localStorage:", e);
    }
    return {
      vrcRate: DEFAULT_VRC_RATE,
      funarpenPct: DEFAULT_FUNDS_CONFIG.funarpenPct,
      fadepPct: DEFAULT_FUNDS_CONFIG.fadepPct,
      issPct: DEFAULT_FUNDS_CONFIG.issPct,
      funrejusPct: DEFAULT_FUNDS_CONFIG.funrejusPct,
      tetoFunrejusReais: DEFAULT_FUNDS_CONFIG.tetoFunrejusReais,
      taxaSeloFixoReais: DEFAULT_FUNDS_CONFIG.taxaSeloFixoReais,
      taxaDistribReais: DEFAULT_FUNDS_CONFIG.taxaDistribReais
    };
  });

  const [salvandoConfig, setSalvandoConfig] = useState(false);
  const [mensagemConfig, setMensagemConfig] = useState<{ texto: string; tipo: "sucesso" | "erro" | null }>({ texto: "", tipo: null });

  const carregarConfigDoServidor = async () => {
    try {
      const res = await fetch("/api/config");
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (e) {
      console.error("Erro ao carregar configurações do servidor:", e);
    }
  };

  const salvarConfigNoServidor = async () => {
    setSalvandoConfig(true);
    setMensagemConfig({ texto: "", tipo: null });
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        setMensagemConfig({ texto: "Configurações salvas no banco de dados e atualizadas para todos os usuários!", tipo: "sucesso" });
        setTimeout(() => setMensagemConfig({ texto: "", tipo: null }), 6000);
      } else {
        throw new Error("Resposta do servidor não foi OK");
      }
    } catch (e) {
      console.error("Erro ao salvar configurações no servidor:", e);
      setMensagemConfig({ texto: "Erro ao salvar no banco de dados.", tipo: "erro" });
    } finally {
      setSalvandoConfig(false);
    }
  };

  React.useEffect(() => {
    carregarConfigDoServidor();
  }, []);

  React.useEffect(() => {
    try {
      localStorage.setItem("tabelionato_digital_config", JSON.stringify(config));
    } catch (e) {
      console.error("Erro ao salvar no localStorage:", e);
    }
  }, [config]);

  const [cliente, setCliente] = useState<ClienteDados>({
    nome: "",
    cpfCnpj: "",
    telefone: "",
    email: "",
    notarioNome: "",
    comarca: ""
  });

  const [calculoIndividualizado, setCalculoIndividualizado] = useState<boolean>(false);
  const [tipoEscritura, setTipoEscritura] = useState<"compra_venda" | "inventario" | "ata">("compra_venda");
  const [quantidadeFalecidos, setQuantidadeFalecidos] = useState<number>(1);
  const [percentuaisFalecidos, setPercentuaisFalecidos] = useState<number[]>([100]);
  const [globalAtaSubtipo, setGlobalAtaSubtipo] = useState<"interna" | "externa">("interna");
  const [globalAtaPaginas, setGlobalAtaPaginas] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<"itens" | "destinacao">("itens");
  const [isConfigExpanded, setIsConfigExpanded] = useState<boolean>(false);
  const [configPasswordVerified, setConfigPasswordVerified] = useState<boolean>(false);
  const [showConfigPasswordPrompt, setShowConfigPasswordPrompt] = useState<boolean>(false);
  const [configPasswordInput, setConfigPasswordInput] = useState<string>("");
  const [configPasswordError, setConfigPasswordError] = useState<string>("");
  const [exportingPdf, setExportingPdf] = useState<boolean>(false);

  const [editandoBemId, setEditandoBemId] = useState<string | null>(null);

  // Estados do formulário de novo bem
  const [novoBemNome, setNovoBemNome] = useState<string>("");
  const [novoBemValor, setNovoBemValor] = useState<string>("");
  const [novoBemTipoAto, setNovoBemTipoAto] = useState<"valor" | "fixo" | "ata">("valor");
  const [novoBemSubtipoAta, setNovoBemSubtipoAta] = useState<"interna" | "externa">("interna");
  const [novoBemPaginasAta, setNovoBemPaginasAta] = useState<number>(1);
  const [novoBemAtoFixoId, setNovoBemAtoFixoId] = useState<string>("pacto");
  const [novoBemCustomVrc, setNovoBemCustomVrc] = useState<string>("");
  const [novoBemMatricula, setNovoBemMatricula] = useState<string>("");
  const [novoBemObservacoes, setNovoBemObservacoes] = useState<string>("");
  const [novoBemFracaoFunrejus, setNovoBemFracaoFunrejus] = useState<string>("100");
  const [novoBemIsGaragemAutonoma, setNovoBemIsGaragemAutonoma] = useState<boolean>(false);

  const [incluirItensAdicionais, setIncluirItensAdicionais] = useState<boolean>(false);
  const [itensAdicionais, setItensAdicionais] = useState<ItemAdicional[]>([]);
  const [novoItemAdicionalNome, setNovoItemAdicionalNome] = useState<string>("");
  const [novoItemAdicionalValor, setNovoItemAdicionalValor] = useState<string>("");

  // Estado para erros de formulário
  const [formErro, setFormErro] = useState<string>("");

  React.useEffect(() => {
    if (tipoEscritura === "compra_venda" || tipoEscritura === "inventario") {
      setNovoBemTipoAto("valor");
    }
  }, [tipoEscritura]);

  // --- CÁLCULO DOS RESULTADOS ---
  const configComAto = useMemo(() => {
    return {
      ...config,
      tipoEscritura,
      quantidadeFalecidos,
      percentuaisFalecidos,
      ataSubtipo: globalAtaSubtipo,
      ataPaginas: globalAtaPaginas
    };
  }, [config, tipoEscritura, quantidadeFalecidos, percentuaisFalecidos, globalAtaSubtipo, globalAtaPaginas]);

  const resultado = useMemo(() => {
    return calcularResultados(bens, configComAto, calculoIndividualizado, incluirItensAdicionais ? itensAdicionais : undefined);
  }, [bens, configComAto, calculoIndividualizado, incluirItensAdicionais, itensAdicionais]);

  // --- COMPORTAMENTOS ---
  const handleAdicionarBem = (e: React.FormEvent) => {
    e.preventDefault();
    setFormErro("");

    if (!novoBemNome.trim()) {
      setFormErro("Insira um nome/descrição para o bem ou ato.");
      return;
    }

    const valorNum = parseFloat(novoBemValor.replace(/\./g, "").replace(",", ".")) || 0;
    if (novoBemTipoAto === "valor" && valorNum <= 0) {
      setFormErro("Para escrituras com valor declaratório, digite um valor maior que R$ 0,00.");
      return;
    }

    const customVrcNum = parseFloat(novoBemCustomVrc) || 0;
    if (novoBemTipoAto === "fixo" && novoBemAtoFixoId === "outros_custom" && customVrcNum <= 0) {
      setFormErro("Insira um valor de VRC customizado válido.");
      return;
    }

    const fracaoFunrejusNum = parseFloat(novoBemFracaoFunrejus) || 100;

    const novoBem: BemCadastrado = {
      id: editandoBemId || Date.now().toString(),
      nome: novoBemNome.trim(),
      valor: novoBemTipoAto === "valor" ? valorNum : 0,
      tipoAto: novoBemTipoAto,
      matricula: novoBemMatricula.trim() || undefined,
      observacoes: novoBemObservacoes.trim() || undefined,
      atoFixoId: novoBemTipoAto === "fixo" ? novoBemAtoFixoId : undefined,
      customVrc: novoBemTipoAto === "fixo" && novoBemAtoFixoId === "outros_custom" ? customVrcNum : undefined,
      subtipoAta: novoBemTipoAto === "ata" ? novoBemSubtipoAta : undefined,
      paginasAta: novoBemTipoAto === "ata" ? novoBemPaginasAta : undefined,
      fracaoFunrejus: novoBemTipoAto === "valor" ? fracaoFunrejusNum : undefined,
      isGaragemAutonoma: novoBemTipoAto === "valor" ? novoBemIsGaragemAutonoma : undefined
    };

    if (editandoBemId) {
      setBens(bens.map(b => b.id === editandoBemId ? novoBem : b));
      setEditandoBemId(null);
    } else {
      setBens([...bens, novoBem]);
    }

    // Limpar formulário de inserção
    setNovoBemNome("");
    setNovoBemValor("");
    setNovoBemMatricula("");
    setNovoBemObservacoes("");
    setNovoBemCustomVrc("");
    setNovoBemFracaoFunrejus("100");
    setNovoBemIsGaragemAutonoma(false);
    setNovoBemSubtipoAta("interna");
    setNovoBemPaginasAta(1);
  };

  const iniciarEdicaoBem = (bem: BemCadastrado) => {
    setEditandoBemId(bem.id);
    setNovoBemNome(bem.nome);
    const val = bem.valor > 0 ? new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(bem.valor) : "";
    setNovoBemValor(val);
    setNovoBemTipoAto(bem.tipoAto);
    if (bem.atoFixoId) setNovoBemAtoFixoId(bem.atoFixoId);
    if (bem.customVrc) setNovoBemCustomVrc(bem.customVrc.toString());
    if (bem.subtipoAta) setNovoBemSubtipoAta(bem.subtipoAta);
    if (bem.paginasAta) setNovoBemPaginasAta(bem.paginasAta);
    setNovoBemMatricula(bem.matricula || "");
    setNovoBemObservacoes(bem.observacoes || "");
    if (bem.fracaoFunrejus) setNovoBemFracaoFunrejus(bem.fracaoFunrejus.toString());
    setNovoBemIsGaragemAutonoma(!!bem.isGaragemAutonoma);
    
    // Rolar para o formulário
    document.getElementById("form-adicionar-bem")?.scrollIntoView({ behavior: "smooth" });
  };

  const cancelarEdicaoBem = () => {
    setEditandoBemId(null);
    setNovoBemNome("");
    setNovoBemValor("");
    setNovoBemMatricula("");
    setNovoBemObservacoes("");
    setNovoBemCustomVrc("");
    setNovoBemFracaoFunrejus("100");
    setNovoBemIsGaragemAutonoma(false);
    setNovoBemSubtipoAta("interna");
    setNovoBemPaginasAta(1);
  };

  const handleRemoverBem = (id: string) => {
    setBens(bens.filter((b) => b.id !== id));
  };

  const handleAdicionarItemAdicional = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoItemAdicionalNome.trim()) {
      return;
    }
    const valorNum = parseFloat(novoItemAdicionalValor.replace(/\./g, "").replace(",", ".")) || 0;
    if (valorNum <= 0) {
      return;
    }
    
    const novoItem: ItemAdicional = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      descricao: novoItemAdicionalNome.trim(),
      valor: valorNum,
    };
    
    setItensAdicionais([...itensAdicionais, novoItem]);
    setNovoItemAdicionalNome("");
    setNovoItemAdicionalValor("");
  };

  const handleRemoverItemAdicional = (id: string) => {
    setItensAdicionais(itensAdicionais.filter((i) => i.id !== id));
  };

  const handleResetarConfig = () => {
    setConfig({
      vrcRate: DEFAULT_VRC_RATE,
      funarpenPct: DEFAULT_FUNDS_CONFIG.funarpenPct,
      fadepPct: DEFAULT_FUNDS_CONFIG.fadepPct,
      issPct: DEFAULT_FUNDS_CONFIG.issPct,
      funrejusPct: DEFAULT_FUNDS_CONFIG.funrejusPct,
      tetoFunrejusReais: DEFAULT_FUNDS_CONFIG.tetoFunrejusReais,
      taxaSeloFixoReais: DEFAULT_FUNDS_CONFIG.taxaSeloFixoReais,
      taxaDistribReais: DEFAULT_FUNDS_CONFIG.taxaDistribReais
    });
  };

  const handleExportarPDF = () => {
    setExportingPdf(true);
    setTimeout(() => {
      try {
        gerarPdfCliente(resultado, cliente, configComAto);
      } catch (err) {
        console.error("Erro ao gerar PDF:", err);
      } finally {
        setExportingPdf(false);
      }
    }, 800);
  };

  const handleImprimir = () => {
    window.print();
  };

  // VRC estimado em tempo real para o formulário
  const vrcEstimadoNovoBem = useMemo(() => {
    if (novoBemTipoAto !== "valor") return null;
    const valorNum = parseFloat(novoBemValor.replace(/\./g, "").replace(",", ".")) || 0;
    if (valorNum <= 0) return 0;
    return calcularVrcEscrituraValor(valorNum);
  }, [novoBemValor, novoBemTipoAto]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans">
      {/* --- HEADER --- */}
      <header className="h-20 bg-slate-900 text-white flex items-center justify-between px-4 sm:px-8 border-b-4 border-amber-500 no-print">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-amber-500 rounded-none flex items-center justify-center text-slate-900 font-extrabold text-lg">
            PR
          </div>
          <div>
            <h1 className="text-sm sm:text-md font-bold tracking-tight uppercase">Calculadora</h1>
            <p className="text-[10px] text-slate-400 font-mono">Calculadora de Custas Extrajudiciais - Paraná</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[9px] uppercase text-slate-400 tracking-widest font-mono">Valor do VRC Atual</p>
          <p className="text-base sm:text-lg font-mono font-bold text-amber-400">{formatarTaxaVrc(config.vrcRate)}</p>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 w-full">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          
          {/* ================= COLUNA ESQUERDA: ENTRADA DE DADOS (5/12 cols) ================= */}
          <div className="lg:col-span-5 space-y-6 no-print">
            
            {/* CARD 1: DADOS DO CLIENTE */}
            <section className="bg-white rounded-none border border-slate-200 p-6 shadow-xs" id="card-cliente">
              <div className="border-l-4 border-slate-900 pl-4 mb-5">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <User className="h-4 w-4 text-slate-600" />
                  Informações do Cliente e Comarca
                </h2>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nome do Cliente</label>
                  <input
                    type="text"
                    value={cliente.nome}
                    onChange={(e) => setCliente({ ...cliente, nome: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-none text-sm focus:outline-hidden focus:border-slate-900 focus:bg-white transition-all font-medium"
                    placeholder="Digite o Nome do Cliente"
                    id="input-cliente-nome"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">CPF / CNPJ</label>
                  <input
                    type="text"
                    value={cliente.cpfCnpj}
                    onChange={(e) => setCliente({ ...cliente, cpfCnpj: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-none text-sm focus:outline-hidden focus:border-slate-900 focus:bg-white transition-all font-mono"
                    placeholder="Digite o CPF do CLiente"
                    id="input-cliente-documento"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Telefone</label>
                  <input
                    type="text"
                    value={cliente.telefone}
                    onChange={(e) => setCliente({ ...cliente, telefone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-none text-sm focus:outline-hidden focus:border-slate-900 focus:bg-white transition-all"
                    placeholder="Digite Telefone do Cliente"
                    id="input-cliente-telefone"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">E-mail</label>
                  <input
                    type="email"
                    value={cliente.email}
                    onChange={(e) => setCliente({ ...cliente, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-none text-sm focus:outline-hidden focus:border-slate-900 focus:bg-white transition-all"
                    placeholder="Digite o e-mail do Cliente"
                    id="input-cliente-email"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Município / Comarca (PR)</label>
                  <input
                    type="text"
                    value={cliente.comarca}
                    onChange={(e) => setCliente({ ...cliente, comarca: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-none text-sm focus:outline-hidden focus:border-slate-900 focus:bg-white transition-all"
                    placeholder=""
                    id="input-cliente-comarca"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Escrevente Responsável</label>
                  <input
                    type="text"
                    value={cliente.notarioNome}
                    onChange={(e) => setCliente({ ...cliente, notarioNome: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-none text-sm focus:outline-hidden focus:border-slate-900 focus:bg-white transition-all"
                    placeholder=""
                    id="input-cliente-escrevente"
                  />
                </div>
              </div>
            </section>

            {/* CARD DE CONFIGURAÇÃO DO ATO (ESCRITURA) */}
            <section className="bg-white rounded-none border border-slate-200 p-6 shadow-xs" id="card-tipo-ato-config">
              <div className="border-l-4 border-slate-900 pl-4 mb-5">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-600" />
                  Configuração do Ato (Escritura)
                </h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tipo de Ato / Escritura Pública</label>
                  <select
                    value={tipoEscritura}
                    onChange={(e) => {
                      const val = e.target.value as "compra_venda" | "inventario" | "ata";
                      setTipoEscritura(val);
                      if (val === "compra_venda" || val === "ata") {
                        setQuantidadeFalecidos(1);
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-none text-sm focus:outline-hidden focus:border-slate-900 focus:bg-white transition-all font-medium cursor-pointer"
                    id="select-tipo-escritura"
                  >
                    <option value="compra_venda">Escritura de Compra e Venda / Doação (Onerosa)</option>
                    <option value="inventario">Escritura de Inventário e Partilha (Sucessão Causa Mortis)</option>
                    <option value="ata">Ata Notarial</option>
                  </select>
                </div>

                {tipoEscritura === "ata" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 bg-amber-50/50 border border-amber-200/70 space-y-4"
                  >
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                      <FileText className="h-4 w-4 shrink-0" />
                      Configuração da Ata Notarial
                    </div>
                    
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Subtipo da Ata Notarial</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setGlobalAtaSubtipo("interna")}
                          className={`py-2 px-3 text-[10px] font-bold uppercase tracking-wider transition-all rounded-none cursor-pointer border text-center ${
                            globalAtaSubtipo === "interna"
                              ? "bg-slate-900 border-slate-900 text-white"
                              : "bg-white border-slate-200 text-slate-600 hover:text-slate-950 hover:bg-slate-100"
                          }`}
                        >
                          Interna (Sem Deslocamento)
                        </button>
                        <button
                          type="button"
                          onClick={() => setGlobalAtaSubtipo("externa")}
                          className={`py-2 px-3 text-[10px] font-bold uppercase tracking-wider transition-all rounded-none cursor-pointer border text-center ${
                            globalAtaSubtipo === "externa"
                              ? "bg-slate-900 border-slate-900 text-white"
                              : "bg-white border-slate-200 text-slate-600 hover:text-slate-950 hover:bg-slate-100"
                          }`}
                        >
                          Externa (Com Deslocamento)
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Quantidade de Páginas / Folhas</label>
                      <input
                        type="number"
                        min="1"
                        value={globalAtaPaginas}
                        onChange={(e) => setGlobalAtaPaginas(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-none text-sm font-mono font-bold focus:outline-hidden focus:border-slate-900 focus:bg-white transition-all text-slate-900"
                        id="input-global-ata-paginas"
                      />
                      <p className="text-[10px] text-slate-600 mt-2 font-mono leading-relaxed bg-white p-2.5 border border-slate-200">
                        {globalAtaSubtipo === "interna" ? (
                          <span>
                            <strong>Ata Interna:</strong> 630 VRC na 1ª página (~ {formatarMoeda(630 * config.vrcRate)}) + 30 VRC (~ {formatarMoeda(30 * config.vrcRate)}) por página adicional.<br />
                            <strong>FUNREJUS:</strong> R$ 43,63 na 1ª página + R$ 2,08 por página adicional.
                          </span>
                        ) : (
                          <span>
                            <strong>Ata Externa:</strong> 1260 VRC na 1ª página (~ {formatarMoeda(1260 * config.vrcRate)}) + 30 VRC (~ {formatarMoeda(30 * config.vrcRate)}) por página adicional.<br />
                            <strong>FUNREJUS:</strong> R$ 87,25 na 1ª página + R$ 2,08 por página adicional.
                          </span>
                        )}
                        <br />
                        <span className="text-[9px] text-slate-400">
                          * Selos: R$ 8,00 (Ata) + R$ 8,00 (Traslado) + R$ 1,00 por página adicional. Distribuição: R$ {config.taxaDistribReais.toFixed(2)}. ISS: {config.issPct}%. FADEP: {config.fadepPct}%.
                        </span>
                      </p>
                    </div>
                  </motion.div>
                )}

                {tipoEscritura === "inventario" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 bg-amber-50 border border-amber-200 space-y-3"
                  >
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                      <Users className="h-4 w-4 shrink-0" />
                      Inventário Conjunto (Múltiplos Falecidos)
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-amber-800 uppercase mb-1">Quantidade de Falecidos (Óbitos)</label>
                      <input
                        type="number"
                        min="1"
                        max="15"
                        value={quantidadeFalecidos}
                        onChange={(e) => {
                          const val = Math.max(1, parseInt(e.target.value) || 1);
                          setQuantidadeFalecidos(val);
                          setPercentuaisFalecidos(prev => {
                            const next = [...prev];
                            while(next.length < val) next.push(100);
                            return next.slice(0, val);
                          });
                        }}
                        className="w-full px-3 py-2 bg-white border border-amber-300 rounded-none text-sm font-mono font-bold focus:outline-hidden focus:border-slate-900 transition-all text-amber-950"
                        id="input-quantidade-falecidos"
                      />
                    </div>
                    
                    {quantidadeFalecidos > 1 && (
                      <div className="mt-4 space-y-2">
                        <label className="block text-[10px] font-bold text-amber-800 uppercase mb-1">Percentual Transmitido por Falecido (%)</label>
                        <div className="grid grid-cols-2 gap-2">
                          {Array.from({ length: quantidadeFalecidos }).map((_, i) => (
                            <div key={`falecido-pct-${i}`} className="flex items-center gap-2">
                              <span className="text-[10px] text-amber-800 font-bold whitespace-nowrap">Óbito {i+1}:</span>
                              <div className="relative w-full">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={percentuaisFalecidos[i] ?? 100}
                                  onChange={(e) => {
                                    const val = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                                    setPercentuaisFalecidos(prev => {
                                      const next = [...prev];
                                      next[i] = val;
                                      return next;
                                    });
                                  }}
                                  className="w-full px-2 py-1.5 pr-6 bg-white border border-amber-300 rounded-none text-xs font-mono focus:outline-hidden focus:border-slate-900 text-amber-950"
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-amber-500">%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <p className="text-[10px] text-amber-800 mt-2 leading-relaxed">
                      Conforme normas do PR, no inventário conjunto, os <strong>emolumentos base são cobrados por óbito</strong> sobre o valor efetivamente transmitido por cada um. O cálculo irá considerar as frações acima para cada bem.
                    </p>

                  </motion.div>
                )}
              </div>
            </section>

            {tipoEscritura !== "ata" && (
              <>
                {/* CARD 2: ADICIONAR NOVO BEM / ATO */}
                <section className="bg-white rounded-none border border-slate-200 p-6 shadow-xs" id="card-adicionar-bem">
              <div className="border-l-4 border-slate-900 pl-4 mb-5">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  {editandoBemId ? <Pencil className="h-4 w-4 text-amber-600" /> : <FileText className="h-4 w-4 text-slate-600" />}
                  {editandoBemId ? "Editar Bem ou Ato Notarial" : "Cadastrar Bem ou Ato Notarial"}
                </h2>
              </div>

              <form onSubmit={handleAdicionarBem} className="space-y-4">
                {/* Identificação / Descrição do Bem */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Identificação / Descrição do Bem</label>
                  <input
                    type="text"
                    value={novoBemNome}
                    onChange={(e) => setNovoBemNome(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-none text-sm focus:outline-hidden focus:border-slate-900 focus:bg-white transition-all font-medium"
                    placeholder="Ex: Lote 04 - Residencial Alpha"
                    id="input-bem-descricao"
                  />
                </div>

                {/* Seleção do Tipo de Ato (Abas de Categoria) */}
                {tipoEscritura !== "compra_venda" && tipoEscritura !== "inventario" && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Tipo de Ato / Enquadramento</label>
                    <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setNovoBemTipoAto("valor")}
                        className={`py-2 text-[10px] font-bold uppercase tracking-wider transition-all rounded-none cursor-pointer text-center ${
                          novoBemTipoAto === "valor"
                            ? "bg-slate-900 text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                        }`}
                      >
                        Imóvel
                      </button>
                      <button
                        type="button"
                        onClick={() => setNovoBemTipoAto("ata")}
                        className={`py-2 text-[10px] font-bold uppercase tracking-wider transition-all rounded-none cursor-pointer text-center ${
                          novoBemTipoAto === "ata"
                            ? "bg-slate-900 text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                        }`}
                      >
                        Ata Notarial
                      </button>
                      <button
                        type="button"
                        onClick={() => setNovoBemTipoAto("fixo")}
                        className={`py-2 text-[10px] font-bold uppercase tracking-wider transition-all rounded-none cursor-pointer text-center ${
                          novoBemTipoAto === "fixo"
                            ? "bg-slate-900 text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                        }`}
                      >
                        Ato Fixo
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {/* --- CAMPOS PARA ESCRITURA DE IMÓVEL (VALOR DECLARATÓRIO) --- */}
                  {novoBemTipoAto === "valor" && (
                    <div className="space-y-3 animate-fadeIn">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Valor do Imóvel (R$)</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-slate-400 text-sm font-mono font-bold">R$</span>
                          </div>
                          <input
                            type="text"
                            value={novoBemValor}
                            onChange={(e) => {
                              const digits = e.target.value.replace(/\D/g, "");
                              if (!digits) {
                                setNovoBemValor("");
                                return;
                              }
                              const num = parseFloat(digits) / 100;
                              const formatted = new Intl.NumberFormat('pt-BR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              }).format(num);
                              setNovoBemValor(formatted);
                            }}
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-none text-sm font-mono font-bold focus:outline-hidden focus:border-slate-900 focus:bg-white transition-all"
                            placeholder="Ex: 250.000,00"
                            id="input-bem-valor"
                          />
                        </div>
                        {/* Exibe o VRC estimado em tempo real */}
                        {vrcEstimadoNovoBem !== null && vrcEstimadoNovoBem > 0 && (
                          <p className="text-[10px] text-slate-600 mt-1.5 flex items-center gap-1.5 bg-amber-50/50 p-2 border border-amber-100 font-mono">
                            <Info className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                            <span>Enquadramento: <strong>{vrcEstimadoNovoBem.toFixed(2)} VRC</strong> (~ {formatarMoeda(vrcEstimadoNovoBem * config.vrcRate)})</span>
                          </p>
                        )}
                      </div>

                      {/* Vaga de Garagem Autônoma Checkbox */}
                      <div className="flex items-start gap-2.5 p-3.5 bg-slate-50 border border-slate-200">
                        <input
                          type="checkbox"
                          checked={novoBemIsGaragemAutonoma}
                          onChange={(e) => setNovoBemIsGaragemAutonoma(e.target.checked)}
                          className="mt-0.5 rounded-none border-slate-300 text-slate-900 focus:ring-slate-900 h-4 w-4 cursor-pointer"
                          id="checkbox-garagem-autonoma"
                        />
                        <div>
                          <label htmlFor="checkbox-garagem-autonoma" className="block text-xs font-bold text-slate-900 cursor-pointer select-none">
                            Vaga de Garagem Autônoma (Tabela XI, IV, c)
                          </label>
                          <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                            Cobrança reduzida para <strong>50%</strong> do valor da faixa, se for unidade de garagem com matrícula própria vinculada ao apartamento.
                          </p>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Fração do Imóvel para FUNREJUS (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="any"
                          value={novoBemFracaoFunrejus}
                          onChange={(e) => setNovoBemFracaoFunrejus(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-none text-sm font-mono font-bold focus:outline-hidden focus:border-slate-900 focus:bg-white transition-all"
                          placeholder="Ex: 100"
                          id="input-bem-fracao-funrejus"
                        />
                        <p className="text-[9px] text-slate-400 mt-0.5 font-mono">Padrão: 100% (ex: 50% se a transferência for da metade ideal, reduzindo a base do FUNREJUS).</p>
                      </div>
                    </div>
                  )}

                  {/* --- CAMPOS PARA ATA NOTARIAL --- */}
                  {novoBemTipoAto === "ata" && (
                    <div className="space-y-3 animate-fadeIn">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Subtipo da Ata Notarial</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setNovoBemSubtipoAta("interna")}
                            className={`py-2 px-3 text-[10px] font-bold uppercase tracking-wider transition-all rounded-none cursor-pointer border text-center ${
                              novoBemSubtipoAta === "interna"
                                ? "bg-slate-900 border-slate-900 text-white"
                                : "bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-950 hover:bg-slate-100"
                            }`}
                          >
                            Interna (Sem Deslocamento)
                          </button>
                          <button
                            type="button"
                            onClick={() => setNovoBemSubtipoAta("externa")}
                            className={`py-2 px-3 text-[10px] font-bold uppercase tracking-wider transition-all rounded-none cursor-pointer border text-center ${
                              novoBemSubtipoAta === "externa"
                                ? "bg-slate-900 border-slate-900 text-white"
                                : "bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-950 hover:bg-slate-100"
                            }`}
                          >
                            Externa (Com Deslocamento)
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Quantidade de Páginas / Folhas</label>
                        <input
                          type="number"
                          min="1"
                          value={novoBemPaginasAta}
                          onChange={(e) => setNovoBemPaginasAta(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-none text-sm font-mono font-bold focus:outline-hidden focus:border-slate-900 focus:bg-white transition-all"
                          id="input-ata-paginas"
                        />
                        <p className="text-[10px] text-slate-600 mt-2 font-mono leading-relaxed bg-amber-50/50 p-2.5 border border-amber-100/70">
                          {novoBemSubtipoAta === "interna" ? (
                            <span>
                              <strong>Ata Interna:</strong> 630 VRC na 1ª página (~ {formatarMoeda(630 * config.vrcRate)}) + 30 VRC (~ {formatarMoeda(30 * config.vrcRate)}) por página adicional.<br />
                              <strong>FUNREJUS:</strong> R$ 43,63 na 1ª página + R$ 2,08 por página adicional.
                            </span>
                          ) : (
                            <span>
                              <strong>Ata Externa:</strong> 1260 VRC na 1ª página (~ {formatarMoeda(1260 * config.vrcRate)}) + 30 VRC (~ {formatarMoeda(30 * config.vrcRate)}) por página adicional.<br />
                              <strong>FUNREJUS:</strong> R$ 87,25 na 1ª página + R$ 2,08 por página adicional.
                            </span>
                          )}
                          <br />
                          <span className="text-[9px] text-slate-400">
                            * Selos: R$ 8,00 (Ata) + R$ 8,00 (Traslado) + R$ 1,00 por página adicional. Distribuição: R$ {config.taxaDistribReais.toFixed(2)}. ISS: {config.issPct}%. FADEP: {config.fadepPct}%.
                          </span>
                        </p>
                      </div>
                    </div>
                  )}

                  {/* --- CAMPOS PARA ATO FIXO --- */}
                  {novoBemTipoAto === "fixo" && (
                    <div className="space-y-3 animate-fadeIn">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Selecione o Ato Fixo</label>
                        <select
                          value={novoBemAtoFixoId}
                          onChange={(e) => setNovoBemAtoFixoId(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-none text-sm font-semibold focus:outline-hidden focus:border-slate-900 focus:bg-white transition-all text-slate-800"
                          id="select-ato-fixo"
                        >
                          {ATOS_FIXOS_PR.map((ato) => (
                            <option key={ato.id} value={ato.id}>
                              {ato.nome} ({ato.id === "outros_custom" ? "Customizado" : `${ato.vrc.toFixed(2)} VRC`})
                            </option>
                          ))}
                        </select>
                        <p className="text-[10px] text-slate-500 mt-1 font-mono">
                          {ATOS_FIXOS_PR.find(a => a.id === novoBemAtoFixoId)?.descricao}
                        </p>
                      </div>

                      {novoBemAtoFixoId === "outros_custom" && (
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Valor Customizado em VRC</label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={novoBemCustomVrc}
                            onChange={(e) => setNovoBemCustomVrc(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-none text-sm font-mono font-bold focus:outline-hidden focus:border-slate-900 focus:bg-white transition-all"
                            placeholder="Ex: 150"
                            id="input-custom-vrc"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Campos secundários opcionais */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Matrícula / Registro (Opcional)</label>
                    <input
                      type="text"
                      value={novoBemMatricula}
                      onChange={(e) => setNovoBemMatricula(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-none text-sm focus:outline-hidden focus:border-slate-900 focus:bg-white transition-all"
                      placeholder="Ex: Matrícula 14.293"
                      id="input-bem-matricula"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Anotações / Notas (Opcional)</label>
                    <input
                      type="text"
                      value={novoBemObservacoes}
                      onChange={(e) => setNovoBemObservacoes(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-none text-sm focus:outline-hidden focus:border-slate-900 focus:bg-white transition-all"
                      placeholder="Ex: Proprietário A"
                      id="input-bem-notas"
                    />
                  </div>
                </div>

                {/* Erros */}
                {formErro && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-none text-xs flex items-center gap-2 border border-red-100 font-medium">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>{formErro}</span>
                  </div>
                )}

                {editandoBemId ? (
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase tracking-widest py-3 px-4 rounded-none transition-colors flex items-center justify-center gap-2 border border-amber-600 cursor-pointer"
                      id="btn-salvar-edicao"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Salvar Edição
                    </button>
                    <button
                      type="button"
                      onClick={cancelarEdicaoBem}
                      className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs uppercase tracking-widest py-3 px-4 rounded-none transition-colors flex items-center justify-center gap-2 border border-slate-300 cursor-pointer"
                      id="btn-cancelar-edicao"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    type="submit"
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-widest py-3 px-4 rounded-none transition-colors flex items-center justify-center gap-2 border border-slate-900 cursor-pointer"
                    id="btn-adicionar-bem"
                  >
                    <Plus className="h-4 w-4 text-amber-400" />
                    Incluir na Escritura
                  </button>
                )}
              </form>
            </section>

            {/* CARD 3: LISTA DE BENS CADASTRADOS */}
            <section className="bg-white rounded-none border border-slate-200 p-6 shadow-xs" id="card-lista-bens">
              <div className="border-l-4 border-slate-900 pl-4 mb-5 flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-slate-600" />
                  Bens e Atos Incluídos ({bens.length})
                </h2>
                {bens.length > 0 && (
                  <button
                    onClick={() => setBens([])}
                    className="text-[10px] font-bold uppercase tracking-wider text-red-600 hover:text-red-800 transition-colors cursor-pointer"
                    id="btn-limpar-todos-bens"
                  >
                    Excluir Tudo
                  </button>
                )}
              </div>

              {bens.length === 0 ? (
                <div className="py-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-none flex flex-col items-center justify-center gap-2 font-mono">
                  <FileText className="h-6 w-6 text-slate-300" />
                  <p className="text-xs font-bold uppercase tracking-wider">Nenhum bem ou ato incluído</p>
                  <p className="text-[10px] text-slate-400">Preencha o formulário acima para adicionar.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  <AnimatePresence initial={false}>
                    {bens.map((b) => {
                      const vrcCalculado = b.tipoAto === "valor" 
                        ? calcularVrcEscrituraValor(b.valor) 
                        : b.tipoAto === "ata"
                          ? (b.subtipoAta === "interna" ? 630 : 1260) + ((b.paginasAta || 1) - 1) * 30
                          : b.atoFixoId === "outros_custom" 
                            ? (b.customVrc || 0) 
                            : (ATOS_FIXOS_PR.find(a => a.id === b.atoFixoId)?.vrc || 0);

                      return (
                        <motion.div
                          key={b.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="bg-slate-50 p-4 rounded-none border border-slate-200 flex items-start justify-between gap-3 hover:border-slate-400 transition-colors"
                          id={`bem-item-${b.id}`}
                        >
                          <div className="min-w-0">
                            <h3 className="text-xs font-bold text-slate-950 truncate">{b.nome}</h3>
                            <p className="text-[10px] text-slate-500 font-medium mt-0.5 font-mono uppercase tracking-wider">
                              {b.tipoAto === "valor" 
                                ? "Valor Declaratório" 
                                : b.tipoAto === "ata" 
                                  ? `Ata Notarial (${b.subtipoAta === "interna" ? "Interna" : "Externa"})` 
                                  : "Ato Fixo"} 
                              {b.tipoAto === "ata" && ` | ${b.paginasAta || 1} pág.`}
                              {b.isGaragemAutonoma ? " | Vaga de Garagem Autônoma" : ""}
                              {b.fracaoFunrejus !== undefined && b.fracaoFunrejus !== 100 ? ` | Fração FUNREJUS: ${b.fracaoFunrejus}%` : ""}
                              {b.matricula ? ` | Mat: ${b.matricula}` : ""}
                            </p>
                            {b.observacoes && (
                              <p className="text-[10px] text-slate-400 italic mt-0.5 truncate">{b.observacoes}</p>
                            )}
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-[10px] bg-slate-200 text-slate-800 px-2 py-0.5 rounded-none font-mono font-bold">
                                {vrcCalculado.toFixed(2)} VRC
                              </span>
                              {b.tipoAto === "valor" && (
                                <span className="text-xs font-bold text-slate-900 font-mono">
                                  {formatarMoeda(b.valor)}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-2 shrink-0">
                            <button
                              onClick={() => iniciarEdicaoBem(b)}
                              className="text-slate-400 hover:text-amber-600 p-1 rounded-none hover:bg-amber-50 transition-all cursor-pointer"
                              title="Editar este bem"
                              id={`btn-editar-bem-${b.id}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleRemoverBem(b.id)}
                              className="text-slate-400 hover:text-red-600 p-1 rounded-none hover:bg-red-50 transition-all cursor-pointer"
                              title="Remover este bem"
                              id={`btn-remover-bem-${b.id}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </section>
          </>
        )}

            {/* CARD 5: VALORES ADICIONAIS */}
            <section className="bg-white rounded-none border border-slate-200 p-6 shadow-xs" id="card-valores-adicionais">
              <div className="border-l-4 border-slate-900 pl-4 mb-5 flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-slate-600" />
                  Valores Adicionais
                </h2>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="chk-incluir-adicionais"
                    checked={incluirItensAdicionais}
                    onChange={(e) => setIncluirItensAdicionais(e.target.checked)}
                    className="w-4 h-4 text-slate-900 border-slate-300 rounded focus:ring-slate-900 cursor-pointer"
                  />
                  <label htmlFor="chk-incluir-adicionais" className="text-[10px] font-bold text-slate-600 uppercase cursor-pointer">
                    Habilitar
                  </label>
                </div>
              </div>

              {incluirItensAdicionais && (
                <div className="space-y-4">
                  <form onSubmit={handleAdicionarItemAdicional} className="bg-slate-50 p-4 border border-slate-200 flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Descrição</label>
                      <input
                        type="text"
                        value={novoItemAdicionalNome}
                        onChange={(e) => setNovoItemAdicionalNome(e.target.value)}
                        placeholder="Ex: Certidões, Diligência..."
                        className="w-full px-3 py-2 border border-slate-200 rounded-none text-sm focus:outline-hidden focus:border-slate-900 bg-white"
                      />
                    </div>
                    <div className="w-full sm:w-1/3">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Valor (R$)</label>
                      <input
                        type="text"
                        value={novoItemAdicionalValor}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, "");
                          if (!digits) {
                            setNovoItemAdicionalValor("");
                            return;
                          }
                          const num = parseFloat(digits) / 100;
                          const formatted = new Intl.NumberFormat('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          }).format(num);
                          setNovoItemAdicionalValor(formatted);
                        }}
                        placeholder="Ex: 50,00"
                        className="w-full px-3 py-2 border border-slate-200 rounded-none text-sm font-mono focus:outline-hidden focus:border-slate-900 bg-white text-right"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="submit"
                        className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-none transition-colors h-[38px] flex items-center justify-center cursor-pointer"
                        disabled={!novoItemAdicionalNome.trim() || !novoItemAdicionalValor.trim()}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </form>

                  {itensAdicionais.length > 0 && (
                    <div className="space-y-2 mt-4">
                      {itensAdicionais.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-none text-sm">
                          <span className="font-medium text-slate-700">{item.descricao}</span>
                          <div className="flex items-center gap-4">
                            <span className="font-mono font-bold text-slate-900">{formatarMoeda(item.valor)}</span>
                            <button
                              onClick={() => handleRemoverItemAdicional(item.id)}
                              className="text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                              title="Remover item"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                      <div className="flex items-center justify-between p-3 bg-slate-100 border border-slate-200 rounded-none text-sm font-bold">
                        <span className="uppercase tracking-wide text-xs text-slate-600">Total Adicionais</span>
                        <span className="font-mono text-slate-900">{formatarMoeda(itensAdicionais.reduce((s, i) => s + i.valor, 0))}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>

          {/* ================= COLUNA DIREITA: MEMORANDO E RESULTADO (7/12 cols) ================= */}
          <div className="lg:col-span-7 mt-8 lg:mt-0 flex flex-col space-y-6">
            
            {/* CARD 4: RESULTADO ESTIMADO & ENQUADRAMENTO */}
            <section className="bg-slate-900 text-white rounded-none border-t-4 border-amber-500 p-6 flex flex-col justify-between relative overflow-hidden" id="card-resultado-geral">
              {/* Backlight glow */}
              <div className="absolute right-0 top-0 w-36 h-36 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>

              <div className="no-print">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
                  <div>
                    <h2 className="text-xs font-bold tracking-widest uppercase text-amber-500">Orçamento Estimativo Consolidado</h2>
                    <p className="text-[10px] font-mono text-slate-400">Demonstrativo de Emolumentos e Fundos - Extrajudicial PR</p>
                  </div>

                  {/* Toggle de Categoria de Cálculo */}
                  {tipoEscritura !== "ata" && (
                    <div className="flex items-center gap-px bg-slate-800 p-0.5 rounded-none border border-slate-700 self-start sm:self-auto">
                      <button
                        onClick={() => setCalculoIndividualizado(false)}
                        className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-none transition-all cursor-pointer ${
                          !calculoIndividualizado 
                            ? "bg-amber-500 text-slate-950" 
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                        title="Escritura Única (Tabela XI, Item IV): Maior valor integral (100%), demais 80% (limite 9) e garagens autônomas 50%."
                        id="btn-calculo-unificado"
                      >
                        Escritura Única (Tab. XI, IV)
                      </button>
                      <button
                        onClick={() => setCalculoIndividualizado(true)}
                        className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-none transition-all cursor-pointer ${
                          calculoIndividualizado 
                            ? "bg-amber-500 text-slate-950" 
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                        title="Escrituras Individuais: Cada imóvel gera uma escritura individual cheia (100%)."
                        id="btn-calculo-individualizado"
                      >
                        Escrituras Individuais
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Área de Impressão de Cabeçalho especial se for impressa */}
              <div className="hidden print-only mb-6 border-b pb-4">
                <h1 className="text-xl font-bold text-slate-900">DEMONSTRATIVO DE CUSTAS DE ESCRITURAS PÚBLICAS</h1>
                <p className="text-xs text-slate-500">Tabela de Emolumentos do Estado do Paraná - Extrajudicial</p>
                <div className="grid grid-cols-2 gap-4 mt-4 text-xs text-slate-700">
                  <div>
                    <p><strong>Cliente:</strong> {cliente.nome || "Não informado"}</p>
                    <p><strong>CPF/CNPJ:</strong> {cliente.cpfCnpj || "Não informado"}</p>
                    <p><strong>Município/Comarca:</strong> {cliente.comarca || "Paraná"}</p>
                  </div>
                  <div>
                    <p><strong>Data:</strong> {new Date().toLocaleDateString("pt-BR")}</p>
                    <p><strong>Responsável:</strong> {cliente.notarioNome || "Escrevente"}</p>
                    <p><strong>VRC de Referência:</strong> {formatarMoeda(config.vrcRate)}</p>
                  </div>
                </div>
              </div>

              {/* GRANDE TOTAL EXIBIDO */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Estimado das Custas</span>
                  <div className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mt-1 font-mono">
                    {formatarMoeda(resultado.totalGeral)}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-none border border-slate-700 font-mono">
                      Equivale a {formatarVrc(resultado.somaEmolumentosVrc)}
                    </span>
                    {resultado.calculoIndividualizado && bens.filter(b=>b.tipoAto==="valor").length > 1 && (
                      <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wide font-mono">
                        * Multi-Atos
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 w-full sm:w-auto no-print">
                  <button
                    onClick={handleExportarPDF}
                    disabled={exportingPdf || (tipoEscritura !== "ata" && bens.length === 0)}
                    className={`w-full sm:w-auto bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-600 disabled:border-slate-800 text-slate-950 font-bold text-xs py-3 px-5 rounded-none shadow-md transition-colors flex items-center justify-center gap-2 border border-amber-600 uppercase tracking-wider cursor-pointer`}
                    id="btn-exportar-pdf"
                  >
                    {exportingPdf ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin text-slate-950" />
                        Gerando PDF...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 text-slate-950" />
                        Exportar PDF Cliente
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleImprimir}
                    disabled={tipoEscritura !== "ata" && bens.length === 0}
                    className="w-full sm:w-auto bg-slate-800 hover:bg-slate-750 disabled:opacity-50 text-slate-200 font-bold text-xs py-2.5 px-4 rounded-none border border-slate-700 transition-colors flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
                    id="btn-imprimir-relatorio"
                  >
                    <Printer className="h-3.5 w-3.5 text-slate-400" />
                    Imprimir Orçamento
                  </button>
                </div>
              </div>

              {/* Informações explicativas rápidas */}
              <div className="mt-5 p-4 bg-slate-800/60 rounded-none border border-slate-700 text-xs text-slate-300 space-y-2 leading-relaxed">
                <div className="flex items-center gap-2 text-amber-500 font-bold mb-1 uppercase tracking-wider text-[10px]">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Esclarecimento de Custas no Paraná:</span>
                </div>
                <p>
                  1. Os <strong>Emolumentos</strong> e taxas do <strong>Funarpen</strong>, <strong>Fadep</strong> e <strong>ISSQN</strong> são calculados sobre os emolumentos e recolhidos diretamente pelo Tabelionato de Notas. {tipoEscritura === "inventario" && <span className="text-amber-400 font-bold">Por tratar-se de Inventário Conjunto, as custas base são devidas por óbito e multiplicadas por {quantidadeFalecidos}.</span>}
                </p>
                <p>
                  2. O <strong>FUNREJUS (0.2%)</strong> é recolhido pelo contribuinte por meio de guia gerada diretamente no portal do TJPR, mas faz parte do custo obrigatório de aquisição e transmissão de bens no Paraná, {config.tetoFunrejusReais > 0 && <span>com limite máximo (teto) de <strong>{formatarMoeda(config.tetoFunrejusReais)}</strong> por transmissão.</span>}
                </p>
              </div>
            </section>

            {/* CARD 5: DETALHAMENTO DAS ABAS (ITENS OU DESTINAÇÃO) */}
            <section className="bg-white rounded-none border border-slate-200 p-6 flex-1 flex flex-col" id="card-detalhes-abas">
              {/* Abas */}
              <div className="flex border-b border-slate-200 mb-5 no-print">
                <button
                  onClick={() => setActiveTab("itens")}
                  className={`py-3 px-5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                    activeTab === "itens"
                      ? "border-slate-900 text-slate-900 font-extrabold"
                      : "border-transparent text-slate-400 hover:text-slate-800"
                  }`}
                  id="tab-itens"
                >
                  Visão Detalhada por Bem
                </button>
                <button
                  onClick={() => setActiveTab("destinacao")}
                  className={`py-3 px-5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                    activeTab === "destinacao"
                      ? "border-slate-900 text-slate-900 font-extrabold"
                      : "border-transparent text-slate-400 hover:text-slate-800"
                  }`}
                  id="tab-destinacao"
                >
                  Consolidado de Fundos
                </button>
              </div>

              {/* CONTEÚDO DA ABA: VISÃO DETALHADA POR ITEM */}
              {activeTab === "itens" && (
                <div className="space-y-4 flex-1">
                  {resultado.itens.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 font-mono text-xs uppercase tracking-wider">
                      Adicione atos ou bens na coluna ao lado para visualizar os cálculos detalhados.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {resultado.itens.map((item) => (
                        <div
                          key={item.id}
                          className="p-5 rounded-none border border-slate-200 bg-slate-50/50 space-y-4"
                          id={`detalhe-item-${item.id}`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-200 pb-3">
                            <div>
                              <h3 className="text-sm font-bold text-slate-950 uppercase tracking-wide">{item.nome}</h3>
                              <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mt-1 flex flex-wrap items-center gap-2">
                                <span>{item.tipoAtoNome}</span>
                                {item.matricula && <span>| Matrícula: {item.matricula}</span>}
                                {item.percentualEmolumentos !== undefined && (
                                  <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded-none font-mono tracking-normal normal-case ${
                                    item.percentualEmolumentos === 100 
                                      ? "bg-slate-900 text-white" 
                                      : item.percentualEmolumentos === 80 
                                        ? "bg-blue-100 text-blue-800 border border-blue-200" 
                                        : item.percentualEmolumentos === 50 
                                          ? "bg-purple-100 text-purple-800 border border-purple-200"
                                          : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                  }`}>
                                    {item.percentualEmolumentos === 0 ? "Isento de Emolumentos (>9)" : `${item.percentualEmolumentos}% Emolumentos`}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-left sm:text-right">
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Subtotal</span>
                              <div className="text-md font-extrabold text-slate-900 font-mono">
                                {formatarMoeda(item.total)}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs leading-relaxed">
                            <div>
                              <span className="text-slate-500 block font-bold text-[9px] uppercase tracking-wider">Valor de Referência:</span>
                              <span className="font-bold text-slate-800 font-mono">{item.valorImovel > 0 ? formatarMoeda(item.valorImovel) : "N/A"}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block font-bold text-[9px] uppercase tracking-wider">Emolumentos Brutos:</span>
                              <span className="font-bold text-slate-800 font-mono">
                                {formatarMoeda(item.emolumentosReais)} <span className="text-[10px] text-slate-400 font-normal">({item.emolumentosVrc.toFixed(2)} VRC)</span>
                              </span>
                            </div>

                            <div>
                              <span className="text-slate-500 block font-bold text-[9px] uppercase tracking-wider">FADEP ({config.fadepPct}%):</span>
                              <span className="font-semibold text-slate-700 font-mono">{formatarMoeda(item.fadep)}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block font-bold text-[9px] uppercase tracking-wider">ISSQN ({config.issPct}%):</span>
                              <span className="font-semibold text-slate-700 font-mono">{formatarMoeda(item.iss)}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block font-bold text-[9px] uppercase tracking-wider">Selo Digital:</span>
                              <span className="font-semibold text-slate-700 font-mono">
                                {formatarMoeda(item.selo)}
                                {item.selo > 0 && (
                                  <span className="text-[9px] text-slate-400 font-normal ml-1">
                                    {item.selosDetalhes ? (
                                      <span>
                                        ({item.selosDetalhes.tn2Count}x TN2 R$ {item.selosDetalhes.tn2Value.toFixed(2)}
                                        {item.selosDetalhes.tn1Count > 0 ? ` + ${item.selosDetalhes.tn1Count}x TN1 R$ ${item.selosDetalhes.tn1Value.toFixed(2)}` : ""})
                                      </span>
                                    ) : (
                                      <span>
                                        ({Math.round(item.selo / (config.taxaSeloFixoReais / 2))} {Math.round(item.selo / (config.taxaSeloFixoReais / 2)) === 1 ? "selo" : "selos"})
                                      </span>
                                    )}
                                  </span>
                                )}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500 block font-bold text-[9px] uppercase tracking-wider">Distribuição:</span>
                              <span className="font-semibold text-slate-700 font-mono">{formatarMoeda(item.distrib)}</span>
                            </div>
                            {item.funrejus > 0 && (
                              <div className="col-span-2 sm:col-span-3 bg-amber-50/60 p-3 rounded-none border border-amber-200 flex items-center justify-between text-xs mt-2 font-mono">
                                <span className="text-amber-800 font-bold flex items-center gap-1 text-[10px] uppercase tracking-wider">
                                  <Info className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                                  {item.tipoAtoNome.includes("Ata Notarial") ? "FUNREJUS:" : `FUNREJUS (${config.funrejusPct}%):`}
                                </span>
                                <span className="font-extrabold text-amber-900 font-mono">{formatarMoeda(item.funrejus)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* CONTEÚDO DA ABA: DETALHAMENTO DE DESTINAÇÃO DE FUNDOS */}
              {activeTab === "destinacao" && (
                <div className="space-y-4 flex-1">
                  <div className="p-4 bg-slate-50 rounded-none border border-slate-200">
                    <h3 className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-2 uppercase tracking-wider">
                      <Coins className="h-4 w-4 text-slate-700" />
                      Destinação dos Recursos Notariais
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed font-sans">
                      No Paraná, o valor arrecadado é legalmente partilhado entre a manutenção do serviço, fundos do poder judiciário, fiscalização, previdência e defensoria pública:
                    </p>
                  </div>

                  <div className="space-y-3">
                    {/* Item 1: Emolumentos Notário */}
                    <div className="flex items-center justify-between p-4 rounded-none border border-slate-250 bg-white">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-blue-600 rounded-none shrink-0"></div>
                        <div>
                          <span className="text-xs font-bold text-slate-800 block uppercase tracking-wide">Tabelionato de Notas (Emolumentos)</span>
                          <span className="text-[10px] text-slate-400 block font-mono">Estrutura física, tecnologia e equipe do cartório</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-slate-900">{formatarMoeda(resultado.somaEmolumentosReais)}</span>
                        <span className="text-[10px] text-slate-400 block font-mono">{resultado.somaEmolumentosVrc.toFixed(2)} VRC</span>
                      </div>
                    </div>

                    {/* Item 3: Fadep */}
                    <div className="flex items-center justify-between p-4 rounded-none border border-slate-250 bg-white">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-emerald-500 rounded-none shrink-0"></div>
                        <div>
                          <span className="text-xs font-bold text-slate-800 block uppercase tracking-wide">FADEP ({config.fadepPct.toFixed(1)}%)</span>
                          <span className="text-[10px] text-slate-400 block font-mono">Fundo de Apoio à Defensoria Pública do Paraná</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-slate-900">{formatarMoeda(resultado.somaFadep)}</span>
                      </div>
                    </div>

                    {/* Item 4: ISSQN */}
                    <div className="flex items-center justify-between p-4 rounded-none border border-slate-250 bg-white">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-indigo-500 rounded-none shrink-0"></div>
                        <div>
                          <span className="text-xs font-bold text-slate-800 block uppercase tracking-wide">ISSQN ({config.issPct.toFixed(1)}%)</span>
                          <span className="text-[10px] text-slate-400 block font-mono">Imposto Municipal sobre Serviços</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-slate-900">{formatarMoeda(resultado.somaIss)}</span>
                      </div>
                    </div>

                      {/* Item 5: Selos */}
                      <div className="flex items-center justify-between p-4 rounded-none border border-slate-250 bg-white">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-purple-500 rounded-none shrink-0"></div>
                          <div>
                            <span className="text-xs font-bold text-slate-800 block uppercase tracking-wide">Selos Digitais de Fiscalização</span>
                            <span className="text-[10px] text-slate-400 block font-mono font-sans">
                              {resultado.selosDetalhes ? (
                                <span>
                                  Taxa TJPR ({resultado.selosDetalhes.tn2Count}x TN2 de R$ {resultado.selosDetalhes.tn2Value.toFixed(2)}
                                  {resultado.selosDetalhes.tn1Count > 0 ? ` + ${resultado.selosDetalhes.tn1Count}x TN1 de R$ ${resultado.selosDetalhes.tn1Value.toFixed(2)}` : ""})
                                </span>
                              ) : (
                                <span>
                                  Taxa do Tribunal de Justiça ({resultado.somaSelos > 0 ? `${Math.round(resultado.somaSelos / (config.taxaSeloFixoReais / 2))} selos de R$ ${(config.taxaSeloFixoReais / 2).toFixed(2)}` : "sem selos"})
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-slate-900">{formatarMoeda(resultado.somaSelos)}</span>
                        </div>
                      </div>

                     {/* Item 6: Distribuição */}
                     <div className="flex items-center justify-between p-4 rounded-none border border-slate-250 bg-white">
                       <div className="flex items-center gap-3">
                         <div className="w-3 h-3 bg-teal-500 rounded-none shrink-0"></div>
                         <div>
                           <span className="text-xs font-bold text-slate-800 block uppercase tracking-wide">Distribuição (Tabela XII)</span>
                           <span className="text-[10px] text-slate-400 block font-mono">Taxa de distribuição judicial do ato</span>
                         </div>
                       </div>
                       <div className="text-right">
                         <span className="font-mono font-bold text-slate-900">{formatarMoeda(resultado.somaDistrib)}</span>
                       </div>
                     </div>

                     {/* Item 7: Funrejus */}
                     <div className="flex items-center justify-between p-4 rounded-none border border-slate-250 bg-amber-50">
                       <div className="flex items-center gap-3">
                         <div className="w-3 h-3 bg-amber-800 rounded-none shrink-0"></div>
                         <div>
                           <span className="text-xs font-bold text-amber-900 block uppercase tracking-wide">FUNREJUS ({config.funrejusPct.toFixed(2)}%)</span>
                           <span className="text-[10px] text-amber-700 block font-mono">Fundo de Equipamento do Judiciário (Guia TJPR)</span>
                         </div>
                       </div>
                       <div className="text-right">
                         <span className="font-mono font-extrabold text-amber-950">{formatarMoeda(resultado.somaFunrejus)}</span>
                       </div>
                     </div>

                     {/* Item 8: Valores Adicionais */}
                     {resultado.somaItensAdicionais && resultado.somaItensAdicionais > 0 ? (
                       <div className="flex items-center justify-between p-4 rounded-none border border-slate-250 bg-slate-50">
                         <div className="flex items-center gap-3">
                           <div className="w-3 h-3 bg-slate-400 rounded-none shrink-0"></div>
                           <div>
                             <span className="text-xs font-bold text-slate-800 block uppercase tracking-wide">Valores Adicionais (Isentos)</span>
                             <span className="text-[10px] text-slate-500 block font-mono">Taxas complementares (certidões, etc.)</span>
                           </div>
                         </div>
                         <div className="text-right">
                           <span className="font-mono font-bold text-slate-900">{formatarMoeda(resultado.somaItensAdicionais)}</span>
                         </div>
                       </div>
                     ) : null}
                  </div>
                </div>
              )}
            </section>

            {/* CARD 6: AJUSTES DA TABELA / ALÍQUOTAS (EXPANDÍVEL) */}
            <section className="bg-white rounded-none border border-slate-200 overflow-hidden no-print" id="card-config-aliquotas">
              <button
                onClick={() => {
                  if (!isConfigExpanded) {
                    if (!configPasswordVerified) {
                      setShowConfigPasswordPrompt(true);
                      setIsConfigExpanded(true);
                    } else {
                      setIsConfigExpanded(true);
                    }
                  } else {
                    setIsConfigExpanded(false);
                    setShowConfigPasswordPrompt(false);
                  }
                }}
                className="w-full p-5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors rounded-none cursor-pointer"
                id="btn-expandir-config"
              >
                <div className="flex items-center gap-3">
                  <Sliders className="h-5 w-5 text-slate-600" />
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">Configurações Avançadas de Alíquotas e Taxas</h2>
                    <p className="text-[10px] text-slate-500 font-mono">Ajuste o VRC e taxas adicionais dos fundos</p>
                  </div>
                </div>
                {isConfigExpanded ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
              </button>

              <AnimatePresence>
                {isConfigExpanded && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    className="overflow-hidden border-t border-slate-200"
                  >
                    {showConfigPasswordPrompt ? (
                      <div className="p-6 bg-slate-50/50 space-y-4">
                        <div className="max-w-md mx-auto bg-white p-6 border border-slate-200 shadow-sm">
                          <h3 className="text-sm font-bold text-slate-900 mb-2">Acesso Restrito</h3>
                          <p className="text-xs text-slate-500 mb-4">Por favor, insira a senha para acessar as configurações avançadas.</p>
                          <div className="space-y-3">
                            <input
                              type="password"
                              value={configPasswordInput}
                              onChange={(e) => setConfigPasswordInput(e.target.value)}
                              placeholder="Senha de acesso"
                              className="w-full px-3 py-2 border border-slate-200 rounded-none font-mono focus:outline-hidden focus:border-slate-900 bg-white text-sm"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  if (configPasswordInput === '@Def18441') {
                                    setConfigPasswordVerified(true);
                                    setShowConfigPasswordPrompt(false);
                                    setConfigPasswordError("");
                                  } else {
                                    setConfigPasswordError("Senha incorreta.");
                                  }
                                }
                              }}
                            />
                            {configPasswordError && (
                              <p className="text-[10px] text-red-600 font-bold">{configPasswordError}</p>
                            )}
                            <button
                              onClick={() => {
                                if (configPasswordInput === '@Def18441') {
                                  setConfigPasswordVerified(true);
                                  setShowConfigPasswordPrompt(false);
                                  setConfigPasswordError("");
                                } else {
                                  setConfigPasswordError("Senha incorreta.");
                                }
                              }}
                              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-none text-xs transition-colors"
                            >
                              Acessar Configurações
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                    <div className="p-6 bg-slate-50/50 space-y-4 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* VRC Rate */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Valor Unitário do VRC (R$)</label>
                          <input
                            type="number"
                            step="any"
                            value={config.vrcRate}
                            onChange={(e) => setConfig({ ...config, vrcRate: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-none font-mono focus:outline-hidden focus:border-slate-900 bg-white"
                            id="config-vrc-rate"
                          />
                        </div>

                        {/* ISSQN */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Alíquota ISSQN (%)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={config.issPct}
                            onChange={(e) => setConfig({ ...config, issPct: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-none font-mono focus:outline-hidden focus:border-slate-900 bg-white"
                            id="config-iss-pct"
                          />
                        </div>

                        {/* FADEP */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Fundo FADEP (%)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={config.fadepPct}
                            onChange={(e) => setConfig({ ...config, fadepPct: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-none font-mono focus:outline-hidden focus:border-slate-900 bg-white"
                            id="config-fadep-pct"
                          />
                        </div>

                        {/* FUNREJUS */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">FUNREJUS sobre o Imóvel (%)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={config.funrejusPct}
                            onChange={(e) => setConfig({ ...config, funrejusPct: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-none font-mono focus:outline-hidden focus:border-slate-900 bg-white"
                            id="config-funrejus-pct"
                          />
                        </div>

                        {/* TETO FUNREJUS */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Teto Máximo do FUNREJUS (R$)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={config.tetoFunrejusReais}
                            onChange={(e) => setConfig({ ...config, tetoFunrejusReais: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-none font-mono focus:outline-hidden focus:border-slate-900 bg-white text-slate-900 font-bold"
                            id="config-teto-funrejus-reais"
                          />
                        </div>

                        {/* Selo Digital */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Custo do Selo Digital (R$)</label>
                          <input
                            type="number"
                            step="0.5"
                            value={config.taxaSeloFixoReais}
                            onChange={(e) => setConfig({ ...config, taxaSeloFixoReais: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-none font-mono focus:outline-hidden focus:border-slate-900 bg-white"
                            id="config-selo-fixo"
                          />
                          <p className="text-[9px] text-slate-400 mt-1 font-mono">
                            Custo para 2 selos (Escritura + Traslado). Cada selo individual custa <strong>R$ 8,00</strong> (metade do custo base). Para escrituras unificadas com N bens, serão aplicados <strong>N + 1</strong> selos.
                          </p>
                        </div>

                        {/* Distribuição */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Custo da Distribuição Tabela XII (R$)</label>
                          <input
                            type="number"
                            step="any"
                            value={config.taxaDistribReais}
                            onChange={(e) => setConfig({ ...config, taxaDistribReais: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-none font-mono focus:outline-hidden focus:border-slate-900 bg-white"
                            id="config-distrib"
                          />
                        </div>
                      </div>

                      {mensagemConfig.texto && (
                        <div className={`text-[11px] font-bold px-3 py-2 border rounded-none mb-3 text-center ${mensagemConfig.tipo === "sucesso" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"}`} id="mensagem-config-servidor">
                          {mensagemConfig.texto}
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-200 pt-4">
                        <button
                          type="button"
                          onClick={handleResetarConfig}
                          className="text-amber-600 hover:text-amber-800 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                          id="btn-restaurar-config"
                        >
                          Restaurar Padrões Oficiais PR
                        </button>

                        <button
                          type="button"
                          onClick={salvarConfigNoServidor}
                          disabled={salvandoConfig}
                          className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-450 text-white px-4 py-2 text-[10px] font-extrabold uppercase tracking-wider cursor-pointer transition-colors duration-150 rounded-none shrink-0"
                          id="btn-salvar-config-servidor"
                        >
                          {salvandoConfig ? "Salvando..." : "Salvar para Todos os Usuários"}
                        </button>
                      </div>
                    </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          </div>

        </div>
      </main>

      {/* --- FOOTER --- */}
      <footer className="bg-slate-900 border-t-2 border-slate-800 text-slate-450 py-8 text-center text-xs mt-12 no-print font-sans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="uppercase tracking-wider font-bold text-white text-[10px]">Calculadora Paraná</p>
          <p className="text-[10px] text-slate-500 mt-2">
            Esta calculadora é uma ferramenta independente de simulação e apoio estimativo. Os valores oficiais definitivos devem ser validados perante o respectivo Cartório / Tabelionato de Notas de acordo com as diretrizes do TJPR.
          </p>
        </div>
      </footer>
    </div>
  );
}
