/**
 * One-off ETL: copies data from the live Odoo installation (PostgreSQL) into
 * the MSSQL database used by this app.
 *
 * The live brgshopping.vn site does NOT run a small custom app — it runs on
 * Odoo (confirmed from the real schema dump: `pg_dump`/PostgreSQL, table
 * names like product_template/sale_order/res_partner, 460 tables in total).
 * Odoo's full data model covers accounting, inventory, HR, etc. — this
 * script only pulls the slice relevant to the storefront rebuilt in this
 * repo: catalog (categories, products, images), customers, and orders.
 * Everything else (accounting entries, internal stock moves, HR...) is
 * intentionally left in Odoo.
 *
 * Because the source and target schemas are structurally different (Odoo's
 * product.template/product.product split, many-to-many category links,
 * stock.quant-based inventory, etc. vs this app's flat tables), each entity
 * below is a hand-written JOIN query that assembles one row per target
 * table, rather than a 1:1 table copy.
 *
 * Usage:
 *   1. Fill in ODOO_PG_* in .env (read-only access to the Odoo database is enough).
 *   2. npm run db:migrate   (creates the MSSQL schema, if not already done)
 *   3. npm run migrate:odoo -- --dry-run   (prints row counts only)
 *   4. npm run migrate:odoo                 (writes the data)
 *
 * Run this BEFORE creating any real data in MSSQL (admin seed included) —
 * see the id-collision note in docs/MIGRATION.md.
 */

require('dotenv').config();
const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const slugify = require('slugify');
const odooConfig = require('../src/config/odooSource');
const {
  sequelize, Category, Product, ProductImage, User, Order, OrderItem,
} = require('../src/models');

const BATCH_SIZE = 500;
const isDryRun = process.argv.includes('--dry-run');

const toNumber = (v) => (v === null || v === undefined ? null : Number(v));

/** Inserts rows into `model`, preserving the source's primary key via
 * IDENTITY_INSERT, skipping ids that already exist so re-runs stay
 * idempotent (see the id-collision caveat in docs/MIGRATION.md). */
async function upsertPreservingIds(model, rows, label) {
  if (rows.length === 0) return { inserted: 0, skipped: 0 };
  if (isDryRun) return { inserted: rows.length, skipped: 0 };

  const tableName = model.getTableName();
  const existing = await model.findAll({ attributes: ['id'], where: { id: rows.map((r) => r.id) }, raw: true });
  const existingIds = new Set(existing.map((r) => r.id));
  const toInsert = rows.filter((r) => !existingIds.has(r.id));

  if (toInsert.length > 0) {
    await sequelize.query(`SET IDENTITY_INSERT ${tableName} ON`);
    try {
      await model.bulkCreate(toInsert, { validate: false });
    } finally {
      await sequelize.query(`SET IDENTITY_INSERT ${tableName} OFF`);
    }
  }
  console.log(`[${label}] ${toInsert.length} new, ${rows.length - toInsert.length} already present`);
  return { inserted: toInsert.length, skipped: rows.length - toInsert.length };
}

async function migrateCategories(pg) {
  const { rows } = await pg.query(`
    SELECT id, name, parent_id, category_code
    FROM product_public_category
    ORDER BY id
  `);
  console.log(`\n[categories] found ${rows.length} row(s) in product_public_category`);

  // Two passes: insert with parentId null first, then wire up parentId —
  // avoids failing the self-referencing FK when a parent's id is greater
  // than its child's (category_code often isn't unique/slug-safe, hence
  // falling back to name + id).
  const mapped = rows.map((r) => ({
    id: r.id,
    parentId: null,
    name: r.name,
    slug: slugify(`${r.category_code || r.name}-${r.id}`, { lower: true, strict: true }),
    isActive: true,
  }));
  const result = await upsertPreservingIds(Category, mapped, 'categories');

  if (!isDryRun) {
    for (const r of rows) {
      if (r.parent_id) {
        await Category.update({ parentId: r.parent_id }, { where: { id: r.id } });
      }
    }
  }
  return result;
}

