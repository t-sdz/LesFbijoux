const express = require('express');
const { z } = require('zod');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const xss = require('xss');
const adminService = require('../services/adminService');
const settingsService = require('../services/settingsService');

const router = express.Router();

// ─── UPLOAD ───────────────────────────────────────────────────────────────────

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../../public/images');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, unique + path.extname(file.originalname));
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (/jpeg|jpg|png|webp/.test(path.extname(file.originalname).toLowerCase())) {
            cb(null, true);
        } else {
            cb(new Error('Seulement JPG, PNG, WEBP acceptés'));
        }
    },
});

// ─── VALIDATION SCHEMAS ───────────────────────────────────────────────────────

const productSchema = z.object({
    name: z.string().min(1, 'Nom requis').max(200),
    description: z.string().max(2000).optional(),
    price: z.number({ coerce: true }).positive('Prix doit être positif'),
    category: z.string().max(100).optional(),
});

const collectionSchema = z.object({
    name: z.string().min(1, 'Nom de collection requis').max(100),
});

const fontName = z.enum(settingsService.FONTS.map(f => f.name));
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Couleur invalide');
const blockBackground = z.enum(['site', 'alt', 'blanc']);
const blockColumns = z.enum(['auto', '2', '3', '4']);

const blockSchema = z.discriminatedUnion('id', [
    z.object({ id: z.literal('hero'), visible: z.boolean(), size: z.enum(['plein', 'moyen', 'compact']) }),
    z.object({ id: z.literal('collections'), visible: z.boolean(), columns: blockColumns, background: blockBackground }),
    z.object({ id: z.literal('products'), visible: z.boolean(), columns: blockColumns, background: blockBackground }),
    z.object({ id: z.literal('newsletter'), visible: z.boolean(), background: blockBackground }),
]);

const settingsSchema = z.object({
    siteName: z.string().trim().min(1, 'Nom de la boutique requis').max(60),
    footerText: z.string().trim().max(200),
    hero: z.object({
        subtitle: z.string().trim().max(60),
        title: z.string().trim().min(1, 'Titre de la bannière requis').max(60),
        titleAccent: z.string().trim().max(60),
        text: z.string().trim().max(200),
        button: z.string().trim().min(1, 'Texte du bouton requis').max(30),
    }),
    fonts: z.object({ title: fontName, body: fontName }),
    colors: z.object({ background: hexColor, text: hexColor, accent: hexColor }),
    blocks: z.array(blockSchema).length(4).refine(
        blocks => new Set(blocks.map(b => b.id)).size === 4,
        'Chaque bloc doit apparaître une seule fois'
    ),
});

// ─── MIDDLEWARE ADMIN ─────────────────────────────────────────────────────────

async function isAdmin(req, res, next) {
    if (!req.session.userId)
        return res.status(401).json({ error: 'Non connecté' });
    try {
        if (!(await adminService.isAdmin(req.session.userId)))
            return res.status(403).json({ error: 'Accès refusé' });
        next();
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

// ─── STATS ────────────────────────────────────────────────────────────────────

router.get('/stats', isAdmin, async (req, res) => {
    try {
        res.json(await adminService.getStats());
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ─── PRODUITS ─────────────────────────────────────────────────────────────────

router.get('/products', isAdmin, async (req, res) => {
    try {
        res.json(await adminService.getAllProducts());
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.post('/products', isAdmin, upload.single('image'), async (req, res) => {
    const parsed = productSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.issues[0].message });

    const { name, description, price, category } = parsed.data;
    const image = req.file ? req.file.filename : 'default.jpg';
    try {
        const id = await adminService.createProduct(
            xss(name), xss(description || ''), price, image, xss(category || '')
        );
        res.json({ message: 'Produit ajouté !', id });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.put('/products/:id', isAdmin, upload.single('image'), async (req, res) => {
    const parsed = productSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.issues[0].message });

    const { name, description, price, category } = parsed.data;
    try {
        const image = req.file
            ? req.file.filename
            : await adminService.getProductImage(req.params.id);
        await adminService.updateProduct(
            req.params.id, xss(name), xss(description || ''), price, image, xss(category || '')
        );
        res.json({ message: 'Produit modifié !' });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.delete('/products/:id', isAdmin, async (req, res) => {
    try {
        await adminService.deleteProduct(req.params.id);
        res.json({ message: 'Produit supprimé !' });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.patch('/products/:id/category', isAdmin, async (req, res) => {
    try {
        await adminService.updateProductCategory(req.params.id, req.body.category);
        res.json({ message: 'Catégorie mise à jour !' });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ─── PANIERS ──────────────────────────────────────────────────────────────────

router.get('/carts', isAdmin, async (req, res) => {
    try {
        res.json(await adminService.getAllCarts());
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ─── COLLECTIONS ──────────────────────────────────────────────────────────────

router.get('/collections', isAdmin, async (req, res) => {
    try {
        res.json(await adminService.getAllCollections());
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.post('/collections', isAdmin, upload.single('image'), async (req, res) => {
    const parsed = collectionSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.issues[0].message });

    const image = req.file ? req.file.filename : 'default.jpg';
    try {
        const id = await adminService.createCollection(xss(parsed.data.name.trim()), image);
        res.json({ message: 'Collection créée !', id });
    } catch (err) {
        if (err.message.includes('UNIQUE'))
            return res.status(400).json({ error: 'Cette collection existe déjà' });
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.put('/collections/:id', isAdmin, upload.single('image'), async (req, res) => {
    const parsed = collectionSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.issues[0].message });

    try {
        const image = req.file
            ? req.file.filename
            : await adminService.getCollectionImage(req.params.id);
        await adminService.updateCollection(req.params.id, xss(parsed.data.name.trim()), image);
        res.json({ message: 'Collection modifiée !' });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.delete('/collections/:id', isAdmin, async (req, res) => {
    try {
        await adminService.deleteCollection(req.params.id);
        res.json({ message: 'Collection supprimée !' });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ─── HERO IMAGES ──────────────────────────────────────────────────────────────

router.get('/hero', isAdmin, async (req, res) => {
    try {
        res.json(await adminService.getHeroImages());
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.put('/hero/:id', isAdmin, upload.single('image'), async (req, res) => {
    const { position_x, position_y, size, fullscreen_x, fullscreen_y } = req.body;
    try {
        const image = req.file
            ? req.file.filename
            : await adminService.getHeroImage(req.params.id);
        await adminService.updateHeroImage(
            req.params.id, image, position_x, position_y, size, fullscreen_x, fullscreen_y
        );
        res.json({ message: 'Image mise à jour !' });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ─── APPARENCE DU SITE ────────────────────────────────────────────────────────

router.put('/settings', isAdmin, async (req, res) => {
    const parsed = settingsSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.issues[0].message });

    try {
        await settingsService.saveSettings(parsed.data);
        res.json({ message: 'Apparence enregistrée !', settings: parsed.data });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;
