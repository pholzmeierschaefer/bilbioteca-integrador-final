const express = require('express');
const authController = require('./auth.controller');
const autenticar = require('../middlewares/autenticar');
const asyncHandler = require('../middlewares/asyncHandler');

const router = express.Router();

// Rotas públicas de autenticação
router.post('/registrar', asyncHandler(authController.registrar));
router.post('/login', asyncHandler(authController.login));

// Rotas protegidas do usuário autenticado via JWT
router.get('/perfil', autenticar, asyncHandler(authController.perfil));
router.put('/senha', autenticar, asyncHandler(authController.alterarSenha));

module.exports = router;