async function migrateProducts(pg) {
  const { rows: countRows } = await pg.query('SELECT COUNT(*) AS total FROM product_template');
  const total = Number(countRows[0].total);
  console.log(`\n[products] found ${total} row(s) in product_template`);

  const variantToTemplate = new Map();
  let inserted = 0;
  let skipped = 0;

  for (let offset = 0; offset < total; offset += BATCH_SIZE) {
    const { rows } = await pg.query(
      `
      SELECT
        t.id AS template_id,
        t.name,
        t.product_code,
        t.list_price,
        t.finalprice,
        t.is_saleoff,
        t.active,
        t.is_published,
        COALESCE(t.website_description, t.description_sale) AS description,
        cat.product_public_category_id AS category_id,
        variant.id AS variant_id,
        COALESCE(stock.qty, 0) AS stock_quantity,
        t.create_date,
        t.write_date
      FROM product_template t
      LEFT JOIN LATERAL (
        SELECT product_public_category_id
        FROM product_public_category_product_template_rel rel
        WHERE rel.product_template_id = t.id
        ORDER BY product_public_category_id
        LIMIT 1
      ) cat ON true
      LEFT JOIN LATERAL (
        SELECT id FROM product_product p WHERE p.product_tmpl_id = t.id ORDER BY p.id LIMIT 1
      ) variant ON true
      LEFT JOIN LATERAL (
        SELECT SUM(quantity) AS qty FROM stock_quant sq WHERE sq.product_id = variant.id
      ) stock ON true
      ORDER BY t.id
      LIMIT $1 OFFSET $2
      `,
      [BATCH_SIZE, offset]
    );

    const mapped = rows.map((r) => {
      if (r.variant_id) variantToTemplate.set(r.variant_id, r.template_id);
      return {
        id: r.template_id,
        categoryId: r.category_id || null,
        name: r.name,
        slug: slugify(`${r.name}-${r.template_id}`, { lower: true, strict: true }),
        sku: r.product_code || null,
        description: r.description,
        price: toNumber(r.list_price) ?? 0,
        salePrice: r.is_saleoff ? toNumber(r.finalprice) : null,
        stockQuantity: Math.max(0, Math.round(toNumber(r.stock_quantity) ?? 0)),
        isActive: r.active === true && r.is_published === true,
        createdAt: r.create_date || new Date(),
        updatedAt: r.write_date || new Date(),
      };
    });

    const result = await upsertPreservingIds(Product, mapped, 'products');
    inserted += result.inserted;
    skipped += result.skipped;
  }

  return { variantToTemplate, inserted, skipped };
}

async function migrateProductImages(pg) {
  const { rows } = await pg.query(`
    SELECT id, product_tmpl_id, link
    FROM product_image
    WHERE link IS NOT NULL
    ORDER BY product_tmpl_id, id
  `);
  console.log(`\n[product_images] found ${rows.length} row(s) in product_image`);

  const mapped = rows.map((r, i) => ({
    id: r.id,
    productId: r.product_tmpl_id,
    imageUrl: r.link,
    sortOrder: i,
  }));
  return upsertPreservingIds(ProductImage, mapped, 'product_images');
}

async function migrateCustomers(pg) {
  const { rows } = await pg.query(`
    SELECT p.id, p.name, p.email, p.phone, p.create_date, p.write_date
    FROM res_partner p
    WHERE p.customer = true AND p.active = true AND p.email IS NOT NULL
    ORDER BY p.id
  `);
  console.log(`\n[users] found ${rows.length} customer row(s) in res_partner`);
  console.log('[users] Odoo password hashes are not bcrypt-compatible — every migrated');
  console.log('[users] account gets a random unusable password and must reset it.');

  const mapped = rows.map((r) => ({
    id: r.id,
    fullName: r.name || `Khách hàng #${r.id}`,
    email: r.email,
    passwordHash: bcrypt.hashSync(crypto.randomBytes(32).toString('hex'), 10),
    phone: r.phone || null,
    role: 'customer',
    isActive: true,
    createdAt: r.create_date || new Date(),
    updatedAt: r.write_date || new Date(),
  }));
  return upsertPreservingIds(User, mapped, 'users');
}

// Best-effort mapping from Odoo's default + this store's custom order flags
// to this app's simpler status enum — adjust if the real workflow differs.
function mapOrderStatus(r) {
  if (r.is_cancel) return 'cancelled';
  if (r.is_received || r.backend_state === 'completed') return 'completed';
  if (r.is_shipped) return 'shipping';
  if (r.state === 'sale' || r.state === 'done' || r.backend_state === 'confirmed') return 'confirmed';
  return 'pending';
}

