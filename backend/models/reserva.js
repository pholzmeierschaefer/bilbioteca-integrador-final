'use strict';

// RF08 & RN-05: Fila de espera de reservas por obra com prioridade na devolução
module.exports = (sequelize, DataTypes) => {
  const Reserva = sequelize.define(
    'Reserva',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      estudante_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      obra_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      // Preenchido quando o exemplar é devolvido e retido para este estudante (RN-05)
      exemplar_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      data_reserva: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      status: {
        type: DataTypes.ENUM('pendente', 'aguardando_retirada', 'atendida', 'cancelada'),
        allowNull: false,
        defaultValue: 'pendente',
      },
      // RF08: Indica se o estudante já foi alertado da disponibilidade para retirada
      alerta_enviado: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      tableName: 'reservas',
      schema: 'public',
      freezeTableName: true,
      underscored: true,
      timestamps: true,
    }
  );

  Reserva.associate = function associate(models) {
    Reserva.belongsTo(models.Estudante, { foreignKey: 'estudante_id', as: 'estudante' });
    Reserva.belongsTo(models.Obra, { foreignKey: 'obra_id', as: 'obra' });
    Reserva.belongsTo(models.Exemplar, { foreignKey: 'exemplar_id', as: 'exemplar' });
  };

  return Reserva;
};
