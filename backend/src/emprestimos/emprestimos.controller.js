const emprestimosService = require('./emprestimos.service');

/**
 * Camada Controller de Empréstimos (RF05, RF06, RF07, RF09 e RF11):
 * Valida entrada básica, delega lógica de negócio ao Service e retorna status HTTP semânticos.
 */

async function listarEmprestimos(req, res, next) {
  try {
    const emprestimos = await emprestimosService.listarEmprestimos(req.query);
    return res.status(200).json(emprestimos);
  } catch (err) {
    return next(err);
  }
}

async function registrarEmprestimo(req, res, next) {
  try {
    const estudanteMatricula = req.body.estudante_matricula ?? req.body.matricula;
    const exemplarTombo = req.body.exemplar_tombo ?? req.body.codigo_tombo ?? req.body.codigo_exemplar;
    const detalhes = [];

    if (!estudanteMatricula || String(estudanteMatricula).trim() === '') {
      detalhes.push({
        campo: 'estudante_matricula',
        mensagem: 'A matrícula do estudante é obrigatória.',
      });
    }
    if (!exemplarTombo || String(exemplarTombo).trim() === '') {
      detalhes.push({
        campo: 'exemplar_tombo',
        mensagem: 'O código de tombo do exemplar é obrigatório.',
      });
    }

    if (detalhes.length > 0) {
      return res.status(400).json({ erro: 'Dados obrigatórios do empréstimo inválidos.', detalhes });
    }

    const emprestimo = await emprestimosService.registrarEmprestimo({
      estudante_matricula: estudanteMatricula,
      exemplar_tombo: exemplarTombo,
    });

    return res.status(201).json(emprestimo);
  } catch (err) {
    return next(err);
  }
}

/**
 * RF06: Aceita devolução tanto via :id numérico quanto via código de tombo no parâmetro ou no body.
 */
async function registrarDevolucao(req, res, next) {
  try {
    const paramId = req.params.id;
    const bodyTombo =
      req.body?.exemplar_tombo ?? req.body?.codigo_tombo ?? req.body?.codigo_exemplar;
    const bodyId = req.body?.emprestimo_id;

    let emprestimoId = null;
    let exemplarTombo = null;

    if (paramId) {
      if (/^\d+$/.test(String(paramId).trim())) {
        emprestimoId = Number(paramId);
      } else {
        exemplarTombo = String(paramId).trim();
      }
    } else if (bodyId && /^\d+$/.test(String(bodyId).trim())) {
      emprestimoId = Number(bodyId);
    } else if (bodyTombo && String(bodyTombo).trim() !== '') {
      exemplarTombo = String(bodyTombo).trim();
    }

    if (!emprestimoId && !exemplarTombo) {
      return res.status(400).json({
        erro: 'Informe o ID do empréstimo ou o exemplar_tombo para registrar a devolução.',
      });
    }

    const resultado = await emprestimosService.registrarDevolucao({
      emprestimoId,
      exemplarTombo,
    });

    return res.status(200).json(resultado);
  } catch (err) {
    return next(err);
  }
}

async function registrarRenovacao(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ erro: 'ID de empréstimo inválido.' });
    }

    const emprestimo = await emprestimosService.registrarRenovacao(id);
    return res.status(200).json(emprestimo);
  } catch (err) {
    return next(err);
  }
}

async function obterDashboard(req, res, next) {
  try {
    const dashboard = await emprestimosService.obterDashboard();
    return res.status(200).json(dashboard);
  } catch (err) {
    return next(err);
  }
}

async function listarMeusEmprestimos(req, res, next) {
  try {
    const resultado = await emprestimosService.listarMeusEmprestimos(
      req.usuario,
      req.query.matricula
    );
    return res.status(200).json(resultado);
  } catch (err) {
    return next(err);
  }
}

async function enviarJustificativaAtraso(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ erro: 'ID de empréstimo inválido.' });
    }

    const texto =
      req.body.justificativa_atraso ?? req.body.texto_descritivo ?? req.body.justificativa;
    if (!texto || String(texto).trim() === '') {
      return res.status(400).json({
        erro: 'O texto da justificativa de atraso é obrigatório.',
        detalhes: [{ campo: 'justificativa_atraso', mensagem: 'Obrigatório.' }],
      });
    }

    const resultado = await emprestimosService.enviarJustificativaAtraso(id, texto, req.usuario);
    return res.status(200).json(resultado);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listarEmprestimos,
  registrarEmprestimo,
  registrarDevolucao,
  registrarRenovacao,
  obterDashboard,
  listarMeusEmprestimos,
  enviarJustificativaAtraso,
};
