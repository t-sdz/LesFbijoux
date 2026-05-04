const express = require("express");
const router = express.Router();
const db = require("../db/database");

// GET /products
router.get("/", async (req, res) => {
    try {
        const result = await db.execute("SELECT * FROM products");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// GET /products/categories
router.get("/categories", async (req, res) => {
    try {
        const result = await db.execute(
            "SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != ''"
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// GET /products/collections
router.get("/collections", async (req, res) => {
    try {
        const result = await db.execute("SELECT * FROM collections ORDER BY id");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// GET /products/hero
router.get("/hero", async (req, res) => {
    try {
        const result = await db.execute("SELECT * FROM hero_images ORDER BY position");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// GET /products/:id — EN DERNIER
router.get("/:id", async (req, res) => {
    try {
        const result = await db.execute({
            sql: "SELECT * FROM products WHERE id = ?",
            args: [req.params.id]
        });
        const row = result.rows[0];
        if (!row) return res.status(404).json({ error: "Produit introuvable" });
        res.json(row);
    } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

module.exports = router;
