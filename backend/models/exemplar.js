'use strict';

// RF02 & RN-06: Cada exemplar físico possui um código único de tombo vinculado a uma Obra
module.exports = (sequelize, DataTypes) => {
  const Exemplar = sequelize.define(
    'Exemplar',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      codigo_exemplar: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: { msg: 'Este código de exemplar (tombo) já está cadastrado.' },
        validate: {
          notEmpty: { msg: 'O código único do exemplar é obrigatório (RN-06).' },
        },
      },
      obra_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      // Status conforme RF02 e RN-05 (retido para reserva)
      status: {
        type: DataTypes.ENUM('disponivel', 'emprestado', 'reservado', 'inativo_extraviado'),
        allowNull: false,
        defaultValue: 'disponivel',
      },
    },
    {
      tableName: 'exemplares',
      schema: 'public',
      freezeTableName: true,
      underscored: true,
      timestamps: true,
    }
  );

  Exemplar.associate = function associate(models) {
    Exemplar.belongsTo(models.Obra, { foreignKey: 'obra_id', as: 'obra' });
    Exemplar.hasMany(models.Emprestimo, { foreignKey: 'exemplar_id', as: 'emprestimos' });
    Exemplar.hasMany(models.Reserva, { foreignKey: 'exemplar_id', as: 'reservas' });
  };

  return Exemplar;
};
