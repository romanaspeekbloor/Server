module.exports = (sequelize, DataTypes) =>  {

  const Sample = sequelize.define('samples', {
      sample_id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
      },
      freq_band_name: {
          type: DataTypes.STRING(20),
      },
      client_uuid: {
          type: DataTypes.STRING(50)
      },
      data: {
          type: DataTypes.TEXT
      },
      sampling_start: {
          type: DataTypes.INTEGER,
      },
      sampling_end: {
          type: DataTypes.INTEGER,
      },
  },
      {
          timestamps: false,
  });

  return Sample;
};

