const env = require('../src/config/env');

// Configuração de conexão por ambiente para o Sequelize e Sequelize CLI (sem senhas hardcoded)
const base = {
  username: env.db.user,
  password: env.db.pass,
  database: env.db.name,
  host: env.db.host,
  port: env.db.port,
  dialect: 'postgres',
  logging: env.nodeEnv === 'development' ? console.log : false,
  define: {
    underscored: true,
    freezeTableName: true,
    timestamps: true,
  },
};

module.exports = {
  development: { ...base },
  test: {
    ...base,
    database: process.env.DB_NAME_TEST || `${base.database}_test`,
    logging: false,
  },
  production: {
    ...base,
    logging: false,
  },
};
