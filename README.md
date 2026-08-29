# BRG Shopping — Node.js + MSSQL rebuild

Rebuild of the brgshopping.vn e-commerce backend on Node.js (Express +
Sequelize) targeting **MSSQL** instead of the original MySQL, with a
migration script to bring over the old data.

## Status

This is a **starter scaffold**, not a 1:1 clone of the live site yet. It
covers the core e-commerce domain — auth, categories, products, cart,
orders, a minimal admin surface — as a foundation to extend once the real
site's feature list / current source code is available. See
[`docs/MIGRATION.md`](docs/MIGRATION.md) for adapting the data migration to
the real old MySQL schema.

## Tech stack

- **Node.js + Express** — REST API
- **Sequelize** (dialect `mssql` via `tedious`) — ORM / migrations for the
  target database
- **MySQL2** — only used by the one-off migration script, to read from the
  legacy database
- **JWT** (`jsonwebtoken`) + `bcryptjs` — authentication

## Project layout

```
src/
  app.js                 Express app (middleware, routes)
  server.js              Entry point: connects DB, starts HTTP server
  config/
    db.js                 Sequelize connection to MSSQL (the app's DB)
    mysqlSource.js         MySQL connection config (migration script only)
    sequelize-cli.config.js  Config consumed by `sequelize-cli` migrations
  models/                 Sequelize models: User, Address, Category,
                          Product, ProductImage, Cart, CartItem, Order,
                          OrderItem, plus associations in index.js
  controllers/            Route handlers per resource
  routes/                 Express routers, mounted under /api
  middlewares/            JWT auth guard, admin guard, error handler
  migrations/             sequelize-cli migrations that create the MSSQL schema
  seeders/                Demo admin user
scripts/
  migrate-mysql-to-mssql.js   ETL template: old MySQL -> this MSSQL schema
docs/
  MIGRATION.md            Step-by-step data migration guide
  SCHEMA-MAPPING.md        MySQL -> MSSQL type mapping cheat sheet
```

## Getting started

### 1. Prerequisites

- Node.js 18+
- An MSSQL Server instance (local install, Docker, or Azure SQL)

Quick local MSSQL via Docker:
```bash
docker run -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=YourStrong!Passw0rd" \
  -p 1433:1433 --name mssql -d mcr.microsoft.com/mssql/server:2022-latest
```

### 2. Install & configure

```bash
npm install
cp .env.example .env
# edit .env: set MSSQL_* to match your server, create the database first
# (this project does not auto-create the database itself, only its tables)
```

### 3. Create the schema and start the app

```bash
npm run db:migrate    # creates tables via src/migrations
npm run db:seed       # optional: creates an admin@brgshopping.local user
npm run dev           # http://localhost:3000
```

In development (`NODE_ENV=development`, the default), `src/server.js` also
calls `sequelize.sync({ alter: true })` on boot as a convenience — in
production, rely on `npm run db:migrate` instead and set `NODE_ENV=production`.

### 4. API overview

All endpoints are under `/api`.

| Method | Path                        | Auth        | Description |
|--------|-----------------------------|-------------|--------------|
| POST   | `/auth/register`            | -           | Create an account |
| POST   | `/auth/login`                | -           | Get a JWT |
| GET    | `/auth/me`                   | user        | Current user profile |
| GET    | `/categories`                | -           | List active categories |
| GET    | `/categories/:slug`           | -           | Category detail |
| POST/PUT/DELETE `/categories`   | admin      | Manage categories |
| GET    | `/products`                   | -           | List products (filters: `categoryId`, `search`, `page`, `limit`) |
| GET    | `/products/:slug`              | -           | Product detail |
| POST/PUT/DELETE `/products`     | admin      | Manage products |
| GET    | `/cart`                       | user        | Current user's cart |
| POST   | `/cart/items`                  | user        | Add item to cart |
| PUT/DELETE `/cart/items/:itemId` | user      | Update/remove cart item |
| DELETE | `/cart`                       | user        | Clear cart |
| POST   | `/orders/checkout`             | user        | Create order from current cart |
| GET    | `/orders/my`                   | user        | Current user's orders |
| GET    | `/orders/:id`                  | user/admin  | Order detail (owner or admin) |
| GET    | `/orders`                      | admin       | All orders |
| PUT    | `/orders/:id/status`            | admin       | Update order status |

Send `Authorization: Bearer <token>` for user/admin routes.

### 5. Migrating data from the old MySQL database

See [`docs/MIGRATION.md`](docs/MIGRATION.md).

## Next steps

- Share the current brgshopping.vn source code and/or a MySQL schema dump so
  the models, migrations and the ETL script's column mappings can be made
  exact instead of best-guess placeholders.
- List out the real feature set (promotions/vouchers, product reviews,
  wishlists, multiple product variants/options, payment gateway integration,
  shipping providers, CMS pages, admin dashboard, etc.) so it can be scoped
  into further modules on top of this foundation.
