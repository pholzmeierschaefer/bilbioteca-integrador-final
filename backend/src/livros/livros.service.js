const livrosRepository = require('./livros.repository');

// Mapeamento bidirecional entre os nomes de status da API (RF02) e o ENUM do banco (Fase 1)
const STATUS_API_PARA_DB = {
  disponivel: 'disponivel',
  emprestado: 'emprestado',
  inativo: 'inativo_extraviado',
  inativo_extraviado: 'inativo_extraviado',
  retido_reserva: 'reservado',
  reservado: 'reservado',
};

const STATUS_DB_PARA_API = {
  disponivel: 'disponivel',
  emprestado: 'emprestado',
  inativo_extraviado: 'inativo',
  reservado: 'retido_reserva',
};

const STATUS_VALIDOS_API = ['disponivel', 'emprestado', 'inativo', 'retido_reserva'];

function criarErroHttp(statusCode, mensagem, codigo) {
  const err = new Error(mensagem);
  err.statusCode = statusCode;
  if (codigo) err.codigo = codigo;
  return err;
}

function normalizarStatusParaDb(status) {
  if (!status) return null;
  const chave = String(status).trim().toLowerCase();
  return STATUS_API_PARA_DB[chave] || null;
}

function formatarStatusParaApi(statusDb) {
  return STATUS_DB_PARA_API[statusDb] || statusDb;
}

function formatarExemplar(exemplar) {
  const item = {
    id: exemplar.id,
    codigo_tombo: exemplar.codigo_exemplar,
    obra_id: exemplar.obra_id,
    status: formatarStatusParaApi(exemplar.status),
    created_at: exemplar.created_at,
    updated_at: exemplar.updated_at,
  };

  if (exemplar.obra) {
    item.obra = {
      id: exemplar.obra.id,
      codigo: exemplar.obra.codigo_livro,
      titulo: exemplar.obra.titulo,
      autor: exemplar.obra.autor,
      editora: exemplar.obra.editora,
      tipo: exemplar.obra.tipoObra ? exemplar.obra.tipoObra.descricao : null,
      categoria: exemplar.obra.categoria ? exemplar.obra.categoria.nome : null,
    };
  }

  return item;
}

/**
 * Formata uma obra com contagens em tempo real de exemplares ativos e disponíveis (RF10).
 */
function formatarObra(obra, { incluirExemplares = false } = {}) {
  const exemplares = Array.isArray(obra.exemplares) ? obra.exemplares : [];

  let exemplaresDisponiveis = 0;
  let exemplaresEmprestados = 0;
  let exemplaresRetidosReserva = 0;
  let exemplaresInativos = 0;

  for (const ex of exemplares) {
    if (ex.status === 'disponivel') exemplaresDisponiveis += 1;
    else if (ex.status === 'emprestado') exemplaresEmprestados += 1;
    else if (ex.status === 'reservado') exemplaresRetidosReserva += 1;
    else if (ex.status === 'inativo_extraviado') exemplaresInativos += 1;
  }

  const totalExemplaresAtivos =
    exemplaresDisponiveis + exemplaresEmprestados + exemplaresRetidosReserva;

  const resultado = {
    id: obra.id,
    codigo: obra.codigo_livro,
    titulo: obra.titulo,
    autor: obra.autor,
    editora: obra.editora,
    ano_publicacao: obra.ano_publicacao,
    tipo: obra.tipoObra ? obra.tipoObra.descricao : null,
    categoria: obra.categoria ? obra.categoria.nome : null,
    total_exemplares_ativos: totalExemplaresAtivos,
    exemplares_disponiveis: exemplaresDisponiveis,
    disponivel_para_emprestimo: exemplaresDisponiveis > 0,
    resumo_exemplares: {
      disponiveis: exemplaresDisponiveis,
      emprestados: exemplaresEmprestados,
      retidos_reserva: exemplaresRetidosReserva,
      inativos: exemplaresInativos,
    },
    created_at: obra.created_at,
    updated_at: obra.updated_at,
  };

  if (incluirExemplares) {
    resultado.exemplares = exemplares.map(formatarExemplar);
  }

  return resultado;
}

