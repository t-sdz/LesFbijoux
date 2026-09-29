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
    // Textes modifiés (clé du catalogue → texte) ; absent = texte d'origine
    texts: {},
    // Entrées du menu affichées
    menu: { accueil: true, boutique: true, collections: true, panier: true, compte: true },
    footer: { visible: true, columns: { boutique: true, apropos: true, service: true } },
    // Mise en page de chaque page
    pages: {
        boutique: { columns: 'auto', background: 'site' },
        collection: { columns: 'auto', background: 'alt' },
        produit: { imageSide: 'gauche', imageSize: 'moyenne', showDescription: true },
        panier: { background: 'site' },
        confirmation: { background: 'site' },
        connexion: { background: 'site' },
    },
};

// Textes modifiables depuis l'admin, page par page. Dans les pages, chaque texte porte data-edit="clé".
const TEXT_CATALOG = [
    { page: 'commun', label: 'Menu et pied de page (toutes les pages)', items: [
        ['menu.accueil', 'Menu : Accueil', 'Accueil'],
        ['menu.boutique', 'Menu : Boutique', 'Boutique'],
        ['menu.collections', 'Menu : Collections', 'Collections'],
        ['menu.panier', 'Menu : texte à côté du panier 🛍', ''],
        ['menu.connexion', 'Menu : Connexion', 'Connexion'],
        ['menu.deconnexion', 'Menu : Déconnexion', 'Déconnexion'],
        ['footer.boutique', 'Pied de page : titre colonne 1', 'Boutique'],
        ['footer.boutique.1', 'Pied de page : lien « Tous les bijoux »', 'Tous les bijoux'],
        ['footer.boutique.2', 'Pied de page : lien « Bagues »', 'Bagues'],
        ['footer.boutique.3', 'Pied de page : lien « Colliers »', 'Colliers'],
        ['footer.boutique.4', 'Pied de page : lien « Bracelets »', 'Bracelets'],
        ['footer.apropos', 'Pied de page : titre colonne 2', 'À propos'],
        ['footer.apropos.1', 'Pied de page : lien « Notre histoire »', 'Notre histoire'],
        ['footer.apropos.2', 'Pied de page : lien « Savoir-faire »', 'Savoir-faire'],
        ['footer.apropos.3', 'Pied de page : lien « Engagement »', 'Engagement'],
        ['footer.service', 'Pied de page : titre colonne 3', 'Service'],
        ['footer.service.1', 'Pied de page : lien « Livraison »', 'Livraison'],
        ['footer.service.2', 'Pied de page : lien « Retours »', 'Retours'],
        ['footer.service.3', 'Pied de page : lien « Contact »', 'Contact'],
        ['footer.service.4', 'Pied de page : lien « FAQ »', 'FAQ'],
    ] },
    { page: 'accueil', label: 'Accueil', items: [
        ['accueil.collections.label', 'Collections : petit titre', 'Explorer'],
        ['accueil.collections.title', 'Collections : titre', 'Nos Collections'],
        ['accueil.products.label', 'Produits : petit titre', 'Sélection'],
        ['accueil.products.title', 'Produits : titre', 'Pièces Favorites'],
        ['accueil.newsletter.title', 'Newsletter : titre', 'Restez Inspiré'],
        ['accueil.newsletter.text', 'Newsletter : texte', 'Inscrivez-vous pour recevoir nos nouveautés et offres exclusives.'],
        ['accueil.newsletter.button', 'Newsletter : bouton', "S'inscrire"],
    ] },
    { page: 'boutique', label: 'Boutique', items: [
        ['boutique.label', 'Petit titre', 'Notre sélection'],
        ['boutique.title', 'Titre', 'Boutique'],
    ] },
    { page: 'collection', label: 'Page d\'une collection', items: [
        ['collection.label', 'Petit titre', 'Collection'],
        ['collection.back', 'Lien de retour', '← Retour aux collections'],
    ] },
    { page: 'produit', label: 'Fiche produit', items: [
        ['produit.quantity', 'Libellé quantité', 'Quantité'],
        ['produit.add', 'Bouton d\'ajout', 'Ajouter au panier'],
        ['produit.back', 'Lien de retour', '← Retour à la boutique'],
    ] },
    { page: 'panier', label: 'Panier', items: [
        ['panier.label', 'Petit titre', 'Mon compte'],
        ['panier.title', 'Titre', 'Mon Panier'],
        ['panier.total', 'Libellé du total', 'Total'],
        ['panier.info', 'Texte sous le total', 'Livraison gratuite · Paiement sécurisé'],
        ['panier.pay', 'Bouton de paiement', 'Payer maintenant'],
        ['panier.continue', 'Lien de retour', '← Continuer mes achats'],
    ] },
    { page: 'confirmation', label: 'Confirmation de commande', items: [
        ['confirmation.title', 'Titre', 'Merci pour votre commande !'],
        ['confirmation.text', 'Texte', 'Votre paiement a bien été reçu. Vous allez recevoir un email de confirmation dans quelques instants. Nous préparons votre commande avec soin.'],
        ['confirmation.delay', 'Délai de livraison', '3 à 5 jours ouvrés'],
        ['confirmation.shipping', 'Prix de l\'expédition', 'Gratuite'],
        ['confirmation.continue', 'Bouton « continuer »', 'Continuer mes achats'],
        ['confirmation.home', 'Bouton « accueil »', "Retour à l'accueil"],
    ] },
    { page: 'connexion', label: 'Connexion', items: [
        ['connexion.title', 'Titre', 'Connexion'],
        ['connexion.subtitle', 'Sous-titre', 'Bienvenue chez Les F Bijoux'],
        ['connexion.button', 'Bouton', 'Se connecter'],
        ['connexion.question', 'Question', 'Pas de compte ?'],
        ['connexion.link', 'Lien vers l\'inscription', 'Créer un compte'],
    ] },
    { page: 'inscription', label: 'Inscription', items: [
        ['inscription.title', 'Titre', 'Créer un compte'],
        ['inscription.subtitle', 'Sous-titre', 'Rejoignez la communauté Les F Bijoux'],
        ['inscription.button', 'Bouton', "S'inscrire"],
        ['inscription.question', 'Question', 'Déjà un compte ?'],
        ['inscription.link', 'Lien vers la connexion', 'Se connecter'],
    ] },
].map(group => ({ ...group, items: group.items.map(([key, label, value]) => ({ key, label, default: value })) }));

const TEXT_KEYS = TEXT_CATALOG.flatMap(group => group.items.map(item => item.key));

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
            texts: saved.texts && typeof saved.texts === 'object' ? saved.texts : {},
            menu: { ...DEFAULTS.menu, ...saved.menu },
            footer: {
                ...DEFAULTS.footer,
                ...saved.footer,
                columns: { ...DEFAULTS.footer.columns, ...(saved.footer && saved.footer.columns) },
            },
            pages: Object.fromEntries(Object.entries(DEFAULTS.pages).map(
                ([page, value]) => [page, { ...value, ...(saved.pages && saved.pages[page]) }]
            )),
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
    FONTS, DEFAULTS, TEXT_CATALOG, TEXT_KEYS, getSettings, saveSettings, sortByOrder,
    detectFontFormat, listCustomFonts, getFontFile, addCustomFont, deleteCustomFont, getFontOptions,
};
