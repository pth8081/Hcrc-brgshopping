module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'googleId', { type: Sequelize.STRING(50), allowNull: true });
    await queryInterface.addColumn('users', 'facebookId', { type: Sequelize.STRING(50), allowNull: true });
    await queryInterface.addColumn('users', 'avatarUrl', { type: Sequelize.STRING(500), allowNull: true });
    // A social-only account (Google/Facebook, no email+password registration)
    // never gets a passwordHash.
    await queryInterface.changeColumn('users', 'passwordHash', { type: Sequelize.STRING(255), allowNull: true });
    // Plain (non-unique) indexes: SQL Server unique indexes only allow a single
    // NULL, and almost every row here has NULL for these columns. Duplicate
    // linking is guarded in application code (find-by-id before create) instead.
    await queryInterface.addIndex('users', ['googleId']);
    await queryInterface.addIndex('users', ['facebookId']);
  },
  down: async (queryInterface) => {
    await queryInterface.removeIndex('users', ['googleId']);
    await queryInterface.removeIndex('users', ['facebookId']);
    // Deliberately NOT reverting passwordHash back to NOT NULL: any
    // social-only account created while this migration was applied has
    // passwordHash = NULL, and SQL Server refuses to add a NOT NULL
    // constraint over existing NULLs — same reasoning as userId in
    // 20260101000019-add-guest-fields-to-orders.js.
    await queryInterface.removeColumn('users', 'avatarUrl');
    await queryInterface.removeColumn('users', 'facebookId');
    await queryInterface.removeColumn('users', 'googleId');
  },
};
