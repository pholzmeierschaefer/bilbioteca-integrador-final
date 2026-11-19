/**
 * Middleware manual de autorização por papéis - RBAC (Handout 05, Código 17).
 * Deve ser utilizado sempre APÓS o middleware autenticar().
 */
function autorizar(...papeisPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ erro: 'Usuário não autenticado.' });
    }

    if (!papeisPermitidos.includes(req.usuario.role)) {
      return res.status(403).json({
        erro: 'Permissão insuficiente.',
        necessario: papeisPermitidos,
        atual: req.usuario.role,
      });
    }

    return next();
  };
}

module.exports = autorizar;