async function migrateOrders(pg, variantToTemplate) {
  const { rows: countRows } = await pg.query('SELECT COUNT(*) AS total FROM sale_order');
  const total = Number(countRows[0].total);
  console.log(`\n[orders] found ${total} row(s) in sale_order`);

  let orderInserted = 0;
  let orderSkipped = 0;
  let itemInserted = 0;
  let itemSkipped = 0;

  for (let offset = 0; offset < total; offset += BATCH_SIZE) {
    const { rows } = await pg.query(
      `
      SELECT
        o.id, o.partner_id, o.amount_total, o.state, o.backend_state,
        o.is_shipped, o.is_received, o.is_cancel,
        o.delivery_customer_name, o.delivery_customer_phone, o.delivery_customer_address,
        o.date_order, o.write_date
      FROM sale_order o
      ORDER BY o.id
      LIMIT $1 OFFSET $2
      `,
      [BATCH_SIZE, offset]
    );

    const mappedOrders = rows.map((r) => ({
      id: r.id,
      userId: r.partner_id,
      addressId: null,
      status: mapOrderStatus(r),
      paymentMethod: 'cod', // Odoo's payment acquirer isn't mapped in this pass — adjust if needed
      paymentStatus: r.is_received ? 'paid' : 'unpaid',
      totalAmount: toNumber(r.amount_total) ?? 0,
      note: [
        r.delivery_customer_name ? `Người nhận: ${r.delivery_customer_name} (${r.delivery_customer_phone || ''})` : null,
        r.delivery_customer_address ? `Địa chỉ: ${r.delivery_customer_address}` : null,
      ]
        .filter(Boolean)
        .join(' — ') || null,
      createdAt: r.date_order || new Date(),
      updatedAt: r.write_date || r.date_order || new Date(),
    }));

    // Orders whose customer wasn't migrated (no email, inactive, not
    // flagged as a customer) have no matching User row — userId is
    // NOT NULL on Order, so those rows can't be inserted; skip them here
    // rather than letting the DB reject the whole batch.
    const existingUserIds = new Set(
      (await User.findAll({ attributes: ['id'], where: { id: mappedOrders.map((o) => o.userId) }, raw: true })).map((u) => u.id)
    );
    const insertableOrders = mappedOrders.filter((o) => existingUserIds.has(o.userId));
    if (insertableOrders.length < mappedOrders.length) {
      console.log(`[orders] skipping ${mappedOrders.length - insertableOrders.length} order(s) whose customer wasn't migrated`);
    }

    const orderResult = await upsertPreservingIds(Order, insertableOrders, 'orders');
    orderInserted += orderResult.inserted;
    orderSkipped += orderResult.skipped;

    const orderIds = insertableOrders.map((o) => o.id);
    if (orderIds.length === 0) continue;

    const { rows: lineRows } = await pg.query(
      `
      SELECT id, order_id, name, price_unit, product_uom_qty, price_subtotal, price_total, product_id
      FROM sale_order_line
      WHERE order_id = ANY($1) AND display_type IS NULL
      ORDER BY order_id, id
      `,
      [orderIds]
    );

    const mappedItems = lineRows.map((r) => ({
      id: r.id,
      orderId: r.order_id,
      productId: variantToTemplate.get(r.product_id) || null,
      productName: r.name,
      price: toNumber(r.price_unit) ?? 0,
      quantity: Math.round(toNumber(r.product_uom_qty) ?? 1),
      subtotal: toNumber(r.price_subtotal ?? r.price_total) ?? 0,
    }));
    const itemResult = await upsertPreservingIds(OrderItem, mappedItems, 'order_items');
    itemInserted += itemResult.inserted;
    itemSkipped += itemResult.skipped;
  }

  return { orderInserted, orderSkipped, itemInserted, itemSkipped };
}

async function main() {
  console.log(`Starting Odoo (PostgreSQL) -> MSSQL migration${isDryRun ? ' (dry run, no writes)' : ''}...`);

  const pg = new Client(odooConfig);
  await pg.connect();
  await sequelize.authenticate();

  try {
    await migrateCategories(pg);
    const { variantToTemplate } = await migrateProducts(pg);
    await migrateProductImages(pg);
    await migrateCustomers(pg);
    await migrateOrders(pg, variantToTemplate);
    console.log('\nMigration finished.');
  } finally {
    await pg.end();
    await sequelize.close();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
