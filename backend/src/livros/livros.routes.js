const express = require('express');
const livrosController = require('./livros.controller');
const autenticar = require('../middlewares/autenticar');
const autorizar = require('../middlewares/autorizar');

const router = express.Router();

// =====================================================================
// ROTAS DE EXEMPLARES POR TOMBO (/api/livros/exemplares/:tombo)
// Registradas antes de /:id para evitar conflito de parâmetros no Express
// =====================================================================

// Consulta de exemplar específico (bibliotecario e aluno)
router.get('/exemplares/:tombo', autenticar, livrosController.buscarExemplarPorTombo);

// Edição de status/tombo e exclusão de exemplar (apenas bibliotecario)
router.patch(
  '/exemplares/:tombo',
  autenticar,
  autorizar('bibliotecario'),
  livrosController.editarExemplar
);
router.put(
  '/exemplares/:tombo',
  autenticar,
  autorizar('bibliotecario'),
  livrosController.editarExemplar
);
router.delete(
  '/exemplares/:tombo',
  autenticar,
  autorizar('bibliotecario'),
  livrosController.excluirExemplar
);

// =====================================================================
// ROTAS DE EXEMPLARES VINCULADOS À OBRA (/api/livros/:codigo/exemplares)
// =====================================================================

// Listagem de exemplares de uma obra (bibliotecario e aluno)
router.get('/:codigo/exemplares', autenticar, livrosController.listarExemplaresDaObra);

// Cadastro de novo exemplar físico com código de tombo único - RN-06 (apenas bibliotecario)
router.post(
  '/:codigo/exemplares',
  autenticar,
  autorizar('bibliotecario'),
  livrosController.cadastrarExemplar
);

// =====================================================================
// ROTAS DE OBRAS (/api/livros)
// =====================================================================

// RF10: Consulta rápida de acervo com filtros e disponibilidade em tempo real (bibliotecario e aluno)
router.get('/', autenticar, livrosController.listarObras);

// Busca detalhada de obra por ID ou código com lista de exemplares (bibliotecario e aluno)
router.get('/:id', autenticar, livrosController.buscarObraPorId);

// RF01: Catalogação, edição e exclusão de obras (apenas bibliotecario)
router.post('/', autenticar, autorizar('bibliotecario'), livrosController.criarObra);
router.put('/:id', autenticar, autorizar('bibliotecario'), livrosController.editarObra);
router.delete('/:id', autenticar, autorizar('bibliotecario'), livrosController.excluirObra);

module.exports = router;
