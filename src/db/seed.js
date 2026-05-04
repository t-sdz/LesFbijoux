const db = require('./database');

console.log("📌 Insertion des bijoux...");

db.prepare("DELETE FROM products").run();

const insert = db.prepare(
    "INSERT INTO products (name, description, price, image, category) VALUES (?, ?, ?, ?, ?)"
);

const products = [
    ["Collier Or",               "Collier délicat en or 18 carats",         49.99,  "collier.jpg",  "colliers"],
    ["Bracelet Argent",          "Bracelet fin en argent 925",               29.99,  "bracelet.jpg", "bracelets"],
    ["Boucles d'oreilles Perles","Boucles d'oreilles en perles naturelles",  19.99,  "boucles.jpg",  "boucles"],
    ["Bague Diamant",            "Bague solitaire avec diamant 0.3 carat",   99.99,  "bague.jpg",    "bagues"],
];

const insertMany = db.transaction((items) => {
    for (const p of items) insert.run(...p);
});

insertMany(products);

console.log("✨ Base initialisée !");
