require('dotenv').config();
const { Sequelize } = require('sequelize');

// Main application database (target): MSSQL
const sequelize = new Sequelize(
  process.env.MSSQL_DATABASE,
  process.env.MSSQL_USER,
  process.env.MSSQL_PASSWORD,
  {
    host: process.env.MSSQL_HOST,
    port: Number(process.env.MSSQL_PORT || 1433),
    dialect: 'mssql',
    dialectOptions: {
      options: {
        encrypt: process.env.MSSQL_ENCRYPT === 'true',
        trustServerCertificate: process.env.MSSQL_TRUST_SERVER_CERTIFICATE === 'true',
      },
    },
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    define: {
      freezeTableName: true,
      timestamps: true,
    },
  }
);

module.exports = sequelize;
