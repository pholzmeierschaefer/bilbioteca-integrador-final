const { Router } = require('express');
const authRoutes = require('../../modules/auth/routes/authRoutes');

const router = Router();

router.use('/auth', authRoutes);
// Futuros módulos:
// router.use('/livros', livrosRoutes);
// router.use('/emprestimos', emprestimosRoutes);

module.exports = router;
