const env = require('../config/env');

/**
 * Handler global de erros do Express (Handout 03, Código 25).
 * Deve ser registrado como o ÚLTIMO middleware no main.js.
 */
function errorHandler(err, req, res, _next) {
  // Log interno completo para depuração no servidor
  console.error(`[${new Date().toISOString()}]`, err.stack || err.message);

  // Erros de validação do Sequelize -> 400 Bad Request
  if (err.name === 'SequelizeValidationError') {
    const detalhes = (err.errors || []).map((e) => ({
      campo: e.path,
      mensagem: e.message,
    }));
    return res.status(400).json({
      erro: 'Dados inválidos.',
      detalhes,
      codigo: 'VALIDACAO_FALHOU',
    });
  }

  // Violação de unicidade (e-mail, matrícula ou tombo duplicado) -> 409 Conflict
  if (err.name === 'SequelizeUniqueConstraintError') {
    const detalhes = (err.errors || []).map((e) => ({
      campo: e.path,
      mensagem: e.message,
    }));
    return res.status(409).json({
      erro: 'Conflito: registro já cadastrado.',
      detalhes,
      codigo: 'REGISTRO_DUPLICADO',
    });
  }

  // Violação de chave estrangeira -> 409 Conflict
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(409).json({
      erro: 'Operação bloqueada: existem registros vinculados.',
      codigo: 'CONFLITO_RELACIONAMENTO',
    });
  }

  // JSON malformado no corpo da requisição -> 400 Bad Request
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      erro: 'JSON malformado no corpo da requisição.',
      codigo: 'JSON_INVALIDO',
    });
  }

  const status = err.statusCode || err.status || 500;
  const mensagem =
    status < 500
      ? err.message
      : 'Erro interno no servidor. Tente novamente mais tarde.';

  return res.status(status).json({
    erro: mensagem,
    ...(err.detalhes ? { detalhes: err.detalhes } : {}),
    codigo: err.codigo || (status < 500 ? 'ERRO_CLIENTE' : 'ERRO_INTERNO'),
    ...(env.nodeEnv !== 'production' && status >= 500 ? { detalhe_dev: err.message } : {}),
  });
}

module.exports = errorHandler;

