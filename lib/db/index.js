const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const basename = path.basename(module.filename);

const db = {};

const sequelize = new Sequelize(
    'sdrx',
    'sdrx',
    'n0smoking', {
        host: '192.168.10.242',
        port: 3306,
        dialect: 'mysql',
});

sequelize
  .authenticate()
  .then(() => {
    console.log('Connection has been established successfully.');
  })
  .catch((err) => {
    console.log('Unable to connect to the database:', err);
  });

fs.readdirSync(`${__dirname}/models`)
    .filter(file => (file.indexOf('.') !== 0) && (file !== basename))
    .forEach((file) => {
        if (file.slice(-3) !== '.js') return;
        const model = sequelize.import(path.join(`${__dirname}/models`, file));
        db[model.name] = model;
    });

Object.keys(db).forEach((modelName) => {
    if (db[modelName].associate) db[modelName].associate(db);
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;

