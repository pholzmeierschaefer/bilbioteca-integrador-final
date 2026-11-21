const bcrypt = require('bcrypt');
const db = require('../../models');

const SALT_ROUNDS = 12;

/**
 * Seed mínimo: cria/recria as tabelas e cadastra apenas o usuário Administrador (admin / admin).
 * Use `yarn seed` para garantir o admin ou `yarn seed:reset` para zerar o banco inteiro.
 */
async function executarSeed() {
  try {
    const resetar = process.argv.includes('--reset');

    await db.sequelize.authenticate();
    if (resetar) {
      console.log('Zerando e recriando todas as tabelas do banco (--reset)...');
      await db.sequelize.drop({ cascade: true });
      await db.sequelize.sync({ force: true });
    } else {
      await db.sequelize.sync();
    }

    const senhaAdminHash = await bcrypt.hash('admin', SALT_ROUNDS);
    await db.Usuario.findOrCreate({
      where: { matricula: 'admin' },
      defaults: {
        nome: 'Administrador',
        matricula: 'admin',
        email: 'admin@humbertomachado.edu.br',
        senha: senhaAdminHash,
        role: 'bibliotecario',
        estudante_id: null,
      },
    });

    console.log('Seed concluído! Apenas o usuário administrador foi cadastrado.');
    console.log('Acesso: matrícula "admin" / senha "admin"');
  } catch (err) {
    console.error('Erro ao executar seed:', err);
    process.exitCode = 1;
  } finally {
    await db.sequelize.close();
  }
}

executarSeed();
