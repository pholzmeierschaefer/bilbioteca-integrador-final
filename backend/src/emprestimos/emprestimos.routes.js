const express = require('express');
const emprestimosController = require('./emprestimos.controller');
const autenticar = require('../middlewares/autenticar');
const autorizar = require('../middlewares/autorizar');

const router = express.Router();

// =====================================================================
// ROTAS FIXAS (registradas antes de /:id para evitar conflito no Express)
// =====================================================================

// RF09: Dashboard gerencial com atrasos críticos > 10 dias (apenas bibliotecario)
router.get(
  '/dashboard',
  autenticar,
  autorizar('bibliotecario'),
  emprestimosController.obterDashboard
);

// RF11: Portal do aluno — livros em posse, histórico e reservas ativas (aluno e bibliotecario)
router.get('/meus', autenticar, emprestimosController.listarMeusEmprestimos);

// RF06: Devolução rápida no balcão informando { exemplar_tombo } no body (apenas bibliotecario)
router.patch(
  '/devolver',
  autenticar,
  autorizar('bibliotecario'),
  emprestimosController.registrarDevolucao
);

// =====================================================================
// CRUD COMPLETO E OPERAÇÕES DE BALCÃO (/api/emprestimos)
// =====================================================================

// Listar empréstimos com filtros (apenas bibliotecario)
router.get('/', autenticar, autorizar('bibliotecario'), emprestimosController.listarEmprestimos);

// Buscar empréstimo por ID (bibliotecario vê qualquer um; aluno vê apenas o próprio)
router.get('/:id', autenticar, emprestimosController.buscarEmprestimoPorId);

// RF05: Registrar empréstimo no balcão (apenas bibliotecario)
router.post('/', autenticar, autorizar('bibliotecario'), emprestimosController.registrarEmprestimo);

// Editar empréstimo por ID (apenas bibliotecario)
router.put('/:id', autenticar, autorizar('bibliotecario'), emprestimosController.editarEmprestimo);

// Excluir empréstimo por ID (apenas bibliotecario)
router.delete(
  '/:id',
  autenticar,
  autorizar('bibliotecario'),
  emprestimosController.excluirEmprestimo
);

// RF06: Registrar devolução por ID do empréstimo ou por exemplar_tombo no parâmetro (apenas bibliotecario)
router.patch(
  '/:id/devolver',
  autenticar,
  autorizar('bibliotecario'),
  emprestimosController.registrarDevolucao
);

// RF07: Registrar renovação (+7 dias corridos) (apenas bibliotecario)
router.patch(
  '/:id/renovar',
  autenticar,
  autorizar('bibliotecario'),
  emprestimosController.registrarRenovacao
);

// RF11: Enviar justificativa de atraso (aluno dono do empréstimo ou bibliotecario)
router.patch(
  '/:id/justificativa',
  autenticar,
  emprestimosController.enviarJustificativaAtraso
);

module.exports = router;
