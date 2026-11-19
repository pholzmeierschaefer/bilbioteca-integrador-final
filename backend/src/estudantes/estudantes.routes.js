const express = require('express');
const estudantesController = require('./estudantes.controller');
const autenticar = require('../middlewares/autenticar');
const autorizar = require('../middlewares/autorizar');

const router = express.Router();

// Parser nativo do Express para aceitar upload de CSV simples (text/csv ou text/plain) sem bibliotecas extras
const parseCsvBody = express.text({ type: ['text/csv', 'text/plain'], limit: '2mb' });

// =====================================================================
// IMPORTAÇÃO EM LOTE (/api/estudantes/importar) — RF04
// Registrada antes de /:matricula para evitar conflito de rota
// =====================================================================
router.post(
  '/importar',
  autenticar,
  autorizar('bibliotecario'),
  parseCsvBody,
  estudantesController.importarEstudantes
);

// =====================================================================
// GESTÃO DE ESTUDANTES (/api/estudantes) — RF03, RN-03 e RN-04
// =====================================================================

// Listagem com filtros em tempo real por nome, matrícula, turma ou status (apenas bibliotecario)
router.get('/', autenticar, autorizar('bibliotecario'), estudantesController.listarEstudantes);

// Cadastro individual de estudante (apenas bibliotecario)
router.post('/', autenticar, autorizar('bibliotecario'), estudantesController.cadastrarEstudante);

// Consulta por matrícula: bibliotecario acessa qualquer leitor; aluno acessa apenas seus próprios dados
router.get('/:matricula', autenticar, estudantesController.buscarPorMatricula);

// Edição de dados e status administrativo do estudante (apenas bibliotecario)
router.put('/:matricula', autenticar, autorizar('bibliotecario'), estudantesController.editarEstudante);
router.patch(
  '/:matricula/status',
  autenticar,
  autorizar('bibliotecario'),
  estudantesController.alterarStatusEstudante
);

// Inativação de estudante preservando histórico (apenas bibliotecario)
router.delete(
  '/:matricula',
  autenticar,
  autorizar('bibliotecario'),
  estudantesController.inativarEstudante
);

module.exports = router;
