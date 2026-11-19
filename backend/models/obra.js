'use strict';

// RF01: Catálogo de Obras (separa os metadados da obra dos exemplares físicos na estante)
module.exports = (sequelize, DataTypes) => {
  const Obra = sequelize.define(
    'Obra',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      codigo_livro: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: { msg: 'Já existe uma obra cadastrada com este código.' },
        validate: {
          notEmpty: { msg: 'O código do livro é obrigatório.' },
        },
      },
      titulo: {
        type: DataTypes.STRING(200),
        allowNull: false,
        validate: {
          notEmpty: { msg: 'O título da obra é obrigatório.' },
        },
      },
      autor: {
        type: DataTypes.STRING(150),
        allowNull: false,
        validate: {
          notEmpty: { msg: 'O autor da obra é obrigatório.' },
        },
      },
      editora: {
        type: DataTypes.STRING(120),
        allowNull: true,
      },
      ano_publicacao: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      tipo_obra_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      categoria_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: 'obras',
      schema: 'public',
      freezeTableName: true,
      underscored: true,
      timestamps: true,
    }
  );

  Obra.associate = function associate(models) {
    Obra.belongsTo(models.TipoObra, { foreignKey: 'tipo_obra_id', as: 'tipoObra' });
    Obra.belongsTo(models.Categoria, { foreignKey: 'categoria_id', as: 'categoria' });
    Obra.hasMany(models.Exemplar, { foreignKey: 'obra_id', as: 'exemplares' });
    Obra.hasMany(models.Reserva, { foreignKey: 'obra_id', as: 'reservas' });
  };

  return Obra;
};
