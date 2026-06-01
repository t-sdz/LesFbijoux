const db = require('../db/database');

async function getCartByUser(userId) {
    const result = await db.execute({
        sql: `SELECT cart_items.id, cart_items.quantity,
               products.name, products.price, products.image
              FROM cart_items
              JOIN products ON cart_items.product_id = products.id
              WHERE cart_items.user_id = ?`,
        args: [userId],
    });
    return result.rows;
}

async function addOrIncrement(userId, productId) {
    const existing = await db.execute({
        sql: 'SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?',
        args: [userId, productId],
    });

    if (existing.rows[0]) {
        await db.execute({
            sql: 'UPDATE cart_items SET quantity = quantity + 1 WHERE id = ?',
            args: [existing.rows[0].id],
        });
        return 'updated';
    }

    await db.execute({
        sql: 'INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, 1)',
        args: [userId, productId],
    });
    return 'created';
}

async function removeItem(itemId, userId) {
    await db.execute({
        sql: 'DELETE FROM cart_items WHERE id = ? AND user_id = ?',
        args: [itemId, userId],
    });
}

async function clearCart(userId) {
    await db.execute({
        sql: 'DELETE FROM cart_items WHERE user_id = ?',
        args: [userId],
    });
}

async function getItemsForCheckout(userId) {
    const result = await db.execute({
        sql: `SELECT cart_items.quantity, products.name, products.price
              FROM cart_items
              JOIN products ON cart_items.product_id = products.id
              WHERE cart_items.user_id = ?`,
        args: [userId],
    });
    return result.rows;
}

module.exports = { getCartByUser, addOrIncrement, removeItem, clearCart, getItemsForCheckout };
