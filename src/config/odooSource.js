require('dotenv').config();

// Old application database (source): the live site runs on Odoo, backed by
// PostgreSQL — not MySQL. Only used by scripts/migrate-odoo-to-mssql.js; the
// running Express app never connects to it.
module.exports = {
  host: process.env.ODOO_PG_HOST,
  port: Number(process.env.ODOO_PG_PORT || 5432),
  database: process.env.ODOO_PG_DATABASE,
  user: process.env.ODOO_PG_USER,
  password: process.env.ODOO_PG_PASSWORD,
};
