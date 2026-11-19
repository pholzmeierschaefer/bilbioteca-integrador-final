const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const db = require('../models');
const authRoutes = require('./auth/auth.routes');
const livrosRoutes = require('./livros/livros.routes');
const estudantesRoutes = require('./estudantes/estudantes.routes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// 1. Middlewares globais (sempre registrados ANTES das rotas)
app.use(cors());
app.use(express.json());

// 2. Rota simples de verificação de status da API
app.get('/', (req, res) => {
  res.status(200).json({
    sistema: 'Biblioteca HM — EEB Humberto Machado',
    status: 'online',
    fase: 3,
  });
});

// 3. Módulos de rotas por funcionalidade (Feature-based)
app.use('/auth', authRoutes);
app.use('/api/livros', livrosRoutes);
app.use('/api/estudantes', estudantesRoutes);
// Próximas fases:
// app.use('/api/emprestimos', emprestimosRoutes); // Fase 4
// app.use('/api/reservas', reservasRoutes);       // Fase 4

// 4. Catch-all para rotas inexistentes (404 padronizado)
app.use((req, res) => {
  res.status(404).json({
    erro: `Rota não encontrada: ${req.method} ${req.originalUrl}`,
    codigo: 'ROTA_NAO_ENCONTRADA',
  });
});

// 5. Middleware global de tratamento de erros (SEMPRE o último)
app.use(errorHandler);

// Inicialização: autentica banco, sincroniza em dev e sobe o servidor
async function iniciar() {
  try {
    await db.sequelize.authenticate();
    console.log('Conexão com o PostgreSQL estabelecida com sucesso.');

    if (env.nodeEnv === 'development') {
      await db.sequelize.sync({ alter: true });
      console.log('Models sincronizados com o banco de dados (modo development).');
    }

    app.listen(env.port, () => {
      console.log(`Servidor Biblioteca HM rodando em http://localhost:${env.port}`);
    });
  } catch (err) {
    console.error('Falha ao iniciar o servidor:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  iniciar();
}

module.exports = app;
