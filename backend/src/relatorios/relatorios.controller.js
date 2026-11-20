const relatoriosService = require('./relatorios.service');

/**
 * Camada Controller de Relatórios Gerenciais (RF12):
 * Retorna JSON por padrão ou CSV para download direto quando ?formato=csv.
 */

function deveExportarCsv(query) {
  return String(query?.formato || '').trim().toLowerCase() === 'csv';
}

function enviarRespostaCsv(res, nomeArquivo, conteudoCsv) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}"`);
  return res.status(200).send(conteudoCsv);
}

async function livrosMaisLidos(req, res, next) {
  try {
    const relatorio = await relatoriosService.gerarRelatorioLivrosMaisLidos(req.query);

    if (deveExportarCsv(req.query)) {
      const csv = relatoriosService.formatarLivrosMaisLidosCsv(relatorio);
      return enviarRespostaCsv(res, 'livros-mais-lidos.csv', csv);
    }

    return res.status(200).json(relatorio);
  } catch (err) {
    return next(err);
  }
}

async function frequenciaTurmas(req, res, next) {
  try {
    const relatorio = await relatoriosService.gerarRelatorioFrequenciaTurmas(req.query);

    if (deveExportarCsv(req.query)) {
      const csv = relatoriosService.formatarFrequenciaTurmasCsv(relatorio);
      return enviarRespostaCsv(res, 'frequencia-por-turma.csv', csv);
    }

    return res.status(200).json(relatorio);
  } catch (err) {
    return next(err);
  }
}

async function taxasAtraso(req, res, next) {
  try {
    const relatorio = await relatoriosService.gerarRelatorioTaxasAtraso(req.query);

    if (deveExportarCsv(req.query)) {
      const csv = relatoriosService.formatarTaxasAtrasoCsv(relatorio);
      return enviarRespostaCsv(res, 'taxas-de-atraso.csv', csv);
    }

    return res.status(200).json(relatorio);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  livrosMaisLidos,
  frequenciaTurmas,
  taxasAtraso,
};
