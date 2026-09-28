const express = require('express');
const settingsService = require('../services/settingsService');

const router = express.Router();

// Apparence du site (publique : chaque page en a besoin pour s'afficher)
router.get('/', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
        res.json({
            settings: await settingsService.getSettings(),
            defaults: settingsService.DEFAULTS,
            fonts: settingsService.FONTS,
        });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;
