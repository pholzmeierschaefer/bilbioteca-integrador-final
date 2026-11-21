const express = require('express');
const reservasController = require('./reservas.controller');
const autenticar = require('../middlewares/autenticar');
const autorizar = require('../middlewares/autorizar');

const router = express.Router();

// =====================================================================
// CRUD COMPLETO DE RESERVAS (/api/reservas) — RF08 e RN-05
// =====================================================================

// Listar fila de reservas ordenada por ordem de chegada (FIFO)
router.get('/', autenticar, reservasController.listarReservas);

// Buscar reserva por ID
router.get('/:id', autenticar, reservasController.buscarReservaPorId);

// Criar reserva na fila de espera (status inicial 'pendente')
router.post('/', autenticar, reservasController.criarReserva);

// Atualizar status/alerta da reserva (apenas bibliotecario)
router.put('/:id', autenticar, autorizar('bibliotecario'), reservasController.editarReserva);

// Cancelar reserva (liberando ou repassando exemplar retido se aplicável)
router.put('/:id/cancelar', autenticar, reservasController.cancelarReserva);

// Excluir reserva por ID
router.delete('/:id', autenticar, reservasController.excluirReserva);

module.exports = router;
