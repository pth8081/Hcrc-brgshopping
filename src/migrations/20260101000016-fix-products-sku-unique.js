// SQL Server's plain UNIQUE CONSTRAINT treats multiple NULLs as duplicates,
// so a second product left without a sku fails with a unique-violation —
// found by creating several demo products in a row. The fix is SQL Server's
// standard pattern: a filtered unique index that only enforces uniqueness
// where sku IS NOT NULL.
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      DECLARE @constraintName NVARCHAR(200);
      SELECT @constraintName = kc.name
      FROM sys.key_constraints kc
      JOIN sys.tables t ON kc.parent_object_id = t.object_id
      JOIN sys.index_columns ic ON ic.object_id = t.object_id AND ic.index_id = kc.unique_index_id
      JOIN sys.columns c ON c.object_id = t.object_id AND c.column_id = ic.column_id
      WHERE t.name = 'products' AND c.name = 'sku' AND kc.type = 'UQ';
      IF @constraintName IS NOT NULL
        EXEC('ALTER TABLE [products] DROP CONSTRAINT [' + @constraintName + ']');
    `);
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX UQ_products_sku_filtered ON [products]([sku]) WHERE [sku] IS NOT NULL;
    `);
  },
  down: async (queryInterface) => {
    await queryInterface.sequelize.query('DROP INDEX UQ_products_sku_filtered ON [products];');
    await queryInterface.addConstraint('products', { fields: ['sku'], type: 'unique', name: 'UQ_products_sku' });
  },
};
