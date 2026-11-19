'use strict';

// RF03, RF04, RN-03, RN-04: Cadastro de leitores (estudantes da EEB Humberto Machado)
module.exports = (sequelize, DataTypes) => {
  const Estudante = sequelize.define(
    'Estudante',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      matricula: {
        type: DataTypes.STRING(30),
        allowNull: false,
        unique: { msg: 'Esta matrícula já está cadastrada.' },
        validate: {
          notEmpty: { msg: 'A matrícula do estudante é obrigatória.' },
        },
      },
      nome_completo: {
        type: DataTypes.STRING(150),
        allowNull: false,
        validate: {
          notEmpty: { msg: 'O nome completo é obrigatório.' },
          len: { args: [2, 150], msg: 'Nome deve ter entre 2 e 150 caracteres.' },
        },
      },
      turma: {
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: {
          notEmpty: { msg: 'A turma é obrigatória.' },
        },
      },
      telefone: {
        type: DataTypes.STRING(30),
        allowNull: true,
      },
      // RN-03: Bloqueio administrativo por atraso (sem multa financeira - RN-04)
      status: {
        type: DataTypes.ENUM('ativo', 'bloqueado', 'inativo'),
        allowNull: false,
        defaultValue: 'ativo',
      },
    },
    {
      tableName: 'estudantes',
      schema: 'public',
      freezeTableName: true,
      underscored: true,
      timestamps: true,
    }
  );

  Estudante.associate = function associate(models) {
    Estudante.hasOne(models.Usuario, { foreignKey: 'estudante_id', as: 'usuario' });
    Estudante.hasMany(models.Emprestimo, { foreignKey: 'estudante_id', as: 'emprestimos' });
    Estudante.hasMany(models.Reserva, { foreignKey: 'estudante_id', as: 'reservas' });
    Estudante.hasMany(models.Justificativa, { foreignKey: 'estudante_id', as: 'justificativas' });
  };

  return Estudante;
};
