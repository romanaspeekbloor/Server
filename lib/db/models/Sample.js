module.exports = (sequelize, DataTypes) =>  {
  const samples = sequelize.define('samples', {
      sample_id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
      },
      freq_band_name: {
          type: DataTypes.STRING(20),
      },
      client_uuid: {
          type: DataTypes.STRING(60)
      },
      data: {
          type: DataTypes.TEXT(),
      },
      sampling_start: {
          type: DataTypes.BIGINT,
      },
      sampling_end: {
          type: DataTypes.BIGINT,
      },
      saved_at: {
        type: DataTypes.DATE,
      },
      cycle_uuid: {
          type: DataTypes.STRING(60)
      },
      cycle_timestamp: {
        type: DataTypes.BIGINT,
      },
  },
      {
          timestamps: false,
  });

  return samples;
};

