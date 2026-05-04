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
async function isAdmin(req, res, next) {
    if (!req.session.userId)
        return res.status(401).json({ error: "Non connecté" });
    try {
        const result = await db.execute({
            sql: "SELECT is_admin FROM users WHERE id = ?",
            args: [req.session.userId]
        });
        const user = result.rows[0];
        if (!user || user.is_admin !== 1)
            return res.status(403).json({ error: "Accès refusé" });
        next();
    } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
}

// ─── STATS ────────────────────────────────────────────────────────────────────

router.get("/stats", isAdmin, async (req, res) => {
    try {
        const [users, products, carts, topProducts] = await Promise.all([
            db.execute("SELECT COUNT(*) as count FROM users"),
            db.execute("SELECT COUNT(*) as count FROM products"),
            db.execute("SELECT COUNT(*) as count FROM cart_items"),
            db.execute(`
                SELECT products.name, SUM(cart_items.quantity) as total
                FROM cart_items
                JOIN products ON cart_items.product_id = products.id
                GROUP BY products.id
                ORDER BY total DESC
                LIMIT 5
            `)
        ]);
        res.json({
            totalUsers: Number(users.rows[0].count),
            totalProducts: Number(products.rows[0].count),
            totalCarts: Number(carts.rows[0].count),
            topProducts: topProducts.rows
        });
    } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// ─── PRODUITS ─────────────────────────────────────────────────────────────────

router.get("/products", isAdmin, async (req, res) => {
    try {
        const result = await db.execute("SELECT * FROM products");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

router.post("/products", isAdmin, upload.single("image"), async (req, res) => {
    const name        = xss(req.body.name || '');
    const description = xss(req.body.description || '');
    const price       = req.body.price;
    const category    = xss(req.body.category || '');

    if (!name || !price)
        return res.status(400).json({ error: "Nom et prix requis" });

    const image = req.file ? req.file.filename : "default.jpg";
    try {
        const result = await db.execute({
            sql: "INSERT INTO products (name, description, price, image, category) VALUES (?, ?, ?, ?, ?)",
            args: [name, description, price, image, category]
        });
        if (category) {
            await db.execute({
                sql: "INSERT OR IGNORE INTO collections (name) VALUES (?)",
                args: [category]
            });
        }
        res.json({ message: "Produit ajouté !", id: Number(result.lastInsertRowid) });
    } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

router.put("/products/:id", isAdmin, upload.single("image"), async (req, res) => {
    const name        = xss(req.body.name || '');
    const description = xss(req.body.description || '');
    const price       = req.body.price;
    const category    = xss(req.body.category || '');

    try {
        let image;
        if (req.file) {
            image = req.file.filename;
        } else {
            const existing = await db.execute({
                sql: "SELECT image FROM products WHERE id = ?",
                args: [req.params.id]
            });
            image = existing.rows[0] ? existing.rows[0].image : "default.jpg";
        }

        await db.execute({
            sql: "UPDATE products SET name=?, description=?, price=?, image=?, category=? WHERE id=?",
            args: [name, description, price, image, category, req.params.id]
        });
        res.json({ message: "Produit modifié !" });
    } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

router.delete("/products/:id", isAdmin, async (req, res) => {
    try {
        await db.execute({
            sql: "DELETE FROM products WHERE id=?",
            args: [req.params.id]
        });
        res.json({ message: "Produit supprimé !" });
    } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

router.patch("/products/:id/category", isAdmin, async (req, res) => {
    const { category } = req.body;
    try {
        await db.execute({
            sql: "UPDATE products SET category=? WHERE id=?",
            args: [category || null, req.params.id]
        });
        res.json({ message: "Catégorie mise à jour !" });
    } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// ─── PANIERS ──────────────────────────────────────────────────────────────────

router.get("/carts", isAdmin, async (req, res) => {
    try {
        const result = await db.execute(`
            SELECT users.email, products.name, cart_items.quantity, products.price
            FROM cart_items
            JOIN users ON cart_items.user_id = users.id
            JOIN products ON cart_items.product_id = products.id
            ORDER BY users.email
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// ─── COLLECTIONS ──────────────────────────────────────────────────────────────

router.get("/collections", isAdmin, async (req, res) => {
    try {
        const result = await db.execute("SELECT * FROM collections ORDER BY id");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

router.post("/collections", isAdmin, upload.single("image"), async (req, res) => {
    const name = xss(req.body.name || '').trim();
    if (!name)
        return res.status(400).json({ error: "Nom de collection requis" });

    const image = req.file ? req.file.filename : "default.jpg";
    try {
        const result = await db.execute({
            sql: "INSERT INTO collections (name, image) VALUES (?, ?)",
            args: [name, image]
        });
        res.json({ message: "Collection créée !", id: Number(result.lastInsertRowid) });
    } catch (err) {
        if (err.message.includes("UNIQUE"))
            return res.status(400).json({ error: "Cette collection existe déjà" });
        res.status(500).json({ error: "Erreur serveur" });
    }
});

router.put("/collections/:id", isAdmin, upload.single("image"), async (req, res) => {
    const name = xss(req.body.name || '').trim();
    try {
        let image;
        if (req.file) {
            image = req.file.filename;
        } else {
            const existing = await db.execute({
                sql: "SELECT image FROM collections WHERE id = ?",
                args: [req.params.id]
            });
            image = existing.rows[0] ? existing.rows[0].image : "default.jpg";
        }
        await db.execute({
            sql: "UPDATE collections SET name=?, image=? WHERE id=?",
            args: [name, image, req.params.id]
        });
        res.json({ message: "Collection modifiée !" });
    } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

router.delete("/collections/:id", isAdmin, async (req, res) => {
    try {
        await db.execute({
            sql: "DELETE FROM collections WHERE id=?",
            args: [req.params.id]
        });
        res.json({ message: "Collection supprimée !" });
    } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// ─── HERO IMAGES ──────────────────────────────────────────────────────────────

router.get("/hero", isAdmin, async (req, res) => {
    try {
        const result = await db.execute("SELECT * FROM hero_images ORDER BY position");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

router.put("/hero/:id", isAdmin, upload.single("image"), async (req, res) => {
    const { position_x, position_y, size, fullscreen_x, fullscreen_y } = req.body;
    try {
        let image;
        if (req.file) {
            image = req.file.filename;
        } else {
            const existing = await db.execute({
                sql: "SELECT image FROM hero_images WHERE id = ?",
                args: [req.params.id]
            });
            image = existing.rows[0] ? existing.rows[0].image : "default.jpg";
        }
        await db.execute({
            sql: "UPDATE hero_images SET image=?, position_x=?, position_y=?, size=?, fullscreen_x=?, fullscreen_y=? WHERE id=?",
            args: [image, position_x||'50', position_y||'50', size||'1x1', fullscreen_x||'50', fullscreen_y||'50', req.params.id]
        });
        res.json({ message: "Image mise à jour !" });
    } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

module.exports = router;
