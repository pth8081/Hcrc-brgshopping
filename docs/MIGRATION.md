# Migrating data from the live Odoo installation to MSSQL

The live brgshopping.vn site does **not** run a small custom app on MySQL —
the real schema dump turned out to be a PostgreSQL dump (`pg_dump`) with 460
tables named things like `product_template`, `sale_order`, `res_partner`.
That's [Odoo](https://www.odoo.com/): a full ERP, heavily customized here
for BRG's grocery/delivery business (custom fields like
`delivery_customer_name`, `is_shipped`, `loyalty_customer_code`, etc.).

This project's app runs entirely on MSSQL and only covers the storefront
slice of that ERP — catalog, customers, orders — not accounting, internal
stock moves, HR, or any of Odoo's other ~450 tables. The Odoo/PostgreSQL
database is only ever touched by the one-off script below; the running
Express app never connects to it.

> **Run this before creating any real data in MSSQL.** The script preserves
> Odoo's original primary keys (via `SET IDENTITY_INSERT ... ON`) so foreign
> keys stay valid. If a row with that id already exists in the target table
> — e.g. the demo admin from `npm run db:seed`, or products created by hand
> through the API — the migration silently treats it as "already migrated"
> and skips it instead of inserting your real data. Run `npm run db:migrate`
> to create empty tables, then migrate immediately, before seeding or using
> the app.

## What gets migrated, and from where

| This app's table | Source (Odoo/PostgreSQL)                                                        |
|-------------------|----------------------------------------------------------------------------------|
| `categories`      | `product_public_category` (the website-facing category tree, not the internal `product_category`) |
| `products`        | `product_template`, joined to its first `product_product` variant for stock, and to `product_public_category_product_template_rel` for its category |
| `product_images`  | `product_image` |
| `users`           | `res_partner` where `customer = true` (see **Passwords** below) |
| `orders`          | `sale_order` |
| `order_items`     | `sale_order_line` |

Not migrated: accounting (`account_*`), internal stock movements
(`stock_move`, `stock_picking`, ...), HR, email/messaging (`mail_*`),
multi-variant attributes (`product_attribute*`), pricelists beyond the
template's own `list_price`/`finalprice`, and payment method detail (every
migrated order gets `paymentMethod: 'cod'` as a placeholder — adjust
`migrateOrders()` in the script if you need the real acquirer).

## Prerequisites

1. Read-only access to the Odoo PostgreSQL database — either live, or a
   dump restored locally:
   ```bash
   createdb odoo_brg
   psql -d odoo_brg -f schema-and-data-dump.sql
   ```
2. Fill in `.env`: `ODOO_PG_HOST` / `ODOO_PG_PORT` / `ODOO_PG_DATABASE` /
   `ODOO_PG_USER` / `ODOO_PG_PASSWORD`, and the `MSSQL_*` variables pointing
   at a running MSSQL Server.
3. If your Odoo install differs from what's assumed here (different custom
   fields, multi-variant products, a different order-status workflow),
   read the queries in `scripts/migrate-odoo-to-mssql.js` first — each
   target entity is one hand-written SQL query, not a generic table copy,
   so it needs to match your actual schema.

## Steps

1. **Create the MSSQL schema:**
   ```bash
   npm install
   npm run db:migrate
   ```

2. **Dry run** (counts rows per source table, writes nothing):
   ```bash
   npm run migrate:odoo -- --dry-run
   ```

3. **Run the real migration:**
   ```bash
   npm run migrate:odoo
   ```

4. **Verify** row counts and spot-check data in MSSQL against the Odoo
   source before treating the new site as the source of truth.

## Notes

- **Idempotent re-runs**: before each insert the script checks which ids
  already exist in the MSSQL table and skips them, so re-running after
  fixing a query won't duplicate rows (it won't *update* rows already
  inserted — delete the partially-migrated rows first for a clean re-run of
  a given entity).
- **Variants vs templates**: Odoo's `sale_order_line.product_id` and
  `stock_quant.product_id` reference `product_product` (a specific variant),
  not `product_template` (what this app's `products` table is keyed on).
  The script builds an in-memory variant→template map while migrating
  products and uses it to resolve order line products correctly — if a
  variant has no matching migrated template, the order line still migrates
  with its `productName`/`price` snapshot, just with `productId: null`.
- **Orders without a migrated customer**: `orders.userId` is required, so an
  order whose `partner_id` didn't qualify as a migrated customer (no email,
  inactive, `customer = false`) is skipped with a log line — it isn't lost
  in Odoo, just not carried over here.
- **Order status mapping is a best-effort guess.** `mapOrderStatus()` in the
  script maps this store's custom flags (`is_cancel`, `is_received`,
  `is_shipped`, `backend_state`) onto this app's five-status enum. Check it
  against the real order workflow and adjust before trusting it for
  reporting.
- **Passwords are not migrated — they can't be.** Odoo hashes passwords with
  `passlib` (bcrypt or pbkdf2_sha512 depending on config), which isn't
  something `bcryptjs.compare()` can verify. Every migrated user gets a
  random, unusable password hash (verified in testing: login with any
  guessed password correctly fails). Before letting migrated customers back
  in, either build a "forgot password" flow (this scaffold doesn't have one
  yet) or have an admin reset accounts individually.
