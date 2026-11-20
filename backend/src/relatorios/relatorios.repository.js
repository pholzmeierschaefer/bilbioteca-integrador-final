const db = require('../../models');

const { Emprestimo, Exemplar, Obra, TipoObra, Categoria, Estudante, Sequelize } = db;
const { Op } = Sequelize;

/**
 * Monta filtro de período (mes e/ou ano) sobre data_emprestimo.
 */
function montarFiltroPeriodo({ mes, ano } = {}) {
  const where = {};

  if (ano && mes) {
    const inicio = new Date(ano, mes - 1, 1, 0, 0, 0, 0);
    const fim = new Date(ano, mes, 0, 23, 59, 59, 999);
    where.data_emprestimo = { [Op.between]: [inicio, fim] };
  } else if (ano) {
    const inicio = new Date(ano, 0, 1, 0, 0, 0, 0);
    const fim = new Date(ano, 11, 31, 23, 59, 59, 999);
    where.data_emprestimo = { [Op.between]: [inicio, fim] };
  }

  return where;
}

/**
 * Busca empréstimos do período com Obra, TipoObra, Categoria e Estudante
 * para agregação limpa dos relatórios gerenciais (RF12).
 */
async function listarEmprestimosParaRelatorio({ mes, ano, turma } = {}) {
  const whereEmprestimo = montarFiltroPeriodo({ mes, ano });

  const includeEstudante = {
    model: Estudante,
    as: 'estudante',
    attributes: ['id', 'matricula', 'nome_completo', 'turma', 'status'],
    required: true,
  };

  if (turma) {
    includeEstudante.where = { turma: { [Op.iLike]: `%${String(turma).trim()}%` } };
  }

  return Emprestimo.findAll({
    where: whereEmprestimo,
    attributes: [
      'id',
      'estudante_id',
      'exemplar_id',
      'data_emprestimo',
      'data_devolucao_prevista',
      'data_devolucao_realizada',
      'renovacoes',
      'status',
    ],
    include: [
      includeEstudante,
      {
        model: Exemplar,
        as: 'exemplar',
        attributes: ['id', 'codigo_exemplar', 'obra_id'],
        required: true,
        include: [
          {
            model: Obra,
            as: 'obra',
            attributes: ['id', 'codigo_livro', 'titulo', 'autor', 'editora'],
            required: true,
            include: [
              { model: TipoObra, as: 'tipoObra', attributes: ['id', 'descricao'], required: false },
              { model: Categoria, as: 'categoria', attributes: ['id', 'nome'], required: false },
            ],
          },
        ],
      },
    ],
    order: [['data_emprestimo', 'DESC']],
  });
}

/**
 * Lista todos os estudantes ativos/bloqueados para calcular o total de alunos por turma.
 */
async function listarEstudantesPorTurma() {
  return Estudante.findAll({
    where: { status: { [Op.ne]: 'inativo' } },
    attributes: ['id', 'turma'],
  });
}

module.exports = {
  listarEmprestimosParaRelatorio,
  listarEstudantesPorTurma,
};
