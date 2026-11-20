const reservasRepository = require('./reservas.repository');

const STATUS_RESERVA_VALIDOS = ['pendente', 'aguardando_retirada', 'atendida', 'cancelada'];

const STATUS_EXEMPLAR_DB_PARA_API = {
  disponivel: 'disponivel',
  emprestado: 'emprestado',
  reservado: 'retido_reserva',
  inativo_extraviado: 'inativo',
};

function criarErroHttp(statusCode, mensagem, codigo) {
  const err = new Error(mensagem);
  err.statusCode = statusCode;
  if (codigo) err.codigo = codigo;
  return err;
}

function formatarReserva(reserva, posicaoFila = null) {
  return {
    id: reserva.id,
    status: reserva.status,
    data_reserva: reserva.data_reserva,
    alerta_enviado: reserva.alerta_enviado,
    ...(posicaoFila !== null ? { posicao_fila: posicaoFila } : {}),
    estudante: reserva.estudante
      ? {
          id: reserva.estudante.id,
          matricula: reserva.estudante.matricula,
          nome: reserva.estudante.nome_completo,
          turma: reserva.estudante.turma,
          telefone: reserva.estudante.telefone,
          status: reserva.estudante.status,
        }
      : null,
    obra: reserva.obra
      ? {
          id: reserva.obra.id,
          codigo: reserva.obra.codigo_livro,
          titulo: reserva.obra.titulo,
          autor: reserva.obra.autor,
          editora: reserva.obra.editora,
        }
      : null,
    exemplar: reserva.exemplar
      ? {
          id: reserva.exemplar.id,
          codigo_tombo: reserva.exemplar.codigo_exemplar,
          status: STATUS_EXEMPLAR_DB_PARA_API[reserva.exemplar.status] || reserva.exemplar.status,
        }
      : null,
    created_at: reserva.created_at,
    updated_at: reserva.updated_at,
  };
}

/**
 * Resolve o estudante alvo respeitando RBAC:
 * - Bibliotecário informa estudante_matricula.
 * - Aluno só pode reservar para si mesmo.
 */
async function resolverEstudanteParaReserva(matriculaInformada, usuarioAutenticado) {
  if (usuarioAutenticado.role === 'aluno') {
    if (!usuarioAutenticado.estudante_id) {
      throw criarErroHttp(
        403,
        'Conta de aluno sem vínculo com cadastro de estudante.',
        'ESTUDANTE_NAO_VINCULADO'
      );
    }

    const proprio = await reservasRepository.buscarEstudantePorId(usuarioAutenticado.estudante_id);
    if (!proprio) {
      throw criarErroHttp(404, 'Cadastro de estudante não encontrado.', 'ESTUDANTE_NAO_ENCONTRADO');
    }

    if (
      matriculaInformada &&
      String(matriculaInformada).trim().toLowerCase() !== proprio.matricula.toLowerCase()
    ) {
      throw criarErroHttp(
        403,
        'Permissão insuficiente. Você só pode registrar reservas para a sua própria matrícula.',
        'ACESSO_NEGADO'
      );
    }

    return proprio;
  }

  // Bibliotecário precisa informar a matrícula do estudante
  if (!matriculaInformada || String(matriculaInformada).trim() === '') {
    throw criarErroHttp(400, 'A matrícula do estudante é obrigatória.', 'MATRICULA_OBRIGATORIA');
  }

  const estudante = await reservasRepository.buscarEstudantePorMatricula(matriculaInformada);
  if (!estudante) {
    throw criarErroHttp(404, 'Estudante não encontrado.', 'ESTUDANTE_NAO_ENCONTRADO');
  }

  return estudante;
}

/**
 * RF08 & RN-05: Coloca um estudante na fila de espera de uma obra com status inicial 'pendente'.
 * Valida se o aluno está ativo e não possui empréstimos em atraso (RN-03).
 */
async function criarReserva({ estudante_matricula, obra_codigo }, usuarioAutenticado) {
  const estudante = await resolverEstudanteParaReserva(estudante_matricula, usuarioAutenticado);

  // RN-03: Apenas estudantes ativos e sem atrasos podem reservar
  if (estudante.status !== 'ativo') {
    throw criarErroHttp(
      409,
      `Reserva bloqueada: o estudante está com status "${estudante.status}" (RN-03).`,
      'ESTUDANTE_BLOQUEADO_OU_INATIVO'
    );
  }

  const atrasos = await reservasRepository.contarEmprestimosAtrasadosDoEstudante(estudante.id);
  if (atrasos > 0) {
    throw criarErroHttp(
      409,
      'Reserva bloqueada: o estudante possui livro(s) em atraso (RN-03).',
      'ESTUDANTE_COM_ATRASO'
    );
  }

  const obra = await reservasRepository.buscarObraPorCodigoOuId(obra_codigo);
  if (!obra) {
    throw criarErroHttp(404, 'Obra não encontrada.', 'OBRA_NAO_ENCONTRADA');
  }

  const jaComLivro = await reservasRepository.buscarEmprestimoAtivoDaObraPeloEstudante(
    estudante.id,
    obra.id
  );
  if (jaComLivro) {
    throw criarErroHttp(
      409,
      'O estudante já possui um exemplar desta obra emprestado no momento.',
      'OBRA_JA_EM_POSSE'
    );
  }

  const reservaExistente = await reservasRepository.buscarReservaAtivaDoEstudanteNaObra(
    estudante.id,
    obra.id
  );
  if (reservaExistente) {
    throw criarErroHttp(
      409,
      'O estudante já possui uma reserva ativa na fila para esta obra.',
      'RESERVA_DUPLICADA'
    );
  }

  const reservaCriada = await reservasRepository.executarTransacao(async (transaction) => {
    const nova = await reservasRepository.criarReserva(
      {
        estudante_id: estudante.id,
        obra_id: obra.id,
        exemplar_id: null,
        data_reserva: new Date(),
        status: 'pendente',
        alerta_enviado: false,
      },
      transaction
    );

    const posicao = await reservasRepository.contarReservasPendentesDaObra(obra.id, transaction);
    const completa = await reservasRepository.buscarReservaPorId(nova.id, transaction);
    return { completa, posicao };
  });

  return formatarReserva(reservaCriada.completa, reservaCriada.posicao);
}

