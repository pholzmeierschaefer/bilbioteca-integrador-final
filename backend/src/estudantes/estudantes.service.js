const bcrypt = require('bcrypt');
const estudantesRepository = require('./estudantes.repository');

const SALT_ROUNDS = 12; // Custo >= 12 conforme diretrizes de segurança (Handout 05)
const STATUS_VALIDOS = ['ativo', 'bloqueado', 'inativo'];

function criarErroHttp(statusCode, mensagem, codigo) {
  const err = new Error(mensagem);
  err.statusCode = statusCode;
  if (codigo) err.codigo = codigo;
  return err;
}

/**
 * Gera um e-mail institucional padrão válido para contas de alunos criadas sem e-mail explícito,
 * permitindo login no portal do estudante mesmo após importação via planilha da secretaria.
 */
function gerarEmailPadrao(matricula) {
  const slug = String(matricula)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '');
  return `${slug || 'aluno'}@aluno.biblioteca.hm.edu.br`;
}

/**
 * Formata o estudante para resposta JSON, garantindo que o campo senha NUNCA seja exposto.
 */
function formatarEstudante(estudante) {
  return {
    id: estudante.id,
    matricula: estudante.matricula,
    nome: estudante.nome_completo,
    nome_completo: estudante.nome_completo,
    turma: estudante.turma,
    telefone: estudante.telefone,
    status: estudante.status,
    email: estudante.usuario ? estudante.usuario.email : null,
    role: estudante.usuario ? estudante.usuario.role : 'aluno',
    created_at: estudante.created_at,
    updated_at: estudante.updated_at,
  };
}

// =====================================================================
// PARSER CSV NATIVO (SEM BIBLIOTECAS EXTERNAS — RF04)
// =====================================================================

