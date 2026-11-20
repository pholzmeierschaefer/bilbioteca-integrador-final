const express = require('express');
const relatoriosController = require('./relatorios.controller');
const autenticar = require('../middlewares/autenticar');
const autorizar = require('../middlewares/autorizar');

const router = express.Router();

// =====================================================================
// ROTAS DE RELATÓRIOS GERENCIAIS (/api/relatorios) — RF12
// Restritas ao perfil bibliotecario; aceitam ?mes=&ano=&formato=csv
// =====================================================================

router.use(autenticar, autorizar('bibliotecario'));

router.get('/livros-mais-lidos', relatoriosController.livrosMaisLidos);
router.get('/frequencia-turmas', relatoriosController.frequenciaTurmas);
router.get('/taxas-atraso', relatoriosController.taxasAtraso);

module.exports = router;
