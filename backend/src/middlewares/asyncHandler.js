/**
 * Wrapper DRY para funções async no Express (Handout 04, Código 15).
 * Encaminha qualquer Promise rejeitada para o middleware global de erros via next(err).
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