/**
 * Localiza uma obra aceitando tanto o código do livro quanto o ID numérico.
 */
async function localizarObraPorCodigoOuId(identificador, transaction) {
  const valor = String(identificador).trim();

  // Tenta primeiro por código do livro; se for numérico e não achar, busca por ID
  let obra = await livrosRepository.buscarObraPorCodigo(valor, transaction);
  if (!obra && /^\d+$/.test(valor)) {
    obra = await livrosRepository.buscarObraPorId(Number(valor), transaction);
  }

  return obra;
}

// =====================================================================
// SERVIÇOS DE OBRAS (RF01 e RF10)
// =====================================================================

async function listarObras(filtros = {}) {
  const obras = await livrosRepository.listarObras({
    titulo: filtros.titulo,
    autor: filtros.autor,
    tipo: filtros.tipo,
    categoria: filtros.categoria || filtros.genero,
    codigo: filtros.codigo,
    q: filtros.q || filtros.busca,
  });

  return obras.map((obra) => formatarObra(obra));
}

async function buscarObraPorId(idOuCodigo) {
  const obra = await localizarObraPorCodigoOuId(idOuCodigo);
  if (!obra) {
    throw criarErroHttp(404, 'Obra não encontrada.', 'OBRA_NAO_ENCONTRADA');
  }

  return formatarObra(obra, { incluirExemplares: true });
}

async function criarObra(dados) {
  const codigoLimpo = String(dados.codigo || dados.codigo_livro).trim();
  const existente = await livrosRepository.buscarObraPorCodigo(codigoLimpo);

  if (existente) {
    throw criarErroHttp(
      409,
      `Já existe uma obra cadastrada com o código "${codigoLimpo}".`,
      'CODIGO_OBRA_DUPLICADO'
    );
  }

  const obraCriada = await livrosRepository.executarTransacao(async (transaction) => {
    const tipoObra = await livrosRepository.buscarOuCriarTipoObra(
      dados.tipo_obra_id ?? dados.tipo,
      transaction
    );
    const categoria = await livrosRepository.buscarOuCriarCategoria(
      dados.categoria_id ?? dados.categoria,
      transaction
    );

    if ((dados.tipo_obra_id || dados.tipo) && !tipoObra) {
      throw criarErroHttp(404, 'Tipo de obra informado não encontrado.', 'TIPO_OBRA_NAO_ENCONTRADO');
    }
    if ((dados.categoria_id || dados.categoria) && !categoria) {
      throw criarErroHttp(404, 'Categoria informada não encontrada.', 'CATEGORIA_NAO_ENCONTRADA');
    }

    const novaObra = await livrosRepository.criarObra(
      {
        codigo_livro: codigoLimpo,
        titulo: String(dados.titulo).trim(),
        autor: String(dados.autor).trim(),
        editora: dados.editora ? String(dados.editora).trim() : null,
        ano_publicacao:
          dados.ano_publicacao !== undefined && dados.ano_publicacao !== null && dados.ano_publicacao !== ''
            ? Number(dados.ano_publicacao)
            : null,
        tipo_obra_id: tipoObra ? tipoObra.id : null,
        categoria_id: categoria ? categoria.id : null,
      },
      transaction
    );

    return livrosRepository.buscarObraPorId(novaObra.id, transaction);
  });

  return formatarObra(obraCriada, { incluirExemplares: true });
}

