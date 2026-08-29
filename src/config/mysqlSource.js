require('dotenv').config();

// Old application database (source): MySQL. Only used by scripts/migrate-mysql-to-mssql.js
// This is intentionally kept separate from src/config/db.js so the running app
// never talks to the legacy MySQL database.
module.exports = {
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT || 3306),
  database: process.env.MYSQL_DATABASE,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
};
