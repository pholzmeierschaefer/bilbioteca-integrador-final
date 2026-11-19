const { Sequelize } = require('sequelize');
const configs = require('./config');

const ambiente = process.env.NODE_ENV || 'development';
const config = configs[ambiente];

// Instância única de conexão Sequelize compartilhada por toda a aplicação (DRY)
const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  config
);

module.exports = sequelize;
