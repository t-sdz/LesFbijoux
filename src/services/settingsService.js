const db = require('../db/database');

// Polices Google Fonts proposées dans l'admin (toutes vérifiées sur fonts.googleapis.com)
const FONTS = [
    { name: 'Playfair Display', fallback: 'serif' },
    { name: 'Cormorant Garamond', fallback: 'serif' },
    { name: 'DM Serif Display', fallback: 'serif' },
    { name: 'Lora', fallback: 'serif' },
    { name: 'Libre Baskerville', fallback: 'serif' },
    { name: 'Bodoni Moda', fallback: 'serif' },
    { name: 'Cinzel', fallback: 'serif' },
    { name: 'Inter', fallback: 'sans-serif' },
    { name: 'Montserrat', fallback: 'sans-serif' },
    { name: 'Poppins', fallback: 'sans-serif' },
    { name: 'Lato', fallback: 'sans-serif' },
    { name: 'Raleway', fallback: 'sans-serif' },
    { name: 'Nunito', fallback: 'sans-serif' },
    { name: 'Josefin Sans', fallback: 'sans-serif' },
    { name: 'Open Sans', fallback: 'sans-serif' },
];

// Apparence d'origine du site : c'est aussi ce qui s'affiche tant que l'admin n'a rien changé
const DEFAULTS = {
    siteName: 'Les F Bijoux',
    footerText: "Joaillerie d'exception, créée avec amour et savoir-faire artisanal.",
    hero: {
        subtitle: 'Nouvelle Collection',
        title: "L'Art de la",
        titleAccent: 'Joaillerie',
        text: 'Des pièces uniques, façonnées avec passion pour sublimer chaque instant.',
        button: 'Découvrir',
    },
    fonts: { title: 'Playfair Display', body: 'Inter' },
    colors: { background: '#f9f6f1', text: '#1f1a14', accent: '#9a6f2e' },
    blocks: [
        { id: 'hero', visible: true, size: 'plein' },
        { id: 'collections', visible: true, columns: 'auto', background: 'blanc' },
        { id: 'products', visible: true, columns: 'auto', background: 'alt' },
        { id: 'newsletter', visible: true, background: 'site' },
    ],
};

let tableReady = null;

// La table est créée au premier accès : rien à lancer à la main sur Turso
function ensureTable() {
    if (!tableReady) {
        tableReady = db.execute(
            'CREATE TABLE IF NOT EXISTS site_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)'
        ).catch(err => {
            tableReady = null;
            throw err;
        });
    }
    return tableReady;
}

async function getSettings() {
    await ensureTable();
    const result = await db.execute({
        sql: 'SELECT value FROM site_settings WHERE key = ?',
        args: ['site'],
    });
    if (!result.rows[0]) return DEFAULTS;
    try {
        const saved = JSON.parse(result.rows[0].value);
        return {
            ...DEFAULTS,
            ...saved,
            hero: { ...DEFAULTS.hero, ...saved.hero },
            fonts: { ...DEFAULTS.fonts, ...saved.fonts },
            colors: { ...DEFAULTS.colors, ...saved.colors },
            blocks: Array.isArray(saved.blocks) ? saved.blocks : DEFAULTS.blocks,
        };
    } catch (e) {
        return DEFAULTS;
    }
}

async function saveSettings(settings) {
    await ensureTable();
    await db.execute({
        sql: `INSERT INTO site_settings (key, value) VALUES (?, ?)
              ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        args: ['site', JSON.stringify(settings)],
    });
}

module.exports = { FONTS, DEFAULTS, getSettings, saveSettings };
