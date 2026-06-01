const db = require('./database');

const products = [
    ['Collier Or',                'Collier délicat en or 18 carats',          49.99,  'collier.jpg',  'colliers'],
    ['Bracelet Argent',           'Bracelet fin en argent 925',                29.99,  'bracelet.jpg', 'bracelets'],
    ["Boucles d'oreilles Perles", "Boucles d'oreilles en perles naturelles",   19.99,  'boucles.jpg',  'boucles'],
    ['Bague Diamant',             'Bague solitaire avec diamant 0.3 carat',    99.99,  'bague.jpg',    'bagues'],
];

const collections = [
    ['colliers',   'collier.jpg'],
    ['bracelets',  'bracelet.jpg'],
    ['boucles',    'boucles.jpg'],
    ['bagues',     'bague.jpg'],
];

async function seed() {
    console.log('Suppression des données existantes...');
    await db.execute('DELETE FROM cart_items');
    await db.execute('DELETE FROM products');
    await db.execute('DELETE FROM collections');

    console.log('Insertion des produits...');
    for (const [name, description, price, image, category] of products) {
        await db.execute({
            sql: 'INSERT INTO products (name, description, price, image, category) VALUES (?, ?, ?, ?, ?)',
            args: [name, description, price, image, category],
        });
    }

    console.log('Insertion des collections...');
    for (const [name, image] of collections) {
        await db.execute({
            sql: 'INSERT OR IGNORE INTO collections (name, image) VALUES (?, ?)',
            args: [name, image],
        });
    }

    console.log('Base de données peuplée avec les données de démo.');
}

seed().catch(err => {
    console.error('Erreur seed :', err);
    process.exit(1);
});
