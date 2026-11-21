const reservasService = require('./reservas.service');

/**
 * Camada Controller de Reservas (RF08 e RN-05):
 * Valida entrada básica, chama o Service com async/await + try/catch e retorna status semânticos.
 */

async function listarReservas(req, res, next) {
  try {
    const reservas = await reservasService.listarReservas(req.query, req.usuario);
    return res.status(200).json(reservas);
  } catch (err) {
    return next(err);
  }
}

async function criarReserva(req, res, next) {
  try {
    const obraCodigo = req.body.obra_codigo ?? req.body.codigo_livro ?? req.body.obra_id;
    const estudanteMatricula = req.body.estudante_matricula ?? req.body.matricula;
    const detalhes = [];

    if (!obraCodigo || String(obraCodigo).trim() === '') {
      detalhes.push({ campo: 'obra_codigo', mensagem: 'O código da obra é obrigatório.' });
    }

    if (
      req.usuario.role === 'bibliotecario' &&
      (!estudanteMatricula || String(estudanteMatricula).trim() === '')
    ) {
      detalhes.push({
        campo: 'estudante_matricula',
        mensagem: 'A matrícula do estudante é obrigatória.',
      });
    }

    if (detalhes.length > 0) {
      return res.status(400).json({ erro: 'Dados obrigatórios da reserva inválidos.', detalhes });
    }

    const reserva = await reservasService.criarReserva(
      {
        estudante_matricula: estudanteMatricula,
        obra_codigo: obraCodigo,
      },
      req.usuario
    );

    return res.status(201).json(reserva);
  } catch (err) {
    return next(err);
  }
}

async function buscarReservaPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ erro: 'ID de reserva inválido.' });
    }

    const reserva = await reservasService.buscarReservaPorId(id, req.usuario);
    return res.status(200).json(reserva);
  } catch (err) {
    return next(err);
  }
}

async function editarReserva(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ erro: 'ID de reserva inválido.' });
    }

    if (req.body.status === undefined && req.body.alerta_enviado === undefined) {
      return res.status(400).json({
        erro: 'Informe ao menos um campo para atualizar (status ou alerta_enviado).',
      });
    }

    const reserva = await reservasService.editarReserva(id, req.body);
    return res.status(200).json(reserva);
  } catch (err) {
    return next(err);
  }
}

async function cancelarReserva(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ erro: 'ID de reserva inválido.' });
    }

    const resultado = await reservasService.cancelarReserva(id, req.usuario);
    return res.status(200).json(resultado);
  } catch (err) {
    return next(err);
  }
}

async function excluirReserva(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ erro: 'ID de reserva inválido.' });
    }

    await reservasService.excluirReserva(id, req.usuario);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listarReservas,
  buscarReservaPorId,
  criarReserva,
  editarReserva,
  cancelarReserva,
  excluirReserva,
};
