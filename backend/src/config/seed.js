const bcrypt = require('bcrypt');
const db = require('../../models');

const SALT_ROUNDS = 12;

function diasRelativos(dias) {
  const data = new Date();
  data.setDate(data.getDate() + dias);
  return data;
}

/**
 * Seed inicial idempotente para a EEB Humberto Machado (Itapiranga - SC).
 * Pode ser executado repetidamente com `yarn seed` ou `node src/config/seed.js` sem duplicar dados.
 */
async function executarSeed() {
  try {
    const resetar = process.argv.includes('--reset');

    await db.sequelize.authenticate();
    if (resetar) {
      console.log('Recriando tabelas do banco de dados (--reset)...');
      await db.sequelize.drop({ cascade: true });
      await db.sequelize.sync({ force: true });
    } else {
      await db.sequelize.sync();
    }

    console.log('Iniciando seed da Biblioteca HM...');

    // 1. Classificações auxiliares (TipoObra e Categoria)
    const tiposSeed = [
      { codigo: 'LITERATURA', descricao: 'Literatura' },
      { codigo: 'DIDATICO', descricao: 'Didático' },
      { codigo: 'PARADIDATICO', descricao: 'Paradidático' },
    ];
    const tipos = {};
    for (const item of tiposSeed) {
      const [registro] = await db.TipoObra.findOrCreate({
        where: { codigo: item.codigo },
        defaults: item,
      });
      tipos[item.codigo] = registro;
    }

    const categoriasSeed = [
      { codigo: 'ROMANCE', nome: 'Romance' },
      { codigo: 'FICCAO', nome: 'Ficção' },
      { codigo: 'AVENTURA', nome: 'Aventura' },
      { codigo: 'HISTORIA', nome: 'História' },
      { codigo: 'CIENCIAS', nome: 'Ciências' },
    ];
    const categorias = {};
    for (const item of categoriasSeed) {
      const [registro] = await db.Categoria.findOrCreate({
        where: { codigo: item.codigo },
        defaults: item,
      });
      categorias[item.codigo] = registro;
    }

    // 2. Administrador padrão (matrícula: admin / senha: admin)
    const senhaAdminHash = await bcrypt.hash('admin', SALT_ROUNDS);
    await db.Usuario.findOrCreate({
      where: { matricula: 'admin' },
      defaults: {
        nome: 'Administrador — Biblioteca HM',
        matricula: 'admin',
        email: 'admin@humbertomachado.edu.br',
        senha: senhaAdminHash,
        role: 'bibliotecario',
        estudante_id: null,
      },
    });

    // 3. Estudantes e contas de acesso (senha padrão = própria matrícula)
    const estudantesSeed = [
      {
        matricula: '2026001',
        nome_completo: 'Ana Clara Weber',
        turma: '3º Ano A',
        telefone: '(49) 99911-1001',
        status: 'ativo',
      },
      {
        matricula: '2026002',
        nome_completo: 'Lucas Henrique Mallmann',
        turma: '2º Ano B',
        telefone: '(49) 99911-1002',
        status: 'ativo',
      },
      {
        matricula: '2026003',
        nome_completo: 'Mariana Jungblut',
        turma: '1º Ano A',
        telefone: '(49) 99911-1003',
        status: 'bloqueado',
      },
      {
        matricula: '2026004',
        nome_completo: 'Pedro Augusto Schneider',
        turma: '9º Ano A',
        telefone: '(49) 99911-1004',
        status: 'ativo',
      },
      {
        matricula: '2026005',
        nome_completo: 'Sofia Beatriz Kuhn',
        turma: '3º Ano A',
        telefone: '(49) 99911-1005',
        status: 'ativo',
      },
    ];

    const estudantes = {};
    for (const est of estudantesSeed) {
      const [estudante] = await db.Estudante.findOrCreate({
        where: { matricula: est.matricula },
        defaults: est,
      });
      estudantes[est.matricula] = estudante;

      const emailAluno = `${est.matricula}@aluno.biblioteca.hm.edu.br`;
      const usuarioExistente = await db.Usuario.findOne({ where: { matricula: est.matricula } });
      if (!usuarioExistente) {
        const senhaHash = await bcrypt.hash(est.matricula, SALT_ROUNDS);
        await db.Usuario.create({
          nome: est.nome_completo,
          matricula: est.matricula,
          email: emailAluno,
          senha: senhaHash,
          role: 'aluno',
          estudante_id: estudante.id,
        });
      }
    }

    // 4. Obras e Exemplares físicos com códigos de tombo únicos (RN-06)
    const obrasSeed = [
      {
        codigo_livro: 'LIV-001',
        titulo: 'Dom Casmurro',
        autor: 'Machado de Assis',
        editora: 'Ática',
        ano_publicacao: 2019,
        tipo_obra_id: tipos.LITERATURA.id,
        categoria_id: categorias.ROMANCE.id,
        exemplares: [
          { codigo_exemplar: 'TOMBO-001', status: 'disponivel' },
          { codigo_exemplar: 'TOMBO-002', status: 'emprestado' },
        ],
      },
      {
        codigo_livro: 'LIV-002',
        titulo: 'O Pequeno Príncipe',
        autor: 'Antoine de Saint-Exupéry',
        editora: 'Agir',
        ano_publicacao: 2018,
        tipo_obra_id: tipos.LITERATURA.id,
        categoria_id: categorias.FICCAO.id,
        exemplares: [
          { codigo_exemplar: 'TOMBO-003', status: 'disponivel' },
          { codigo_exemplar: 'TOMBO-004', status: 'inativo_extraviado' },
        ],
      },
      {
        codigo_livro: 'LIV-003',
        titulo: 'Capitães da Areia',
        autor: 'Jorge Amado',
        editora: 'Companhia das Letras',
        ano_publicacao: 2020,
        tipo_obra_id: tipos.LITERATURA.id,
        categoria_id: categorias.ROMANCE.id,
        exemplares: [{ codigo_exemplar: 'TOMBO-005', status: 'emprestado' }],
      },
      {
        codigo_livro: 'LIV-004',
        titulo: 'Vidas Secas',
        autor: 'Graciliano Ramos',
        editora: 'Record',
        ano_publicacao: 2021,
        tipo_obra_id: tipos.LITERATURA.id,
        categoria_id: categorias.HISTORIA.id,
        exemplares: [
          { codigo_exemplar: 'TOMBO-006', status: 'disponivel' },
          { codigo_exemplar: 'TOMBO-007', status: 'disponivel' },
        ],
      },
      {
        codigo_livro: 'LIV-005',
        titulo: 'Matemática: Contexto & Aplicações',
        autor: 'Luiz Roberto Dante',
        editora: 'Ática',
        ano_publicacao: 2022,
        tipo_obra_id: tipos.DIDATICO.id,
        categoria_id: categorias.CIENCIAS.id,
        exemplares: [{ codigo_exemplar: 'TOMBO-008', status: 'disponivel' }],
      },
    ];

    const obras = {};
    const exemplares = {};
    for (const item of obrasSeed) {
      const { exemplares: listaExemplares, ...dadosObra } = item;
      const [obra] = await db.Obra.findOrCreate({
        where: { codigo_livro: dadosObra.codigo_livro },
        defaults: dadosObra,
      });
      obras[dadosObra.codigo_livro] = obra;

      for (const ex of listaExemplares) {
        const [exemplar] = await db.Exemplar.findOrCreate({
          where: { codigo_exemplar: ex.codigo_exemplar },
          defaults: {
            codigo_exemplar: ex.codigo_exemplar,
            obra_id: obra.id,
            status: ex.status,
          },
        });
        exemplares[ex.codigo_exemplar] = exemplar;
      }
    }

    // 5. Movimentações de exemplo (criadas apenas se ainda não houver empréstimos no banco)
    const totalEmprestimos = await db.Emprestimo.count();
    if (totalEmprestimos === 0) {
      // Cenário A: Atraso crítico (> 10 dias) com estudante bloqueada + justificativa (RF09, RF11, RN-03)
      const empAtrasado = await db.Emprestimo.create({
        exemplar_id: exemplares['TOMBO-005'].id,
        estudante_id: estudantes['2026003'].id,
        data_emprestimo: diasRelativos(-21),
        data_devolucao_prevista: diasRelativos(-14),
        data_devolucao_realizada: null,
        renovacoes: 0,
        status: 'atrasado',
      });

      await db.Justificativa.create({
        emprestimo_id: empAtrasado.id,
        estudante_id: estudantes['2026003'].id,
        texto_descritivo: 'Estive afastada por atestado médico e devolverei na próxima aula.',
        data_envio: diasRelativos(-2),
        status: 'pendente',
      });

      // Cenário B: Empréstimo ativo com devolução prevista para HOJE (RF09 Dashboard)
      await db.Emprestimo.create({
        exemplar_id: exemplares['TOMBO-002'].id,
        estudante_id: estudantes['2026005'].id,
        data_emprestimo: diasRelativos(-7),
        data_devolucao_prevista: new Date(),
        data_devolucao_realizada: null,
        renovacoes: 0,
        status: 'ativo',
      });

      // Cenário C: Empréstimos já devolvidos para popular relatórios gerenciais (RF12)
      await db.Emprestimo.create({
        exemplar_id: exemplares['TOMBO-001'].id,
        estudante_id: estudantes['2026004'].id,
        data_emprestimo: diasRelativos(-15),
        data_devolucao_prevista: diasRelativos(-8),
        data_devolucao_realizada: diasRelativos(-9),
        renovacoes: 0,
        status: 'devolvido',
      });

      await db.Emprestimo.create({
        exemplar_id: exemplares['TOMBO-003'].id,
        estudante_id: estudantes['2026001'].id,
        data_emprestimo: diasRelativos(-12),
        data_devolucao_prevista: diasRelativos(-5),
        data_devolucao_realizada: diasRelativos(-6),
        renovacoes: 0,
        status: 'devolvido',
      });
    }

    // 6. Reserva pendente para Capitães da Areia (pronta para testar RN-05 na devolução do TOMBO-005)
    const totalReservas = await db.Reserva.count();
    if (totalReservas === 0) {
      await db.Reserva.create({
        estudante_id: estudantes['2026002'].id,
        obra_id: obras['LIV-003'].id,
        exemplar_id: null,
        data_reserva: diasRelativos(-3),
        status: 'pendente',
        alerta_enviado: false,
      });
    }

    console.log('Seed concluído com sucesso!');
    console.log('------------------------------------------------------------');
    console.log('Administrador: matrícula "admin" / senha "admin"');
    console.log('Estudante (ativo): matrícula "2026001" / senha "2026001"');
    console.log('Estudante (atraso crítico): matrícula "2026003" / senha "2026003"');
    console.log('------------------------------------------------------------');
  } catch (err) {
    console.error('Erro ao executar seed:', err);
    process.exitCode = 1;
  } finally {
    await db.sequelize.close();
  }
}

executarSeed();