/**
 * RF08: Lista reservas ordenadas por ordem de chegada (FIFO).
 * Alunos visualizam apenas as próprias reservas; bibliotecários visualizam toda a fila.
 */
async function listarReservas(filtros = {}, usuarioAutenticado) {
  if (filtros.status) {
    const statusLimpo = String(filtros.status).trim().toLowerCase();
    if (!STATUS_RESERVA_VALIDOS.includes(statusLimpo)) {
      throw criarErroHttp(
        400,
        `Status inválido. Valores permitidos: ${STATUS_RESERVA_VALIDOS.join(', ')}.`,
        'STATUS_INVALIDO'
      );
    }
  }

  const opcoesConsulta = {
    status: filtros.status,
    obraCodigo: filtros.obra_codigo || filtros.codigo_livro,
    estudanteMatricula: filtros.estudante_matricula || filtros.matricula,
  };

  if (usuarioAutenticado.role === 'aluno') {
    if (!usuarioAutenticado.estudante_id) {
      return [];
    }
    opcoesConsulta.estudanteId = usuarioAutenticado.estudante_id;
    delete opcoesConsulta.estudanteMatricula;
  }

  const reservas = await reservasRepository.listarReservas(opcoesConsulta);

  // Calcula posição na fila pendente por obra
  const contadorPorObra = new Map();
  return reservas.map((reserva) => {
    let posicao = null;
    if (reserva.status === 'pendente') {
      const atual = (contadorPorObra.get(reserva.obra_id) || 0) + 1;
      contadorPorObra.set(reserva.obra_id, atual);
      posicao = atual;
    }
    return formatarReserva(reserva, posicao);
  });
}

/**
 * RF08 & RN-05: Cancela uma reserva.
 * Se a reserva cancelada estava 'aguardando_retirada' com exemplar retido,
 * transfere automaticamente o exemplar para a próxima reserva pendente ou libera para 'disponivel'.
 */
async function cancelarReserva(reservaId, usuarioAutenticado) {
  const resultado = await reservasRepository.executarTransacao(async (transaction) => {
    const reserva = await reservasRepository.buscarReservaPorId(reservaId, transaction);
    if (!reserva) {
      throw criarErroHttp(404, 'Reserva não encontrada.', 'RESERVA_NAO_ENCONTRADA');
    }

    if (
      usuarioAutenticado.role === 'aluno' &&
      Number(reserva.estudante_id) !== Number(usuarioAutenticado.estudante_id)
    ) {
      throw criarErroHttp(
        403,
        'Permissão insuficiente. Você só pode cancelar suas próprias reservas.',
        'ACESSO_NEGADO'
      );
    }

    if (reserva.status === 'atendida') {
      throw criarErroHttp(
        409,
        'Não é possível cancelar uma reserva que já foi atendida.',
        'RESERVA_JA_ATENDIDA'
      );
    }

    if (reserva.status === 'cancelada') {
      throw criarErroHttp(409, 'Esta reserva já está cancelada.', 'RESERVA_JA_CANCELADA');
    }

    const estavaAguardandoRetirada = reserva.status === 'aguardando_retirada';
    const exemplarRetidoId = reserva.exemplar_id;

    await reservasRepository.atualizarReserva(reserva, { status: 'cancelada' }, transaction);

    let proximaReservaAcionada = null;

    // RN-05: Se havia exemplar retido para esta reserva, repassa ao próximo da fila ou libera na estante
    if (estavaAguardandoRetirada && exemplarRetidoId) {
      const exemplar = await reservasRepository.buscarExemplarPorId(exemplarRetidoId, transaction);
      if (exemplar && exemplar.status === 'reservado') {
        const proxima = await reservasRepository.buscarProximaReservaPendente(
          reserva.obra_id,
          transaction
        );

        if (proxima) {
          await reservasRepository.atualizarReserva(
            proxima,
            {
              status: 'aguardando_retirada',
              exemplar_id: exemplar.id,
              alerta_enviado: true,
            },
            transaction
          );
          proximaReservaAcionada = await reservasRepository.buscarReservaPorId(
            proxima.id,
            transaction
          );
        } else {
          await reservasRepository.atualizarExemplar(
            exemplar,
            { status: 'disponivel' },
            transaction
          );
        }
      }
    }

    const reservaCancelada = await reservasRepository.buscarReservaPorId(reserva.id, transaction);
    return { reservaCancelada, proximaReservaAcionada };
  });

  return {
    reserva: formatarReserva(resultado.reservaCancelada),
    ...(resultado.proximaReservaAcionada
      ? {
          proxima_reserva_notificada: formatarReserva(resultado.proximaReservaAcionada),
        }
      : {}),
  };
}

module.exports = {
  STATUS_RESERVA_VALIDOS,
  formatarReserva,
  criarReserva,
  listarReservas,
  cancelarReserva,
};
