require('dotenv').config();

// sequelize-cli reads plain JS/JSON, not the Sequelize instance in db.js,
// so connection settings are duplicated here for `npm run db:migrate`.
const common = {
  dialect: 'mssql',
  dialectOptions: {
    options: {
      encrypt: process.env.MSSQL_ENCRYPT === 'true',
      trustServerCertificate: process.env.MSSQL_TRUST_SERVER_CERTIFICATE === 'true',
    },
  },
};

const config = {
  username: process.env.MSSQL_USER,
  password: process.env.MSSQL_PASSWORD,
  database: process.env.MSSQL_DATABASE,
  host: process.env.MSSQL_HOST,
  port: Number(process.env.MSSQL_PORT || 1433),
  ...common,
};

module.exports = {
  development: config,
  test: config,
  production: config,
};
