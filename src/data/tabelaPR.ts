/**
 * Tabela de Custas Extrajudiciais do Estado do Paraná - Escrituras
 * Baseado no Valor de Referência de Custas (VRC)
 */

export interface FaixaValor {
  de: number;
  ate: number;
  vrc: number;
}

// Tabela I - Atos dos Tabeliães de Notas (Escrituras de qualquer natureza com valor declaratório)
// Atualizado conforme Tabela XI (Item IV - Escrituras) da Lei 21.869/2023 do Paraná
export const TABELA_ESCRITURAS_VALOR: FaixaValor[] = [
  { de: 0, ate: 15512.00, vrc: 1260.00 },
  { de: 15512.01, ate: 18282.00, vrc: 1485.00 },
  { de: 18282.01, ate: 21052.00, vrc: 1710.00 },
  { de: 21052.01, ate: 23822.00, vrc: 1935.00 },
  { de: 23822.01, ate: 26592.00, vrc: 2160.00 },
  { de: 26592.01, ate: 29362.00, vrc: 2385.00 },
  { de: 29362.01, ate: 32132.00, vrc: 2610.00 },
  { de: 32132.01, ate: 34902.00, vrc: 2835.00 },
  { de: 34902.01, ate: 37672.00, vrc: 3060.00 },
  { de: 37672.01, ate: 40442.00, vrc: 3285.00 },
  { de: 40442.01, ate: 43212.00, vrc: 3510.00 },
  { de: 43212.01, ate: 45982.00, vrc: 3652.00 },
  { de: 45982.01, ate: 48752.00, vrc: 3872.00 },
  { de: 48752.01, ate: 51522.00, vrc: 4092.00 },
  { de: 51522.01, ate: 54292.00, vrc: 4312.00 },
  { de: 54292.01, ate: 57062.00, vrc: 4532.00 },
  { de: 57062.01, ate: 59832.00, vrc: 4752.00 },
  { de: 59832.01, ate: 62602.00, vrc: 4972.00 }
];

export interface AtoFixo {
  id: string;
  nome: string;
  vrc: number;
  descricao: string;
}

// Atos comuns sem valor declaratório ou com taxas fixas (valores atualizados)
export const ATOS_FIXOS_PR: AtoFixo[] = [
  { id: "pacto", nome: "Pacto Antenupcial", vrc: 394.00, descricao: "Escritura de pacto antenupcial simples" },
  { id: "uniao_estavel", nome: "União Estável (Sem Partilha)", vrc: 394.00, descricao: "Declaração de união estável sem atribuição patrimonial" },
  { id: "procuracao_simples", nome: "Procuração Simples (Outros Fins)", vrc: 131.00, descricao: "Representação geral, previdenciária, acadêmica ou judicial" },
  { id: "testamento", nome: "Testamento Público", vrc: 1150.00, descricao: "Escritura pública de testamento" },
  { id: "divorcio_sem_partilha", nome: "Divórcio Consensual (Sem Partilha)", vrc: 493.00, descricao: "Escritura de divórcio sem divisão de bens" },
  { id: "ata_notarial_base", nome: "Ata Notarial (Página Inicial)", vrc: 493.00, descricao: "Constatação de fatos, mensagens, páginas da web (base: 1ª folha)" },
  { id: "revogacao_procuracao", nome: "Revogação de Procuração", vrc: 131.00, descricao: "Ato de cancelamento/revogação de procuração anterior" },
  { id: "outros_custom", nome: "Outros Atos (Customizado)", vrc: 0, descricao: "Permite definir um valor de VRC customizado" }
];

// Valor padrão do VRC (Valor de Referência de Custas do Estado do Paraná para 2025/2026)
// Atualmente em torno de R$ 0,277. Os usuários podem alterar livremente no painel de configurações.
export const DEFAULT_VRC_RATE = 0.277;

// Valores padrão das alíquotas dos fundos adicionais sobre os emolumentos
export const DEFAULT_FUNDS_CONFIG = {
  funarpenPct: 0.0, // Funarpen (0% por padrão para corresponder aos demonstrativos de notas unificados, editável)
  fadepPct: 5.0,    // 5% de Fadep
  issPct: 4.0,      // 4% de ISSQN (conforme demonstrativo de notas real do PR)
  funrejusPct: 0.2, // 0.2% sobre o valor do imóvel (pago à Justiça do PR na transferência)
  tetoFunrejusReais: 8076.67, // Teto máximo do FUNREJUS em R$ (atualmente R$ 8.076,67)
  taxaSeloFixoReais: 16.0, // Taxa de selo digital de fiscalização em Reais (16,00 R$ por ato conforme o demonstrativo)
  taxaDistribReais: 12.62  // Taxa de distribuição em Reais (Tabela XII, 12,62 R$ conforme o demonstrativo)
};

/**
 * Calcula os emolumentos brutos em VRC com base no valor declarado do imóvel
 * Teto de R$ 62.602,00 correspondendo a 4.972,00 VRC
 */
export function calcularVrcEscrituraValor(valorImovel: number): number {
  if (valorImovel <= 0) return 0;

  // Se for maior ou igual ao teto de R$ 62.602,00, retorna o teto de 4.972,00 VRC
  if (valorImovel >= 62602.00) {
    return 4972.00;
  }

  for (const faixa of TABELA_ESCRITURAS_VALOR) {
    if (valorImovel <= faixa.ate) {
      return faixa.vrc;
    }
  }

  return 4972.00;
}
