// Chargé uniquement dans l'aperçu de l'admin (index.html?apercu) :
// on glisse-dépose les produits et les collections pour changer leur ordre, et les clics ne naviguent pas.
(function () {
    const LISTS = [
        { kind: 'products', container: '#product-list', item: '.product-card' },
        { kind: 'collections', container: '#collections-grid', item: '.collection-card' },
    ];
    let dragged = null;
    let knownCards = 0;

    // Pas de navigation ni d'ajout au panier dans l'aperçu
    document.addEventListener('click', e => {
        if (e.target.closest('a, button, .product-card, .collection-card')) {
            e.preventDefault();
            e.stopPropagation();
        }
    }, true);

    // Prévient l'admin du nouvel ordre
    function report(kind, container) {
        const ids = [...container.querySelectorAll(':scope > [data-id]')].map(el => Number(el.dataset.id));
        if (window.parent !== window && typeof window.parent.onPreviewReorder === 'function') {
            window.parent.onPreviewReorder(kind, ids);
        }
    }

    function makeDraggable(card, list) {
        if (card.dataset.dragReady) return;
        card.dataset.dragReady = '1';
        card.draggable = true;
        card.style.cursor = 'grab';
        card.title = 'Glisse pour changer la place';
        card.querySelectorAll('img').forEach(img => { img.draggable = false; });

        card.addEventListener('dragstart', e => {
            dragged = card;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', card.dataset.id);
            card.style.opacity = '0.4';
        });
        card.addEventListener('dragend', () => { card.style.opacity = ''; dragged = null; });
        card.addEventListener('dragover', e => {
            if (!dragged || dragged.parentNode !== card.parentNode) return;
            e.preventDefault();
            card.style.outline = '3px solid var(--gold)';
        });
        card.addEventListener('dragleave', () => { card.style.outline = ''; });
        card.addEventListener('drop', e => {
            e.preventDefault();
            card.style.outline = '';
            if (!dragged || dragged === card || dragged.parentNode !== card.parentNode) return;
            const cards = [...card.parentNode.children];
            const movingDown = cards.indexOf(dragged) < cards.indexOf(card);
            card.parentNode.insertBefore(dragged, movingDown ? card.nextSibling : card);
            report(list.kind, card.parentNode);
        });
    }

    // Les cartes arrivent après le chargement : on les prépare dès qu'il y en a de nouvelles
    function refresh() {
        const count = document.querySelectorAll('[data-id]').length;
        if (count === knownCards) return;
        knownCards = count;
        LISTS.forEach(list => {
            document.querySelectorAll(`${list.container} > ${list.item}[data-id]`).forEach(card => makeDraggable(card, list));
        });
        if (window.SiteTheme) window.SiteTheme.reorder();
    }

    new MutationObserver(refresh).observe(document.documentElement, { childList: true, subtree: true });
    refresh();
})();
