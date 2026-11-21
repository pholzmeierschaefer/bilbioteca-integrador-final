const db = require('../../models');

const { Emprestimo, Exemplar, Obra, Estudante, Justificativa, Reserva, Sequelize, sequelize } = db;
const { Op } = Sequelize;

const INCLUDES_EMPRESTIMO_COMPLETO = [
  {
    model: Estudante,
    as: 'estudante',
    attributes: ['id', 'matricula', 'nome_completo', 'turma', 'telefone', 'status'],
  },
  {
    model: Exemplar,
    as: 'exemplar',
    attributes: ['id', 'codigo_exemplar', 'status', 'obra_id'],
    include: [
      {
        model: Obra,
        as: 'obra',
        attributes: ['id', 'codigo_livro', 'titulo', 'autor', 'editora'],
      },
    ],
  },
  {
    model: Justificativa,
    as: 'justificativas',
    attributes: ['id', 'texto_descritivo', 'data_envio', 'status'],
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

async function buscarExemplarPorTombo(tombo, transaction) {
  return Exemplar.findOne({
    where: { codigo_exemplar: { [Op.iLike]: String(tombo).trim() } },
    include: [
      {
        model: Obra,
        as: 'obra',
        attributes: ['id', 'codigo_livro', 'titulo', 'autor', 'editora'],
      },
    ],
    transaction,
  });
}

async function buscarEmprestimoPorId(id, transaction) {
  return Emprestimo.findByPk(id, {
    include: INCLUDES_EMPRESTIMO_COMPLETO,
    order: [[{ model: Justificativa, as: 'justificativas' }, 'data_envio', 'DESC']],
    transaction,
  });
}

async function buscarEmprestimoAtivoPorTombo(tombo, transaction) {
  return Emprestimo.findOne({
    where: { data_devolucao_realizada: null },
    include: [
      {
        model: Estudante,
        as: 'estudante',
        attributes: ['id', 'matricula', 'nome_completo', 'turma', 'telefone', 'status'],
      },
      {
        model: Exemplar,
        as: 'exemplar',
        where: { codigo_exemplar: { [Op.iLike]: String(tombo).trim() } },
        attributes: ['id', 'codigo_exemplar', 'status', 'obra_id'],
        include: [
          {
            model: Obra,
            as: 'obra',
            attributes: ['id', 'codigo_livro', 'titulo', 'autor', 'editora'],
          },
        ],
      },
      {
        model: Justificativa,
        as: 'justificativas',
        attributes: ['id', 'texto_descritivo', 'data_envio', 'status'],
        required: false,
      },
    ],
    transaction,
  });
}

async function listarEmprestimos({
  status,
  estudanteId,
  estudanteMatricula,
  exemplarTombo,
  apenasAtivos,
} = {}) {
  const where = {};

  if (status) {
    where.status = String(status).trim().toLowerCase();
  }
  if (estudanteId) {
    where.estudante_id = estudanteId;
  }
  if (apenasAtivos) {
    where.data_devolucao_realizada = null;
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

  const includeExemplar = {
    model: Exemplar,
    as: 'exemplar',
    attributes: ['id', 'codigo_exemplar', 'status', 'obra_id'],
    required: false,
    include: [
      {
        model: Obra,
        as: 'obra',
        attributes: ['id', 'codigo_livro', 'titulo', 'autor', 'editora'],
      },
    ],
  };
  if (exemplarTombo) {
    includeExemplar.required = true;
    includeExemplar.where = { codigo_exemplar: { [Op.iLike]: String(exemplarTombo).trim() } };
  }

  return Emprestimo.findAll({
    where,
    include: [
      includeEstudante,
      includeExemplar,
      {
        model: Justificativa,
        as: 'justificativas',
        attributes: ['id', 'texto_descritivo', 'data_envio', 'status'],
        required: false,
      },
    ],
    order: [
      ['data_emprestimo', 'DESC'],
      ['id', 'DESC'],
    ],
  });
}

async function contarEmprestimosAtivosDoEstudante(estudanteId, transaction) {
  return Emprestimo.count({
    where: {
      estudante_id: estudanteId,
      data_devolucao_realizada: null,
    },
    transaction,
  });
}

async function contarEmprestimosAtrasadosDoEstudante(
  estudanteId,
  referencia = new Date(),
  excluirEmprestimoId = null,
  transaction
) {
  const where = {
    estudante_id: estudanteId,
    data_devolucao_realizada: null,
    data_devolucao_prevista: { [Op.lt]: referencia },
  };

  if (excluirEmprestimoId) {
    where.id = { [Op.ne]: excluirEmprestimoId };
  }

  return Emprestimo.count({ where, transaction });
}

async function criarEmprestimo(dados, transaction) {
  return Emprestimo.create(dados, { transaction });
}

async function atualizarEmprestimo(emprestimo, dados, transaction) {
  return emprestimo.update(dados, { transaction });
}

async function atualizarExemplar(exemplar, dados, transaction) {
  return exemplar.update(dados, { transaction });
}

async function atualizarEstudante(estudante, dados, transaction) {
  return estudante.update(dados, { transaction });
}

async function criarJustificativa(dados, transaction) {
  return Justificativa.create(dados, { transaction });
}

async function listarJustificativas() {
  return Justificativa.findAll({
    include: [
      {
        model: Estudante,
        as: 'estudante',
        attributes: ['id', 'matricula', 'nome_completo', 'turma', 'telefone'],
      },
      {
        model: Emprestimo,
        as: 'emprestimo',
        attributes: ['id', 'data_devolucao_prevista', 'data_devolucao_realizada', 'status'],
        include: [
          {
            model: Exemplar,
            as: 'exemplar',
            attributes: ['id', 'codigo_exemplar'],
            include: [{ model: Obra, as: 'obra', attributes: ['id', 'codigo_livro', 'titulo'] }],
          },
        ],
      },
    ],
    order: [['data_envio', 'DESC']],
  });
}

async function buscarJustificativaPorId(id) {
  return Justificativa.findByPk(id);
}

async function atualizarJustificativa(justificativa, dados) {
  return justificativa.update(dados);
}

async function excluirEmprestimoComJustificativas(emprestimoId, transaction) {
  await Justificativa.destroy({ where: { emprestimo_id: emprestimoId }, transaction });
  return Emprestimo.destroy({ where: { id: emprestimoId }, transaction });
}

/**
 * Sincroniza empréstimos vencidos (status -> 'atrasado') e bloqueia automaticamente
 * estudantes 'ativo' com títulos vencidos (RN-03 / RF09).
 */
async function sincronizarAtrasos({ estudanteId = null, referencia = new Date() } = {}) {
  return sequelize.transaction(async (transaction) => {
    const whereVencidos = {
      data_devolucao_realizada: null,
      data_devolucao_prevista: { [Op.lt]: referencia },
    };

    if (estudanteId) {
      whereVencidos.estudante_id = estudanteId;
    }

    const vencidos = await Emprestimo.findAll({
      where: whereVencidos,
      attributes: ['id', 'estudante_id', 'status'],
      transaction,
    });

    if (vencidos.length === 0) {
      return { emprestimosMarcadosAtrasados: 0, estudantesBloqueados: 0 };
    }

    const idsParaMarcarAtrasado = vencidos
      .filter((emp) => emp.status !== 'atrasado')
      .map((emp) => emp.id);

    if (idsParaMarcarAtrasado.length > 0) {
      await Emprestimo.update(
        { status: 'atrasado' },
        { where: { id: { [Op.in]: idsParaMarcarAtrasado } }, transaction }
      );
    }

    const idsEstudantesComAtraso = [...new Set(vencidos.map((emp) => emp.estudante_id))];

    const [estudantesBloqueados] = await Estudante.update(
      { status: 'bloqueado' },
      {
        where: {
          id: { [Op.in]: idsEstudantesComAtraso },
          status: 'ativo',
        },
        transaction,
      }
    );

    return {
      emprestimosMarcadosAtrasados: idsParaMarcarAtrasado.length,
      estudantesBloqueados,
    };
  });
}

async function listarEmprestimosAtivosCompletos() {
  return Emprestimo.findAll({
    where: { data_devolucao_realizada: null },
    include: INCLUDES_EMPRESTIMO_COMPLETO,
    order: [['data_devolucao_prevista', 'ASC']],
  });
}

async function contarReservasPorStatus() {
  const [pendentes, aguardandoRetirada] = await Promise.all([
    Reserva.count({ where: { status: 'pendente' } }),
    Reserva.count({ where: { status: 'aguardando_retirada' } }),
  ]);
  return { pendentes, aguardandoRetirada };
}

async function executarTransacao(callback) {
  return sequelize.transaction(callback);
}

module.exports = {
  buscarEstudantePorId,
  buscarEstudantePorMatricula,
  buscarExemplarPorTombo,
  buscarEmprestimoPorId,
  buscarEmprestimoAtivoPorTombo,
  listarEmprestimos,
  contarEmprestimosAtivosDoEstudante,
  contarEmprestimosAtrasadosDoEstudante,
  criarEmprestimo,
  atualizarEmprestimo,
  atualizarExemplar,
  atualizarEstudante,
  criarJustificativa,
  listarJustificativas,
  buscarJustificativaPorId,
  atualizarJustificativa,
  excluirEmprestimoComJustificativas,
  sincronizarAtrasos,
  listarEmprestimosAtivosCompletos,
  contarReservasPorStatus,
  executarTransacao,
};
