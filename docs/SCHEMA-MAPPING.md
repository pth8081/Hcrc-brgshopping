# Odoo/PostgreSQL → MSSQL notes

The live site's real source is Odoo on PostgreSQL (see
[`MIGRATION.md`](MIGRATION.md) for how that was discovered and what's
actually migrated). This isn't a generic type cheat sheet — Odoo's schema is
too different from this app's for a column-by-column table copy, so the ETL
script does one JOIN query per target entity. This doc covers the type/value
conversions those queries rely on.

## Type conversions used in `scripts/migrate-odoo-to-mssql.js`

| PostgreSQL (Odoo)        | MSSQL (this app)   | Notes |
|---------------------------|---------------------|-------|
| `integer` (id columns)    | `INT IDENTITY(1,1)` | `node-postgres` returns these as JS numbers already; ids are preserved via `SET IDENTITY_INSERT` |
| `numeric` (`list_price`, `amount_total`, ...) | `DECIMAL(14,2)` | `node-postgres` returns `numeric` as a **string** to avoid float rounding — always `Number(...)` before assigning |
| `boolean`                 | `BIT`               | comes through as a real JS boolean already, no 0/1 conversion needed (unlike the MySQL `TINYINT(1)` case) |
| `timestamp without time zone` | `DATETIME2`     | returned as a JS `Date` already |
| `character varying` / `text` | `NVARCHAR`       | as-is |
| Odoo's `product.template` / `product.product` split | single `products` row | see **Variants vs templates** in MIGRATION.md — the template is the row, the variant is only used to look up stock/order references |
| many-to-many rel table (`product_public_category_product_template_rel`) | single `categoryId` FK | this app supports one category per product; the query picks the lowest category id when a product is linked to several |
| `stock_quant.quantity` summed per product | `products.stockQuantity` | naive `SUM(quantity)` across all locations/companies — doesn't distinguish reserved, in-transit, or per-warehouse stock; adjust the query if that distinction matters |

## Key differences from a typical MySQL migration

- **No `LIMIT x OFFSET y` translation needed** — PostgreSQL uses the same
  `LIMIT`/`OFFSET` syntax as MySQL (unlike MSSQL, which needs
  `OFFSET y ROWS FETCH NEXT x ROWS ONLY`); Sequelize/the `pg` driver handle
  this without any special-casing in the script.
- **Identifier quoting**: PostgreSQL uses double quotes for
  case-sensitive/reserved identifiers (Odoo's dump has a couple, e.g.
  `"isSpecial"`); MSSQL uses square brackets. Not directly relevant here
  since the ETL script only ever reads from Postgres and writes through
  Sequelize models, never hand-written MSSQL SQL.
- **No password migration** — see the **Passwords** section in
  `MIGRATION.md`. This is the one area where "convert the type" isn't
  enough; the hashing scheme itself isn't compatible.
