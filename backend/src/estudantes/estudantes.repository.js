const db = require('../../models');

const { Estudante, Usuario, Emprestimo, Sequelize, sequelize } = db;
const { Op } = Sequelize;

// Nunca retorna o hash da senha nas consultas do Usuario associado
const INCLUDE_USUARIO_SEM_SENHA = {
  model: Usuario,
  as: 'usuario',
  attributes: { exclude: ['senha'] },
  required: false,
};

/**
 * RF03: Lista estudantes com filtros em tempo real por nome, matrícula, turma, status ou busca geral.
 */
async function listarEstudantes({ nome, matricula, turma, status, q } = {}) {
  const where = {};

  if (nome) {
    where.nome_completo = { [Op.iLike]: `%${String(nome).trim()}%` };
  }
  if (matricula) {
    where.matricula = { [Op.iLike]: `%${String(matricula).trim()}%` };
  }
  if (turma) {
    where.turma = { [Op.iLike]: `%${String(turma).trim()}%` };
  }
  if (status) {
    where.status = String(status).trim().toLowerCase();
  }
  if (q) {
    const termo = `%${String(q).trim()}%`;
    where[Op.or] = [
      { nome_completo: { [Op.iLike]: termo } },
      { matricula: { [Op.iLike]: termo } },
      { turma: { [Op.iLike]: termo } },
    ];
  }

  return Estudante.findAll({
    where,
    include: [INCLUDE_USUARIO_SEM_SENHA],
    order: [['nome_completo', 'ASC']],
  });
}

async function buscarEstudantePorId(id, transaction) {
  return Estudante.findByPk(id, {
    include: [INCLUDE_USUARIO_SEM_SENHA],
    transaction,
  });
}

async function buscarEstudantePorMatricula(matricula, transaction) {
  return Estudante.findOne({
    where: { matricula: { [Op.iLike]: String(matricula).trim() } },
    include: [INCLUDE_USUARIO_SEM_SENHA],
    transaction,
  });
}

async function buscarUsuarioPorEmail(email, transaction) {
  return Usuario.findOne({
    where: { email: String(email).trim().toLowerCase() },
    attributes: { exclude: ['senha'] },
    transaction,
  });
}

async function buscarUsuarioPorEstudanteId(estudanteId, transaction) {
  return Usuario.findOne({
    where: { estudante_id: estudanteId },
    transaction,
  });
}

async function criarEstudante(dados, transaction) {
  return Estudante.create(dados, { transaction });
}

async function atualizarEstudante(estudante, dados, transaction) {
  return estudante.update(dados, { transaction });
}

async function criarUsuario(dados, transaction) {
  return Usuario.create(dados, { transaction });
}

async function atualizarUsuario(usuario, dados, transaction) {
  return usuario.update(dados, { transaction });
}

/**
 * Conta empréstimos ainda não devolvidos (ativos ou atrasados) do estudante.
 */
async function contarEmprestimosEmAberto(estudanteId, transaction) {
  return Emprestimo.count({
    where: {
      estudante_id: estudanteId,
      data_devolucao_realizada: null,
    },
    transaction,
  });
}

async function executarTransacao(callback) {
  return sequelize.transaction(callback);
}

module.exports = {
  listarEstudantes,
  buscarEstudantePorId,
  buscarEstudantePorMatricula,
  buscarUsuarioPorEmail,
  buscarUsuarioPorEstudanteId,
  criarEstudante,
  atualizarEstudante,
  criarUsuario,
  atualizarUsuario,
  contarEmprestimosEmAberto,
  executarTransacao,
};
