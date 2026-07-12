import { jsPDF } from "jspdf";
import { ResultadoCalculo, ClienteDados, ConfigCustas } from "../types";
import { formatarMoeda, formatarVrc, formatarTaxaVrc } from "./calculator";

export function gerarPdfCliente(
  resultado: ResultadoCalculo,
  cliente: ClienteDados,
  config: ConfigCustas
) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Margens: 15mm
  const marginX = 15;
  let currentY = 15;

  // Função auxiliar para quebra de página
  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > 275) {
      doc.addPage();
      currentY = 15;
      // Adicionar sutil cabeçalho de página subsequente
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text("Orçamento Estimativo de Custas Extrajudiciais (Paraná)", marginX, currentY);
      doc.line(marginX, currentY + 2, 195, currentY + 2);
      currentY += 10;
    }
  };

  // --- CABEÇALHO ---
  // Tarja elegante superior (cor slate-900)
  doc.setFillColor(15, 23, 42); // Slate 900 #0F172A
  doc.rect(marginX, currentY, 180, 4, "F");
  currentY += 10;

  // Título Principal
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text("ORÇAMENTO DE CUSTAS EXTRAJUDICIAIS", marginX, currentY);
  currentY += 6;

  // Subtítulo
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(
    `Tabela de Custas do Estado do Paraná | VRC de Referência: ${formatarTaxaVrc(config.vrcRate)}`,
    marginX,
    currentY
  );
  currentY += 10;

  // Divisória sutil
  doc.setDrawColor(220, 224, 230);
  doc.line(marginX, currentY, 195, currentY);
  currentY += 6;

  // --- DADOS DO CLIENTE / ATO ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(50, 50, 50);
  doc.text("Dados do Cliente e do Ato:", marginX, currentY);
  currentY += 6;

  // Caixa de dados do cliente
  doc.setFillColor(248, 249, 250);
  doc.setDrawColor(220, 224, 230);
  const isInventario = config.tipoEscritura === "inventario";
  const isAta = config.tipoEscritura === "ata";
  const numFalecidos = config.quantidadeFalecidos || 1;
  const rectHeight = 34; // standard size to accommodate extra info line nicely
  doc.rect(marginX, currentY, 180, rectHeight, "FD");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);

  const colWidth = 90;
  // Coluna 1
  doc.text(`Cliente: ${cliente.nome || "Não informado"}`, marginX + 4, currentY + 6);
  doc.text(`CPF/CNPJ: ${cliente.cpfCnpj || "Não informado"}`, marginX + 4, currentY + 12);
  doc.text(`Telefone: ${cliente.telefone || "Não informado"}`, marginX + 4, currentY + 18);
  doc.text(`E-mail: ${cliente.email || "Não informado"}`, marginX + 4, currentY + 24);
  
  let tipoAtoTexto = "Compra e Venda / Doação";
  if (isInventario) {
    tipoAtoTexto = "Inventário e Partilha (Sucessão)";
  } else if (isAta) {
    tipoAtoTexto = "Ata Notarial";
  }
  doc.text(`Tipo de Ato: ${tipoAtoTexto}`, marginX + 4, currentY + 30);

  // Coluna 2
  doc.text(`Comarca/Município: ${cliente.comarca || "Paraná (Geral)"}`, marginX + colWidth, currentY + 6);
  doc.text(`Responsável: ${cliente.notarioNome || "Escrevente / Notário"}`, marginX + colWidth, currentY + 12);
  doc.text(`Data do Cálculo: ${new Date().toLocaleDateString("pt-BR")}`, marginX + colWidth, currentY + 18);
  
  let modalidadeTexto = resultado.calculoIndividualizado ? "Escrituras Individuais" : "Escritura Única (Tab. XI, IV)";
  if (isAta) {
    modalidadeTexto = "Ato Único Fixo";
  }
  doc.text(`Modalidade: ${modalidadeTexto}`, marginX + colWidth, currentY + 24);
  
  if (isInventario) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(190, 110, 20); // Amber tone
    doc.text(`Óbitos (Falecidos): ${numFalecidos}`, marginX + colWidth, currentY + 30);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
  } else if (isAta) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(190, 110, 20); // Amber tone
    const subtipoAta = config.ataSubtipo || "interna";
    const paginasAta = config.ataPaginas || 1;
    doc.text(`Ata: ${subtipoAta === "interna" ? "Interna" : "Externa"} (${paginasAta} pág.)`, marginX + colWidth, currentY + 30);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
  } else {
    doc.text("Óbitos (Falecidos): Não aplicável", marginX + colWidth, currentY + 30);
  }

  currentY += rectHeight + 6;

  // --- DETALHAMENTO DOS BENS / ESCRITURA ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(50, 50, 50);
  doc.text("Detalhamento dos Atos e Emolumentos:", marginX, currentY);
  currentY += 6;

  // Cabeçalho da tabela de bens
  doc.setFillColor(235, 241, 248);
  doc.rect(marginX, currentY, 180, 7, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(40, 60, 90);
  doc.text("Descrição do Bem / Ato", marginX + 2, currentY + 5);
  doc.text("Valor Ref (R$)", marginX + 85, currentY + 5);
  doc.text("VRC", marginX + 115, currentY + 5);
  doc.text("Emolumentos (R$)", marginX + 145, currentY + 5);
  
  currentY += 7;

  // Linhas da tabela de bens
  resultado.itens.forEach((item, index) => {
    checkPageBreak(18);
    
    // Fundo zebrado sutil
    if (index % 2 === 1) {
      doc.setFillColor(250, 252, 254);
      doc.rect(marginX, currentY, 180, 10, "F");
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(60, 60, 60);

    // Nome longo com quebra de linha sutil ou trim
    const nomeAbreviado = item.nome.length > 42 ? item.nome.substring(0, 40) + "..." : item.nome;
    doc.text(nomeAbreviado, marginX + 2, currentY + 6.5);
    
    // Tipo de ato abaixo do nome em fonte cinza e itálico
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(120, 120, 120);
    const matriculaText = item.matricula ? ` | Matrícula: ${item.matricula}` : "";
    let subLabel = item.tipoAtoNome;
    if (subLabel.includes("Escritura Pública c/ Valor Declaratório ")) {
      subLabel = subLabel.replace("Escritura Pública c/ Valor Declaratório ", "Escritura ");
    }
    doc.text(`${subLabel}${matriculaText}`, marginX + 2, currentY + 11.5);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(60, 60, 60);

    // Valores
    const valorImovelTxt = item.valorImovel > 0 ? formatarMoeda(item.valorImovel) : "N/A";
    doc.text(valorImovelTxt, marginX + 85, currentY + 6.5);
    doc.text(item.emolumentosVrc.toFixed(2), marginX + 115, currentY + 6.5);
    doc.text(formatarMoeda(item.emolumentosReais), marginX + 145, currentY + 6.5);

    doc.setDrawColor(240, 240, 240);
    doc.line(marginX, currentY + 13, 195, currentY + 13);
    currentY += 13;
  });

  currentY += 4;
  checkPageBreak(50);

  // --- DETALHAMENTO DE IMPOSTOS E TRIBUTOS EXTRAJUDICIAIS ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(50, 50, 50);
  doc.text("Demonstrativo Consolidado de Custas e Fundos Estaduais:", marginX, currentY);
  currentY += 6;

  // Caixa consolidada de valores
  doc.setDrawColor(220, 224, 230);
  doc.setFillColor(252, 252, 253);
  const boxHeight = (resultado.somaItensAdicionais && resultado.somaItensAdicionais > 0) ? 58 : 51;
  doc.rect(marginX, currentY, 180, boxHeight, "FD");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(80, 80, 80);

  // Linhas da caixa consolidada
  const colValX1 = marginX + 4;
  const colValX2 = marginX + 140;
  
  doc.text("1. Emolumentos Notariais (Destinado ao Tabelionato):", colValX1, currentY + 6);
  doc.setFont("helvetica", "bold");
  doc.text(formatarMoeda(resultado.somaEmolumentosReais), colValX2, currentY + 6);
  doc.setFont("helvetica", "normal");

  doc.text(`2. FADEP (${config.fadepPct.toFixed(1)}% sobre Emolumentos - Defensoria Pública):`, colValX1, currentY + 13);
  doc.text(formatarMoeda(resultado.somaFadep), colValX2, currentY + 13);

  doc.text(`3. ISSQN (${config.issPct.toFixed(1)}% - Imposto Municipal Sobre Serviços):`, colValX1, currentY + 20);
  doc.text(formatarMoeda(resultado.somaIss), colValX2, currentY + 20);

  if (resultado.selosDetalhes) {
    const det = resultado.selosDetalhes;
    const descSelo = `4. Selo Digital de Fiscalização (${det.tn2Count} TN2 de R$ ${det.tn2Value.toFixed(2)}${det.tn1Count > 0 ? ` + ${det.tn1Count} TN1 de R$ ${det.tn1Value.toFixed(2)}` : ""}):`;
    doc.text(descSelo, colValX1, currentY + 27);
  } else {
    const totalSelosNum = resultado.somaSelos > 0 ? Math.round(resultado.somaSelos / (config.taxaSeloFixoReais / 2)) : 0;
    doc.text(`4. Selo Digital de Fiscalização (${totalSelosNum} ${totalSelosNum === 1 ? "Selo" : "Selos"} de R$ ${(config.taxaSeloFixoReais / 2).toFixed(2)}):`, colValX1, currentY + 27);
  }
  doc.text(formatarMoeda(resultado.somaSelos), colValX2, currentY + 27);

  doc.text("5. Distribuição Judicial (Fixo por Ato Tabela XII):", colValX1, currentY + 34);
  doc.text(formatarMoeda(resultado.somaDistrib), colValX2, currentY + 34);

  doc.text(`6. FUNREJUS (${config.funrejusPct.toFixed(2)}% sobre o Valor Declarado dos Bens):`, colValX1, currentY + 41);
  doc.text(formatarMoeda(resultado.somaFunrejus), colValX2, currentY + 41);

  let additionalY = 0;
  if (resultado.somaItensAdicionais && resultado.somaItensAdicionais > 0) {
    additionalY = 7;
    doc.text("7. Valores Adicionais (Certidões, Expediente, etc.):", colValX1, currentY + 41 + additionalY);
    doc.text(formatarMoeda(resultado.somaItensAdicionais), colValX2, currentY + 41 + additionalY);
  }

  // Linha divisória interna da caixa de resumo
  doc.setDrawColor(200, 200, 200);
  doc.line(marginX + 2, currentY + 45 + additionalY, 195 - 2, currentY + 45 + additionalY);

  currentY += 51 + additionalY;

  // Caixa de Total Geral Destacada
  doc.setFillColor(15, 23, 42); // Slate 900 #0F172A
  doc.rect(marginX, currentY, 180, 12, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("TOTAL ESTIMADO DAS CUSTAS:", marginX + 4, currentY + 8);
  
  doc.setFontSize(13);
  doc.text(formatarMoeda(resultado.totalGeral), marginX + 135, currentY + 8);
  
  currentY += 18;
  checkPageBreak(35);

  // --- OBSERVAÇÕES E NOTAS LEGAIS ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(80, 80, 80);
  doc.text("Observações Importantes e Disposições Legais:", marginX, currentY);
  currentY += 4.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(110, 110, 110);
  
  const obsLines = [
    "* Este documento é um demonstrativo estimativo de custas, elaborado com base nas tabelas de emolumentos vigentes do Tribunal de Justiça do Estado do Paraná (TJPR).",
    "* Os valores de emolumentos variam de acordo com as faixas de valores estipuladas pelo Poder Judiciário. A taxa do VRC é reajustada anualmente.",
    "* O FUNREJUS (0.2%) incide sobre transmissões de propriedade e deve ser recolhido por guia bancária própria junto ao TJPR.",
    "* Este cálculo NÃO engloba taxas de certidões adicionais, impostos de transmissão municipais (ITBI) ou estaduais (ITCMD), nem custos de registro de imóveis subsequentes.",
    "* A exatidão do cálculo final está sujeita à análise minuciosa da documentação e das matrículas imobiliárias no momento da qualificação notarial pelo escrevente autorizado."
  ];

  obsLines.forEach((line) => {
    // Quebrar linhas automaticamente para caber na folha A4 (largura aproximada de 180mm)
    const splitLines = doc.splitTextToSize(line, 176);
    splitLines.forEach((sLine: string) => {
      checkPageBreak(4);
      doc.text(sLine, marginX, currentY);
      currentY += 3.5;
    });
  });

  currentY += 8;
  checkPageBreak(25);

  // --- ÁREA DE ASSINATURA / CARIMBO ---
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(130, 130, 130);
  doc.text("Orçamento gerado eletronicamente. Valores calculados exclusivamente de acordo com a CGJ-TJPR.", marginX, currentY);
  
  currentY += 12;
  doc.setDrawColor(180, 180, 180);
  doc.line(marginX + 10, currentY, marginX + 70, currentY);
  doc.line(marginX + 100, currentY, marginX + 160, currentY);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("Assinatura do Responsável", marginX + 25, currentY + 4);
  doc.text("Ciente do Cliente / Data", marginX + 118, currentY + 4);

  // Salvar o arquivo PDF
  const nomeArquivo = `Orcamento_Custas_PR_${cliente.nome ? cliente.nome.replace(/\s+/g, "_") : "Cliente"}.pdf`;
  doc.save(nomeArquivo);
}
