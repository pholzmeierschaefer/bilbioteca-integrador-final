const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../../../../models');

const SALT_ROUNDS = 12;
// Hash bcrypt válido usado para mitigar ataques de timing quando o usuário não existe
const HASH_FICTICIO = '$2b$12$C6UzMDM.H6dfI/f/IKcEeO7H8d4K9vP6qG0mW1xZ2yA3bC4dE5fG6';

function criarErro(status, message) {
    const error = new Error(message);
    error.status = status;
    return error;
}

async function registrar({ nome, email, senha, role }) {
    const emailExiste = await db.Usuario.findOne({ where: { email } });
    if (emailExiste) {
        throw criarErro(409, 'E-mail já foi registrado');
    }

    const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);
    const usuario = await db.Usuario.create({
        nome,
        email,
        senha: senhaHash,
        role: role || 'aluno', // papel padrão se não for informado
    });

    return {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role,
    };
}

async function login({ email, senha }) {
    const usuario = await db.Usuario.findOne({ where: { email } });
    const senhaValida = await bcrypt.compare(senha, usuario?.senha ?? HASH_FICTICIO);

    if (!usuario || !senhaValida) {
        throw criarErro(401, 'Credenciais inválidas');
    }

    const token = jwt.sign(
        { id: usuario.id, role: usuario.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );

    return { token };
}

module.exports = { registrar, login };
