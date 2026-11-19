const authService = require('../services/authService');

async function registrar(req, res) {
    const { nome, email, senha, role } = req.body;

    if (!nome || !email || !senha) {
        return res.status(400).json({ erro: 'Campos obrigatórios ausentes' });
    }

    try {
        const usuario = await authService.registrar({ nome, email, senha, role });
        return res.status(201).json(usuario);
    } catch (err) {
        if (err.status) {
            return res.status(err.status).json({ erro: err.message });
        }
        return res.status(500).json({ erro: 'Erro interno ao registrar o usuário' });
    }
}

async function login(req, res) {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({ erro: 'E-mail e senha são obrigatórios' });
    }

    try {
        const resultado = await authService.login({ email, senha });
        return res.status(200).json(resultado);
    } catch (err) {
        if (err.status) {
            return res.status(err.status).json({ erro: err.message });
        }
        return res.status(500).json({ erro: 'Erro interno ao realizar login' });
    }
}

module.exports = { registrar, login };