async function editarObra(idOuCodigo, dados) {
  const obra = await localizarObraPorCodigoOuId(idOuCodigo);
  if (!obra) {
    throw criarErroHttp(404, 'Obra não encontrada.', 'OBRA_NAO_ENCONTRADA');
  }

  const novoCodigo = dados.codigo ?? dados.codigo_livro;
  if (novoCodigo !== undefined) {
    const codigoLimpo = String(novoCodigo).trim();
    if (codigoLimpo.toLowerCase() !== obra.codigo_livro.toLowerCase()) {
      const duplicada = await livrosRepository.buscarObraPorCodigo(codigoLimpo);
      if (duplicada && duplicada.id !== obra.id) {
        throw criarErroHttp(
          409,
          `Já existe outra obra cadastrada com o código "${codigoLimpo}".`,
          'CODIGO_OBRA_DUPLICADO'
        );
      }
    }
  }

  const obraAtualizada = await livrosRepository.executarTransacao(async (transaction) => {
    const camposAtualizados = {};

    if (novoCodigo !== undefined) camposAtualizados.codigo_livro = String(novoCodigo).trim();
    if (dados.titulo !== undefined) camposAtualizados.titulo = String(dados.titulo).trim();
    if (dados.autor !== undefined) camposAtualizados.autor = String(dados.autor).trim();
    if (dados.editora !== undefined) {
      camposAtualizados.editora = dados.editora ? String(dados.editora).trim() : null;
    }
    if (dados.ano_publicacao !== undefined) {
      camposAtualizados.ano_publicacao =
        dados.ano_publicacao === null || dados.ano_publicacao === ''
          ? null
          : Number(dados.ano_publicacao);
    }

    if (dados.tipo !== undefined || dados.tipo_obra_id !== undefined) {
      const valorTipo = dados.tipo_obra_id ?? dados.tipo;
      if (valorTipo === null || String(valorTipo).trim() === '') {
        camposAtualizados.tipo_obra_id = null;
      } else {
        const tipoObra = await livrosRepository.buscarOuCriarTipoObra(valorTipo, transaction);
        if (!tipoObra) {
          throw criarErroHttp(404, 'Tipo de obra informado não encontrado.', 'TIPO_OBRA_NAO_ENCONTRADO');
        }
        camposAtualizados.tipo_obra_id = tipoObra.id;
      }
    }

    if (dados.categoria !== undefined || dados.categoria_id !== undefined) {
      const valorCategoria = dados.categoria_id ?? dados.categoria;
      if (valorCategoria === null || String(valorCategoria).trim() === '') {
        camposAtualizados.categoria_id = null;
      } else {
        const categoria = await livrosRepository.buscarOuCriarCategoria(valorCategoria, transaction);
        if (!categoria) {
          throw criarErroHttp(404, 'Categoria informada não encontrada.', 'CATEGORIA_NAO_ENCONTRADA');
        }
        camposAtualizados.categoria_id = categoria.id;
      }
    }

    await livrosRepository.atualizarObra(obra, camposAtualizados, transaction);
    return livrosRepository.buscarObraPorId(obra.id, transaction);
  });

  return formatarObra(obraAtualizada, { incluirExemplares: true });
}

async function excluirObra(idOuCodigo) {
  const obra = await localizarObraPorCodigoOuId(idOuCodigo);
  if (!obra) {
    throw criarErroHttp(404, 'Obra não encontrada.', 'OBRA_NAO_ENCONTRADA');
  }

  const exemplares = obra.exemplares || [];
  const possuiEmprestado = exemplares.some((ex) => ex.status === 'emprestado');
  if (possuiEmprestado) {
    throw criarErroHttp(
      409,
      'Não é possível excluir a obra porque existem exemplares emprestados.',
      'OBRA_COM_EXEMPLAR_EMPRESTADO'
    );
  }

  const possuiRetidoReserva = exemplares.some((ex) => ex.status === 'reservado');
  if (possuiRetidoReserva) {
    throw criarErroHttp(
      409,
      'Não é possível excluir a obra porque existem exemplares retidos para reserva.',
      'OBRA_COM_EXEMPLAR_RESERVADO'
    );
  }

  const { totalEmprestimos, totalReservas } = await livrosRepository.contarHistoricoObra(obra.id);
  if (totalEmprestimos > 0 || totalReservas > 0) {
    throw criarErroHttp(
      409,
      'Não é possível excluir a obra pois há histórico de empréstimos ou reservas vinculado. Inative os exemplares para preservar o histórico.',
      'OBRA_COM_HISTORICO'
    );
  }

  await livrosRepository.executarTransacao(async (transaction) => {
    await livrosRepository.excluirObraComExemplares(obra.id, transaction);
  });
}

// =====================================================================
// SERVIÇOS DE EXEMPLARES FÍSICOS (RF02 e RN-06)
// =====================================================================

