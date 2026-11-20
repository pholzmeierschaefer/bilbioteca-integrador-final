const authService = require('./auth.service');

/**
 * Camada Controller de Auth: recebe req, valida entrada básica, chama Service e retorna res.
 */
async function registrar(req, res) {
  const { nome, email, senha, role, matricula, turma, telefone } = req.body;
  const detalhes = [];

  if (!nome || String(nome).trim() === '') {
    detalhes.push({ campo: 'nome', mensagem: 'O nome é obrigatório.' });
  }
  if (!email || !String(email).includes('@')) {
    detalhes.push({ campo: 'email', mensagem: 'Informe um e-mail válido.' });
  }
  if (!senha || String(senha).length < 6) {
    detalhes.push({ campo: 'senha', mensagem: 'A senha deve ter no mínimo 6 caracteres.' });
  }

  if (detalhes.length > 0) {
    return res.status(400).json({ erro: 'Dados inválidos.', detalhes });
  }

  const usuario = await authService.registrar({
    nome,
    email,
    senha,
    role,
    matricula,
    turma,
    telefone,
  });

  return res.status(201).json(usuario);
}

async function login(req, res) {
  const { matricula, email, senha, perfil } = req.body;
  const identificador = matricula ?? email;

  if (!identificador || !senha) {
    return res.status(400).json({
      erro: 'Matrícula e senha são obrigatórias.',
      detalhes: [
        !identificador && { campo: 'matricula', mensagem: 'Obrigatória.' },
        !senha && { campo: 'senha', mensagem: 'Obrigatória.' },
      ].filter(Boolean),
    });
  }

  const resultado = await authService.login({ matricula, email, senha, perfil });
  return res.status(200).json(resultado);
}

async function perfil(req, res) {
  const usuario = await authService.obterPerfil(req.usuario.id);
  return res.status(200).json(usuario);
}

module.exports = {
  registrar,
  login,
  perfil,
};
