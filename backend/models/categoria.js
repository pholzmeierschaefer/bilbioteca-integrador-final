'use strict';

// RF01: Classificação auxiliar — categoria/gênero literário (ex: Romance, Ficção, Biografia)
module.exports = (sequelize, DataTypes) => {
  const Categoria = sequelize.define(
    'Categoria',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      codigo: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: { msg: 'Já existe uma categoria com este código.' },
        validate: {
          notEmpty: { msg: 'O código da categoria é obrigatório.' },
        },
      },
      nome: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
          notEmpty: { msg: 'O nome da categoria é obrigatório.' },
        },
      },
    },
    {
      tableName: 'categorias',
      schema: 'public',
      freezeTableName: true,
      underscored: true,
      timestamps: true,
    }
  );

  Categoria.associate = function associate(models) {
    Categoria.hasMany(models.Obra, { foreignKey: 'categoria_id', as: 'obras' });
  };

  return Categoria;
};
