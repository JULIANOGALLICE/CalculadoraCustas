export interface BemCadastrado {
  id: string;
  nome: string;
  valor: number; // Valor do bem em R$
  tipoAto: "valor" | "fixo"; // Atos com valor progressivo ou taxas fixas
  atoFixoId?: string; // ID do ato fixo se aplicável
  customVrc?: number; // VRC customizado se "outros_custom" for selecionado
  matricula?: string; // Número de Matrícula ou Registro Imobiliário
  observacoes?: string; // Anotações extras
  fracaoFunrejus?: number; // Fração ideal do FUNREJUS (por exemplo, 50% se for metade ideal)
  isGaragemAutonoma?: boolean; // Se é uma vaga de garagem com matrícula autônoma (Tabela XI, IV, c - 50%)
}

export interface ConfigCustas {
  vrcRate: number; // Valor do VRC em Reais
  funarpenPct: number; // % do Funarpen sobre emolumentos
  fadepPct: number; // % do Fadep sobre emolumentos
  issPct: number; // % do ISSQN sobre emolumentos
  funrejusPct: number; // % do Funrejus sobre o valor do imóvel (0.2%)
  tetoFunrejusReais: number; // Teto do FUNREJUS em R$ (atualmente 8.076,67)
  taxaSeloFixoReais: number; // Taxa de selo em R$
  taxaDistribReais: number; // Taxa de distribuição em R$ (Tabela XII)
  tipoEscritura?: "compra_venda" | "inventario"; // Tipo de escritura principal
  quantidadeFalecidos?: number; // Quantidade de falecidos (óbito/inventariado)
  percentuaisFalecidos?: number[]; // Percentuais de transmissão por cada falecido (ex: [100, 50])
}

export interface ResultadoItem {
  id: string; // ID correspondente ao Bem ou identificador de cálculo
  nome: string;
  matricula?: string;
  valorImovel: number;
  tipoAtoNome: string;
  emolumentosVrc: number;
  emolumentosReais: number;
  funarpen: number;
  fadep: number;
  iss: number;
  funrejus: number;
  selo: number;
  distrib: number;
  percentualEmolumentos?: number; // Ex: 100, 80, 50, ou 0
  regraAplicada?: string; // Ex: "Maior Valor (100%)", "Demais unidades (80%)", "Garagem autônoma (50%)", "Excedente isento (>9)"
  total: number;
}

export interface ResultadoCalculo {
  itens: ResultadoItem[];
  vrcRate: number;
  calculoIndividualizado: boolean; // se cada imóvel calcula na sua própria faixa ou se somamos tudo em um único ato
  somaEmolumentosVrc: number;
  somaEmolumentosReais: number;
  somaFunarpen: number;
  somaFadep: number;
  somaIss: number;
  somaFunrejus: number;
  somaSelos: number;
  somaDistrib: number;
  totalGeral: number;
}

export interface ClienteDados {
  nome: string;
  cpfCnpj?: string;
  telefone?: string;
  email?: string;
  notarioNome?: string;
  comarca?: string; // Município/Comarca do Paraná
}
