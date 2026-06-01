const db = require('./database');

async function initDb() {
    await db.execute(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            is_admin INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            price REAL NOT NULL,
            image TEXT,
            category TEXT
        )
    `);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS collections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            image TEXT DEFAULT 'default.jpg'
        )
    `);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS cart_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            quantity INTEGER DEFAULT 1,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (product_id) REFERENCES products(id)
        )
    `);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS hero_images (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            image TEXT NOT NULL,
            position INTEGER DEFAULT 0,
            position_x TEXT DEFAULT 'center',
            position_y TEXT DEFAULT 'center',
            size TEXT DEFAULT '1x1',
            fullscreen_x INTEGER DEFAULT 50,
            fullscreen_y INTEGER DEFAULT 50
        )
    `);

    // Indexes sur les colonnes de jointure critiques
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_cart_user ON cart_items(user_id)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_cart_product ON cart_items(product_id)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)`);

    console.log('Base de données initialisée.');
}

initDb().catch(err => {
    console.error('Erreur initialisation DB :', err);
    process.exit(1);
});
