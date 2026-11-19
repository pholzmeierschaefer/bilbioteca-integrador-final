const estudantesService = require('./estudantes.service');

/**
 * Camada Controller de Estudantes:
 * Valida entrada básica, chama Service com async/await + try/catch e nunca expõe o campo senha.
 */

async function listarEstudantes(req, res, next) {
  try {
    const estudantes = await estudantesService.listarEstudantes(req.query);
    return res.status(200).json(estudantes);
  } catch (err) {
    return next(err);
  }
}

async function buscarPorMatricula(req, res, next) {
  try {
    const estudante = await estudantesService.buscarPorMatricula(
      req.params.matricula,
      req.usuario
    );
    return res.status(200).json(estudante);
  } catch (err) {
    return next(err);
  }
}

async function cadastrarEstudante(req, res, next) {
  try {
    const { matricula, nome, nome_completo, turma, email } = req.body;
    const detalhes = [];

    if (!matricula || String(matricula).trim() === '') {
      detalhes.push({ campo: 'matricula', mensagem: 'A matrícula do estudante é obrigatória.' });
    }
    const nomeInformado = nome ?? nome_completo;
    if (!nomeInformado || String(nomeInformado).trim().length < 2) {
      detalhes.push({ campo: 'nome', mensagem: 'O nome do estudante é obrigatório (mínimo 2 caracteres).' });
    }
    if (!turma || String(turma).trim() === '') {
      detalhes.push({ campo: 'turma', mensagem: 'A turma do estudante é obrigatória.' });
    }
    if (email !== undefined && email !== null && String(email).trim() !== '' && !String(email).includes('@')) {
      detalhes.push({ campo: 'email', mensagem: 'Informe um e-mail válido.' });
    }

    if (detalhes.length > 0) {
      return res.status(400).json({ erro: 'Dados obrigatórios do estudante inválidos.', detalhes });
    }

    const estudanteCriado = await estudantesService.cadastrarEstudante(req.body);
    return res.status(201).json(estudanteCriado);
  } catch (err) {
    return next(err);
  }
}

async function editarEstudante(req, res, next) {
  try {
    const { matricula, nome, nome_completo, turma, email, senha } = req.body;
    const detalhes = [];

    if (matricula !== undefined && String(matricula).trim() === '') {
      detalhes.push({ campo: 'matricula', mensagem: 'A matrícula não pode ficar vazia.' });
    }
    const nomeInformado = nome !== undefined ? nome : nome_completo;
    if (nomeInformado !== undefined && String(nomeInformado).trim().length < 2) {
      detalhes.push({ campo: 'nome', mensagem: 'O nome deve ter no mínimo 2 caracteres.' });
    }
    if (turma !== undefined && String(turma).trim() === '') {
      detalhes.push({ campo: 'turma', mensagem: 'A turma não pode ficar vazia.' });
    }
    if (email !== undefined && email !== null && String(email).trim() !== '' && !String(email).includes('@')) {
      detalhes.push({ campo: 'email', mensagem: 'Informe um e-mail válido.' });
    }
    if (senha !== undefined && senha !== null && String(senha).trim() !== '' && String(senha).length < 4) {
      detalhes.push({ campo: 'senha', mensagem: 'A senha deve ter no mínimo 4 caracteres.' });
    }

    if (detalhes.length > 0) {
      return res.status(400).json({ erro: 'Dados inválidos para atualização do estudante.', detalhes });
    }

    const estudanteAtualizado = await estudantesService.editarEstudante(
      req.params.matricula,
      req.body
    );
    return res.status(200).json(estudanteAtualizado);
  } catch (err) {
    return next(err);
  }
}

async function alterarStatusEstudante(req, res, next) {
  try {
    const { status } = req.body;
    if (!status || String(status).trim() === '') {
      return res.status(400).json({
        erro: 'Informe o novo status do estudante (ativo, bloqueado ou inativo).',
        detalhes: [{ campo: 'status', mensagem: 'Obrigatório.' }],
      });
    }

    const estudanteAtualizado = await estudantesService.alterarStatusEstudante(
      req.params.matricula,
      status
    );
    return res.status(200).json(estudanteAtualizado);
  } catch (err) {
    return next(err);
  }
}

async function inativarEstudante(req, res, next) {
  try {
    await estudantesService.inativarEstudante(req.params.matricula);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

/**
 * RF04: Aceita importação via:
 * 1) Corpo texto puro (Content-Type: text/csv ou text/plain)
 * 2) JSON com campo { csv: "...", atualizar_existentes?: boolean }
 * 3) JSON com array direto [...] ou { estudantes: [...], atualizar_existentes?: boolean }
 */
async function importarEstudantes(req, res, next) {
  try {
    const atualizarExistentes =
      req.query.atualizar_existentes === 'true' ||
      Boolean(req.body && req.body.atualizar_existentes);

    let resultado;

    if (typeof req.body === 'string') {
      resultado = await estudantesService.importarEstudantes({
        csv: req.body,
        atualizarExistentes,
      });
    } else if (Array.isArray(req.body)) {
      resultado = await estudantesService.importarEstudantes({
        estudantes: req.body,
        atualizarExistentes,
      });
    } else if (req.body && typeof req.body.csv === 'string') {
      resultado = await estudantesService.importarEstudantes({
        csv: req.body.csv,
        atualizarExistentes,
      });
    } else if (req.body && (Array.isArray(req.body.estudantes) || Array.isArray(req.body.alunos))) {
      resultado = await estudantesService.importarEstudantes({
        estudantes: req.body.estudantes || req.body.alunos,
        atualizarExistentes,
      });
    } else {
      return res.status(400).json({
        erro: 'Formato inválido. Envie um texto CSV (text/csv), { csv: "..." } ou uma lista JSON em { estudantes: [...] }.',
      });
    }

    const statusHttp = resultado.criados > 0 ? 201 : 200;
    return res.status(statusHttp).json(resultado);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listarEstudantes,
  buscarPorMatricula,
  cadastrarEstudante,
  editarEstudante,
  alterarStatusEstudante,
  inativarEstudante,
  importarEstudantes,
};
