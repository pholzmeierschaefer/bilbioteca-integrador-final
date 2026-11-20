const db = require('../../models');

const { Op } = db.Sequelize;

/**
 * Camada Repository de Auth: abstrai todo o acesso ao Sequelize (PostgreSQL).
 */
async function buscarUsuarioPorEmail(email) {
  return db.Usuario.findOne({ where: { email: String(email).trim().toLowerCase() } });
}

async function buscarUsuarioPorMatricula(matricula) {
  const valor = String(matricula).trim();

  // 1. Busca direta por matricula (ou email) na tabela usuarios
  const direto = await db.Usuario.findOne({
    where: {
      [Op.or]: [
        { matricula: { [Op.iLike]: valor } },
        { email: { [Op.iLike]: valor } },
      ],
    },
    include: [{ model: db.Estudante, as: 'estudante', required: false }],
  });

  if (direto) {
    return direto;
  }

  // 2. Fallback: busca pelo cadastro de Estudante vinculado pela matrícula
  return db.Usuario.findOne({
    include: [
      {
        model: db.Estudante,
        as: 'estudante',
        where: { matricula: { [Op.iLike]: valor } },
        required: true,
      },
    ],
  });
}

async function buscarUsuarioPorIdSemSenha(id) {
  return db.Usuario.findByPk(id, {
    attributes: { exclude: ['senha'] },
    include: [{ model: db.Estudante, as: 'estudante' }],
  });
}

async function contarUsuariosPorRole(role) {
  return db.Usuario.count({ where: { role } });
}

async function criarUsuario(dados, transaction) {
  return db.Usuario.create(dados, { transaction });
}

async function buscarEstudantePorMatricula(matricula, transaction) {
  return db.Estudante.findOne({ where: { matricula }, transaction });
}

async function criarEstudante(dados, transaction) {
  return db.Estudante.create(dados, { transaction });
}

function executarTransacao(callback) {
  return db.sequelize.transaction(callback);
}

module.exports = {
  buscarUsuarioPorEmail,
  buscarUsuarioPorMatricula,
  buscarUsuarioPorIdSemSenha,
  contarUsuariosPorRole,
  criarUsuario,
  buscarEstudantePorMatricula,
  criarEstudante,
  executarTransacao,
};
