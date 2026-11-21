const db = require('../../models');

const { Reserva, Obra, Exemplar, Estudante, Emprestimo, Sequelize, sequelize } = db;
const { Op } = Sequelize;

const INCLUDES_RESERVA_COMPLETA = [
  {
    model: Estudante,
    as: 'estudante',
    attributes: ['id', 'matricula', 'nome_completo', 'turma', 'telefone', 'status'],
  },
  {
    model: Obra,
    as: 'obra',
    attributes: ['id', 'codigo_livro', 'titulo', 'autor', 'editora'],
  },
  {
    model: Exemplar,
    as: 'exemplar',
    attributes: ['id', 'codigo_exemplar', 'status'],
    required: false,
  },
];

async function buscarEstudantePorId(id, transaction) {
  return Estudante.findByPk(id, { transaction });
}

async function buscarEstudantePorMatricula(matricula, transaction) {
  return Estudante.findOne({
    where: { matricula: { [Op.iLike]: String(matricula).trim() } },
    transaction,
  });
}

async function buscarObraPorCodigoOuId(identificador, transaction) {
  const valor = String(identificador).trim();
  let obra = await Obra.findOne({
    where: { codigo_livro: { [Op.iLike]: valor } },
    include: [{ model: Exemplar, as: 'exemplares', attributes: ['id', 'codigo_exemplar', 'status'] }],
    transaction,
  });

  if (!obra && /^\d+$/.test(valor)) {
    obra = await Obra.findByPk(Number(valor), {
      include: [{ model: Exemplar, as: 'exemplares', attributes: ['id', 'codigo_exemplar', 'status'] }],
      transaction,
    });
  }

  return obra;
}

/**
 * Conta empréstimos em atraso (não devolvidos e com data prevista já vencida) do estudante (RN-03).
 */
async function contarEmprestimosAtrasadosDoEstudante(estudanteId, referencia = new Date(), transaction) {
  return Emprestimo.count({
    where: {
      estudante_id: estudanteId,
      data_devolucao_realizada: null,
      data_devolucao_prevista: { [Op.lt]: referencia },
    },
    transaction,
  });
}

async function buscarEmprestimoAtivoDaObraPeloEstudante(estudanteId, obraId, transaction) {
  return Emprestimo.findOne({
    where: {
      estudante_id: estudanteId,
      data_devolucao_realizada: null,
    },
    include: [
      {
        model: Exemplar,
        as: 'exemplar',
        where: { obra_id: obraId },
        attributes: ['id', 'codigo_exemplar', 'obra_id'],
      },
    ],
    transaction,
  });
}

async function buscarReservaAtivaDoEstudanteNaObra(estudanteId, obraId, transaction) {
  return Reserva.findOne({
    where: {
      estudante_id: estudanteId,
      obra_id: obraId,
      status: { [Op.in]: ['pendente', 'aguardando_retirada'] },
    },
    transaction,
  });
}

async function criarReserva(dados, transaction) {
  return Reserva.create(dados, { transaction });
}

async function buscarReservaPorId(id, transaction) {
  return Reserva.findByPk(id, {
    include: INCLUDES_RESERVA_COMPLETA,
    transaction,
  });
}

/**
 * RF08: Lista reservas ordenadas por ordem de chegada (FIFO: created_at ASC, id ASC).
 */
async function listarReservas({ status, estudanteId, estudanteMatricula, obraCodigo } = {}) {
  const where = {};

  if (status) {
    where.status = String(status).trim().toLowerCase();
  }
  if (estudanteId) {
    where.estudante_id = estudanteId;
  }

  const includeEstudante = {
    model: Estudante,
    as: 'estudante',
    attributes: ['id', 'matricula', 'nome_completo', 'turma', 'telefone', 'status'],
    required: false,
  };
  if (estudanteMatricula) {
    includeEstudante.required = true;
    includeEstudante.where = { matricula: { [Op.iLike]: String(estudanteMatricula).trim() } };
  }

  const includeObra = {
    model: Obra,
    as: 'obra',
    attributes: ['id', 'codigo_livro', 'titulo', 'autor', 'editora'],
    required: false,
  };
  if (obraCodigo) {
    includeObra.required = true;
    includeObra.where = { codigo_livro: { [Op.iLike]: String(obraCodigo).trim() } };
  }

  return Reserva.findAll({
    where,
    include: [
      includeEstudante,
      includeObra,
      {
        model: Exemplar,
        as: 'exemplar',
        attributes: ['id', 'codigo_exemplar', 'status'],
        required: false,
      },
    ],
    order: [
      ['created_at', 'ASC'],
      ['id', 'ASC'],
    ],
  });
}

/**
 * RN-05: Busca a primeira reserva pendente na fila FIFO de uma obra.
 */
async function buscarProximaReservaPendente(obraId, transaction) {
  return Reserva.findOne({
    where: {
      obra_id: obraId,
      status: 'pendente',
    },
    include: INCLUDES_RESERVA_COMPLETA,
    order: [
      ['created_at', 'ASC'],
      ['id', 'ASC'],
    ],
    transaction,
  });
}

/**
 * RN-05: Busca a reserva em status 'aguardando_retirada' vinculada a um exemplar ou obra.
 */
async function buscarReservaAguardandoRetirada(obraId, exemplarId, transaction) {
  const reservaPorExemplar = await Reserva.findOne({
    where: {
      obra_id: obraId,
      exemplar_id: exemplarId,
      status: 'aguardando_retirada',
    },
    include: INCLUDES_RESERVA_COMPLETA,
    order: [
      ['created_at', 'ASC'],
      ['id', 'ASC'],
    ],
    transaction,
  });

  if (reservaPorExemplar) {
    return reservaPorExemplar;
  }

  return Reserva.findOne({
    where: {
      obra_id: obraId,
      status: 'aguardando_retirada',
    },
    include: INCLUDES_RESERVA_COMPLETA,
    order: [
      ['created_at', 'ASC'],
      ['id', 'ASC'],
    ],
    transaction,
  });
}

async function contarReservasPendentesDaObra(obraId, transaction) {
  return Reserva.count({
    where: {
      obra_id: obraId,
      status: 'pendente',
    },
    transaction,
  });
}

async function atualizarReserva(reserva, dados, transaction) {
  return reserva.update(dados, { transaction });
}

async function excluirReserva(reserva, transaction) {
  return reserva.destroy({ transaction });
}

async function buscarExemplarPorId(exemplarId, transaction) {
  return Exemplar.findByPk(exemplarId, { transaction });
}

async function atualizarExemplar(exemplar, dados, transaction) {
  return exemplar.update(dados, { transaction });
}

async function executarTransacao(callback) {
  return sequelize.transaction(callback);
}

module.exports = {
  buscarEstudantePorId,
  buscarEstudantePorMatricula,
  buscarObraPorCodigoOuId,
  contarEmprestimosAtrasadosDoEstudante,
  buscarEmprestimoAtivoDaObraPeloEstudante,
  buscarReservaAtivaDoEstudanteNaObra,
  criarReserva,
  buscarReservaPorId,
  listarReservas,
  buscarProximaReservaPendente,
  buscarReservaAguardandoRetirada,
  contarReservasPendentesDaObra,
  atualizarReserva,
  excluirReserva,
  buscarExemplarPorId,
  atualizarExemplar,
  executarTransacao,
};
