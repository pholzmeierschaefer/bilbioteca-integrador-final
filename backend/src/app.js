const express = require('express');
const cors = require('cors');
const routes = require('./shared/routes');

const app = express();

app.use(express.json()); // middleware para JSON no corpo das requisições
app.use(cors()); // middleware para pedidos de outras origens (front)

app.use(routes);

module.exports = app;
