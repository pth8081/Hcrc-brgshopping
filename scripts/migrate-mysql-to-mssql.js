/**
 * One-off ETL: copies data from the legacy MySQL database into the new MSSQL
 * database used by this app.
 *
 * THIS IS A TEMPLATE. The old brgshopping.vn MySQL schema is not available in
 * this repo, so the `mysqlTable` names and `mapRow` column mappings below are
 * placeholders named after this project's own MSSQL tables. Before running:
 *
 *   1. Open MySQL Workbench / phpMyAdmin / `mysqldump --no-data` on the old DB
 *      and note the real table + column names for users, addresses,
 *      categories, products, product images, carts, cart items, orders and
 *      order items (rename/add/remove tables in TABLE_MIGRATIONS to match).
 *   2. Update each `mysqlTable` value and each `mapRow` function so the
 *      right-hand side reads the real MySQL column names.
 *   3. Fill in .env with both MYSQL_* (source) and MSSQL_* (target, already
 *      used by the app) credentials.
 *   4. Run `npm run db:migrate` first so the MSSQL tables exist.
 *   5. Preview counts only:      npm run migrate:mysql-to-mssql -- --dry-run
 *      Actually copy the data:  npm run migrate:mysql-to-mssql
 *
 * Order matters: tables are migrated in FK-dependency order (parents before
 * children). IDENTITY_INSERT is toggled per table so the original MySQL
 * primary keys are preserved in MSSQL, which keeps foreign keys valid across
 * tables without having to remap ids.
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const mysqlConfig = require('../src/config/mysqlSource');
const {
  sequelize, User, Address, Category, Product, ProductImage, Cart, CartItem, Order, OrderItem,
} = require('../src/models');

const BATCH_SIZE = 500;
const isDryRun = process.argv.includes('--dry-run');

const toBool = (v) => (v === null || v === undefined ? null : Boolean(Number(v)));
const toNumber = (v) => (v === null || v === undefined ? null : Number(v));

// Ordered parent -> child so foreign keys always resolve.
const TABLE_MIGRATIONS = [
  {
    name: 'users',
    mysqlTable: 'users', // TODO: rename to the real old table, e.g. "tbl_user"
    model: User,
    mapRow: (row) => ({
      id: row.id,
      fullName: row.full_name ?? row.name,
      email: row.email,
      passwordHash: row.password ?? row.password_hash,
      phone: row.phone,
      role: row.role ?? (toBool(row.is_admin) ? 'admin' : 'customer'),
      isActive: toBool(row.is_active) ?? true,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }),
  },
  {
    name: 'addresses',
    mysqlTable: 'addresses',
    model: Address,
    mapRow: (row) => ({
      id: row.id,
      userId: row.user_id,
      recipientName: row.recipient_name ?? row.name,
      phone: row.phone,
      addressLine: row.address_line ?? row.address,
      ward: row.ward,
      district: row.district,
      province: row.province ?? row.city,
      isDefault: toBool(row.is_default) ?? false,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }),
  },
  {
    name: 'categories',
    mysqlTable: 'categories',
    model: Category,
    mapRow: (row) => ({
      id: row.id,
      parentId: row.parent_id || null,
      name: row.name,
      slug: row.slug,
      description: row.description,
      imageUrl: row.image_url ?? row.image,
      isActive: toBool(row.is_active) ?? true,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }),
  },
  {
    name: 'products',
    mysqlTable: 'products',
    model: Product,
    mapRow: (row) => ({
      id: row.id,
      categoryId: row.category_id || null,
      name: row.name,
      slug: row.slug,
      sku: row.sku,
      description: row.description,
      price: toNumber(row.price) ?? 0,
      salePrice: toNumber(row.sale_price),
      stockQuantity: toNumber(row.stock_quantity ?? row.stock) ?? 0,
      thumbnailUrl: row.thumbnail_url ?? row.image,
      isActive: toBool(row.is_active) ?? true,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }),
  },
  {
    name: 'product_images',
    mysqlTable: 'product_images',
    model: ProductImage,
    mapRow: (row) => ({
      id: row.id,
      productId: row.product_id,
      imageUrl: row.image_url ?? row.url,
      sortOrder: toNumber(row.sort_order) ?? 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }),
  },
  {
    name: 'carts',
    mysqlTable: 'carts',
    model: Cart,
    mapRow: (row) => ({
      id: row.id,
      userId: row.user_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }),
  },
  {
    name: 'cart_items',
    mysqlTable: 'cart_items',
    model: CartItem,
    mapRow: (row) => ({
      id: row.id,
      cartId: row.cart_id,
      productId: row.product_id,
      quantity: toNumber(row.quantity) ?? 1,
      priceAtAdd: toNumber(row.price_at_add ?? row.price) ?? 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }),
  },
  {
    name: 'orders',
    mysqlTable: 'orders',
    model: Order,
    mapRow: (row) => ({
      id: row.id,
      userId: row.user_id,
      addressId: row.address_id || null,
      status: row.status ?? 'pending',
      paymentMethod: row.payment_method ?? 'cod',
      paymentStatus: row.payment_status ?? 'unpaid',
      totalAmount: toNumber(row.total_amount ?? row.total) ?? 0,
      note: row.note,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }),
  },
  {
    name: 'order_items',
    mysqlTable: 'order_items',
    model: OrderItem,
    mapRow: (row) => ({
      id: row.id,
      orderId: row.order_id,
      productId: row.product_id || null,
      productName: row.product_name ?? row.name,
      price: toNumber(row.price) ?? 0,
      quantity: toNumber(row.quantity) ?? 1,
      subtotal: toNumber(row.subtotal) ?? 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }),
  },
];

async function migrateTable(mysqlConn, migration) {
  const [countRows] = await mysqlConn.query(`SELECT COUNT(*) as total FROM \`${migration.mysqlTable}\``);
  const total = countRows[0].total;
  console.log(`\n[${migration.name}] found ${total} row(s) in MySQL table "${migration.mysqlTable}"`);

  if (isDryRun || total === 0) return;

  const tableName = migration.model.getTableName();
  await sequelize.query(`SET IDENTITY_INSERT ${tableName} ON`);

  try {
    for (let offset = 0; offset < total; offset += BATCH_SIZE) {
      const [rows] = await mysqlConn.query(
        `SELECT * FROM \`${migration.mysqlTable}\` LIMIT ? OFFSET ?`,
        [BATCH_SIZE, offset]
      );
      const mapped = rows.map(migration.mapRow);

      // MSSQL's Sequelize dialect has no `ignoreDuplicates` bulkCreate option
      // (unlike MySQL/Postgres), so re-runs skip already-migrated ids manually.
      const existing = await migration.model.findAll({
        attributes: ['id'],
        where: { id: mapped.map((r) => r.id) },
        raw: true,
      });
      const existingIds = new Set(existing.map((r) => r.id));
      const toInsert = mapped.filter((r) => !existingIds.has(r.id));

      if (toInsert.length > 0) {
        await migration.model.bulkCreate(toInsert, { validate: false });
      }
      console.log(`[${migration.name}] migrated ${Math.min(offset + BATCH_SIZE, total)}/${total} (${toInsert.length} new, ${mapped.length - toInsert.length} already present)`);
    }
  } finally {
    await sequelize.query(`SET IDENTITY_INSERT ${tableName} OFF`);
  }
}

async function main() {
  console.log(`Starting MySQL -> MSSQL migration${isDryRun ? ' (dry run, no writes)' : ''}...`);

  const mysqlConn = await mysql.createConnection(mysqlConfig);
  await sequelize.authenticate();

  try {
    for (const migration of TABLE_MIGRATIONS) {
      await migrateTable(mysqlConn, migration);
    }
    console.log('\nMigration finished.');
  } finally {
    await mysqlConn.end();
    await sequelize.close();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
