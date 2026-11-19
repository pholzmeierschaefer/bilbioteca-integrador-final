'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const sequelize = require('../config/localConnection');

const basename = path.basename(__filename);
const db = {};

// 1. Lê dinamicamente todos os arquivos .js desta pasta (exceto o próprio index.js)
fs.readdirSync(__dirname)
  .filter(
    (file) =>
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js' &&
      !file.endsWith('.test.js')
  )
  .forEach((file) => {
    // 2. Cada model exporta uma função (sequelize, DataTypes) => Model
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

// 3. Executa as associações somente depois que TODOS os models foram carregados
Object.keys(db).forEach((modelName) => {
  if (typeof db[modelName].associate === 'function') {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
