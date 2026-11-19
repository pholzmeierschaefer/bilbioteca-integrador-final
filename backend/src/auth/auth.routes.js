const express = require('express');
const authController = require('./auth.controller');
const autenticar = require('../middlewares/autenticar');
const asyncHandler = require('../middlewares/asyncHandler');

const router = express.Router();

// Rotas públicas de autenticação
router.post('/registrar', asyncHandler(authController.registrar));
router.post('/login', asyncHandler(authController.login));

// Rota protegida para consultar o perfil do usuário autenticado via JWT
router.get('/perfil', autenticar, asyncHandler(authController.perfil));

module.exports = router;