async function listarExemplaresDaObra(codigoOuId, filtroStatus) {
  const obra = await localizarObraPorCodigoOuId(codigoOuId);
  if (!obra) {
    throw criarErroHttp(404, 'Obra não encontrada.', 'OBRA_NAO_ENCONTRADA');
  }

  let statusDb = null;
  if (filtroStatus) {
    statusDb = normalizarStatusParaDb(filtroStatus);
    if (!statusDb) {
      throw criarErroHttp(
        400,
        `Status inválido. Valores permitidos: ${STATUS_VALIDOS_API.join(', ')}.`,
        'STATUS_INVALIDO'
      );
    }
  }

  const exemplares = await livrosRepository.listarExemplaresPorObra(obra.id, statusDb);

  return {
    obra: {
      id: obra.id,
      codigo: obra.codigo_livro,
      titulo: obra.titulo,
      autor: obra.autor,
    },
    total: exemplares.length,
    exemplares: exemplares.map(formatarExemplar),
  };
}

async function cadastrarExemplar(codigoOuId, dados) {
  const obra = await localizarObraPorCodigoOuId(codigoOuId);
  if (!obra) {
    throw criarErroHttp(404, 'Obra não encontrada.', 'OBRA_NAO_ENCONTRADA');
  }

  const codigoTombo = String(dados.codigo_tombo || dados.codigo_exemplar).trim();

  // RN-06: cada exemplar físico possui código de tombo único em todo o acervo
  const exemplarExistente = await livrosRepository.buscarExemplarPorTombo(codigoTombo);
  if (exemplarExistente) {
    throw criarErroHttp(
      409,
      `Já existe um exemplar cadastrado com o código de tombo "${codigoTombo}" (RN-06).`,
      'TOMBO_DUPLICADO'
    );
  }

  let statusDb = 'disponivel';
  if (dados.status !== undefined && dados.status !== null && String(dados.status).trim() !== '') {
    statusDb = normalizarStatusParaDb(dados.status);
    if (!statusDb) {
      throw criarErroHttp(
        400,
        `Status inválido. Valores permitidos: ${STATUS_VALIDOS_API.join(', ')}.`,
        'STATUS_INVALIDO'
      );
    }
    if (statusDb === 'emprestado' || statusDb === 'reservado') {
      throw criarErroHttp(
        400,
        'Um novo exemplar deve ser cadastrado como "disponivel" ou "inativo". Os status "emprestado" e "retido_reserva" são definidos pelos fluxos de empréstimo e reserva.',
        'STATUS_INICIAL_INVALIDO'
      );
    }
  }

  const exemplarCriado = await livrosRepository.criarExemplar({
    codigo_exemplar: codigoTombo,
    obra_id: obra.id,
    status: statusDb,
  });

  const exemplarCompleto = await livrosRepository.buscarExemplarPorTombo(
    exemplarCriado.codigo_exemplar
  );
  return formatarExemplar(exemplarCompleto);
}

async function buscarExemplarPorTombo(tombo) {
  const exemplar = await livrosRepository.buscarExemplarPorTombo(tombo);
  if (!exemplar) {
    throw criarErroHttp(404, 'Exemplar não encontrado.', 'EXEMPLAR_NAO_ENCONTRADO');
  }

  return formatarExemplar(exemplar);
}

