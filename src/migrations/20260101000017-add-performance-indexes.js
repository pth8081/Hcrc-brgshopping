module.exports = {
  up: async (queryInterface) => {
    await queryInterface.addIndex('products', ['categoryId']);
    await queryInterface.addIndex('cart_items', ['cartId']);
    await queryInterface.addIndex('cart_items', ['productId']);
    await queryInterface.addIndex('orders', ['userId']);
    await queryInterface.addIndex('orders', ['status']);
    await queryInterface.addIndex('order_items', ['orderId']);
    await queryInterface.addIndex('order_items', ['productId']);
  },
  down: async (queryInterface) => {
    await queryInterface.removeIndex('products', ['categoryId']);
    await queryInterface.removeIndex('cart_items', ['cartId']);
    await queryInterface.removeIndex('cart_items', ['productId']);
    await queryInterface.removeIndex('orders', ['userId']);
    await queryInterface.removeIndex('orders', ['status']);
    await queryInterface.removeIndex('order_items', ['orderId']);
    await queryInterface.removeIndex('order_items', ['productId']);
  },
};
