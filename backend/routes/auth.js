const express = require("express");
const bcrypt = require("bcrypt");
const db = require("../db/database");

const router = express.Router();

// Inscription
router.post("/register", (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ error: "Email et mot de passe requis" });

    try {
        const hashed = bcrypt.hashSync(password, 10);
        const result = db.prepare(
            "INSERT INTO users (email, password, is_admin) VALUES (?, ?, 0)"
        ).run(email, hashed);
        res.json({ message: "Utilisateur créé", userId: result.lastInsertRowid });
    } catch (err) {
        if (err.message.includes("UNIQUE"))
            return res.status(400).json({ error: "Email déjà utilisé" });
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// Connexion
router.post("/login", (req, res) => {
    const { email, password } = req.body;
    try {
        const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
        if (!user) return res.status(400).json({ error: "Utilisateur introuvable" });

        const match = bcrypt.compareSync(password, user.password);
        if (!match) return res.status(400).json({ error: "Mot de passe incorrect" });

        req.session.userId = user.id;
        req.session.isAdmin = user.is_admin === 1;
        res.json({ message: "Connecté", userId: user.id, isAdmin: user.is_admin === 1 });
    } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// Déconnexion
router.post("/logout", (req, res) => {
    req.session.destroy(() => res.json({ message: "Déconnecté" }));
});

// GET /auth/me — retourne l'utilisateur connecté
router.get("/me", (req, res) => {
    if (!req.session.userId)
        return res.status(401).json({ error: "Non connecté" });

    const user = db.prepare("SELECT id, email, is_admin FROM users WHERE id = ?").get(req.session.userId);
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });

    res.json({ userId: user.id, email: user.email, isAdmin: user.is_admin === 1 });
});

module.exports = router;
