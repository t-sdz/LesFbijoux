const express = require("express");
const router = express.Router();
const db = require("../db/database");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const xss = require('xss');

// Configuration upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, "../../public/images");
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, unique + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|webp/;
        if (allowed.test(path.extname(file.originalname).toLowerCase())) {
            cb(null, true);
        } else {
            cb(new Error("Seulement JPG, PNG, WEBP acceptés"));
        }
    }
});

// Middleware admin
function isAdmin(req, res, next) {
    if (!req.session.userId)
        return res.status(401).json({ error: "Non connecté" });
    const user = db.prepare("SELECT is_admin FROM users WHERE id = ?").get(req.session.userId);
    if (!user || user.is_admin !== 1)
        return res.status(403).json({ error: "Accès refusé" });
    next();
}

// ─── STATS ────────────────────────────────────────────────────────────────────

router.get("/stats", isAdmin, (req, res) => {
    const stats = {};
    stats.totalUsers    = db.prepare("SELECT COUNT(*) as count FROM users").get().count;
    stats.totalProducts = db.prepare("SELECT COUNT(*) as count FROM products").get().count;
    stats.totalCarts    = db.prepare("SELECT COUNT(*) as count FROM cart_items").get().count;
    stats.topProducts   = db.prepare(`
        SELECT products.name, SUM(cart_items.quantity) as total
        FROM cart_items
        JOIN products ON cart_items.product_id = products.id
        GROUP BY products.id
        ORDER BY total DESC
        LIMIT 5
    `).all();
    res.json(stats);
});

// ─── PRODUITS ─────────────────────────────────────────────────────────────────

router.get("/products", isAdmin, (req, res) => {
    const products = db.prepare("SELECT * FROM products").all();
    res.json(products);
});

router.post("/products", isAdmin, upload.single("image"), (req, res) => {
    const name        = xss(req.body.name || '');
    const description = xss(req.body.description || '');
    const price       = req.body.price;
    const category    = xss(req.body.category || '');

    if (!name || !price)
        return res.status(400).json({ error: "Nom et prix requis" });

    const image = req.file ? req.file.filename : "default.jpg";
    const result = db.prepare(
        "INSERT INTO products (name, description, price, image, category) VALUES (?, ?, ?, ?, ?)"
    ).run(name, description, price, image, category);

    if (category) {
        db.prepare("INSERT OR IGNORE INTO collections (name) VALUES (?)").run(category);
    }

    res.json({ message: "Produit ajouté !", id: result.lastInsertRowid });
});

router.put("/products/:id", isAdmin, upload.single("image"), (req, res) => {
    const name        = xss(req.body.name || '');
    const description = xss(req.body.description || '');
    const price       = req.body.price;
    const category    = xss(req.body.category || '');

    let image;
    if (req.file) {
        image = req.file.filename;
    } else {
        const existing = db.prepare("SELECT image FROM products WHERE id = ?").get(req.params.id);
        image = existing ? existing.image : "default.jpg";
    }

    db.prepare(
        "UPDATE products SET name=?, description=?, price=?, image=?, category=? WHERE id=?"
    ).run(name, description, price, image, category, req.params.id);

    res.json({ message: "Produit modifié !" });
});

router.delete("/products/:id", isAdmin, (req, res) => {
    db.prepare("DELETE FROM products WHERE id=?").run(req.params.id);
    res.json({ message: "Produit supprimé !" });
});

router.patch("/products/:id/category", isAdmin, (req, res) => {
    const { category } = req.body;
    db.prepare("UPDATE products SET category=? WHERE id=?").run(category || null, req.params.id);
    res.json({ message: "Catégorie mise à jour !" });
});

// ─── PANIERS ──────────────────────────────────────────────────────────────────

router.get("/carts", isAdmin, (req, res) => {
    const carts = db.prepare(`
        SELECT users.email, products.name, cart_items.quantity, products.price
        FROM cart_items
        JOIN users ON cart_items.user_id = users.id
        JOIN products ON cart_items.product_id = products.id
        ORDER BY users.email
    `).all();
    res.json(carts);
});

// ─── COLLECTIONS ──────────────────────────────────────────────────────────────

router.get("/collections", isAdmin, (req, res) => {
    const collections = db.prepare("SELECT * FROM collections ORDER BY id").all();
    res.json(collections);
});

router.post("/collections", isAdmin, upload.single("image"), (req, res) => {
    const name = xss(req.body.name || '').trim();
    if (!name)
        return res.status(400).json({ error: "Nom de collection requis" });

    const image = req.file ? req.file.filename : "default.jpg";

    try {
        const result = db.prepare(
            "INSERT INTO collections (name, image) VALUES (?, ?)"
        ).run(name, image);
        res.json({ message: "Collection créée !", id: result.lastInsertRowid });
    } catch (err) {
        if (err.message.includes("UNIQUE"))
            return res.status(400).json({ error: "Cette collection existe déjà" });
        res.status(500).json({ error: "Erreur serveur" });
    }
});

router.put("/collections/:id", isAdmin, upload.single("image"), (req, res) => {
    const name = xss(req.body.name || '').trim();

    let image;
    if (req.file) {
        image = req.file.filename;
    } else {
        const existing = db.prepare("SELECT image FROM collections WHERE id = ?").get(req.params.id);
        image = existing ? existing.image : "default.jpg";
    }

    db.prepare("UPDATE collections SET name=?, image=? WHERE id=?").run(name, image, req.params.id);
    res.json({ message: "Collection modifiée !" });
});

router.delete("/collections/:id", isAdmin, (req, res) => {
    db.prepare("DELETE FROM collections WHERE id=?").run(req.params.id);
    res.json({ message: "Collection supprimée !" });
});

// ─── HERO IMAGES ──────────────────────────────────────────────────────────────

router.get("/hero", isAdmin, (req, res) => {
    const images = db.prepare("SELECT * FROM hero_images ORDER BY position").all();
    res.json(images);
});

router.put("/hero/:id", isAdmin, upload.single("image"), (req, res) => {
    const { position_x, position_y, size } = req.body;

    let image;
    if (req.file) {
        image = req.file.filename;
    } else {
        const existing = db.prepare("SELECT image FROM hero_images WHERE id = ?").get(req.params.id);
        image = existing ? existing.image : "default.jpg";
    }

    db.prepare(
        "UPDATE hero_images SET image=?, position_x=?, position_y=?, size=? WHERE id=?"
    ).run(
        image,
        position_x || 'center',
        position_y || 'center',
        size || '1x1',
        req.params.id
    );

    res.json({ message: "Image mise à jour !" });
});

module.exports = router;
