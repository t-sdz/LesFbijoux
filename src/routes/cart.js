const express = require("express");
const router = express.Router();
const db = require("../db/database");

function isAuthenticated(req, res, next) {
    if (!req.session.userId)
        return res.status(401).json({ error: "Tu dois être connecté" });
    next();
}

// GET /cart
router.get("/", isAuthenticated, async (req, res) => {
    try {
        const result = await db.execute({
            sql: `SELECT cart_items.id, cart_items.quantity,
                   products.name, products.price, products.image
                  FROM cart_items
                  JOIN products ON cart_items.product_id = products.id
                  WHERE cart_items.user_id = ?`,
            args: [req.session.userId]
        });
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// POST /cart
router.post("/", isAuthenticated, async (req, res) => {
    const { product_id } = req.body;
    if (!product_id)
        return res.status(400).json({ error: "product_id requis" });

    try {
        const existing = await db.execute({
            sql: "SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?",
            args: [req.session.userId, product_id]
        });

        if (existing.rows[0]) {
            await db.execute({
                sql: "UPDATE cart_items SET quantity = quantity + 1 WHERE id = ?",
                args: [existing.rows[0].id]
            });
            res.json({ message: "Quantité mise à jour !" });
        } else {
            await db.execute({
                sql: "INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, 1)",
                args: [req.session.userId, product_id]
            });
            res.json({ message: "Produit ajouté au panier !" });
        }
    } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// DELETE /cart/:id
router.delete("/:id", isAuthenticated, async (req, res) => {
    try {
        await db.execute({
            sql: "DELETE FROM cart_items WHERE id = ? AND user_id = ?",
            args: [req.params.id, req.session.userId]
        });
        res.json({ message: "Article supprimé du panier !" });
    } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// DELETE /cart — vider tout le panier
router.delete("/", isAuthenticated, async (req, res) => {
    try {
        await db.execute({
            sql: "DELETE FROM cart_items WHERE user_id = ?",
            args: [req.session.userId]
        });
        res.json({ message: "Panier vidé !" });
    } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// POST /cart/checkout
router.post("/checkout", isAuthenticated, async (req, res) => {
    try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        const result = await db.execute({
            sql: `SELECT cart_items.quantity, products.name, products.price
                  FROM cart_items
                  JOIN products ON cart_items.product_id = products.id
                  WHERE cart_items.user_id = ?`,
            args: [req.session.userId]
        });
        const items = result.rows;

        if (items.length === 0)
            return res.status(400).json({ error: "Panier vide" });

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: items.map(item => ({
                price_data: {
                    currency: 'eur',
                    product_data: { name: item.name },
                    unit_amount: Math.round(item.price * 100),
                },
                quantity: item.quantity,
            })),
            mode: 'payment',
            success_url: process.env.BASE_URL + '/cart.html?success=true',
            cancel_url: process.env.BASE_URL + '/cart.html?cancelled=true',
        });

        res.json({ url: session.url });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erreur paiement" });
    }
});

module.exports = router;
