const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Carrega o .env de backend/src/.env (padrão da arquitetura) ou backend/.env como fallback
const caminhoSrcEnv = path.resolve(__dirname, '..', '.env');
const caminhoRaizEnv = path.resolve(__dirname, '..', '..', '.env');

if (fs.existsSync(caminhoSrcEnv)) {
  dotenv.config({ path: caminhoSrcEnv });
} else if (fs.existsSync(caminhoRaizEnv)) {
  dotenv.config({ path: caminhoRaizEnv });
} else {
  dotenv.config();
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3000,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 5432,
    name: process.env.DB_NAME || 'integradorBib',
    user: process.env.DB_USER || 'postgres',
    pass: process.env.DB_PASS || process.env.DB_PASSWORD || 'postgres',
  },
};
