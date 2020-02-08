const Sequelize = require('sequelize')
const sequelize = new Sequelize();


// The model definition is done in /path/to/models/project.js
const Client = sequelize.define('Clients', {
    sample_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        
    },
    freq_band_name: {
        type: Sequelize.STRING(20),
    },
    client_uuid: {
        type: Sequelize.STRING(50)
    },
    samples: {
        type: Sequelize.TEXT
    },
    sampling_start: {
        type: Sequelize.INTEGER,
    },
    sampling_end: {
        type: Sequelize.INTEGER,
    },
});

module.exports = Client; 