async function editarExemplar(tombo, dados) {
  const exemplar = await livrosRepository.buscarExemplarPorTombo(tombo);
  if (!exemplar) {
    throw criarErroHttp(404, 'Exemplar não encontrado.', 'EXEMPLAR_NAO_ENCONTRADO');
  }

  const camposAtualizados = {};

  // Valida eventual alteração do código de tombo (RN-06)
  const novoTombo = dados.codigo_tombo ?? dados.codigo_exemplar;
  if (novoTombo !== undefined) {
    const tomboLimpo = String(novoTombo).trim();
    if (!tomboLimpo) {
      throw criarErroHttp(400, 'O código de tombo não pode ficar vazio.', 'TOMBO_INVALIDO');
    }
    if (tomboLimpo.toLowerCase() !== exemplar.codigo_exemplar.toLowerCase()) {
      const duplicado = await livrosRepository.buscarExemplarPorTombo(tomboLimpo);
      if (duplicado && duplicado.id !== exemplar.id) {
        throw criarErroHttp(
          409,
          `Já existe outro exemplar com o código de tombo "${tomboLimpo}" (RN-06).`,
          'TOMBO_DUPLICADO'
        );
      }
      camposAtualizados.codigo_exemplar = tomboLimpo;
    }
  }

  // Valida transições de status do exemplar físico
  if (dados.status !== undefined) {
    const novoStatusDb = normalizarStatusParaDb(dados.status);
    if (!novoStatusDb) {
      throw criarErroHttp(
        400,
        `Status inválido. Valores permitidos: ${STATUS_VALIDOS_API.join(', ')}.`,
        'STATUS_INVALIDO'
      );
    }

    const statusAtualDb = exemplar.status;

    if (novoStatusDb !== statusAtualDb) {
      // Não permite marcar manualmente como "emprestado" fora do fluxo de empréstimo
      if (novoStatusDb === 'emprestado') {
        throw criarErroHttp(
          409,
          'O status "emprestado" é controlado automaticamente pelo registro de empréstimo.',
          'TRANSICAO_STATUS_INVALIDA'
        );
      }

      // Exemplar emprestado só pode sair via devolução (ou inativação por extravio/dano severo)
      if (statusAtualDb === 'emprestado' && novoStatusDb !== 'inativo_extraviado') {
        throw criarErroHttp(
          409,
          'Exemplar emprestado deve ser devolvido pelo módulo de empréstimos antes de voltar a ficar disponível ou retido.',
          'TRANSICAO_STATUS_INVALIDA'
        );
      }

      // Exemplar inativo deve primeiro voltar para "disponivel"
      if (statusAtualDb === 'inativo_extraviado' && novoStatusDb !== 'disponivel') {
        throw criarErroHttp(
          409,
          'Um exemplar inativo só pode ser reativado para o status "disponivel".',
          'TRANSICAO_STATUS_INVALIDA'
        );
      }

      camposAtualizados.status = novoStatusDb;
    }
  }

  if (Object.keys(camposAtualizados).length === 0) {
    return formatarExemplar(exemplar);
  }

  await livrosRepository.atualizarExemplar(exemplar, camposAtualizados);
  const atualizado = await livrosRepository.buscarExemplarPorTombo(
    camposAtualizados.codigo_exemplar || exemplar.codigo_exemplar
  );
  return formatarExemplar(atualizado);
}

async function excluirExemplar(tombo) {
  const exemplar = await livrosRepository.buscarExemplarPorTombo(tombo);
  if (!exemplar) {
    throw criarErroHttp(404, 'Exemplar não encontrado.', 'EXEMPLAR_NAO_ENCONTRADO');
  }

  if (exemplar.status === 'emprestado') {
    throw criarErroHttp(
      409,
      'Não é possível excluir um exemplar que está emprestado.',
      'EXEMPLAR_EMPRESTADO'
    );
  }

  if (exemplar.status === 'reservado') {
    throw criarErroHttp(
      409,
      'Não é possível excluir um exemplar retido para reserva.',
      'EXEMPLAR_RESERVADO'
    );
  }

  const { totalEmprestimos, totalReservas } = await livrosRepository.contarHistoricoExemplar(
    exemplar.id
  );
  if (totalEmprestimos > 0 || totalReservas > 0) {
    throw criarErroHttp(
      409,
      'Este exemplar possui histórico de empréstimos ou reservas. Altere seu status para "inativo" para preservar o histórico da obra.',
      'EXEMPLAR_COM_HISTORICO'
    );
  }

  await livrosRepository.excluirExemplar(exemplar);
}

module.exports = {
  STATUS_VALIDOS_API,
  listarObras,
  buscarObraPorId,
  criarObra,
  editarObra,
  excluirObra,
  listarExemplaresDaObra,
  cadastrarExemplar,
  buscarExemplarPorTombo,
  editarExemplar,
  excluirExemplar,
};
