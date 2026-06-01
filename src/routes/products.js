const express = require('express');
const productService = require('../services/productService');

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        res.json(await productService.getAll());
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.get('/categories', async (req, res) => {
    try {
        res.json(await productService.getCategories());
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.get('/collections', async (req, res) => {
    try {
        res.json(await productService.getCollections());
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.get('/hero', async (req, res) => {
    try {
        res.json(await productService.getHeroImages());
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Doit être en dernier pour ne pas intercepter /categories, /collections, /hero
router.get('/:id', async (req, res) => {
    try {
        const product = await productService.getById(req.params.id);
        if (!product) return res.status(404).json({ error: 'Produit introuvable' });
        res.json(product);
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;
