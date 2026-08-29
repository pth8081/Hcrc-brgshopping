# Migrating data from the old MySQL database to MSSQL

This project's app runs entirely on MSSQL. The old brgshopping.vn MySQL
database is only ever touched by the one-off script below — the running
Express app never connects to MySQL.

## Prerequisites

1. A dump or live read access to the old MySQL database.
   - Live access: fill in `MYSQL_HOST`/`MYSQL_PORT`/`MYSQL_DATABASE`/
     `MYSQL_USER`/`MYSQL_PASSWORD` in `.env`.
   - Dump file only: restore `your_dump.sql` into a local/temporary MySQL
     instance first (`mysql -u root -p new_db < your_dump.sql`), then point
     `.env` at that instance.
2. A running MSSQL Server (local, Docker, or Azure SQL) reachable via the
   `MSSQL_*` variables in `.env`.
3. Look at the real MySQL schema:
   ```sql
   SHOW TABLES;
   SHOW CREATE TABLE <table_name>;
   ```
   or `mysqldump --no-data -u root -p old_db > schema-only.sql` and read it.

## Steps

1. **Adapt the mapping.** Open `scripts/migrate-mysql-to-mssql.js` and edit
   `TABLE_MIGRATIONS`:
   - Fix `mysqlTable` to the real old table name.
   - Fix each `mapRow()` so the right-hand side (`row.xxx`) matches the real
     MySQL column names. Add/remove tables and fields as needed — the
     current list covers this project's own tables (users, addresses,
     categories, products, product_images, carts, cart_items, orders,
     order_items) as a starting skeleton.
   - See `docs/SCHEMA-MAPPING.md` for MySQL → MSSQL type conversion notes.

2. **Create the MSSQL schema:**
   ```bash
   npm install
   npm run db:migrate
   ```

3. **Dry run** (counts rows per table, writes nothing):
   ```bash
   npm run migrate:mysql-to-mssql -- --dry-run
   ```

4. **Run the real migration:**
   ```bash
   npm run migrate:mysql-to-mssql
   ```
   The script migrates tables in parent → child order (users before orders,
   etc.) and uses `SET IDENTITY_INSERT <table> ON/OFF` so the original
   MySQL primary keys are preserved, keeping foreign keys valid without
   needing an id-remapping table.

5. **Verify row counts and spot-check data** in MSSQL (e.g. SSMS or Azure
   Data Studio) against the MySQL source before decommissioning MySQL.

## Notes

- The script is idempotent-ish: it uses `ignoreDuplicates: true` on insert,
  so re-running after fixing a mapping bug will skip rows already migrated
  by primary key, not duplicate them (it won't update rows already inserted
  — delete the partially-migrated rows first if you need a clean re-run).
- Passwords: if the old app used a MySQL-side hashing scheme different from
  bcrypt (used by this app, see `src/controllers/auth.controller.js`), the
  migration script currently copies `passwordHash` verbatim. If the hash
  format differs, existing users won't be able to log in with their old
  password until you either add a shim to `login()` that verifies against
  the old scheme and re-hashes to bcrypt on first login, or force a password
  reset flow for all migrated users.
