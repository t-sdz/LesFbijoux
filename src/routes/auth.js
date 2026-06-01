const express = require('express');
const { z } = require('zod');
const authService = require('../services/authService');

const router = express.Router();

const registerSchema = z.object({
    email: z.string().email('Email invalide'),
    password: z.string().min(8, 'Mot de passe trop court (8 caractères min.)'),
});

const loginSchema = z.object({
    email: z.string().email('Email invalide'),
    password: z.string().min(1, 'Mot de passe requis'),
});

router.post('/register', async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.errors[0].message });

    const { email, password } = parsed.data;
    try {
        const userId = await authService.createUser(email, password);
        res.json({ message: 'Utilisateur créé', userId });
    } catch (err) {
        if (err.message.includes('UNIQUE'))
            return res.status(400).json({ error: 'Email déjà utilisé' });
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.post('/login', async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.errors[0].message });

    const { email, password } = parsed.data;
    try {
        const user = await authService.findByEmail(email);
        if (!user) return res.status(400).json({ error: 'Utilisateur introuvable' });
        if (!authService.verifyPassword(password, user.password))
            return res.status(400).json({ error: 'Mot de passe incorrect' });

        req.session.userId = Number(user.id);
        req.session.isAdmin = user.is_admin === 1;
        res.json({ message: 'Connecté', userId: Number(user.id), isAdmin: user.is_admin === 1 });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.post('/logout', (req, res) => {
    req.session.destroy(() => res.json({ message: 'Déconnecté' }));
});

router.get('/me', async (req, res) => {
    if (!req.session.userId)
        return res.status(401).json({ error: 'Non connecté' });
    try {
        const user = await authService.findById(req.session.userId);
        if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
        res.json({ userId: Number(user.id), email: user.email, isAdmin: user.is_admin === 1 });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;
