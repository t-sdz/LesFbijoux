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
            fonts: await settingsService.getFontOptions(),
            catalog: settingsService.TEXT_CATALOG,
        });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Fichier d'une police importée (l'id change à chaque import : cache long possible)
router.get('/fonts/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(404).end();
    try {
        const font = await settingsService.getFontFile(id);
        if (!font) return res.status(404).end();
        res.set('Content-Type', font.mime);
        res.set('Cache-Control', 'public, max-age=31536000, immutable');
        res.send(font.data);
    } catch (err) {
        res.status(500).end();
    }
});

module.exports = router;
