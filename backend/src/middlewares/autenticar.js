const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Middleware manual de autenticação JWT (Handout 05, Código 13).
 * Verifica assinatura e expiração sem consultar o banco e popula req.usuario.
 */
function autenticar(req, res, next) {
  const authHeader = req.headers.authorization;
  const token =
    authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (!token) {
    return res.status(401).json({ erro: 'Token de autenticação ausente.' });
  }

  try {
    // algorithms: ['HS256'] rejeita tokens adulterados com algoritmos inesperados (ex.: none)
    const payload = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });
    req.usuario = payload; // { id, role, estudante_id, iat, exp }
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ erro: 'Token expirado.', expirado: true });
    }
    return res.status(401).json({ erro: 'Token inválido.' });
  }
}

module.exports = autenticar;

