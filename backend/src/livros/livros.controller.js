const livrosService = require('./livros.service');

/**
 * Camada Controller de Livros (Obras e Exemplares):
 * Recebe req, valida entrada básica, delega regras ao Service e retorna status HTTP semânticos.
 */

// --- Obras (RF01 e RF10) ---

async function listarObras(req, res, next) {
  try {
    const obras = await livrosService.listarObras(req.query);
    return res.status(200).json(obras);
  } catch (err) {
    return next(err);
  }
}

async function buscarObraPorId(req, res, next) {
  try {
    const obra = await livrosService.buscarObraPorId(req.params.id);
    return res.status(200).json(obra);
  } catch (err) {
    return next(err);
  }
}

async function criarObra(req, res, next) {
  try {
    const { codigo, codigo_livro, titulo, autor, editora, ano_publicacao, tipo, tipo_obra_id, categoria, categoria_id } =
      req.body;
    const detalhes = [];

    const codigoInformado = codigo ?? codigo_livro;
    if (!codigoInformado || String(codigoInformado).trim() === '') {
      detalhes.push({ campo: 'codigo', mensagem: 'O código do livro é obrigatório.' });
    }
    if (!titulo || String(titulo).trim() === '') {
      detalhes.push({ campo: 'titulo', mensagem: 'O título da obra é obrigatório.' });
    }
    if (!autor || String(autor).trim() === '') {
      detalhes.push({ campo: 'autor', mensagem: 'O autor da obra é obrigatório.' });
    }
    if (!editora || String(editora).trim() === '') {
      detalhes.push({ campo: 'editora', mensagem: 'A editora da obra é obrigatória.' });
    }
    if ((!tipo || String(tipo).trim() === '') && !tipo_obra_id) {
      detalhes.push({ campo: 'tipo', mensagem: 'O tipo da obra é obrigatório.' });
    }
    if ((!categoria || String(categoria).trim() === '') && !categoria_id) {
      detalhes.push({ campo: 'categoria', mensagem: 'A categoria da obra é obrigatória.' });
    }
    if (
      ano_publicacao !== undefined &&
      ano_publicacao !== null &&
      ano_publicacao !== '' &&
      !Number.isInteger(Number(ano_publicacao))
    ) {
      detalhes.push({ campo: 'ano_publicacao', mensagem: 'O ano de publicação deve ser um número inteiro.' });
    }

    if (detalhes.length > 0) {
      return res.status(400).json({ erro: 'Dados obrigatórios da obra inválidos.', detalhes });
    }

    const obraCriada = await livrosService.criarObra(req.body);
    return res.status(201).json(obraCriada);
  } catch (err) {
    return next(err);
  }
}

async function editarObra(req, res, next) {
  try {
    const { codigo, codigo_livro, titulo, autor, editora, tipo, categoria, ano_publicacao } = req.body;
    const detalhes = [];

    const codigoInformado = codigo !== undefined ? codigo : codigo_livro;
    if (codigoInformado !== undefined && String(codigoInformado).trim() === '') {
      detalhes.push({ campo: 'codigo', mensagem: 'O código do livro não pode ficar vazio.' });
    }
    if (titulo !== undefined && String(titulo).trim() === '') {
      detalhes.push({ campo: 'titulo', mensagem: 'O título da obra não pode ficar vazio.' });
    }
    if (autor !== undefined && String(autor).trim() === '') {
      detalhes.push({ campo: 'autor', mensagem: 'O autor da obra não pode ficar vazio.' });
    }
    if (editora !== undefined && String(editora).trim() === '') {
      detalhes.push({ campo: 'editora', mensagem: 'A editora da obra não pode ficar vazia.' });
    }
    if (tipo !== undefined && String(tipo).trim() === '') {
      detalhes.push({ campo: 'tipo', mensagem: 'O tipo da obra não pode ficar vazio.' });
    }
    if (categoria !== undefined && String(categoria).trim() === '') {
      detalhes.push({ campo: 'categoria', mensagem: 'A categoria da obra não pode ficar vazia.' });
    }
    if (
      ano_publicacao !== undefined &&
      ano_publicacao !== null &&
      ano_publicacao !== '' &&
      !Number.isInteger(Number(ano_publicacao))
    ) {
      detalhes.push({ campo: 'ano_publicacao', mensagem: 'O ano de publicação deve ser um número inteiro.' });
    }

    if (detalhes.length > 0) {
      return res.status(400).json({ erro: 'Dados inválidos para atualização da obra.', detalhes });
    }

    const obraAtualizada = await livrosService.editarObra(req.params.id, req.body);
    return res.status(200).json(obraAtualizada);
  } catch (err) {
    return next(err);
  }
}

async function excluirObra(req, res, next) {
  try {
    await livrosService.excluirObra(req.params.id);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

// --- Exemplares Físicos (RF02 e RN-06) ---

async function listarExemplaresDaObra(req, res, next) {
  try {
    const resultado = await livrosService.listarExemplaresDaObra(
      req.params.codigo,
      req.query.status
    );
    return res.status(200).json(resultado);
  } catch (err) {
    return next(err);
  }
}

async function cadastrarExemplar(req, res, next) {
  try {
    const codigoTombo = req.body.codigo_tombo ?? req.body.codigo_exemplar;
    if (!codigoTombo || String(codigoTombo).trim() === '') {
      return res.status(400).json({
        erro: 'O código de tombo do exemplar é obrigatório (RN-06).',
        detalhes: [{ campo: 'codigo_tombo', mensagem: 'Obrigatório.' }],
      });
    }

    const exemplarCriado = await livrosService.cadastrarExemplar(req.params.codigo, req.body);
    return res.status(201).json(exemplarCriado);
  } catch (err) {
    return next(err);
  }
}

async function buscarExemplarPorTombo(req, res, next) {
  try {
    const exemplar = await livrosService.buscarExemplarPorTombo(req.params.tombo);
    return res.status(200).json(exemplar);
  } catch (err) {
    return next(err);
  }
}

async function editarExemplar(req, res, next) {
  try {
    const { status, codigo_tombo, codigo_exemplar } = req.body;
    if (status === undefined && codigo_tombo === undefined && codigo_exemplar === undefined) {
      return res.status(400).json({
        erro: 'Informe ao menos um campo para atualizar (status ou codigo_tombo).',
      });
    }

    const exemplarAtualizado = await livrosService.editarExemplar(req.params.tombo, req.body);
    return res.status(200).json(exemplarAtualizado);
  } catch (err) {
    return next(err);
  }
}

async function excluirExemplar(req, res, next) {
  try {
    await livrosService.excluirExemplar(req.params.tombo);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

module.exports = {
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
