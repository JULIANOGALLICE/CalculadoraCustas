import { BemCadastrado, ConfigCustas, ResultadoCalculo, ResultadoItem } from "../types";
import { calcularVrcEscrituraValor, ATOS_FIXOS_PR } from "../data/tabelaPR";

/**
 * Trunca um valor em 2 casas decimais (arredondamento para baixo)
 * Ex: 55.0896 -> 55.08
 */
export function truncar2Decimais(valor: number): number {
  return Math.floor(Math.round(valor * 1000000) / 10000) / 100;
}

export function calcularResultados(
  bens: BemCadastrado[],
  config: ConfigCustas,
  calculoIndividualizado: boolean
): ResultadoCalculo {
  const itens: ResultadoItem[] = [];

  if (config.tipoEscritura === "ata") {
    const subtipo = config.ataSubtipo || "interna";
    const paginas = config.ataPaginas || 1;

    let emolumentosVrc = 0;
    let funrejus = 0;
    let tipoAtoNome = "";

    if (subtipo === "interna") {
      // 630 VRC para primeira pagina e mais 30 VRC para cada pagina adicional
      emolumentosVrc = 630 + (paginas - 1) * 30;
      // FUNREJUS é de 43,63 para primeira pagina e 2,08 a cada pagina adicional
      funrejus = 43.63 + (paginas - 1) * 2.08;
      tipoAtoNome = `Ata Notarial Interna (${paginas} fl.)`;
    } else {
      // 1260 VRC para primeira pagina e mais 30 VRC para cada pagina adicional
      emolumentosVrc = 1260 + (paginas - 1) * 30;
      // FUNREJUS é de 87,25 para primeira pagina e 2,08 a cada pagina adicional
      funrejus = 87.25 + (paginas - 1) * 2.08;
      tipoAtoNome = `Ata Notarial Externa (${paginas} fl.)`;
    }

    const emolumentosReais = Math.round(emolumentosVrc * config.vrcRate * 100) / 100;
    const funarpen = 0;
    const fadep = truncar2Decimais(emolumentosReais * (config.fadepPct / 100));
    const iss = truncar2Decimais(emolumentosReais * (config.issPct / 100));

    // Selo: 1 para escritura, 1 para o traslado de 8 reais cada e um selo de 1,00 a cada pagina adicional
    const custoPorSelo = config.taxaSeloFixoReais / 2; // R$ 8,00 por padrão
    const selo = (2 * custoPorSelo) + (paginas - 1) * 1.00;

    // Distribuição normal no preço da tabela da escritura
    const distrib = config.taxaDistribReais;

    const total = emolumentosReais + funarpen + fadep + iss + funrejus + selo + distrib;

    const selosDetalhes = {
      tn2Count: 2,
      tn2Value: custoPorSelo, // R$ 8,00 por padrão
      tn1Count: paginas - 1,
      tn1Value: 1.00
    };

    itens.push({
      id: "ata_unica",
      nome: "Ata Notarial",
      tipoAtoNome,
      valorImovel: 0,
      emolumentosVrc,
      emolumentosReais,
      funarpen,
      fadep,
      iss,
      funrejus,
      selo,
      distrib,
      total,
      selosDetalhes,
    });

    return {
      itens,
      vrcRate: config.vrcRate,
      calculoIndividualizado: false,
      somaEmolumentosVrc: emolumentosVrc,
      somaEmolumentosReais: emolumentosReais,
      somaFunarpen: funarpen,
      somaFadep: fadep,
      somaIss: iss,
      somaFunrejus: funrejus,
      somaSelos: selo,
      somaDistrib: distrib,
      totalGeral: total,
      selosDetalhes,
    };
  }

  if (bens.length === 0) {
    return {
      itens: [],
      vrcRate: config.vrcRate,
      calculoIndividualizado,
      somaEmolumentosVrc: 0,
      somaEmolumentosReais: 0,
      somaFunarpen: 0,
      somaFadep: 0,
      somaIss: 0,
      somaFunrejus: 0,
      somaSelos: 0,
      somaDistrib: 0,
      totalGeral: 0,
    };
  }

  // Separar bens com valor declaratório, atos fixos e atas notariais
  const bensComValor = bens.filter((b) => b.tipoAto === "valor");
  const atosFixos = bens.filter((b) => b.tipoAto === "fixo");
  const atasNotariais = bens.filter((b) => b.tipoAto === "ata");

  // Se o cálculo for ESCRITURA ÚNICA (não-individualizado) para os bens com valor declaratório
  if (!calculoIndividualizado && bensComValor.length > 0) {
    // Regra Tabela XI, Item IV (Múltiplas unidades imobiliárias no mesmo ato):
    // a) Pelas unidades de maior valor, custas integrais (100%);
    // b) Demais unidades limitada a nove: 80% (oitenta por cento) das custas integrais;
    // c) Garagem com matrícula autônoma: 50% (cinquenta por cento) das custas integrais.
    
    // Para identificar o "imóvel de maior valor", ordenamos por valor decrescente
    const sortedBens = [...bensComValor].sort((a, b) => b.valor - a.valor);
    const isInventario = config.tipoEscritura === "inventario";
    const numFalecidos = isInventario ? (config.quantidadeFalecidos || 1) : 1;
    
    sortedBens.forEach((bem, index) => {
      let baseVrcTotal = 0;
      let valoresTransmitidosStr = [];
      for (let i = 0; i < numFalecidos; i++) {
        const pctFalecido = (config.percentuaisFalecidos && config.percentuaisFalecidos[i] !== undefined) 
          ? config.percentuaisFalecidos[i] 
          : 100;
        const valorTransmitido = bem.valor * (pctFalecido / 100);
        baseVrcTotal += calcularVrcEscrituraValor(valorTransmitido);
        valoresTransmitidosStr.push(`${pctFalecido}%`);
      }
      
      let percentual = 100;
      let regraAplicada = "Unidade de Maior Valor (Integral - 100%)";
      
      if (index > 0) {
        if (index > 9) {
          percentual = 0;
          regraAplicada = "Excedente Isento (Limite de 9 adicionais excedido)";
        } else if (bem.isGaragemAutonoma) {
          percentual = 50;
          regraAplicada = "Garagem Autônoma (Tabela XI, IV, c - 50%)";
        } else {
          percentual = 80;
          regraAplicada = "Demais Unidades (Tabela XI, IV, b - 80%)";
        }
      }
      
      const emolumentosVrc = baseVrcTotal * (percentual / 100);
      const emolumentosReais = Math.round(emolumentosVrc * config.vrcRate * 100) / 100;
      
      const funarpen = 0;
      const fadep = truncar2Decimais(emolumentosReais * (config.fadepPct / 100));
      const iss = truncar2Decimais(emolumentosReais * (config.issPct / 100));
      
      // Funrejus é calculado sobre o valor real do imóvel considerando a fração ideal do FUNREJUS (limitado ao teto)
      const funrejusBase = truncar2Decimais((bem.valor * ((bem.fracaoFunrejus ?? 100) / 100)) * (config.funrejusPct / 100));
      const funrejus = Math.min(funrejusBase, config.tetoFunrejusReais ?? 8076.67);
      
      // Selo Digital: R$ 8,00 por selo (equivalente a 50% do custo base de R$ 16,00).
      // O primeiro bem recebe 2 selos (Escritura + Traslado). Cada bem adicional recebe +1 selo.
      // Total de selos para N bens = N + 1.
      const custoPorSelo = config.taxaSeloFixoReais / 2; // R$ 8,00 por padrão
      const selo = index === 0 ? (2 * custoPorSelo) : custoPorSelo;
      const distrib = index === 0 ? config.taxaDistribReais : 0;
      
      const total = emolumentosReais + funarpen + fadep + iss + funrejus + selo + distrib;
      
      const pctStr = numFalecidos > 1 ? ` [${valoresTransmitidosStr.join(' / ')}]` : '';
      const atoNomePrefixo = isInventario ? "Escritura de Inventário" : "Escritura Pública c/ Valor Declaratório";
      const atoNomeSufixo = isInventario ? ` (${regraAplicada} - ${numFalecidos} ${numFalecidos === 1 ? 'óbito' : 'óbitos'}${pctStr})` : ` (${regraAplicada})`;

      itens.push({
        id: bem.id,
        nome: bem.nome,
        matricula: bem.matricula,
        valorImovel: bem.valor,
        tipoAtoNome: `${atoNomePrefixo}${atoNomeSufixo}`,
        emolumentosVrc,
        emolumentosReais,
        funarpen,
        fadep,
        iss,
        funrejus,
        selo,
        distrib,
        percentualEmolumentos: percentual,
        regraAplicada: isInventario ? `${regraAplicada} (x${numFalecidos} Óbito/s${pctStr})` : regraAplicada,
        total,
      });
    });
  } else {
    // Se o cálculo for INDIVIDUALIZADO para bens com valor declaratório
    const isInventario = config.tipoEscritura === "inventario";
    const numFalecidos = isInventario ? (config.quantidadeFalecidos || 1) : 1;

    bensComValor.forEach((bem) => {
      let emolumentosVrc = 0;
      let valoresTransmitidosStr = [];
      for (let i = 0; i < numFalecidos; i++) {
        const pctFalecido = (config.percentuaisFalecidos && config.percentuaisFalecidos[i] !== undefined) 
          ? config.percentuaisFalecidos[i] 
          : 100;
        const valorTransmitido = bem.valor * (pctFalecido / 100);
        emolumentosVrc += calcularVrcEscrituraValor(valorTransmitido);
        valoresTransmitidosStr.push(`${pctFalecido}%`);
      }
      
      const emolumentosReais = Math.round(emolumentosVrc * config.vrcRate * 100) / 100;

      const funarpen = 0;
      const fadep = truncar2Decimais(emolumentosReais * (config.fadepPct / 100));
      const iss = truncar2Decimais(emolumentosReais * (config.issPct / 100));
      // Funrejus usa fracaoFunrejus (default 100) (limitado ao teto)
      const funrejusBase = truncar2Decimais((bem.valor * ((bem.fracaoFunrejus ?? 100) / 100)) * (config.funrejusPct / 100));
      const funrejus = Math.min(funrejusBase, config.tetoFunrejusReais ?? 8076.67);
      const selo = config.taxaSeloFixoReais;
      const distrib = config.taxaDistribReais;

      const total = emolumentosReais + funarpen + fadep + iss + funrejus + selo + distrib;

      const pctStr = numFalecidos > 1 ? ` [${valoresTransmitidosStr.join(' / ')}]` : '';
      const atoNomePrefixo = isInventario ? "Escritura de Inventário" : "Escritura Pública com Valor Declaratório";
      const atoNomeSufixo = isInventario ? ` - Individual (${numFalecidos} ${numFalecidos === 1 ? 'óbito' : 'óbitos'}${pctStr})` : " (Individual)";

      itens.push({
        id: bem.id,
        nome: bem.nome,
        matricula: bem.matricula,
        valorImovel: bem.valor,
        tipoAtoNome: `${atoNomePrefixo}${atoNomeSufixo}`,
        emolumentosVrc,
        emolumentosReais,
        funarpen,
        fadep,
        iss,
        funrejus,
        selo,
        distrib,
        percentualEmolumentos: 100,
        regraAplicada: isInventario ? `Ato Individual (x${numFalecidos} Óbito/s${pctStr})` : "Ato Individual (100%)",
        total,
      });
    });
  }

  // Atos fixos são SEMPRE calculados individualmente
  atosFixos.forEach((bem) => {
    let emolumentosVrc = 0;
    let tipoAtoNome = "Ato Notarial Fixo";

    if (bem.atoFixoId) {
      const atoFixoConfig = ATOS_FIXOS_PR.find((a) => a.id === bem.atoFixoId);
      if (atoFixoConfig) {
        if (bem.atoFixoId === "outros_custom") {
          emolumentosVrc = bem.customVrc || 0;
          tipoAtoNome = "Outro Ato (Customizado em VRC)";
        } else {
          emolumentosVrc = atoFixoConfig.vrc;
          tipoAtoNome = atoFixoConfig.nome;
        }
      }
    }

    const emolumentosReais = Math.round(emolumentosVrc * config.vrcRate * 100) / 100;
    const funarpen = 0;
    const fadep = truncar2Decimais(emolumentosReais * (config.fadepPct / 100));
    const iss = truncar2Decimais(emolumentosReais * (config.issPct / 100));
    
    // Atos fixos ou sem valor geralmente não incidem FUNREJUS de transferência (0.2% de imóvel)
    const funrejus = 0;
    const selo = config.taxaSeloFixoReais;
    const distrib = config.taxaDistribReais;

    const total = emolumentosReais + funarpen + fadep + iss + funrejus + selo + distrib;

    itens.push({
      id: bem.id,
      nome: bem.nome,
      matricula: bem.matricula,
      valorImovel: bem.valor, // geralmente 0 para atos fixos, mas pode conter o valor cadastrado
      tipoAtoNome,
      emolumentosVrc,
      emolumentosReais,
      funarpen,
      fadep,
      iss,
      funrejus,
      selo,
      distrib,
      total,
    });
  });

  // Atas Notariais são SEMPRE calculadas individualmente
  atasNotariais.forEach((bem) => {
    const subtipo = bem.subtipoAta || "interna";
    const paginas = bem.paginasAta || 1;

    let emolumentosVrc = 0;
    let funrejus = 0;
    let tipoAtoNome = "";

    if (subtipo === "interna") {
      // 630 VRC para primeira pagina e mais 30 VRC para cada pagina adicional
      emolumentosVrc = 630 + (paginas - 1) * 30;
      // FUNREJUS é de 43,63 para primeira pagina e 2,08 a cada pagina adicional
      funrejus = 43.63 + (paginas - 1) * 2.08;
      tipoAtoNome = `Ata Notarial Interna (${paginas} fl.)`;
    } else {
      // 1260 VRC para primeira pagina e mais 30 VRC para cada pagina adicional
      emolumentosVrc = 1260 + (paginas - 1) * 30;
      // FUNREJUS é de 87,25 para primeira pagina e 2,08 a cada pagina adicional
      funrejus = 87.25 + (paginas - 1) * 2.08;
      tipoAtoNome = `Ata Notarial Externa (${paginas} fl.)`;
    }

    const emolumentosReais = Math.round(emolumentosVrc * config.vrcRate * 100) / 100;
    const funarpen = 0;
    const fadep = truncar2Decimais(emolumentosReais * (config.fadepPct / 100));
    const iss = truncar2Decimais(emolumentosReais * (config.issPct / 100));

    // Selo: 1 para escritura, 1 para o traslado de 8 reais cada e um selo de 1,00 a cada pagina adicional
    const custoPorSelo = config.taxaSeloFixoReais / 2; // R$ 8,00 por padrão
    const selo = (2 * custoPorSelo) + (paginas - 1) * 1.00;

    // Distribuição normal no preço da tabela da escritura
    const distrib = config.taxaDistribReais;

    const total = emolumentosReais + funarpen + fadep + iss + funrejus + selo + distrib;

    itens.push({
      id: bem.id,
      nome: bem.nome,
      matricula: bem.matricula,
      valorImovel: bem.valor,
      tipoAtoNome,
      emolumentosVrc,
      emolumentosReais,
      funarpen,
      fadep,
      iss,
      funrejus,
      selo,
      distrib,
      total,
    });
  });

  // Somatórias Finais
  const somaEmolumentosVrc = itens.reduce((sum, item) => sum + item.emolumentosVrc, 0);
  const somaEmolumentosReais = itens.reduce((sum, item) => sum + item.emolumentosReais, 0);
  const somaFunarpen = itens.reduce((sum, item) => sum + item.funarpen, 0);
  const somaFadep = itens.reduce((sum, item) => sum + item.fadep, 0);
  const somaIss = itens.reduce((sum, item) => sum + item.iss, 0);
  const somaFunrejus = itens.reduce((sum, item) => sum + item.funrejus, 0);
  const somaSelos = itens.reduce((sum, item) => sum + item.selo, 0);
  const somaDistrib = itens.reduce((sum, item) => sum + item.distrib, 0);
  const totalGeral = itens.reduce((sum, item) => sum + item.total, 0);

  return {
    itens,
    vrcRate: config.vrcRate,
    calculoIndividualizado,
    somaEmolumentosVrc,
    somaEmolumentosReais,
    somaFunarpen,
    somaFadep,
    somaIss,
    somaFunrejus,
    somaSelos,
    somaDistrib,
    totalGeral,
  };
}

/**
 * Formata um número como moeda brasileira (R$)
 */
export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

/**
 * Formata um valor em VRC com 2 casas decimais
 */
export function formatarVrc(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " VRC";
}

/**
 * Formata a taxa do VRC com todas as casas decimais (mínimo 3, máximo 5)
 */
export function formatarTaxaVrc(valor: number): string {
  return "R$ " + valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 5,
  });
}
