// Applique l'apparence réglée dans l'admin (onglet Apparence) : nom, polices, couleurs et blocs de l'accueil.
// Chargé dans le <head> de chaque page. Tout texte est posé avec textContent (jamais innerHTML).
(function () {
    const CACHE_KEY = 'site-apparence';
    const DEFAULT_FONTS = ['Playfair Display', 'Inter'];
    const root = document.documentElement;
    // Page ouverte dans l'aperçu de l'admin (?apercu) : elle affiche les réglages en cours d'édition
    const PREVIEW = new URLSearchParams(location.search).has('apercu');
    let previewSettings = null;
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

    // Polices Google (lien vers fonts.googleapis.com) et polices importées (@font-face servies par le site)
    function loadFonts(names) {
        const wanted = [...new Set(names)].map(n => fonts.find(f => f.name === n)).filter(Boolean);

        const google = wanted.filter(f => !f.url && !DEFAULT_FONTS.includes(f.name));
        let link = document.getElementById('theme-fonts');
        if (google.length === 0) {
            if (link) link.remove();
        } else {
            const href = 'https://fonts.googleapis.com/css2?'
                + google.map(f => 'family=' + f.name.replace(/ /g, '+') + ':ital,wght@0,400;0,600;1,400').join('&')
                + '&display=swap';
            if (!link) {
                link = document.createElement('link');
                link.id = 'theme-fonts';
                link.rel = 'stylesheet';
                document.head.appendChild(link);
            }
            if (link.href !== href) link.href = href;
        }

        const custom = wanted.filter(f => f.url);
        let style = document.getElementById('theme-custom-fonts');
        if (custom.length === 0) {
            if (style) style.remove();
        } else {
            if (!style) {
                style = document.createElement('style');
                style.id = 'theme-custom-fonts';
                document.head.appendChild(style);
            }
            style.textContent = custom
                .map(f => `@font-face { font-family: '${f.name}'; src: url('${f.url}'); font-display: swap; }`)
                .join('\n');
        }
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

    // Ordre des produits et des collections (les cartes portent data-id)
    function sortCards(selector, order) {
        const box = document.querySelector(selector);
        if (!box || !Array.isArray(order)) return;
        const rank = id => { const i = order.indexOf(id); return i === -1 ? order.length + id : i; };
        [...box.querySelectorAll(':scope > [data-id]')]
            .sort((a, b) => rank(Number(a.dataset.id)) - rank(Number(b.dataset.id)))
            .forEach(card => box.appendChild(card));
    }

    function applyOrder(s) {
        sortCards('#product-list', s.productOrder);
        sortCards('#collections-grid', s.collectionOrder);
    }

    function onReady(fn) {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
        else fn();
    }

    function apply(settings) {
        applyStyle(settings);
        onReady(() => { applyTexts(settings); applyBlocks(settings); if (PREVIEW) applyOrder(settings); });
    }

    function remember(data) {
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch (e) { /* stockage indisponible */ }
    }

    // 1. Dernière apparence connue, tout de suite (évite de voir l'ancien style une fraction de seconde)
    try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY));
        if (cached && cached.settings) { fonts = cached.fonts || []; apply(cached.settings); }
    } catch (e) { /* cache absent ou illisible */ }


    // 2. Apparence à jour depuis le serveur (jamais depuis un cache HTTP)
    const ready = fetch('/settings', { cache: 'no-store' })
        .then(res => (res.ok ? res.json() : Promise.reject(new Error('HTTP ' + res.status))))
        .then(data => {
            fonts = data.fonts;
            apply(previewSettings || data.settings);
            if (!PREVIEW) remember({ settings: data.settings, fonts: data.fonts });
            return data;
        })
        .catch(() => null);

    // Dans l'aperçu : glisser-déposer des produits et collections, liens désactivés
    if (PREVIEW) {
        const script = document.createElement('script');
        script.src = '../js/apercu.js';
        document.head.appendChild(script);
    }

    window.SiteTheme = {
        ready,
        apply,
        // Aperçu de l'admin : affiche des réglages non enregistrés sans les mémoriser
        preview(settings, fontList) { if (fontList) fonts = fontList; previewSettings = settings; apply(settings); },
        // Liste des polices à jour (après un import dans l'admin)
        setFonts(fontList) { fonts = fontList; },
        // Aperçu : remet les cartes dans l'ordre en cours d'édition (appelé quand elles arrivent)
        reorder() { if (previewSettings) applyOrder(previewSettings); },
        // Mémorise l'apparence enregistrée pour les prochaines pages
        save(settings) { remember({ settings, fonts }); },
    };
})();
