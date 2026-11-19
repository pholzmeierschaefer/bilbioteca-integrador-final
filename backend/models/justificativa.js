'use strict';

// RF11: Justificativa de atraso enviada pelo estudante no Portal do Aluno
module.exports = (sequelize, DataTypes) => {
  const Justificativa = sequelize.define(
    'Justificativa',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      emprestimo_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      estudante_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      texto_descritivo: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'O texto descritivo da justificativa é obrigatório.' },
        },
      },
      data_envio: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      status: {
        type: DataTypes.ENUM('pendente', 'analisada'),
        allowNull: false,
        defaultValue: 'pendente',
      },
    },
    {
      tableName: 'justificativas',
      schema: 'public',
      freezeTableName: true,
      underscored: true,
      timestamps: true,
    }
  );

  Justificativa.associate = function associate(models) {
    Justificativa.belongsTo(models.Emprestimo, { foreignKey: 'emprestimo_id', as: 'emprestimo' });
    Justificativa.belongsTo(models.Estudante, { foreignKey: 'estudante_id', as: 'estudante' });
  };

  return Justificativa;
};
