const db = require('../../models');

const { Obra, Exemplar, TipoObra, Categoria, Emprestimo, Reserva, Sequelize, sequelize } = db;
const { Op } = Sequelize;

/**
 * Gera um código curto, sem acentos e em maiúsculas para TipoObra/Categoria
 * quando o usuário informa uma nova classificação por texto.
 */
function gerarCodigoClassificacao(texto) {
  const base = String(texto)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 16);

  return base || 'GERAL';
}

/**
 * Busca um TipoObra por ID, código ou descrição (case-insensitive).
 * Se informado por texto e ainda não existir, cria automaticamente.
 */
async function buscarOuCriarTipoObra(valor, transaction) {
  if (valor === undefined || valor === null || String(valor).trim() === '') {
    return null;
  }

  // Se vier um ID numérico (ex: tipo_obra_id)
  if (typeof valor === 'number' || /^\d+$/.test(String(valor).trim())) {
    return TipoObra.findByPk(Number(valor), { transaction });
  }

  const texto = String(valor).trim();
  const existente = await TipoObra.findOne({
    where: {
      [Op.or]: [
        { descricao: { [Op.iLike]: texto } },
        { codigo: { [Op.iLike]: texto } },
      ],
    },
    transaction,
  });

  if (existente) {
    return existente;
  }

  const codigoBase = gerarCodigoClassificacao(texto);
  let codigoFinal = codigoBase;
  let sufixo = 2;

  while (await TipoObra.findOne({ where: { codigo: codigoFinal }, transaction })) {
    codigoFinal = `${codigoBase.slice(0, 16)}_${sufixo}`;
    sufixo += 1;
  }

  return TipoObra.create({ codigo: codigoFinal, descricao: texto }, { transaction });
}

/**
 * Busca uma Categoria por ID, código ou nome (case-insensitive).
 * Se informada por texto e ainda não existir, cria automaticamente.
 */
async function buscarOuCriarCategoria(valor, transaction) {
  if (valor === undefined || valor === null || String(valor).trim() === '') {
    return null;
  }

  if (typeof valor === 'number' || /^\d+$/.test(String(valor).trim())) {
    return Categoria.findByPk(Number(valor), { transaction });
  }

  const texto = String(valor).trim();
  const existente = await Categoria.findOne({
    where: {
      [Op.or]: [
        { nome: { [Op.iLike]: texto } },
        { codigo: { [Op.iLike]: texto } },
      ],
    },
    transaction,
  });

  if (existente) {
    return existente;
  }

  const codigoBase = gerarCodigoClassificacao(texto);
  let codigoFinal = codigoBase;
  let sufixo = 2;

  while (await Categoria.findOne({ where: { codigo: codigoFinal }, transaction })) {
    codigoFinal = `${codigoBase.slice(0, 16)}_${sufixo}`;
    sufixo += 1;
  }

  return Categoria.create({ codigo: codigoFinal, nome: texto }, { transaction });
}

/**
 * RF10: Lista e filtra obras do acervo por título, autor, código, tipo ou categoria/gênero,
 * incluindo seus exemplares para cálculo de disponibilidade em tempo real.
 */
async function listarObras({ titulo, autor, tipo, categoria, codigo, q } = {}) {
  const whereObra = {};

  if (titulo) {
    whereObra.titulo = { [Op.iLike]: `%${String(titulo).trim()}%` };
  }
  if (autor) {
    whereObra.autor = { [Op.iLike]: `%${String(autor).trim()}%` };
  }
  if (codigo) {
    whereObra.codigo_livro = { [Op.iLike]: `%${String(codigo).trim()}%` };
  }
  if (q) {
    const termo = `%${String(q).trim()}%`;
    whereObra[Op.or] = [
      { titulo: { [Op.iLike]: termo } },
      { autor: { [Op.iLike]: termo } },
      { codigo_livro: { [Op.iLike]: termo } },
    ];
  }

  const includeTipo = {
    model: TipoObra,
    as: 'tipoObra',
    attributes: ['id', 'codigo', 'descricao'],
    required: false,
  };

  if (tipo) {
    const valorTipo = String(tipo).trim();
    includeTipo.required = true;
    includeTipo.where = /^\d+$/.test(valorTipo)
      ? { id: Number(valorTipo) }
      : {
          [Op.or]: [
            { descricao: { [Op.iLike]: `%${valorTipo}%` } },
            { codigo: { [Op.iLike]: `%${valorTipo}%` } },
          ],
        };
  }

  const includeCategoria = {
    model: Categoria,
    as: 'categoria',
    attributes: ['id', 'codigo', 'nome'],
    required: false,
  };

  if (categoria) {
    const valorCategoria = String(categoria).trim();
    includeCategoria.required = true;
    includeCategoria.where = /^\d+$/.test(valorCategoria)
      ? { id: Number(valorCategoria) }
      : {
          [Op.or]: [
            { nome: { [Op.iLike]: `%${valorCategoria}%` } },
            { codigo: { [Op.iLike]: `%${valorCategoria}%` } },
          ],
        };
  }

  return Obra.findAll({
    where: whereObra,
    include: [
      includeTipo,
      includeCategoria,
      {
        model: Exemplar,
        as: 'exemplares',
        attributes: ['id', 'codigo_exemplar', 'status', 'obra_id', 'created_at', 'updated_at'],
        required: false,
      },
    ],
    order: [
      ['titulo', 'ASC'],
      [{ model: Exemplar, as: 'exemplares' }, 'codigo_exemplar', 'ASC'],
    ],
  });
}

