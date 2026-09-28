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
    productOrder: [],
    collectionOrder: [],
};

// Formats de police acceptés à l'import, reconnus par leurs premiers octets
const FONT_FORMATS = [
    { ext: '.woff2', mime: 'font/woff2', magic: [0x77, 0x4f, 0x46, 0x32] },         // wOF2
    { ext: '.woff',  mime: 'font/woff',  magic: [0x77, 0x4f, 0x46, 0x46] },         // wOFF
    { ext: '.ttf',   mime: 'font/ttf',   magic: [0x00, 0x01, 0x00, 0x00] },
    { ext: '.otf',   mime: 'font/otf',   magic: [0x4f, 0x54, 0x54, 0x4f] },         // OTTO
];

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
            productOrder: Array.isArray(saved.productOrder) ? saved.productOrder : [],
            collectionOrder: Array.isArray(saved.collectionOrder) ? saved.collectionOrder : [],
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

// Trie des lignes (produits, collections) selon l'ordre choisi dans l'admin ;
// celles qui n'y figurent pas passent après, par id croissant
function sortByOrder(rows, order) {
    const rank = id => {
        const i = order.indexOf(Number(id));
        return i === -1 ? order.length + Number(id) : i;
    };
    return [...rows].sort((a, b) => rank(a.id) - rank(b.id));
}

// ─── Polices importées (stockées en base : le disque de Vercel est en lecture seule)

let fontsTableReady = null;

function ensureFontsTable() {
    if (!fontsTableReady) {
        fontsTableReady = db.execute(
            'CREATE TABLE IF NOT EXISTS custom_fonts (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, mime TEXT NOT NULL, data BLOB NOT NULL)'
        ).catch(err => {
            fontsTableReady = null;
            throw err;
        });
    }
    return fontsTableReady;
}

function detectFontFormat(buffer) {
    return FONT_FORMATS.find(f => f.magic.every((byte, i) => buffer[i] === byte)) || null;
}

async function listCustomFonts() {
    await ensureFontsTable();
    const result = await db.execute('SELECT id, name FROM custom_fonts ORDER BY name');
    return result.rows.map(r => ({ id: Number(r.id), name: r.name }));
}

async function getFontFile(id) {
    await ensureFontsTable();
    const result = await db.execute({ sql: 'SELECT mime, data FROM custom_fonts WHERE id = ?', args: [id] });
    const row = result.rows[0];
    return row ? { mime: row.mime, data: Buffer.from(row.data) } : null;
}

async function addCustomFont(name, mime, buffer) {
    await ensureFontsTable();
    const result = await db.execute({
        sql: 'INSERT INTO custom_fonts (name, mime, data) VALUES (?, ?, ?)',
        args: [name, mime, buffer],
    });
    return Number(result.lastInsertRowid);
}

async function deleteCustomFont(id) {
    await ensureFontsTable();
    await db.execute({ sql: 'DELETE FROM custom_fonts WHERE id = ?', args: [id] });
}

// Toutes les polices proposées : Google Fonts + polices importées
async function getFontOptions() {
    const custom = await listCustomFonts();
    return [
        ...FONTS,
        ...custom.map(f => ({ name: f.name, fallback: 'sans-serif', url: '/settings/fonts/' + f.id, id: f.id, custom: true })),
    ];
}

module.exports = {
    FONTS, DEFAULTS, getSettings, saveSettings, sortByOrder,
    detectFontFormat, listCustomFonts, getFontFile, addCustomFont, deleteCustomFont, getFontOptions,
};
