const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const authRepository = require('./auth.repository');

const SALT_ROUNDS = 12; // Fator de custo >= 12 (Handout 05, Tabela 3)
// Hash bcrypt válido usado quando o usuário não existe, equalizando o tempo de resposta
const HASH_FICTICIO = '$2b$12$C6UzMDM.H6dfI/f/IKcEeO7H8d4K9vP6qG0mW1xZ2yA3bC4dE5fG6';

function criarErroHttp(statusCode, mensagem, codigo) {
  const err = new Error(mensagem);
  err.statusCode = statusCode;
  if (codigo) err.codigo = codigo;
  return err;
}

/**
 * Gera JWT contendo apenas o payload mínimo necessário (id, role, estudante_id).
 */
function gerarToken(usuario) {
  if (!env.jwtSecret) {
    throw criarErroHttp(500, 'JWT_SECRET não configurado nas variáveis de ambiente.');
  }

  return jwt.sign(
    {
      id: usuario.id,
      role: usuario.role,
      estudante_id: usuario.estudante_id ?? null,
    },
    env.jwtSecret,
    { algorithm: 'HS256', expiresIn: env.jwtExpiresIn }
  );
}

/**
 * Cadastra um novo usuário com senha criptografada via bcrypt (custo 12).
 * Caso ainda não exista nenhum bibliotecário no sistema, permite criar o primeiro como 'bibliotecario'.
 */
async function registrar({ nome, email, senha, role, matricula, turma, telefone }) {
  const emailNormalizado = String(email).trim().toLowerCase();

  const existente = await authRepository.buscarUsuarioPorEmail(emailNormalizado);
  if (existente) {
    throw criarErroHttp(409, 'E-mail já cadastrado.', 'EMAIL_DUPLICADO');
  }

  const totalBibliotecarios = await authRepository.contarUsuariosPorRole('bibliotecario');
  const papelFinal =
    role === 'bibliotecario' && totalBibliotecarios === 0 ? 'bibliotecario' : 'aluno';

  const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);

  const usuarioCriado = await authRepository.executarTransacao(async (transaction) => {
    let estudanteId = null;

    // Se for estudante e informar matrícula, vincula ao aluno existente ou cria o registro
    if (papelFinal === 'aluno' && matricula) {
      const matriculaLimpa = String(matricula).trim();
      let estudante = await authRepository.buscarEstudantePorMatricula(
        matriculaLimpa,
        transaction
      );

      if (!estudante && turma) {
        estudante = await authRepository.criarEstudante(
          {
            matricula: matriculaLimpa,
            nome_completo: String(nome).trim(),
            turma: String(turma).trim(),
            telefone: telefone ? String(telefone).trim() : null,
            status: 'ativo',
          },
          transaction
        );
      }

      if (estudante) {
        estudanteId = estudante.id;
      }
    }

    return authRepository.criarUsuario(
      {
        nome: String(nome).trim(),
        email: emailNormalizado,
        senha: senhaHash,
        role: papelFinal,
        estudante_id: estudanteId,
      },
      transaction
    );
  });

  // Nunca retorna o hash da senha
  return {
    id: usuarioCriado.id,
    nome: usuarioCriado.nome,
    email: usuarioCriado.email,
    role: usuarioCriado.role,
    estudante_id: usuarioCriado.estudante_id,
  };
}

/**
 * Autentica credenciais e retorna o token JWT + dados públicos do usuário.
 */
async function login({ email, senha }) {
  const emailNormalizado = String(email).trim().toLowerCase();
  const usuario = await authRepository.buscarUsuarioPorEmail(emailNormalizado);

  // Executa bcrypt.compare mesmo se o usuário não existir (mitigação de timing attack)
  const senhaValida = await bcrypt.compare(senha, usuario?.senha ?? HASH_FICTICIO);

  if (!usuario || !senhaValida) {
    throw criarErroHttp(401, 'Credenciais inválidas.', 'CREDENCIAIS_INVALIDAS');
  }

  const token = gerarToken(usuario);

  return {
    token,
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      role: usuario.role,
      estudante_id: usuario.estudante_id,
    },
  };
}

/**
 * Busca os dados do usuário autenticado no banco (sem o hash da senha).
 */
async function obterPerfil(usuarioId) {
  const usuario = await authRepository.buscarUsuarioPorIdSemSenha(usuarioId);
  if (!usuario) {
    throw criarErroHttp(404, 'Usuário não encontrado.', 'USUARIO_NAO_ENCONTRADO');
  }
  return usuario;
}

module.exports = {
  registrar,
  login,
  obterPerfil,
};