function normalizarCabecalho(texto) {
  return String(texto || '')
    .replace(/^\uFEFF/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

/**
 * Faz o split de uma linha CSV respeitando aspas duplas e o delimitador detectado (';' ou ',').
 */
function dividirLinhaCsv(linha, delimitador) {
  const colunas = [];
  let atual = '';
  let entreAspas = false;

  for (let i = 0; i < linha.length; i += 1) {
    const ch = linha[i];

    if (ch === '"') {
      if (entreAspas && linha[i + 1] === '"') {
        atual += '"';
        i += 1;
      } else {
        entreAspas = !entreAspas;
      }
    } else if (ch === delimitador && !entreAspas) {
      colunas.push(atual.trim());
      atual = '';
    } else {
      atual += ch;
    }
  }

  colunas.push(atual.trim());
  return colunas;
}

/**
 * Converte texto CSV (separado por ';' ou ',') em lista de objetos de estudantes.
 */
function parsearCsvEstudantes(conteudoCsv) {
  const textoLimpo = String(conteudoCsv || '').replace(/^\uFEFF/, '').trim();
  if (!textoLimpo) {
    throw criarErroHttp(400, 'O conteúdo CSV está vazio.', 'CSV_VAZIO');
  }

  const linhas = textoLimpo
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (linhas.length < 2) {
    throw criarErroHttp(
      400,
      'O CSV deve conter a linha de cabeçalho e ao menos uma linha de estudante.',
      'CSV_SEM_REGISTROS'
    );
  }

  // Detecta automaticamente ';' (padrão Excel PT-BR) ou ','
  const primeiraLinha = linhas[0];
  const delimitador =
    (primeiraLinha.match(/;/g) || []).length >= (primeiraLinha.match(/,/g) || []).length
      ? ';'
      : ',';

  const cabecalhos = dividirLinhaCsv(primeiraLinha, delimitador).map(normalizarCabecalho);

  const mapaColunas = {
    matricula: ['matricula', 'matr', 'ra', 'codigo'],
    nome: ['nome', 'nome_completo', 'aluno', 'estudante'],
    turma: ['turma', 'serie', 'classe', 'ano'],
    telefone: ['telefone', 'contato', 'celular', 'fone', 'whatsapp'],
    email: ['email', 'e-mail', 'e_mail'],
  };

  const encontrarIndice = (sinonimos) =>
    cabecalhos.findIndex((col) => sinonimos.includes(col));

  const idxMatricula = encontrarIndice(mapaColunas.matricula);
  const idxNome = encontrarIndice(mapaColunas.nome);
  const idxTurma = encontrarIndice(mapaColunas.turma);
  const idxTelefone = encontrarIndice(mapaColunas.telefone);
  const idxEmail = encontrarIndice(mapaColunas.email);

  if (idxMatricula === -1 || idxNome === -1 || idxTurma === -1) {
    throw criarErroHttp(
      400,
      'Cabeçalho CSV inválido. Colunas obrigatórias: matricula, nome e turma (opcional: telefone, email).',
      'CSV_CABECALHO_INVALIDO'
    );
  }

  const registros = [];
  for (let i = 1; i < linhas.length; i += 1) {
    const valores = dividirLinhaCsv(linhas[i], delimitador);
    registros.push({
      linha: i + 1,
      matricula: valores[idxMatricula] || '',
      nome: valores[idxNome] || '',
      turma: valores[idxTurma] || '',
      telefone: idxTelefone !== -1 ? valores[idxTelefone] || null : null,
      email: idxEmail !== -1 ? valores[idxEmail] || null : null,
    });
  }

  return registros;
}

// =====================================================================
// SERVIÇOS DE ESTUDANTES (RF03, RF04, RN-03 e RN-04)
// =====================================================================

async function listarEstudantes(filtros = {}) {
  if (filtros.status) {
    const statusLimpo = String(filtros.status).trim().toLowerCase();
    if (!STATUS_VALIDOS.includes(statusLimpo)) {
      throw criarErroHttp(
        400,
        `Status inválido. Valores permitidos: ${STATUS_VALIDOS.join(', ')}.`,
        'STATUS_INVALIDO'
      );
    }
  }

  const estudantes = await estudantesRepository.listarEstudantes({
    nome: filtros.nome,
    matricula: filtros.matricula,
    turma: filtros.turma,
    status: filtros.status,
    q: filtros.q || filtros.busca,
  });

  return estudantes.map(formatarEstudante);
}

/**
 * Localiza um estudante aceitando tanto matrícula quanto ID numérico.
 */
async function localizarEstudantePorMatriculaOuId(identificador, transaction) {
  const valor = String(identificador).trim();
  let estudante = await estudantesRepository.buscarEstudantePorMatricula(valor, transaction);
  if (!estudante && /^\d+$/.test(valor)) {
    estudante = await estudantesRepository.buscarEstudantePorId(Number(valor), transaction);
  }
  return estudante;
}

/**
 * Busca estudante por matrícula ou ID.
 * RBAC: bibliotecário consulta qualquer leitor; aluno só pode consultar a própria matrícula.
 */
async function buscarPorMatricula(matricula, usuarioAutenticado) {
  const identificador = String(matricula).trim();

  if (usuarioAutenticado && usuarioAutenticado.role === 'aluno') {
    let proprioEstudante = null;
    if (usuarioAutenticado.estudante_id) {
      proprioEstudante = await estudantesRepository.buscarEstudantePorId(
        usuarioAutenticado.estudante_id
      );
    }

    const matriculaDoToken = usuarioAutenticado.matricula || proprioEstudante?.matricula;
    const correspondeMatricula =
      matriculaDoToken && matriculaDoToken.toLowerCase() === identificador.toLowerCase();
    const correspondeId =
      proprioEstudante && /^\d+$/.test(identificador) && Number(identificador) === proprioEstudante.id;

    if (!correspondeMatricula && !correspondeId) {
      throw criarErroHttp(
        403,
        'Permissão insuficiente. Você só pode consultar os seus próprios dados.',
        'ACESSO_NEGADO'
      );
    }

    if (proprioEstudante) {
      return formatarEstudante(proprioEstudante);
    }
  }

  const estudante = await localizarEstudantePorMatriculaOuId(identificador);
  if (!estudante) {
    throw criarErroHttp(404, 'Estudante não encontrado.', 'ESTUDANTE_NAO_ENCONTRADO');
  }

  return formatarEstudante(estudante);
}

/**
 * Cadastra um estudante e sua conta de acesso vinculada (role: 'aluno').
 * Caso a senha não seja informada, usa a própria matrícula como senha inicial padrão (bcrypt custo 12).
 */
async function cadastrarEstudante(dados) {
  const matriculaLimpa = String(dados.matricula).trim();
  const nomeLimpo = String(dados.nome || dados.nome_completo).trim();
  const turmaLimpa = String(dados.turma).trim();
  const telefoneLimpo = dados.telefone ? String(dados.telefone).trim() : null;
  const statusFinal = dados.status ? String(dados.status).trim().toLowerCase() : 'ativo';

  if (!STATUS_VALIDOS.includes(statusFinal)) {
    throw criarErroHttp(
      400,
      `Status inválido. Valores permitidos: ${STATUS_VALIDOS.join(', ')}.`,
      'STATUS_INVALIDO'
    );
  }

  const existente = await estudantesRepository.buscarEstudantePorMatricula(matriculaLimpa);
  if (existente) {
    throw criarErroHttp(
      409,
      `Já existe um estudante cadastrado com a matrícula "${matriculaLimpa}".`,
      'MATRICULA_DUPLICADA'
    );
  }

  const emailFinal = dados.email
    ? String(dados.email).trim().toLowerCase()
    : gerarEmailPadrao(matriculaLimpa);

  const emailExistente = await estudantesRepository.buscarUsuarioPorEmail(emailFinal);
  if (emailExistente) {
    throw criarErroHttp(
      409,
      `O e-mail "${emailFinal}" já está vinculado a outro usuário.`,
      'EMAIL_DUPLICADO'
    );
  }

  // Senha inicial padrão = própria matrícula quando não informada
  const senhaTexto =
    dados.senha !== undefined && dados.senha !== null && String(dados.senha).trim() !== ''
      ? String(dados.senha)
      : matriculaLimpa;
  const senhaHash = await bcrypt.hash(senhaTexto, SALT_ROUNDS);

  const estudanteCriado = await estudantesRepository.executarTransacao(async (transaction) => {
    const novoEstudante = await estudantesRepository.criarEstudante(
      {
        matricula: matriculaLimpa,
        nome_completo: nomeLimpo,
        turma: turmaLimpa,
        telefone: telefoneLimpo,
        status: statusFinal,
      },
      transaction
    );

    await estudantesRepository.criarUsuario(
      {
        nome: nomeLimpo,
        matricula: matriculaLimpa,
        email: emailFinal,
        senha: senhaHash,
        role: 'aluno',
        estudante_id: novoEstudante.id,
      },
      transaction
    );

    return estudantesRepository.buscarEstudantePorId(novoEstudante.id, transaction);
  });

  return formatarEstudante(estudanteCriado);
}

/**
 * Edita os dados de um estudante e mantém o usuário associado sincronizado.
 */
async function editarEstudante(matriculaParam, dados) {
  const estudante = await localizarEstudantePorMatriculaOuId(matriculaParam);
  if (!estudante) {
    throw criarErroHttp(404, 'Estudante não encontrado.', 'ESTUDANTE_NAO_ENCONTRADO');
  }

  const camposEstudante = {};
  const camposUsuario = {};

  if (dados.matricula !== undefined) {
    const novaMatricula = String(dados.matricula).trim();
    if (novaMatricula.toLowerCase() !== estudante.matricula.toLowerCase()) {
      const duplicado = await estudantesRepository.buscarEstudantePorMatricula(novaMatricula);
      if (duplicado && duplicado.id !== estudante.id) {
        throw criarErroHttp(
          409,
          `Já existe outro estudante com a matrícula "${novaMatricula}".`,
          'MATRICULA_DUPLICADA'
        );
      }
      camposEstudante.matricula = novaMatricula;
      camposUsuario.matricula = novaMatricula;
    }
  }

  const novoNome = dados.nome ?? dados.nome_completo;
  if (novoNome !== undefined) {
    const nomeLimpo = String(novoNome).trim();
    camposEstudante.nome_completo = nomeLimpo;
    camposUsuario.nome = nomeLimpo;
  }

  if (dados.turma !== undefined) {
    camposEstudante.turma = String(dados.turma).trim();
  }

  if (dados.telefone !== undefined) {
    camposEstudante.telefone = dados.telefone ? String(dados.telefone).trim() : null;
  }

  if (dados.status !== undefined) {
    const novoStatus = String(dados.status).trim().toLowerCase();
    if (!STATUS_VALIDOS.includes(novoStatus)) {
      throw criarErroHttp(
        400,
        `Status inválido. Valores permitidos: ${STATUS_VALIDOS.join(', ')}.`,
        'STATUS_INVALIDO'
      );
    }

    if (novoStatus === 'inativo' && estudante.status !== 'inativo') {
      const emAberto = await estudantesRepository.contarEmprestimosEmAberto(estudante.id);
      if (emAberto > 0) {
        throw criarErroHttp(
          409,
          'Não é possível inativar o estudante pois há empréstimos em aberto.',
          'ESTUDANTE_COM_EMPRESTIMO_ABERTO'
        );
      }
    }

    camposEstudante.status = novoStatus;
  }

  if (dados.email !== undefined && dados.email !== null && String(dados.email).trim() !== '') {
    const novoEmail = String(dados.email).trim().toLowerCase();
    const usuarioAtual = estudante.usuario;
    if (!usuarioAtual || novoEmail !== usuarioAtual.email.toLowerCase()) {
      const emailDuplicado = await estudantesRepository.buscarUsuarioPorEmail(novoEmail);
      if (emailDuplicado && (!usuarioAtual || emailDuplicado.id !== usuarioAtual.id)) {
        throw criarErroHttp(
          409,
          `O e-mail "${novoEmail}" já está em uso por outro usuário.`,
          'EMAIL_DUPLICADO'
        );
      }
      camposUsuario.email = novoEmail;
    }
  }

  if (dados.senha !== undefined && dados.senha !== null && String(dados.senha).trim() !== '') {
    camposUsuario.senha = await bcrypt.hash(String(dados.senha), SALT_ROUNDS);
  }

  const atualizado = await estudantesRepository.executarTransacao(async (transaction) => {
    if (Object.keys(camposEstudante).length > 0) {
      await estudantesRepository.atualizarEstudante(estudante, camposEstudante, transaction);
    }

    if (Object.keys(camposUsuario).length > 0) {
      const usuarioVinculado = await estudantesRepository.buscarUsuarioPorEstudanteId(
        estudante.id,
        transaction
      );

      if (usuarioVinculado) {
        await estudantesRepository.atualizarUsuario(usuarioVinculado, camposUsuario, transaction);
      } else {
        const matriculaRef = camposEstudante.matricula || estudante.matricula;
        const senhaHash = camposUsuario.senha || (await bcrypt.hash(matriculaRef, SALT_ROUNDS));
        await estudantesRepository.criarUsuario(
          {
            nome: camposUsuario.nome || estudante.nome_completo,
            matricula: matriculaRef,
            email: camposUsuario.email || gerarEmailPadrao(matriculaRef),
            senha: senhaHash,
            role: 'aluno',
            estudante_id: estudante.id,
          },
          transaction
        );
      }
    }

    return estudantesRepository.buscarEstudantePorId(estudante.id, transaction);
  });

  return formatarEstudante(atualizado);
}

/**
 * Altera apenas o status administrativo do estudante (ativo | bloqueado | inativo).
 * RN-03 e RN-04: bloqueio administrativo sem cobrança de multa financeira.
 */
async function alterarStatusEstudante(matriculaParam, novoStatus) {
  return editarEstudante(matriculaParam, { status: novoStatus });
}

/**
 * Inativa o estudante (soft-delete), preservando o histórico de empréstimos e reservas.
 */
async function inativarEstudante(matriculaParam) {
  const estudante = await localizarEstudantePorMatriculaOuId(matriculaParam);
  if (!estudante) {
    throw criarErroHttp(404, 'Estudante não encontrado.', 'ESTUDANTE_NAO_ENCONTRADO');
  }

  const emAberto = await estudantesRepository.contarEmprestimosEmAberto(estudante.id);
  if (emAberto > 0) {
    throw criarErroHttp(
      409,
      'Não é possível inativar o estudante pois há empréstimos em aberto.',
      'ESTUDANTE_COM_EMPRESTIMO_ABERTO'
    );
  }

  await estudantesRepository.atualizarEstudante(estudante, { status: 'inativo' });
}

/**
 * RF04: Importação em lote de alunos a partir de CSV nativo ou lista JSON.
 * Todos os novos alunos recebem status 'ativo', role 'aluno' e senha inicial = hash da matrícula.
 * Evita duplicidade por matrícula (por padrão ignora existentes, ou atualiza se atualizar_existentes = true).
 */
async function importarEstudantes({ csv, estudantes, atualizarExistentes = false }) {
  let listaBruta = [];

  if (typeof csv === 'string') {
    listaBruta = parsearCsvEstudantes(csv);
  } else if (Array.isArray(estudantes)) {
    listaBruta = estudantes.map((item, idx) => ({
      linha: idx + 1,
      matricula: item?.matricula ?? '',
      nome: item?.nome ?? item?.nome_completo ?? '',
      turma: item?.turma ?? '',
      telefone: item?.telefone ?? null,
      email: item?.email ?? null,
    }));
  } else {
    throw criarErroHttp(
      400,
      'Envie um texto CSV ou um array JSON de estudantes para importação.',
      'FORMATO_IMPORTACAO_INVALIDO'
    );
  }

  if (listaBruta.length === 0) {
    throw criarErroHttp(400, 'Nenhum estudante informado para importação.', 'LISTA_VAZIA');
  }

  let criados = 0;
  let jaExistiam = 0;
  let atualizados = 0;
  const detalhesExistentes = [];
  const erros = [];
  const matriculasProcessadasNoLote = new Set();

  for (const registro of listaBruta) {
    const matriculaLimpa = String(registro.matricula || '').trim();
    const nomeLimpo = String(registro.nome || '').trim();
    const turmaLimpa = String(registro.turma || '').trim();
    const telefoneLimpo = registro.telefone ? String(registro.telefone).trim() : null;

    if (!matriculaLimpa || !nomeLimpo || !turmaLimpa) {
      erros.push({
        linha: registro.linha,
        matricula: matriculaLimpa || null,
        motivo: 'Campos obrigatórios ausentes (matricula, nome e turma).',
      });
      continue;
    }

    const chaveMatricula = matriculaLimpa.toLowerCase();
    if (matriculasProcessadasNoLote.has(chaveMatricula)) {
      jaExistiam += 1;
      detalhesExistentes.push(matriculaLimpa);
      continue;
    }
    matriculasProcessadasNoLote.add(chaveMatricula);

    const existente = await estudantesRepository.buscarEstudantePorMatricula(matriculaLimpa);
    if (existente) {
      jaExistiam += 1;
      detalhesExistentes.push(matriculaLimpa);

      if (atualizarExistentes) {
        await estudantesRepository.executarTransacao(async (transaction) => {
          await estudantesRepository.atualizarEstudante(
            existente,
            {
              nome_completo: nomeLimpo,
              turma: turmaLimpa,
              telefone: telefoneLimpo,
            },
            transaction
          );

          const usuarioVinculado = await estudantesRepository.buscarUsuarioPorEstudanteId(
            existente.id,
            transaction
          );
          if (usuarioVinculado) {
            await estudantesRepository.atualizarUsuario(
              usuarioVinculado,
              { nome: nomeLimpo },
              transaction
            );
          }
        });
        atualizados += 1;
      }
      continue;
    }

    // Novo estudante: status 'ativo', role 'aluno' e senha inicial padrão = hash da matrícula
    const emailFinal = registro.email
      ? String(registro.email).trim().toLowerCase()
      : gerarEmailPadrao(matriculaLimpa);

    const emailEmUso = await estudantesRepository.buscarUsuarioPorEmail(emailFinal);
    if (emailEmUso) {
      erros.push({
        linha: registro.linha,
        matricula: matriculaLimpa,
        motivo: `E-mail "${emailFinal}" já está cadastrado para outro usuário.`,
      });
      continue;
    }

    const senhaHash = await bcrypt.hash(matriculaLimpa, SALT_ROUNDS);

    await estudantesRepository.executarTransacao(async (transaction) => {
      const novoEstudante = await estudantesRepository.criarEstudante(
        {
          matricula: matriculaLimpa,
          nome_completo: nomeLimpo,
          turma: turmaLimpa,
          telefone: telefoneLimpo,
          status: 'ativo',
        },
        transaction
      );

      await estudantesRepository.criarUsuario(
        {
          nome: nomeLimpo,
          matricula: matriculaLimpa,
          email: emailFinal,
          senha: senhaHash,
          role: 'aluno',
          estudante_id: novoEstudante.id,
        },
        transaction
      );
    });

    criados += 1;
  }

  return {
    mensagem: 'Importação em lote processada.',
    total_processados: listaBruta.length,
    criados,
    ja_existiam: jaExistiam,
    atualizados,
    invalidos: erros.length,
    detalhes_existentes: detalhesExistentes,
    erros,
  };
}

module.exports = {
  STATUS_VALIDOS,
  listarEstudantes,
  buscarPorMatricula,
  cadastrarEstudante,
  editarEstudante,
  alterarStatusEstudante,
  inativarEstudante,
  importarEstudantes,
};
