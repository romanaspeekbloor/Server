module.exports = (sequelize, DataTypes) =>  {
  const clients = sequelize.define('clients', {
      uuid: {
          type: DataTypes.STRING(50),
          primaryKey: true,
      },
      device_type: {
          type: DataTypes.STRING(20),
      },
      device_name: {
        type: DataTypes.STRING(20),
      },
      device_make: {
          type: DataTypes.STRING(20),
      },
      device_model: {
          type: DataTypes.STRING(20),
      },
      is_active: {
          type: DataTypes.BOOLEAN,
      },
      is_online: {
          type: DataTypes.BOOLEAN,
      },
      date_added: {
          type: DataTypes.DATE,
      },
      date_online: {
          type: DataTypes.DATE,
      },
      date_activated: {
          type: DataTypes.DATE,
      },
  },
      {
          timestamps: false,
  });

  return clients;
};

