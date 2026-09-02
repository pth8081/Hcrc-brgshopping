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
- **Vanilla HTML/JS storefront** styled with **Tailwind CSS v4**, served as
  static files by the same Express app — no separate frontend server/build
  step at runtime, see [Frontend](#frontend-storefront) below

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
public/                   Storefront static files, served directly by Express
  css/style.css            Compiled Tailwind output (committed, see below)
  js/                      Vanilla JS (ES modules): api.js, layout.js, icons.js,
                          pages/*.js per page
  *.html                   index, product, cart, checkout, orders, login,
                          register, admin, page (static info pages), 404
src/styles/tailwind.css    Tailwind source (@theme tokens + @layer components)
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

Schema changes always go through `npm run db:migrate` (add a new migration
file rather than editing an applied one) — the app itself only calls
`sequelize.authenticate()` on boot, it never auto-alters tables.

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

## Frontend (storefront)

`public/` is a plain HTML/CSS/vanilla-JS storefront (no React/bundler) served
by the same Express app as static files — open `http://localhost:3000/` once
the server is running. It covers the customer flow (home, product, cart,
checkout, orders, login/register) and a basic admin page.

### Styling: Tailwind CSS v4, compiled — no runtime internet needed

The stylesheet is written with Tailwind (`src/styles/tailwind.css`: `@theme`
design tokens + `@layer components`) and **compiled ahead of time** to a
plain, self-contained CSS file at `public/css/style.css`, which is committed
to the repo. This matters if your server has no internet access:

- The running app never downloads anything — no Tailwind CDN `<script>`, no
  Google Fonts or any other remote `@import`. Fonts use a system font stack
  (`Segoe UI` / system-ui / etc.), and `public/css/style.css` is a normal
  static file Express serves as-is.
- `tailwindcss` is a **devDependency** — only needed here, at build time, to
  regenerate `style.css` after editing `src/styles/tailwind.css`. It is never
  required (or imported) by `src/server.js` at runtime.
- If you only change `public/*.html` or `public/js/*.js`, there's nothing to
  rebuild — those are served directly.

To rebuild the CSS after editing `src/styles/tailwind.css`:
```bash
npm run build:css     # one-off build (minified) -> public/css/style.css
npm run watch:css     # rebuild on every save, while developing
```
Do this on a machine with internet access (to fetch the `tailwindcss`
package once via `npm install`), then commit/deploy the resulting
`public/css/style.css` — the offline server itself never needs to run
Tailwind or reach the internet.

## Security

- **XSS**: every place the frontend inserts dynamic data (product/category
  names, user names, error messages, etc.) into the DOM via `innerHTML` goes
  through `escapeHtml()` (`public/js/layout.js`). Order status is rendered
  through a fixed whitelist map (`ORDER_STATUS_CLASS`/`ORDER_STATUS_LABEL` in
  `public/js/api.js`) rather than interpolating the raw value into a class
  name, so an unexpected status value can't break out of the attribute.
- **CSP**: `src/app.js` sets a strict Content-Security-Policy via `helmet`
  with every directive `'self'` or `'none'` — no `unsafe-inline` and no
  `unsafe-eval` anywhere (`script-src-attr` is `'none'` too, blocking inline
  `onclick="..."`-style handlers). This only works because the frontend has:
  - no inline `<script>` blocks (every page uses `<script src="...">`),
  - no `style="..."` attributes anywhere (all styling is Tailwind classes),
  - per-element dynamic styling (e.g. a product thumbnail's gradient color)
    is set via `element.style.background = value` in JS
    (`applyThumbGradients()` in `public/js/api.js`), not a `style` attribute
    — CSP's `style-src` only governs the HTML attribute/`<style>` elements,
    not direct CSSOM property assignment, so this needs no CSP exception.
  - `helmet`'s CSP is built with `useDefaults: false` and an explicit
    directive list — its default directive set otherwise adds
    `upgrade-insecure-requests`, which would make browsers rewrite every
    request to HTTPS and break a plain-HTTP offline/internal deployment with
    no TLS certificate.

## Next steps

- Share the current brgshopping.vn source code and/or a MySQL schema dump so
  the models, migrations and the ETL script's column mappings can be made
  exact instead of best-guess placeholders.
- List out the real feature set (promotions/vouchers, product reviews,
  wishlists, multiple product variants/options, payment gateway integration,
  shipping providers, CMS pages, admin dashboard, etc.) so it can be scoped
  into further modules on top of this foundation.
