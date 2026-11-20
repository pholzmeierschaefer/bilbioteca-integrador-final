const relatoriosRepository = require('./relatorios.repository');

const MS_POR_DIA = 1000 * 60 * 60 * 24;
const LIMITE_CRITICO_DIAS = 10;

function criarErroHttp(statusCode, mensagem, codigo) {
  const err = new Error(mensagem);
  err.statusCode = statusCode;
  if (codigo) err.codigo = codigo;
  return err;
}

/**
 * Valida e normaliza filtros opcionais de mês e ano para os relatórios (RF12).
 */
function validarPeriodo({ mes, ano } = {}) {
  let mesNum = null;
  let anoNum = null;

  if (mes !== undefined && mes !== null && String(mes).trim() !== '') {
    mesNum = Number(mes);
    if (!Number.isInteger(mesNum) || mesNum < 1 || mesNum > 12) {
      throw criarErroHttp(400, 'O mês informado deve ser um inteiro entre 1 e 12.', 'MES_INVALIDO');
    }
  }

  if (ano !== undefined && ano !== null && String(ano).trim() !== '') {
    anoNum = Number(ano);
    if (!Number.isInteger(anoNum) || anoNum < 2000 || anoNum > 2100) {
      throw criarErroHttp(400, 'O ano informado é inválido.', 'ANO_INVALIDO');
    }
  }

  // Se informar apenas o mês, assume o ano corrente
  if (mesNum && !anoNum) {
    anoNum = new Date().getFullYear();
  }

  return { mes: mesNum, ano: anoNum };
}

/**
 * Escapa um valor para CSV (delimitador ';' — padrão Excel PT-BR) com proteção contra formula injection.
 */
