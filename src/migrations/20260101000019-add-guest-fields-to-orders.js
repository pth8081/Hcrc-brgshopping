module.exports = {
  up: async (queryInterface, Sequelize) => {
    // A guest order has no account: userId is null and the recipient info
    // lives directly on the order instead of a linked Address row.
    await queryInterface.changeColumn('orders', 'userId', { type: Sequelize.INTEGER, allowNull: true });
    await queryInterface.addColumn('orders', 'guestName', { type: Sequelize.STRING(150), allowNull: true });
    await queryInterface.addColumn('orders', 'guestPhone', { type: Sequelize.STRING(20), allowNull: true });
    await queryInterface.addColumn('orders', 'guestEmail', { type: Sequelize.STRING(150), allowNull: true });
    await queryInterface.addColumn('orders', 'guestAddress', { type: Sequelize.STRING(500), allowNull: true });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('orders', 'guestAddress');
    await queryInterface.removeColumn('orders', 'guestEmail');
    await queryInterface.removeColumn('orders', 'guestPhone');
    await queryInterface.removeColumn('orders', 'guestName');
    // Deliberately NOT reverting userId back to NOT NULL: any guest order
    // created while this migration was applied has userId = NULL, and
    // SQL Server refuses to add a NOT NULL constraint over existing NULLs.
    // Down() would then fail (and, worse, fail partway through, after the
    // columns above are already dropped) for any deployment that has ever
    // taken a guest order — which is the entire point of this feature.
  },
};