async function buscarObraPorId(id, transaction) {
  return Obra.findByPk(id, {
    include: [
      { model: TipoObra, as: 'tipoObra', attributes: ['id', 'codigo', 'descricao'] },
      { model: Categoria, as: 'categoria', attributes: ['id', 'codigo', 'nome'] },
      {
        model: Exemplar,
        as: 'exemplares',
        attributes: ['id', 'codigo_exemplar', 'status', 'obra_id', 'created_at', 'updated_at'],
      },
    ],
    order: [[{ model: Exemplar, as: 'exemplares' }, 'codigo_exemplar', 'ASC']],
    transaction,
  });
}

async function buscarObraPorCodigo(codigoLivro, transaction) {
  return Obra.findOne({
    where: { codigo_livro: { [Op.iLike]: String(codigoLivro).trim() } },
    include: [
      { model: TipoObra, as: 'tipoObra', attributes: ['id', 'codigo', 'descricao'] },
      { model: Categoria, as: 'categoria', attributes: ['id', 'codigo', 'nome'] },
      {
        model: Exemplar,
        as: 'exemplares',
        attributes: ['id', 'codigo_exemplar', 'status', 'obra_id', 'created_at', 'updated_at'],
      },
    ],
    order: [[{ model: Exemplar, as: 'exemplares' }, 'codigo_exemplar', 'ASC']],
    transaction,
  });
}

async function criarObra(dados, transaction) {
  return Obra.create(dados, { transaction });
}

async function atualizarObra(obra, dados, transaction) {
  return obra.update(dados, { transaction });
}

async function contarHistoricoObra(obraId) {
  const [totalEmprestimos, totalReservas] = await Promise.all([
    Emprestimo.count({
      include: [
        {
          model: Exemplar,
          as: 'exemplar',
          where: { obra_id: obraId },
          attributes: [],
        },
      ],
    }),
    Reserva.count({ where: { obra_id: obraId } }),
  ]);

  return { totalEmprestimos, totalReservas };
}

async function excluirObraComExemplares(obraId, transaction) {
  await Exemplar.destroy({ where: { obra_id: obraId }, transaction });
  return Obra.destroy({ where: { id: obraId }, transaction });
}

// --- Queries de Exemplares (RF02 e RN-06) ---

async function listarExemplaresPorObra(obraId, statusDb) {
  const where = { obra_id: obraId };
  if (statusDb) {
    where.status = statusDb;
  }

  return Exemplar.findAll({
    where,
    order: [['codigo_exemplar', 'ASC']],
  });
}

async function buscarExemplarPorTombo(codigoTombo, transaction) {
  return Exemplar.findOne({
    where: { codigo_exemplar: { [Op.iLike]: String(codigoTombo).trim() } },
    include: [
      {
        model: Obra,
        as: 'obra',
        attributes: ['id', 'codigo_livro', 'titulo', 'autor', 'editora'],
        include: [
          { model: TipoObra, as: 'tipoObra', attributes: ['id', 'codigo', 'descricao'] },
          { model: Categoria, as: 'categoria', attributes: ['id', 'codigo', 'nome'] },
        ],
      },
    ],
    transaction,
  });
}

async function criarExemplar(dados, transaction) {
  return Exemplar.create(dados, { transaction });
}

async function atualizarExemplar(exemplar, dados, transaction) {
  return exemplar.update(dados, { transaction });
}

async function contarHistoricoExemplar(exemplarId) {
  const [totalEmprestimos, totalReservas] = await Promise.all([
    Emprestimo.count({ where: { exemplar_id: exemplarId } }),
    Reserva.count({ where: { exemplar_id: exemplarId } }),
  ]);

  return { totalEmprestimos, totalReservas };
}

async function excluirExemplar(exemplar, transaction) {
  return exemplar.destroy({ transaction });
}

async function executarTransacao(callback) {
  return sequelize.transaction(callback);
}

module.exports = {
  buscarOuCriarTipoObra,
  buscarOuCriarCategoria,
  listarObras,
  buscarObraPorId,
  buscarObraPorCodigo,
  criarObra,
  atualizarObra,
  contarHistoricoObra,
  excluirObraComExemplares,
  listarExemplaresPorObra,
  buscarExemplarPorTombo,
  criarExemplar,
  atualizarExemplar,
  contarHistoricoExemplar,
  excluirExemplar,
  executarTransacao,
};
