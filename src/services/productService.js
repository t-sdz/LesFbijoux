const db = require('../db/database');

async function getAll() {
    const result = await db.execute('SELECT * FROM products');
    return result.rows;
}

async function getById(id) {
    const result = await db.execute({
        sql: 'SELECT * FROM products WHERE id = ?',
        args: [id],
    });
    return result.rows[0] || null;
}

async function getCategories() {
    const result = await db.execute(
        "SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != ''"
    );
    return result.rows;
}

async function getCollections() {
    const result = await db.execute('SELECT * FROM collections ORDER BY id');
    return result.rows;
}

async function getHeroImages() {
    const result = await db.execute('SELECT * FROM hero_images ORDER BY position');
    return result.rows;
}

module.exports = { getAll, getById, getCategories, getCollections, getHeroImages };