function escaparCelulaCsv(valor) {
  if (valor === null || valor === undefined) return '';
  let texto = String(valor);

  // Evita interpretação de fórmulas no Excel quando o texto começa com =, +, @
  if (/^[=+@]/.test(texto)) {
    texto = `'${texto}`;
  }

  if (/[;"\r\n]/.test(texto)) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

/**
 * Gera string CSV com BOM UTF-8 (\uFEFF) para preservar acentuação ao abrir direto no Excel.
 */
function gerarCsv(cabecalhos, linhas) {
  const cabecalhoLinha = cabecalhos.map(escaparCelulaCsv).join(';');
  const corpoLinhas = linhas.map((linha) => linha.map(escaparCelulaCsv).join(';'));
  return `\uFEFF${[cabecalhoLinha, ...corpoLinhas].join('\r\n')}\r\n`;
}

// =====================================================================
// 1. RELATÓRIO DE LIVROS MAIS LIDOS (RF12)
// =====================================================================

async function gerarRelatorioLivrosMaisLidos({ mes, ano, limite } = {}) {
  const periodo = validarPeriodo({ mes, ano });
  let limiteNum = 20;

  if (limite !== undefined && limite !== null && String(limite).trim() !== '') {
    limiteNum = Number(limite);
    if (!Number.isInteger(limiteNum) || limiteNum < 1 || limiteNum > 500) {
      throw criarErroHttp(400, 'O limite deve ser um inteiro entre 1 e 500.', 'LIMITE_INVALIDO');
    }
  }

  const emprestimos = await relatoriosRepository.listarEmprestimosParaRelatorio(periodo);
  const contagemPorObra = new Map();

  for (const emp of emprestimos) {
    const obra = emp.exemplar?.obra;
    if (!obra) continue;

    if (!contagemPorObra.has(obra.id)) {
      contagemPorObra.set(obra.id, {
        obra_id: obra.id,
        codigo: obra.codigo_livro,
        titulo: obra.titulo,
        autor: obra.autor,
        editora: obra.editora || '',
        tipo: obra.tipoObra ? obra.tipoObra.descricao : 'Não informado',
        categoria: obra.categoria ? obra.categoria.nome : 'Não informada',
        total_emprestimos: 0,
      });
    }

    contagemPorObra.get(obra.id).total_emprestimos += 1;
  }

  const ranking = Array.from(contagemPorObra.values())
    .sort((a, b) => b.total_emprestimos - a.total_emprestimos || a.titulo.localeCompare(b.titulo, 'pt-BR'))
    .slice(0, limiteNum)
    .map((item, idx) => ({ posicao: idx + 1, ...item }));

  return {
    relatorio: 'livros_mais_lidos',
    periodo,
    total_emprestimos_periodo: emprestimos.length,
    dados: ranking,
  };
}

function formatarLivrosMaisLidosCsv(relatorio) {
  const cabecalhos = [
    'Posicao',
    'Codigo Obra',
    'Titulo',
    'Autor',
    'Editora',
    'Tipo',
    'Categoria',
    'Total Emprestimos',
  ];

  const linhas = relatorio.dados.map((item) => [
    item.posicao,
    item.codigo,
    item.titulo,
    item.autor,
    item.editora,
    item.tipo,
    item.categoria,
    item.total_emprestimos,
  ]);

  return gerarCsv(cabecalhos, linhas);
}

// =====================================================================
// 2. RELATÓRIO DE FREQUÊNCIA DE LEITURA POR TURMA (RF12)
// =====================================================================

async function gerarRelatorioFrequenciaTurmas({ mes, ano } = {}) {
  const periodo = validarPeriodo({ mes, ano });

  const [emprestimos, estudantes] = await Promise.all([
    relatoriosRepository.listarEmprestimosParaRelatorio(periodo),
    relatoriosRepository.listarEstudantesPorTurma(),
  ]);

  const mapaTurmas = new Map();

  // Inicializa todas as turmas cadastradas para aparecerem mesmo com 0 empréstimos
  for (const est of estudantes) {
    const turma = est.turma || 'Sem Turma';
    if (!mapaTurmas.has(turma)) {
      mapaTurmas.set(turma, {
        turma,
        total_estudantes_turma: 0,
        total_emprestimos: 0,
        leitoresUnicos: new Set(),
      });
    }
    mapaTurmas.get(turma).total_estudantes_turma += 1;
  }

  for (const emp of emprestimos) {
    const turma = emp.estudante?.turma || 'Sem Turma';
    if (!mapaTurmas.has(turma)) {
      mapaTurmas.set(turma, {
        turma,
        total_estudantes_turma: 0,
        total_emprestimos: 0,
        leitoresUnicos: new Set(),
      });
    }

    const registro = mapaTurmas.get(turma);
    registro.total_emprestimos += 1;
    registro.leitoresUnicos.add(emp.estudante_id);
  }

  const dados = Array.from(mapaTurmas.values())
    .map((item) => {
      const media =
        item.total_estudantes_turma > 0
          ? Number((item.total_emprestimos / item.total_estudantes_turma).toFixed(2))
          : 0;

      return {
        turma: item.turma,
        total_estudantes_turma: item.total_estudantes_turma,
        estudantes_leitores: item.leitoresUnicos.size,
        total_emprestimos: item.total_emprestimos,
        media_emprestimos_por_estudante: media,
      };
    })
    .sort((a, b) => b.total_emprestimos - a.total_emprestimos || a.turma.localeCompare(b.turma, 'pt-BR'));

  return {
    relatorio: 'frequencia_por_turma',
    periodo,
    total_emprestimos_periodo: emprestimos.length,
    dados,
  };
}

function formatarFrequenciaTurmasCsv(relatorio) {
  const cabecalhos = [
    'Turma',
    'Total Estudantes',
    'Estudantes Leitores',
    'Total Emprestimos',
    'Media por Estudante',
  ];

  const linhas = relatorio.dados.map((item) => [
    item.turma,
    item.total_estudantes_turma,
    item.estudantes_leitores,
    item.total_emprestimos,
    String(item.media_emprestimos_por_estudante).replace('.', ','),
  ]);

  return gerarCsv(cabecalhos, linhas);
}

// =====================================================================
// 3. RELATÓRIO DE TAXAS DE ATRASO (RF12)
// =====================================================================

async function gerarRelatorioTaxasAtraso({ mes, ano, turma } = {}) {
  const periodo = validarPeriodo({ mes, ano });
  const agora = new Date();

  const emprestimos = await relatoriosRepository.listarEmprestimosParaRelatorio({
    ...periodo,
    turma,
  });

  let totalComAtraso = 0;
  let totalAtrasosCriticos = 0;
  const mapaTurmas = new Map();

  for (const emp of emprestimos) {
    const turmaNome = emp.estudante?.turma || 'Sem Turma';
    if (!mapaTurmas.has(turmaNome)) {
      mapaTurmas.set(turmaNome, {
        turma: turmaNome,
        total_emprestimos: 0,
        total_no_prazo: 0,
        total_com_atraso: 0,
        total_atrasos_criticos: 0,
      });
    }

    const grupo = mapaTurmas.get(turmaNome);
    grupo.total_emprestimos += 1;

    const dataPrevista = new Date(emp.data_devolucao_prevista);
    const dataReferencia = emp.data_devolucao_realizada
      ? new Date(emp.data_devolucao_realizada)
      : agora;
    const diffMs = dataReferencia.getTime() - dataPrevista.getTime();
    const teveAtraso = diffMs > 0;
    const diasAtraso = teveAtraso ? Math.floor(diffMs / MS_POR_DIA) : 0;

    if (teveAtraso) {
      totalComAtraso += 1;
      grupo.total_com_atraso += 1;

      if (diasAtraso > LIMITE_CRITICO_DIAS) {
        totalAtrasosCriticos += 1;
        grupo.total_atrasos_criticos += 1;
      }
    } else {
      grupo.total_no_prazo += 1;
    }
  }

  const totalEmprestimos = emprestimos.length;
  const totalNoPrazo = totalEmprestimos - totalComAtraso;
  const taxaGeral =
    totalEmprestimos > 0 ? Number(((totalComAtraso / totalEmprestimos) * 100).toFixed(2)) : 0;

  const porTurma = Array.from(mapaTurmas.values())
    .map((grupo) => ({
      ...grupo,
      taxa_atraso_percentual:
        grupo.total_emprestimos > 0
          ? Number(((grupo.total_com_atraso / grupo.total_emprestimos) * 100).toFixed(2))
          : 0,
    }))
    .sort((a, b) => b.taxa_atraso_percentual - a.taxa_atraso_percentual || a.turma.localeCompare(b.turma, 'pt-BR'));

  return {
    relatorio: 'taxas_atraso',
    periodo,
    resumo: {
      total_emprestimos: totalEmprestimos,
      total_no_prazo: totalNoPrazo,
      total_com_atraso: totalComAtraso,
      total_atrasos_criticos: totalAtrasosCriticos,
      taxa_atraso_percentual: taxaGeral,
    },
    por_turma: porTurma,
  };
}

function formatarTaxasAtrasoCsv(relatorio) {
  const cabecalhos = [
    'Turma',
    'Total Emprestimos',
    'No Prazo',
    'Com Atraso',
    'Atrasos Criticos (>10d)',
    'Taxa de Atraso (%)',
  ];

  const linhas = relatorio.por_turma.map((item) => [
    item.turma,
    item.total_emprestimos,
    item.total_no_prazo,
    item.total_com_atraso,
    item.total_atrasos_criticos,
    String(item.taxa_atraso_percentual).replace('.', ','),
  ]);

  linhas.push([
    'TOTAL GERAL',
    relatorio.resumo.total_emprestimos,
    relatorio.resumo.total_no_prazo,
    relatorio.resumo.total_com_atraso,
    relatorio.resumo.total_atrasos_criticos,
    String(relatorio.resumo.taxa_atraso_percentual).replace('.', ','),
  ]);

  return gerarCsv(cabecalhos, linhas);
}

module.exports = {
  gerarRelatorioLivrosMaisLidos,
  formatarLivrosMaisLidosCsv,
  gerarRelatorioFrequenciaTurmas,
  formatarFrequenciaTurmasCsv,
  gerarRelatorioTaxasAtraso,
  formatarTaxasAtrasoCsv,
};
