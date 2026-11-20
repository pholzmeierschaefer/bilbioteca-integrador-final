'use strict';

// Autenticação e RBAC (Handout 05): papéis 'bibliotecario' e 'aluno'
module.exports = (sequelize, DataTypes) => {
  const Usuario = sequelize.define(
    'Usuario',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      nome: {
        type: DataTypes.STRING(150),
        allowNull: false,
        validate: {
          notEmpty: { msg: 'O nome do usuário é obrigatório.' },
        },
      },
      matricula: {
        type: DataTypes.STRING(50),
        allowNull: true,
        unique: { msg: 'Esta matrícula de acesso já está cadastrada.' },
      },
      email: {
        type: DataTypes.STRING(150),
        allowNull: false,
        unique: { msg: 'Este e-mail já está cadastrado.' },
        validate: {
          isEmail: { msg: 'Informe um endereço de e-mail válido.' },
        },
      },
      // Sempre armazenada como hash bcrypt (fator de custo >= 12), nunca texto puro
      senha: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM('bibliotecario', 'aluno'),
        allowNull: false,
        defaultValue: 'aluno',
      },
      // Vínculo opcional com o cadastro de Estudante (preenchido para contas de aluno)
      estudante_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        unique: true,
      },
    },
    {
      tableName: 'usuarios',
      schema: 'public',
      freezeTableName: true,
      underscored: true,
      timestamps: true,
    }
  );

  Usuario.associate = function associate(models) {
    Usuario.belongsTo(models.Estudante, { foreignKey: 'estudante_id', as: 'estudante' });
  };

  return Usuario;
};
