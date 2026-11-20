const express = require('express');
const reservasController = require('./reservas.controller');
const autenticar = require('../middlewares/autenticar');

const router = express.Router();

// =====================================================================
// ROTAS DE RESERVAS (/api/reservas) — RF08 e RN-05
// Acessíveis para aluno e bibliotecario (com escopo RBAC no service)
// =====================================================================

// Lista fila de reservas ordenada por ordem de chegada (FIFO)
router.get('/', autenticar, reservasController.listarReservas);

// Coloca estudante na fila de espera de uma obra (status inicial 'pendente')
router.post('/', autenticar, reservasController.criarReserva);

// Cancela uma reserva (liberando ou repassando exemplar retido se aplicável)
router.patch('/:id/cancelar', autenticar, reservasController.cancelarReserva);

module.exports = router;
