const emprestimosRepository = require('./emprestimos.repository');
const reservasRepository = require('../reservas/reservas.repository');
const reservasService = require('../reservas/reservas.service');

const PRAZO_PADRAO_DIAS = 7; // RN-01: 7 dias corridos
const LIMITE_EMPRESTIMOS_SIMULTANEOS = 2; // RN-02: máximo 2 livros simultâneos por estudante
const LIMITE_ATRASO_CRITICO_DIAS = 10; // RF09: destaque crítico vermelho para atrasos > 10 dias
const MS_POR_DIA = 1000 * 60 * 60 * 24;

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

function adicionarDias(dataBase, dias) {
  const novaData = new Date(dataBase);
  novaData.setDate(novaData.getDate() + dias);
  return novaData;
}

function calcularDiasAtraso(dataPrevista, referencia = new Date()) {
  const diffMs = referencia.getTime() - new Date(dataPrevista).getTime();
  if (diffMs <= 0) return 0;
  return Math.max(1, Math.floor(diffMs / MS_POR_DIA));
}

function ehMesmoDiaLocal(dataA, dataB) {
  const a = new Date(dataA);
  const b = new Date(dataB);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatarEmprestimo(emprestimo, referencia = new Date()) {
  const emAberto = emprestimo.data_devolucao_realizada === null;
  const diasAtraso = emAberto
    ? calcularDiasAtraso(emprestimo.data_devolucao_prevista, referencia)
    : 0;
  const atrasado = emAberto && diasAtraso > 0;
  const critico = atrasado && diasAtraso > LIMITE_ATRASO_CRITICO_DIAS;

  const justificativas = Array.isArray(emprestimo.justificativas)
    ? emprestimo.justificativas.map((j) => ({
      id: j.id,
      texto_descritivo: j.texto_descritivo,
      data_envio: j.data_envio,
      status: j.status,
    }))
    : [];

  return {
    id: emprestimo.id,
    data_emprestimo: emprestimo.data_emprestimo,
    data_prevista: emprestimo.data_devolucao_prevista,
    data_devolucao_prevista: emprestimo.data_devolucao_prevista,
    data_devolucao: emprestimo.data_devolucao_realizada,
    data_devolucao_realizada: emprestimo.data_devolucao_realizada,
    renovacoes: emprestimo.renovacoes,
    status: emAberto ? (atrasado ? 'atrasado' : 'ativo') : 'devolvido',
    atrasado,
    dias_atraso: diasAtraso,
    critico,
    estudante: emprestimo.estudante
      ? {
        id: emprestimo.estudante.id,
        matricula: emprestimo.estudante.matricula,
        nome: emprestimo.estudante.nome_completo,
        turma: emprestimo.estudante.turma,
        telefone: emprestimo.estudante.telefone,
        status: emprestimo.estudante.status,
      }
      : null,
    exemplar: emprestimo.exemplar
      ? {
        id: emprestimo.exemplar.id,
        codigo_tombo: emprestimo.exemplar.codigo_exemplar,
        status:
          STATUS_EXEMPLAR_DB_PARA_API[emprestimo.exemplar.status] || emprestimo.exemplar.status,
        obra: emprestimo.exemplar.obra
          ? {
            id: emprestimo.exemplar.obra.id,
            codigo: emprestimo.exemplar.obra.codigo_livro,
            titulo: emprestimo.exemplar.obra.titulo,
            autor: emprestimo.exemplar.obra.autor,
            editora: emprestimo.exemplar.obra.editora,
          }
          : null,
      }
      : null,
    justificativa_atraso: justificativas.length > 0 ? justificativas[0].texto_descritivo : null,
    justificativas,
    created_at: emprestimo.created_at,
    updated_at: emprestimo.updated_at,
  };
}

// =====================================================================
// 1. REGISTRAR EMPRÉSTIMO NO BALCÃO (RF05 / RN-01, RN-02, RN-03, RN-05, RN-06)
// =====================================================================

async function registrarEmprestimo({ estudante_matricula, exemplar_tombo }) {
  const agora = new Date();

  const estudantePrevio = await emprestimosRepository.buscarEstudantePorMatricula(
    estudante_matricula
  );
  if (!estudantePrevio) {
    throw criarErroHttp(404, 'Estudante não encontrado.', 'ESTUDANTE_NAO_ENCONTRADO');
  }

  // Persiste bloqueio automático (RN-03) caso o estudante tenha títulos vencidos antes da transação
  await emprestimosRepository.sincronizarAtrasos({
    estudanteId: estudantePrevio.id,
    referencia: agora,
  });

  const emprestimoCompleto = await emprestimosRepository.executarTransacao(async (transaction) => {
    const estudante = await emprestimosRepository.buscarEstudantePorId(
      estudantePrevio.id,
      transaction
    );
    const exemplar = await emprestimosRepository.buscarExemplarPorTombo(
      exemplar_tombo,
      transaction
    );

    if (!exemplar) {
      throw criarErroHttp(404, 'Exemplar não encontrado.', 'EXEMPLAR_NAO_ENCONTRADO');
    }

    // RN-03: Estudante precisa estar ativo e sem atrasos
    const atrasos = await emprestimosRepository.contarEmprestimosAtrasadosDoEstudante(
      estudante.id,
      agora,
      null,
      transaction
    );

    if (atrasos > 0) {
      throw criarErroHttp(
        409,
        'Empréstimo bloqueado: o estudante possui livro(s) em atraso (RN-03).',
        'ESTUDANTE_COM_ATRASO'
      );
    }

    if (estudante.status !== 'ativo') {
      throw criarErroHttp(
        409,
        `Empréstimo bloqueado: o estudante está com status "${estudante.status}" (RN-03).`,
        'ESTUDANTE_NAO_ATIVO'
      );
    }

    // RN-02: Máximo de 2 empréstimos ativos simultâneos
    const emprestimosAtivos = await emprestimosRepository.contarEmprestimosAtivosDoEstudante(
      estudante.id,
      transaction
    );

    if (emprestimosAtivos >= LIMITE_EMPRESTIMOS_SIMULTANEOS) {
      throw criarErroHttp(
        409,
        `Limite atingido: o estudante já possui ${LIMITE_EMPRESTIMOS_SIMULTANEOS} livros emprestados simultaneamente (RN-02).`,
        'LIMITE_EMPRESTIMOS_ATINGIDO'
      );
    }

    // RN-05 e RN-06: Verifica disponibilidade e retenção prioritária de fila de reserva
    if (exemplar.status === 'emprestado') {
      throw criarErroHttp(409, 'Este exemplar já está emprestado.', 'EXEMPLAR_JA_EMPRESTADO');
    }

    if (exemplar.status === 'inativo_extraviado') {
      throw criarErroHttp(
        409,
        'Este exemplar está inativo/extraviado e não pode ser emprestado.',
        'EXEMPLAR_INATIVO'
      );
    }

    let reservaAtendida = null;

    if (exemplar.status === 'reservado') {
      const reservaPrioritaria = await reservasRepository.buscarReservaAguardandoRetirada(
        exemplar.obra_id,
        exemplar.id,
        transaction
      );

      if (!reservaPrioritaria || Number(reservaPrioritaria.estudante_id) !== Number(estudante.id)) {
        const nomePrioritario = reservaPrioritaria?.estudante?.nome_completo;
        throw criarErroHttp(
          409,
          nomePrioritario
            ? `Exemplar retido para retirada prioritária de ${nomePrioritario} na fila de reserva (RN-05).`
            : 'Exemplar retido para o primeiro estudante da fila de reserva (RN-05).',
          'EXEMPLAR_RETIDO_RESERVA'
        );
      }

      reservaAtendida = reservaPrioritaria;
    } else if (exemplar.status === 'disponivel') {
      // Se o próprio estudante possuía reserva pendente desta obra, conclui a reserva ao retirar
      const reservaPropria = await reservasRepository.buscarReservaAtivaDoEstudanteNaObra(
        estudante.id,
        exemplar.obra_id,
        transaction
      );
      if (reservaPropria) {
        reservaAtendida = reservaPropria;
      }
    }

    // RN-01: Prazo institucional padrão de 7 dias corridos
    const dataPrevista = adicionarDias(agora, PRAZO_PADRAO_DIAS);

    const novoEmprestimo = await emprestimosRepository.criarEmprestimo(
      {
        exemplar_id: exemplar.id,
        estudante_id: estudante.id,
        data_emprestimo: agora,
        data_devolucao_prevista: dataPrevista,
        data_devolucao_realizada: null,
        renovacoes: 0,
        status: 'ativo',
      },
      transaction
    );

    await emprestimosRepository.atualizarExemplar(exemplar, { status: 'emprestado' }, transaction);

    if (reservaAtendida) {
      await reservasRepository.atualizarReserva(
        reservaAtendida,
        { status: 'atendida', exemplar_id: exemplar.id },
        transaction
      );
    }

    return emprestimosRepository.buscarEmprestimoPorId(novoEmprestimo.id, transaction);
  });

  return formatarEmprestimo(emprestimoCompleto, agora);
}

// =====================================================================
// 2. REGISTRAR DEVOLUÇÃO (RF06 / RN-03, RN-04, RN-05)
// =====================================================================

async function registrarDevolucao({ emprestimoId, exemplarTombo }) {
  const agora = new Date();

  const resultado = await emprestimosRepository.executarTransacao(async (transaction) => {
    let emprestimo = null;

    if (emprestimoId) {
      emprestimo = await emprestimosRepository.buscarEmprestimoPorId(emprestimoId, transaction);
    } else if (exemplarTombo) {
      emprestimo = await emprestimosRepository.buscarEmprestimoAtivoPorTombo(
        exemplarTombo,
        transaction
      );
    }

    if (!emprestimo) {
      throw criarErroHttp(
        404,
        'Empréstimo ativo não encontrado para devolução.',
        'EMPRESTIMO_NAO_ENCONTRADO'
      );
    }

    if (emprestimo.data_devolucao_realizada !== null) {
      throw criarErroHttp(409, 'Este empréstimo já foi devolvido.', 'EMPRESTIMO_JA_DEVOLVIDO');
    }

    // 1. Registra baixa da devolução
    await emprestimosRepository.atualizarEmprestimo(
      emprestimo,
      {
        data_devolucao_realizada: agora,
        status: 'devolvido',
      },
      transaction
    );

    // 2. RN-05: Verifica fila de reserva pendente para a obra
    const exemplar = emprestimo.exemplar;
    const proximaReserva = await reservasRepository.buscarProximaReservaPendente(
      exemplar.obra_id,
      transaction
    );

    let novoStatusExemplarDb = 'disponivel';
    let reservaRetida = null;

    if (proximaReserva) {
      novoStatusExemplarDb = 'reservado'; // API: 'retido_reserva'
      await reservasRepository.atualizarReserva(
        proximaReserva,
        {
          status: 'aguardando_retirada',
          exemplar_id: exemplar.id,
          alerta_enviado: true,
        },
        transaction
      );
      reservaRetida = await reservasRepository.buscarReservaPorId(proximaReserva.id, transaction);
    }

    await emprestimosRepository.atualizarExemplar(
      exemplar,
      { status: novoStatusExemplarDb },
      transaction
    );

    // 3. RN-03 e RN-04: Desbloqueio automático sem cobrança de multa financeira
    const estudante = emprestimo.estudante;
    let estudanteDesbloqueado = false;

    if (estudante && estudante.status === 'bloqueado') {
      const outrosAtrasos = await emprestimosRepository.contarEmprestimosAtrasadosDoEstudante(
        estudante.id,
        agora,
        emprestimo.id,
        transaction
      );

      if (outrosAtrasos === 0) {
        await emprestimosRepository.atualizarEstudante(estudante, { status: 'ativo' }, transaction);
        estudanteDesbloqueado = true;
      }
    }

    const emprestimoAtualizado = await emprestimosRepository.buscarEmprestimoPorId(
      emprestimo.id,
      transaction
    );

    return {
      emprestimoAtualizado,
      novoStatusExemplarApi: STATUS_EXEMPLAR_DB_PARA_API[novoStatusExemplarDb],
      reservaRetida,
      estudanteDesbloqueado,
    };
  });

  return {
    mensagem: resultado.reservaRetida
      ? `Devolução registrada! Exemplar retido para retirada prioritária de ${resultado.reservaRetida.estudante.nome_completo} (RN-05).`
      : 'Devolução registrada com sucesso. Exemplar disponível na estante.',
    exemplar_status: resultado.novoStatusExemplarApi,
    estudante_desbloqueado: resultado.estudanteDesbloqueado,
    alerta_reserva: resultado.reservaRetida
      ? reservasService.formatarReserva(resultado.reservaRetida)
      : null,
    emprestimo: formatarEmprestimo(resultado.emprestimoAtualizado, agora),
  };
}

// =====================================================================
// 3. REGISTRAR RENOVAÇÃO (RF07 / RN-01, RN-03, RN-05)
// =====================================================================

async function registrarRenovacao(emprestimoId) {
  const agora = new Date();

  const emprestimoPrevio = await emprestimosRepository.buscarEmprestimoPorId(emprestimoId);
  if (!emprestimoPrevio) {
    throw criarErroHttp(404, 'Empréstimo não encontrado.', 'EMPRESTIMO_NAO_ENCONTRADO');
  }

  // Persiste bloqueio automático se o empréstimo ou outro livro do aluno já estiver vencido
  await emprestimosRepository.sincronizarAtrasos({
    estudanteId: emprestimoPrevio.estudante_id,
    referencia: agora,
  });

  const emprestimoRenovado = await emprestimosRepository.executarTransacao(async (transaction) => {
    const emprestimo = await emprestimosRepository.buscarEmprestimoPorId(emprestimoId, transaction);

    if (emprestimo.data_devolucao_realizada !== null) {
      throw criarErroHttp(
        409,
        'Não é possível renovar um empréstimo que já foi devolvido.',
        'EMPRESTIMO_JA_DEVOLVIDO'
      );
    }

    // RN-03: Bloqueia se o empréstimo atual já estiver vencido
    if (new Date(emprestimo.data_devolucao_prevista) < agora) {
      throw criarErroHttp(
        409,
        'Renovação bloqueada: este empréstimo já está em atraso (RN-03).',
        'EMPRESTIMO_EM_ATRASO'
      );
    }

    // RN-03: Bloqueia se o estudante estiver bloqueado/inativo ou possuir outro livro atrasado
    const outrosAtrasos = await emprestimosRepository.contarEmprestimosAtrasadosDoEstudante(
      emprestimo.estudante_id,
      agora,
      null,
      transaction
    );
    if (outrosAtrasos > 0 || emprestimo.estudante.status !== 'ativo') {
      throw criarErroHttp(
        409,
        'Renovação bloqueada: estudante com pendências em atraso ou status bloqueado (RN-03).',
        'ESTUDANTE_BLOQUEADO'
      );
    }

    // RN-05: Bloqueia se existir qualquer reserva pendente para a obra
    const reservasPendentes = await reservasRepository.contarReservasPendentesDaObra(
      emprestimo.exemplar.obra_id,
      transaction
    );
    if (reservasPendentes > 0) {
      throw criarErroHttp(
        409,
        'Renovação bloqueada: existe reserva pendente na fila para esta obra (RN-05).',
        'OBRA_COM_RESERVA_PENDENTE'
      );
    }

    // RN-01: Prorroga data prevista em +7 dias corridos e incrementa renovacoes
    const novaDataPrevista = adicionarDias(emprestimo.data_devolucao_prevista, PRAZO_PADRAO_DIAS);

    await emprestimosRepository.atualizarEmprestimo(
      emprestimo,
      {
        data_devolucao_prevista: novaDataPrevista,
        renovacoes: emprestimo.renovacoes + 1,
        status: 'ativo',
      },
      transaction
    );

    return emprestimosRepository.buscarEmprestimoPorId(emprestimo.id, transaction);
  });

  return formatarEmprestimo(emprestimoRenovado, agora);
}

// =====================================================================
// 4. LISTAGEM GERAL E DASHBOARD GERENCIAL (RF09)
// =====================================================================

async function listarEmprestimos(filtros = {}) {
  const agora = new Date();
  await emprestimosRepository.sincronizarAtrasos({ referencia: agora });

  const emprestimos = await emprestimosRepository.listarEmprestimos({
    status: filtros.status,
    estudanteMatricula: filtros.estudante_matricula || filtros.matricula,
    exemplarTombo: filtros.exemplar_tombo || filtros.tombo,
    apenasAtivos: filtros.apenas_ativos === 'true' || filtros.apenas_ativos === true,
  });

  return emprestimos.map((emp) => formatarEmprestimo(emp, agora));
}

/**
 * RF09: Dashboard da Bibliotecária com indicadores consolidados e destaque crítico (> 10 dias).
 * Atualiza automaticamente para 'bloqueado' leitores com empréstimos vencidos (RN-03).
 */
async function obterDashboard() {
  const agora = new Date();

  const sincronizacao = await emprestimosRepository.sincronizarAtrasos({ referencia: agora });
  const [ativos, reservasResumo] = await Promise.all([
    emprestimosRepository.listarEmprestimosAtivosCompletos(),
    emprestimosRepository.contarReservasPorStatus(),
  ]);

  const formatados = ativos.map((emp) => formatarEmprestimo(emp, agora));

  const devolucoesHoje = formatados.filter((emp) =>
    ehMesmoDiaLocal(emp.data_devolucao_prevista, agora)
  );
  const atrasosGerais = formatados
    .filter((emp) => emp.atrasado)
    .sort((a, b) => b.dias_atraso - a.dias_atraso);

  const atrasosCriticos = atrasosGerais
    .filter((emp) => emp.critico)
    .map((emp) => ({
      emprestimo_id: emp.id,
      dias_atraso: emp.dias_atraso,
      critico: true,
      data_emprestimo: emp.data_emprestimo,
      data_devolucao_prevista: emp.data_devolucao_prevista,
      aluno: emp.estudante,
      livro: {
        codigo: emp.exemplar?.obra?.codigo ?? null,
        titulo: emp.exemplar?.obra?.titulo ?? null,
        autor: emp.exemplar?.obra?.autor ?? null,
        exemplar_tombo: emp.exemplar?.codigo_tombo ?? null,
      },
      justificativa_atraso: emp.justificativa_atraso,
      justificativas: emp.justificativas,
    }));

  return {
    gerado_em: agora.toISOString(),
    sincronizacao_atrasos: sincronizacao,
    indicadores: {
      total_emprestimos_ativos: formatados.length,
      devolucoes_previstas_hoje: devolucoesHoje.length,
      total_atrasos: atrasosGerais.length,
      total_atrasos_criticos: atrasosCriticos.length,
      total_reservas_pendentes: reservasResumo.pendentes,
      total_reservas_aguardando_retirada: reservasResumo.aguardandoRetirada,
    },
    atrasos_criticos: atrasosCriticos,
    devolucoes_hoje: devolucoesHoje,
    atrasos_gerais: atrasosGerais,
  };
}

// =====================================================================
// 5. PORTAL DO ALUNO E JUSTIFICATIVA DE ATRASO (RF11)
// =====================================================================

async function listarMeusEmprestimos(usuarioAutenticado, matriculaFiltro = null) {
  const agora = new Date();
  let estudante = null;

  if (usuarioAutenticado.role === 'aluno') {
    if (!usuarioAutenticado.estudante_id) {
      throw criarErroHttp(
        403,
        'Conta de aluno sem vínculo com cadastro de estudante.',
        'ESTUDANTE_NAO_VINCULADO'
      );
    }
    estudante = await emprestimosRepository.buscarEstudantePorId(usuarioAutenticado.estudante_id);
  } else if (matriculaFiltro) {
    estudante = await emprestimosRepository.buscarEstudantePorMatricula(matriculaFiltro);
  } else if (usuarioAutenticado.estudante_id) {
    estudante = await emprestimosRepository.buscarEstudantePorId(usuarioAutenticado.estudante_id);
  } else {
    throw criarErroHttp(
      400,
      'Informe o parâmetro ?matricula= para consultar o portal de um estudante específico.',
      'MATRICULA_OBRIGATORIA'
    );
  }

  if (!estudante) {
    throw criarErroHttp(404, 'Estudante não encontrado.', 'ESTUDANTE_NAO_ENCONTRADO');
  }

  await emprestimosRepository.sincronizarAtrasos({
    estudanteId: estudante.id,
    referencia: agora,
  });

  const [estudanteAtualizado, emprestimos, reservas] = await Promise.all([
    emprestimosRepository.buscarEstudantePorId(estudante.id),
    emprestimosRepository.listarEmprestimos({ estudanteId: estudante.id }),
    reservasRepository.listarReservas({ estudanteId: estudante.id }),
  ]);

  const formatados = emprestimos.map((emp) => formatarEmprestimo(emp, agora));
  const emPosse = formatados.filter((emp) => emp.data_devolucao_realizada === null);
  const historico = formatados.filter((emp) => emp.data_devolucao_realizada !== null);

  return {
    estudante: {
      id: estudanteAtualizado.id,
      matricula: estudanteAtualizado.matricula,
      nome: estudanteAtualizado.nome_completo,
      turma: estudanteAtualizado.turma,
      telefone: estudanteAtualizado.telefone,
      status: estudanteAtualizado.status,
    },
    em_posse: emPosse,
    historico,
    reservas: reservas
      .filter((r) => r.status === 'pendente' || r.status === 'aguardando_retirada')
      .map((r) => reservasService.formatarReserva(r)),
  };
}

async function enviarJustificativaAtraso(emprestimoId, textoJustificativa, usuarioAutenticado) {
  const textoLimpo = String(textoJustificativa || '').trim();
  if (textoLimpo.length < 5) {
    throw criarErroHttp(
      400,
      'A justificativa de atraso deve conter ao menos 5 caracteres.',
      'JUSTIFICATIVA_INVALIDA'
    );
  }

  const resultado = await emprestimosRepository.executarTransacao(async (transaction) => {
    const emprestimo = await emprestimosRepository.buscarEmprestimoPorId(emprestimoId, transaction);
    if (!emprestimo) {
      throw criarErroHttp(404, 'Empréstimo não encontrado.', 'EMPRESTIMO_NAO_ENCONTRADO');
    }

    if (
      usuarioAutenticado.role === 'aluno' &&
      Number(emprestimo.estudante_id) !== Number(usuarioAutenticado.estudante_id)
    ) {
      throw criarErroHttp(
        403,
        'Permissão insuficiente. Você só pode enviar justificativas para seus próprios empréstimos.',
        'ACESSO_NEGADO'
      );
    }

    const justificativa = await emprestimosRepository.criarJustificativa(
      {
        emprestimo_id: emprestimo.id,
        estudante_id: emprestimo.estudante_id,
        texto_descritivo: textoLimpo,
        data_envio: new Date(),
        status: 'pendente',
      },
      transaction
    );

    const emprestimoAtualizado = await emprestimosRepository.buscarEmprestimoPorId(
      emprestimo.id,
      transaction
    );

    return { justificativa, emprestimoAtualizado };
  });

  return {
    mensagem: 'Justificativa de atraso registrada com sucesso.',
    justificativa: {
      id: resultado.justificativa.id,
      emprestimo_id: resultado.justificativa.emprestimo_id,
      texto_descritivo: resultado.justificativa.texto_descritivo,
      data_envio: resultado.justificativa.data_envio,
      status: resultado.justificativa.status,
    },
    emprestimo: formatarEmprestimo(resultado.emprestimoAtualizado),
  };
}

async function buscarEmprestimoPorId(emprestimoId, usuarioAutenticado) {
  const emprestimo = await emprestimosRepository.buscarEmprestimoPorId(emprestimoId);
  if (!emprestimo) {
    throw criarErroHttp(404, 'Empréstimo não encontrado.', 'EMPRESTIMO_NAO_ENCONTRADO');
  }

  if (
    usuarioAutenticado &&
    usuarioAutenticado.role === 'aluno' &&
    Number(emprestimo.estudante_id) !== Number(usuarioAutenticado.estudante_id)
  ) {
    throw criarErroHttp(
      403,
      'Permissão insuficiente. Você só pode consultar seus próprios empréstimos.',
      'ACESSO_NEGADO'
    );
  }

  return formatarEmprestimo(emprestimo);
}

/**
 * Edita campos administrativos de um empréstimo (data prevista, devolução, renovações ou status).
 */
async function editarEmprestimo(emprestimoId, dados) {
  const statusValidos = ['ativo', 'devolvido', 'atrasado'];

  const atualizado = await emprestimosRepository.executarTransacao(async (transaction) => {
    const emprestimo = await emprestimosRepository.buscarEmprestimoPorId(emprestimoId, transaction);
    if (!emprestimo) {
      throw criarErroHttp(404, 'Empréstimo não encontrado.', 'EMPRESTIMO_NAO_ENCONTRADO');
    }

    const campos = {};

    const novaPrevista = dados.data_devolucao_prevista ?? dados.data_prevista;
    if (novaPrevista !== undefined) {
      const data = new Date(novaPrevista);
      if (Number.isNaN(data.getTime())) {
        throw criarErroHttp(400, 'Data de devolução prevista inválida.', 'DATA_INVALIDA');
      }
      campos.data_devolucao_prevista = data;
    }

    const novaDevolucao = dados.data_devolucao_realizada ?? dados.data_devolucao;
    if (novaDevolucao !== undefined) {
      if (novaDevolucao === null || novaDevolucao === '') {
        campos.data_devolucao_realizada = null;
      } else {
        const data = new Date(novaDevolucao);
        if (Number.isNaN(data.getTime())) {
          throw criarErroHttp(400, 'Data de devolução realizada inválida.', 'DATA_INVALIDA');
        }
        campos.data_devolucao_realizada = data;
      }
    }

    if (dados.renovacoes !== undefined) {
      const renov = Number(dados.renovacoes);
      if (!Number.isInteger(renov) || renov < 0) {
        throw criarErroHttp(
          400,
          'O número de renovações deve ser um inteiro >= 0.',
          'RENOVACOES_INVALIDAS'
        );
      }
      campos.renovacoes = renov;
    }

    if (dados.status !== undefined) {
      const statusLimpo = String(dados.status).trim().toLowerCase();
      if (!statusValidos.includes(statusLimpo)) {
        throw criarErroHttp(
          400,
          `Status inválido. Valores permitidos: ${statusValidos.join(', ')}.`,
          'STATUS_INVALIDO'
        );
      }
      campos.status = statusLimpo;
    }

    if (Object.keys(campos).length > 0) {
      await emprestimosRepository.atualizarEmprestimo(emprestimo, campos, transaction);
    }

    return emprestimosRepository.buscarEmprestimoPorId(emprestimo.id, transaction);
  });

  return formatarEmprestimo(atualizado);
}

/**
 * Exclui um empréstimo por ID. Se ainda estava em aberto, devolve o exemplar para 'disponivel'.
 */
async function excluirEmprestimo(emprestimoId) {
  await emprestimosRepository.executarTransacao(async (transaction) => {
    const emprestimo = await emprestimosRepository.buscarEmprestimoPorId(emprestimoId, transaction);
    if (!emprestimo) {
      throw criarErroHttp(404, 'Empréstimo não encontrado.', 'EMPRESTIMO_NAO_ENCONTRADO');
    }

    if (
      emprestimo.data_devolucao_realizada === null &&
      emprestimo.exemplar &&
      emprestimo.exemplar.status === 'emprestado'
    ) {
      await emprestimosRepository.atualizarExemplar(
        emprestimo.exemplar,
        { status: 'disponivel' },
        transaction
      );
    }

    await emprestimosRepository.excluirEmprestimoComJustificativas(emprestimo.id, transaction);
  });
}

module.exports = {
  PRAZO_PADRAO_DIAS,
  LIMITE_EMPRESTIMOS_SIMULTANEOS,
  LIMITE_ATRASO_CRITICO_DIAS,
  registrarEmprestimo,
  registrarDevolucao,
  registrarRenovacao,
  listarEmprestimos,
  buscarEmprestimoPorId,
  editarEmprestimo,
  excluirEmprestimo,
  obterDashboard,
  listarMeusEmprestimos,
  enviarJustificativaAtraso,
};
