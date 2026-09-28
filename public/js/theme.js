// Applique l'apparence réglée dans l'admin (onglet Apparence) : nom, polices, couleurs et blocs de l'accueil.
// Chargé dans le <head> de chaque page. Tout texte est posé avec textContent (jamais innerHTML).
(function () {
    const CACHE_KEY = 'site-apparence';
    const DEFAULT_FONTS = ['Playfair Display', 'Inter'];
    const root = document.documentElement;
    let fonts = [];

    // Assombrit une couleur #rrggbb (amount entre 0 et 1)
    function darken(hex, amount) {
        const n = parseInt(hex.slice(1), 16);
        const channel = shift => Math.round(((n >> shift) & 255) * (1 - amount));
        return '#' + [16, 8, 0].map(s => channel(s).toString(16).padStart(2, '0')).join('');
    }

    function fontStack(name) {
        const font = fonts.find(f => f.name === name);
        return font ? `'${font.name}', ${font.fallback}` : null;
    }

    function loadFonts(names) {
        const toLoad = [...new Set(names)].filter(n => fonts.some(f => f.name === n) && !DEFAULT_FONTS.includes(n));
        let link = document.getElementById('theme-fonts');
        if (toLoad.length === 0) { if (link) link.remove(); return; }
        const href = 'https://fonts.googleapis.com/css2?'
            + toLoad.map(n => 'family=' + n.replace(/ /g, '+') + ':ital,wght@0,400;0,600;1,400').join('&')
            + '&display=swap';
        if (!link) {
            link = document.createElement('link');
            link.id = 'theme-fonts';
            link.rel = 'stylesheet';
            document.head.appendChild(link);
        }
        if (link.href !== href) link.href = href;
    }

    function applyStyle(s) {
        const c = s.colors;
        root.style.setProperty('--cream', c.background);
        root.style.setProperty('--cream-dark', darken(c.background, 0.05));
        root.style.setProperty('--foreground', c.text);
        root.style.setProperty('--gold', c.accent);
        root.style.setProperty('--gold-dark', darken(c.accent, 0.2));
        const title = fontStack(s.fonts.title);
        const body = fontStack(s.fonts.body);
        if (title) root.style.setProperty('--font-title', title);
        if (body) root.style.setProperty('--font-body', body);
        loadFonts([s.fonts.title, s.fonts.body]);
    }

    function setText(selector, text) {
        document.querySelectorAll(selector).forEach(el => { el.textContent = text; });
    }

    function applyTexts(s) {
        setText('.nav-logo', s.siteName);
        setText('.footer-brand h3', s.siteName);
        setText('.footer-brand p', s.footerText);
        setText('.footer-bottom', `© ${new Date().getFullYear()} ${s.siteName}. Tous droits réservés.`);
        const parts = document.title.split(' — ');
        document.title = parts.length > 1 ? `${s.siteName} — ${parts.slice(1).join(' — ')}` : s.siteName;

        setText('#hero-subtitle', s.hero.subtitle);
        setText('#hero-text', s.hero.text);
        setText('#hero-button', s.hero.button);
        const h1 = document.getElementById('hero-title');
        if (h1) {
            h1.textContent = s.hero.title;
            if (s.hero.titleAccent) {
                const em = document.createElement('em');
                em.textContent = s.hero.titleAccent;
                h1.append(document.createElement('br'), em);
            }
        }
    }

    // Ordre, affichage et forme des blocs de la page d'accueil
    function applyBlocks(s) {
        const footer = document.querySelector('footer');
        s.blocks.forEach(block => {
            const el = document.querySelector(`[data-block="${block.id}"]`);
            if (!el) return;
            el.style.display = block.visible ? '' : 'none';
            [...el.classList].filter(c => /^(size|cols|bg)-/.test(c)).forEach(c => el.classList.remove(c));
            if (block.size) el.classList.add('size-' + block.size);
            if (block.columns && block.columns !== 'auto') el.classList.add('cols-' + block.columns);
            if (block.background) el.classList.add('bg-' + block.background);
            if (footer) footer.before(el);
        });
    }

    function onReady(fn) {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
        else fn();
    }

    function apply(settings) {
        applyStyle(settings);
        onReady(() => { applyTexts(settings); applyBlocks(settings); });
    }

    function remember(data) {
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch (e) { /* stockage indisponible */ }
    }

    // 1. Dernière apparence connue, tout de suite (évite de voir l'ancien style une fraction de seconde)
    try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY));
        if (cached && cached.settings) { fonts = cached.fonts || []; apply(cached.settings); }
    } catch (e) { /* cache absent ou illisible */ }

    // 2. Apparence à jour depuis le serveur
    const ready = fetch('/settings')
        .then(res => (res.ok ? res.json() : Promise.reject(new Error('HTTP ' + res.status))))
        .then(data => {
            fonts = data.fonts;
            apply(data.settings);
            remember({ settings: data.settings, fonts: data.fonts });
            return data;
        })
        .catch(() => null);

    window.SiteTheme = {
        ready,
        apply,
        // Mémorise l'apparence enregistrée pour les prochaines pages
        save(settings) { remember({ settings, fonts }); },
    };
})();
