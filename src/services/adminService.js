const db = require('../db/database');

async function getStats() {
    const [users, products, carts, topProducts] = await Promise.all([
        db.execute('SELECT COUNT(*) as count FROM users'),
        db.execute('SELECT COUNT(*) as count FROM products'),
        db.execute('SELECT COUNT(*) as count FROM cart_items'),
        db.execute(`
            SELECT products.name, SUM(cart_items.quantity) as total
            FROM cart_items
            JOIN products ON cart_items.product_id = products.id
            GROUP BY products.id
            ORDER BY total DESC
            LIMIT 5
        `),
    ]);
    return {
        totalUsers: Number(users.rows[0].count),
        totalProducts: Number(products.rows[0].count),
        totalCarts: Number(carts.rows[0].count),
        topProducts: topProducts.rows,
    };
}

async function getAllProducts() {
    const result = await db.execute('SELECT * FROM products');
    return result.rows;
}

async function createProduct(name, description, price, image, category) {
    const result = await db.execute({
        sql: 'INSERT INTO products (name, description, price, image, category) VALUES (?, ?, ?, ?, ?)',
        args: [name, description, price, image, category],
    });
    if (category) {
        await db.execute({
            sql: 'INSERT OR IGNORE INTO collections (name) VALUES (?)',
            args: [category],
        });
    }
    return Number(result.lastInsertRowid);
}

async function updateProduct(id, name, description, price, image, category) {
    await db.execute({
        sql: 'UPDATE products SET name=?, description=?, price=?, image=?, category=? WHERE id=?',
        args: [name, description, price, image, category, id],
    });
}

async function deleteProduct(id) {
    await db.execute({ sql: 'DELETE FROM products WHERE id=?', args: [id] });
}

async function updateProductCategory(id, category) {
    await db.execute({
        sql: 'UPDATE products SET category=? WHERE id=?',
        args: [category || null, id],
    });
}

async function getAllCarts() {
    const result = await db.execute(`
        SELECT users.email, products.name, cart_items.quantity, products.price
        FROM cart_items
        JOIN users ON cart_items.user_id = users.id
        JOIN products ON cart_items.product_id = products.id
        ORDER BY users.email
    `);
    return result.rows;
}

async function getAllCollections() {
    const result = await db.execute('SELECT * FROM collections ORDER BY id');
    return result.rows;
}

async function createCollection(name, image) {
    const result = await db.execute({
        sql: 'INSERT INTO collections (name, image) VALUES (?, ?)',
        args: [name, image],
    });
    return Number(result.lastInsertRowid);
}

async function updateCollection(id, name, image) {
    await db.execute({
        sql: 'UPDATE collections SET name=?, image=? WHERE id=?',
        args: [name, image, id],
    });
}

async function deleteCollection(id) {
    await db.execute({ sql: 'DELETE FROM collections WHERE id=?', args: [id] });
}

async function getHeroImages() {
    const result = await db.execute('SELECT * FROM hero_images ORDER BY position');
    return result.rows;
}

async function updateHeroImage(id, image, position_x, position_y, size, fullscreen_x, fullscreen_y) {
    await db.execute({
        sql: 'UPDATE hero_images SET image=?, position_x=?, position_y=?, size=?, fullscreen_x=?, fullscreen_y=? WHERE id=?',
        args: [image, position_x || '50', position_y || '50', size || '1x1', fullscreen_x || 50, fullscreen_y || 50, id],
    });
}

async function getProductImage(id) {
    const result = await db.execute({ sql: 'SELECT image FROM products WHERE id = ?', args: [id] });
    return result.rows[0]?.image || 'default.jpg';
}

async function getCollectionImage(id) {
    const result = await db.execute({ sql: 'SELECT image FROM collections WHERE id = ?', args: [id] });
    return result.rows[0]?.image || 'default.jpg';
}

async function getHeroImage(id) {
    const result = await db.execute({ sql: 'SELECT image FROM hero_images WHERE id = ?', args: [id] });
    return result.rows[0]?.image || 'default.jpg';
}

async function isAdmin(userId) {
    const result = await db.execute({
        sql: 'SELECT is_admin FROM users WHERE id = ?',
        args: [userId],
    });
    return result.rows[0]?.is_admin === 1;
}

module.exports = {
    getStats, getAllProducts, createProduct, updateProduct, deleteProduct, updateProductCategory,
    getAllCarts, getAllCollections, createCollection, updateCollection, deleteCollection,
    getHeroImages, updateHeroImage, getProductImage, getCollectionImage, getHeroImage, isAdmin,
};
