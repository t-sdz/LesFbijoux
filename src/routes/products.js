const express = require("express");
const router = express.Router();
const db = require("../db/database");

// GET /products
router.get("/", (req, res) => {
    try {
        const rows = db.prepare("SELECT * FROM products").all();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// GET /products/categories
router.get("/categories", (req, res) => {
    try {
        const categories = db.prepare(
            "SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != ''"
        ).all();
        res.json(categories);
    } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// GET /products/collections
router.get("/collections", (req, res) => {
    try {
        const collections = db.prepare("SELECT * FROM collections ORDER BY id").all();
        res.json(collections);
    } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// GET /products/hero
router.get("/hero", (req, res) => {
    try {
        const images = db.prepare("SELECT * FROM hero_images ORDER BY position").all();
        res.json(images);
    } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// GET /products/:id — EN DERNIER
router.get("/:id", (req, res) => {
    try {
        const row = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
        if (!row) return res.status(404).json({ error: "Produit introuvable" });
        res.json(row);
    } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

module.exports = router;
