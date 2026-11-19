require('dotenv').config();
const app = require('./app');
const { sequelize } = require('../models');

const PORT = process.env.PORT || 3000;

sequelize.authenticate()
  .then(() => console.log('Conexão com o banco de dados estabelecida com sucesso.'))
  .catch(err => console.error('Erro ao conectar com o banco de dados', err));

app.listen(PORT, () => {
  console.log(`Servidor a correr na porta ${PORT}`);
});
