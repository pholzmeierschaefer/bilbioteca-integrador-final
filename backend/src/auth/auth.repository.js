const db = require('../../models');

/**
 * Camada Repository de Auth: abstrai todo o acesso ao Sequelize (PostgreSQL).
 */
async function buscarUsuarioPorEmail(email) {
  return db.Usuario.findOne({ where: { email } });
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
  buscarUsuarioPorIdSemSenha,
  contarUsuariosPorRole,
  criarUsuario,
  buscarEstudantePorMatricula,
  criarEstudante,
  executarTransacao,
};
