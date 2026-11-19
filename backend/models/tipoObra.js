'use strict';

// RF01: Classificação auxiliar — tipo de obra (ex: Didático, Literatura, Periódico)
module.exports = (sequelize, DataTypes) => {
  const TipoObra = sequelize.define(
    'TipoObra',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      codigo: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: { msg: 'Já existe um tipo de obra com este código.' },
        validate: {
          notEmpty: { msg: 'O código do tipo de obra é obrigatório.' },
        },
      },
      descricao: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
          notEmpty: { msg: 'A descrição do tipo de obra é obrigatória.' },
        },
      },
    },
    {
      tableName: 'tipos_obra',
      schema: 'public',
      freezeTableName: true,
      underscored: true,
      timestamps: true,
    }
  );

  TipoObra.associate = function associate(models) {
    TipoObra.hasMany(models.Obra, { foreignKey: 'tipo_obra_id', as: 'obras' });
  };

  return TipoObra;
};
