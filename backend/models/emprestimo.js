'use strict';

// RF05, RF06, RF07 & RN-01..RN-04: Controle de empréstimos, devoluções e renovações
module.exports = (sequelize, DataTypes) => {
  const Emprestimo = sequelize.define(
    'Emprestimo',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      exemplar_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      estudante_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      data_emprestimo: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      // RN-01: Calculada automaticamente para 7 dias corridos no service de empréstimos
      data_devolucao_prevista: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      // RF05 / RF06: Inicialmente nula; preenchida no registro da devolução
      data_devolucao_realizada: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      // RF07: Contador de renovações (+7 dias por renovação)
      renovacoes: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: { min: 0 },
      },
      status: {
        type: DataTypes.ENUM('ativo', 'devolvido', 'atrasado'),
        allowNull: false,
        defaultValue: 'ativo',
      },
    },
    {
      tableName: 'emprestimos',
      schema: 'public',
      freezeTableName: true,
      underscored: true,
      timestamps: true,
    }
  );

  Emprestimo.associate = function associate(models) {
    Emprestimo.belongsTo(models.Exemplar, { foreignKey: 'exemplar_id', as: 'exemplar' });
    Emprestimo.belongsTo(models.Estudante, { foreignKey: 'estudante_id', as: 'estudante' });
    Emprestimo.hasMany(models.Justificativa, {
      foreignKey: 'emprestimo_id',
      as: 'justificativas',
    });
  };

  return Emprestimo;
};
