const express = require("express");
const bcrypt = require("bcrypt");
const db = require("../db/database");

const router = express.Router();

// Inscription
router.post("/register", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ error: "Email et mot de passe requis" });

    try {
        const hashed = bcrypt.hashSync(password, 10);
        const result = await db.execute({
            sql: "INSERT INTO users (email, password, is_admin) VALUES (?, ?, 0)",
            args: [email, hashed]
        });
        res.json({ message: "Utilisateur créé", userId: Number(result.lastInsertRowid) });
    } catch (err) {
        if (err.message.includes("UNIQUE"))
            return res.status(400).json({ error: "Email déjà utilisé" });
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// Connexion
router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await db.execute({
            sql: "SELECT * FROM users WHERE email = ?",
            args: [email]
        });
        const user = result.rows[0];
        if (!user) return res.status(400).json({ error: "Utilisateur introuvable" });

        const match = bcrypt.compareSync(password, user.password);
        if (!match) return res.status(400).json({ error: "Mot de passe incorrect" });

        req.session.userId = Number(user.id);
        req.session.isAdmin = user.is_admin === 1;
        res.json({ message: "Connecté", userId: Number(user.id), isAdmin: user.is_admin === 1 });
    } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// Déconnexion
router.post("/logout", (req, res) => {
    req.session.destroy(() => res.json({ message: "Déconnecté" }));
});

// GET /auth/me
router.get("/me", async (req, res) => {
    if (!req.session.userId)
        return res.status(401).json({ error: "Non connecté" });

    try {
        const result = await db.execute({
            sql: "SELECT id, email, is_admin FROM users WHERE id = ?",
            args: [req.session.userId]
        });
        const user = result.rows[0];
        if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });
        res.json({ userId: Number(user.id), email: user.email, isAdmin: user.is_admin === 1 });
    } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

module.exports = router;
