// Onglet « Apparence » de l'admin : nom, textes, polices (Google ou importées), couleurs,
// blocs de l'accueil et ordre des articles, avec aperçu en direct de la page d'accueil.

// ── APPARENCE ─────────────────────────────────────────────────────────────────
const BLOCK_LABELS = { hero: 'Bannière (images + titre)', collections: 'Nos collections', products: 'Pièces favorites (produits)', newsletter: 'Newsletter' };
const SIZE_OPTIONS = { plein: 'Plein écran', moyen: 'Hauteur moyenne', compact: 'Compacte' };
const COLUMN_OPTIONS = { auto: 'Colonnes : auto', 2: '2 par ligne', 3: '3 par ligne', 4: '4 par ligne' };
const BACKGROUND_OPTIONS = { site: 'Fond : couleur du site', alt: 'Fond : couleur secondaire', blanc: 'Fond : blanc' };
const PRESETS = [
  { name: 'Crème & or',  colors: { background: '#f9f6f1', text: '#1f1a14', accent: '#9a6f2e' } },
  { name: 'Blanc & noir', colors: { background: '#ffffff', text: '#111111', accent: '#111111' } },
  { name: 'Rose poudré', colors: { background: '#fbf1f1', text: '#3b2a2e', accent: '#b76e79' } },
  { name: 'Vert sauge',  colors: { background: '#f3f5ef', text: '#26302a', accent: '#6b7f5e' } },
  { name: 'Bleu nuit',   colors: { background: '#f4f5f8', text: '#1a2238', accent: '#2f4b8a' } },
];
let appearance = null, appearanceSaved = null, appearanceDefaults = null, fontOptions = [];
let appearanceDirty = false, dragIndex = null;
const PREVIEW_PAGES = { accueil: 'Accueil', boutique: 'Boutique', collection: "Page d'une collection", produit: 'Fiche produit', panier: 'Panier', confirmation: 'Confirmation de commande', connexion: 'Connexion', inscription: 'Inscription' };
const MENU_LABELS = { accueil: 'Accueil', boutique: 'Boutique', collections: 'Collections', panier: 'Panier', compte: 'Connexion / Déconnexion' };
const FOOTER_COLUMNS = { boutique: 'Colonne « Boutique »', apropos: 'Colonne « À propos »', service: 'Colonne « Service »' };
const IMAGE_SIDE = { gauche: 'Photo à gauche', droite: 'Photo à droite' };
const IMAGE_SIZE = { petite: 'Photo petite', moyenne: 'Photo moyenne', grande: 'Photo grande' };
let textCatalog = [], previewPage = 'accueil', allProductIds = [], allCollectionIds = [], previewTargets = {};

const clone = obj => JSON.parse(JSON.stringify(obj));
const getPath = (obj, path) => path.split('.').reduce((o, k) => o[k], obj);
function setPath(obj, path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  keys.reduce((o, k) => o[k], obj)[last] = value;
}

function setStatus(text) { document.getElementById('ap-status').textContent = text; }

function appearanceChanged() {
  appearanceDirty = true;
  SiteTheme.apply(appearance);
  pushPreview();
  setStatus('Modifications non enregistrées');
}

// ── Aperçu : la vraie page d'accueil, affichée en miniature et mise à jour en direct
let previewDevice = 'desktop';

function pushPreview() {
  try {
    const win = document.getElementById('ap-frame').contentWindow;
    if (appearance && win && win.SiteTheme) win.SiteTheme.preview(clone(appearance), fontOptions);
  } catch (e) { /* aperçu pas encore chargé */ }
}

function layoutPreview() {
  const box = document.getElementById('ap-frame-box');
  const frame = document.getElementById('ap-frame');
  if (!box.clientWidth) return;
  const deviceWidth = previewDevice === 'mobile' ? 390 : 1280;
  const scale = Math.min(1, box.clientWidth / deviceWidth);
  frame.style.width = deviceWidth + 'px';
  frame.style.height = (box.clientHeight / scale) + 'px';
  frame.style.transform = 'scale(' + scale + ')';
  frame.style.left = Math.max(0, (box.clientWidth - deviceWidth * scale) / 2) + 'px';
}

function setPreviewDevice(device) {
  previewDevice = device;
  document.querySelectorAll('[data-device]').forEach(b => b.classList.toggle('active', b.dataset.device === device));
  layoutPreview();
}

function openPreview() {
  const frame = document.getElementById('ap-frame');
  if (!frame.getAttribute('src')) {
    frame.addEventListener('load', () => { layoutPreview(); pushPreview(); });
    frame.setAttribute('src', 'index.html?apercu=1');
  }
  layoutPreview();
}
window.addEventListener('resize', layoutPreview);

async function loadAppearance() {
  await SiteTheme.ready;
  const res = await fetch('/settings', { cache: 'no-store' });
  if (!res.ok) { alert("Impossible de charger l'apparence."); return; }
  const data = await res.json();
  fontOptions = data.fonts;
  textCatalog = data.catalog || [];
  appearanceDefaults = data.defaults;
  await loadPreviewTargets();
  appearanceSaved = clone(data.settings);
  appearance = clone(data.settings);
  appearanceDirty = false;
  renderAppearance();
  openPreview();
  setStatus('');
}

function renderAppearance() {
  renderFontSelects();
  renderCustomFonts();
  document.querySelectorAll('#tab-appearance [data-path]').forEach(input => { input.value = getPath(appearance, input.dataset.path); });
  document.querySelectorAll('#tab-appearance [data-code]').forEach(code => { code.textContent = getPath(appearance, code.dataset.code); });
  renderPresets();
  renderBlocks();
  renderPageCard();
  renderMenuFooter();
  const common = document.getElementById('ap-common-texts');
  common.innerHTML = '';
  renderTextInputs('commun', common);
  SiteTheme.apply(appearance);
  pushPreview();
}

// Listes de polices : Google Fonts puis polices importées
function renderFontSelects() {
  document.querySelectorAll('.ap-font').forEach(select => {
    select.innerHTML = '';
    [['Polices Google', fontOptions.filter(f => !f.custom)], ['Mes polices', fontOptions.filter(f => f.custom)]].forEach(([label, list]) => {
      if (!list.length) return;
      const group = document.createElement('optgroup');
      group.label = label;
      list.forEach(f => group.append(new Option(f.name, f.name)));
      select.append(group);
    });
    select.value = getPath(appearance, select.dataset.path);
  });
}

function renderCustomFonts() {
  const box = document.getElementById('custom-fonts-list');
  box.innerHTML = '';
  fontOptions.filter(f => f.custom).forEach(font => {
    const row = document.createElement('div');
    row.className = 'custom-font';
    const name = document.createElement('span');
    name.textContent = font.name;
    name.style.fontFamily = "'" + font.name + "', sans-serif";
    const del = document.createElement('button');
    del.className = 'btn-danger';
    del.textContent = 'Supprimer';
    del.onclick = () => deleteFont(font);
    row.append(name, del);
    box.append(row);
  });
  // Charge les polices importées dans l'admin pour les voir dans la liste
  let style = document.getElementById('admin-custom-fonts');
  if (!style) { style = document.createElement('style'); style.id = 'admin-custom-fonts'; document.head.append(style); }
  style.textContent = fontOptions.filter(f => f.custom)
    .map(f => "@font-face { font-family: '" + f.name + "'; src: url('" + f.url + "'); font-display: swap; }").join('\n');
}

// Recharge la liste des polices sans perdre les modifications en cours
async function refreshFonts() {
  const res = await fetch('/settings', { cache: 'no-store' });
  if (!res.ok) return;
  fontOptions = (await res.json()).fonts;
  SiteTheme.setFonts(fontOptions);
  renderFontSelects();
  renderCustomFonts();
  pushPreview();
}

async function uploadFont() {
  const name = document.getElementById('font-name').value.trim();
  const file = document.getElementById('font-file').files[0];
  if (!name) { alert('Donne un nom à la police.'); return; }
  if (!file) { alert('Choisis un fichier de police.'); return; }
  const form = new FormData();
  form.append('name', name);
  form.append('font', file);
  const res = await fetch('/api/admin/fonts', { method: 'POST', credentials: 'include', body: form });
  const data = await res.json().catch(() => ({ error: 'Erreur serveur' }));
  if (!res.ok) { alert(data.error || 'Import impossible'); return; }
  document.getElementById('font-name').value = '';
  document.getElementById('font-file').value = '';
  await refreshFonts();
  alert('Police « ' + name + ' » importée ! Choisis-la dans « Police des titres » ou « Police des textes ».');
}

async function deleteFont(font) {
  if (!confirm('Supprimer la police « ' + font.name + ' » ?')) return;
  const res = await fetch('/api/admin/fonts/' + font.id, { method: 'DELETE', credentials: 'include' });
  const data = await res.json().catch(() => ({ error: 'Erreur serveur' }));
  if (!res.ok) { alert(data.error || 'Suppression impossible'); return; }
  await refreshFonts();
}

// L'aperçu nous prévient quand un produit ou une collection a été glissé à une autre place
// L'aperçu nous prévient quand un produit ou une collection a été glissé à une autre place.
// Sur une page qui n'en montre qu'une partie (une collection), on garde la place des autres.
function effectiveOrder(ids, order) {
  const rank = id => { const i = order.indexOf(id); return i === -1 ? order.length + id : i; };
  return [...ids].sort((a, b) => rank(a) - rank(b));
}
function mergeOrder(full, moved) {
  const set = new Set(moved);
  let k = 0;
  return full.map(id => (set.has(id) ? moved[k++] : id));
}
window.onPreviewReorder = (kind, ids) => {
  if (!appearance) return;
  if (kind === 'products') appearance.productOrder = mergeOrder(effectiveOrder(allProductIds, appearance.productOrder), ids);
  else appearance.collectionOrder = mergeOrder(effectiveOrder(allCollectionIds, appearance.collectionOrder), ids);
  appearanceChanged();
};

// ── Aperçu des autres pages
async function loadPreviewTargets() {
  const [products, collections] = await Promise.all([
    fetch('/products').then(r => (r.ok ? r.json() : [])).catch(() => []),
    fetch('/products/collections').then(r => (r.ok ? r.json() : [])).catch(() => []),
  ]);
  allProductIds = products.map(p => Number(p.id));
  allCollectionIds = collections.map(c => Number(c.id));
  const withCategory = products.find(p => p.category);
  previewTargets = { productId: products[0] && products[0].id, category: withCategory && withCategory.category };
  const select = document.getElementById('ap-page');
  if (!select.options.length) Object.entries(PREVIEW_PAGES).forEach(([v, label]) => select.add(new Option(label, v)));
  select.value = previewPage;
}

function previewUrl(page) {
  const urls = {
    accueil: 'index.html', boutique: 'boutique.html', panier: 'cart.html', confirmation: 'confirmation.html',
    connexion: 'login.html', inscription: 'register.html',
    collection: 'collection.html?category=' + encodeURIComponent(previewTargets.category || ''),
    produit: 'produit.html?id=' + (previewTargets.productId || ''),
  };
  const url = urls[page];
  return url + (url.includes('?') ? '&' : '?') + 'apercu=1';
}

function setPreviewPage(page) {
  previewPage = page;
  document.getElementById('ap-page').value = page;
  document.getElementById('ap-frame').setAttribute('src', previewUrl(page));
  renderPageCard();
}

function makeCheckbox(label, checked, onChange) {
  const wrap = document.createElement('label');
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = checked;
  box.onchange = () => { onChange(box.checked); appearanceChanged(); };
  wrap.append(box, ' ' + label);
  return wrap;
}

function hint(text) {
  const p = document.createElement('p');
  p.className = 'ap-hint';
  p.textContent = text;
  return p;
}

// Textes modifiables d'une page : on écrit directement le texte voulu (vide = texte d'origine)
function renderTextInputs(pageKey, container) {
  const group = textCatalog.find(g => g.page === pageKey);
  if (!group) return;
  group.items.forEach(item => {
    const wrap = document.createElement('div');
    wrap.className = 'form-group';
    const label = document.createElement('label');
    label.textContent = item.label;
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 300;
    input.placeholder = item.default || '(vide)';
    input.value = appearance.texts[item.key] !== undefined ? appearance.texts[item.key] : item.default;
    input.oninput = () => {
      if (input.value === item.default || input.value.trim() === '') delete appearance.texts[item.key];
      else appearance.texts[item.key] = input.value;
      appearanceChanged();
    };
    wrap.append(label, input);
    container.append(wrap);
  });
}

// Carte « Page : … » : réglages et textes de la page affichée dans l'aperçu
function renderPageCard() {
  if (!appearance) return;
  const card = document.getElementById('ap-page-card');
  card.innerHTML = '';
  const title = document.createElement('h4');
  title.textContent = 'Page : ' + PREVIEW_PAGES[previewPage];
  card.append(title);
  document.getElementById('ap-blocks-card').style.display = previewPage === 'accueil' ? '' : 'none';

  if (previewPage === 'accueil') card.append(hint("La bannière, l'ordre et la forme des blocs se règlent dans « Nom et textes » et « Blocs de la page d'accueil ». Glisse les produits et collections dans l'aperçu pour changer leur place."));
  if (previewPage === 'boutique' || previewPage === 'collection') card.append(hint("Glisse les produits dans l'aperçu pour changer leur place (c'est le même ordre partout)."));
  if (previewPage === 'connexion' || previewPage === 'inscription') card.append(hint('Le fond est commun aux pages Connexion et Inscription.'));

  const conf = appearance.pages[previewPage === 'inscription' ? 'connexion' : previewPage];
  if (conf) {
    const row = document.createElement('div');
    row.className = 'ap-checks';
    if ('columns' in conf) row.append(makeSelect(COLUMN_OPTIONS, conf.columns, v => { conf.columns = v; }));
    if ('background' in conf) row.append(makeSelect(BACKGROUND_OPTIONS, conf.background, v => { conf.background = v; }));
    if ('imageSide' in conf) row.append(makeSelect(IMAGE_SIDE, conf.imageSide, v => { conf.imageSide = v; }));
    if ('imageSize' in conf) row.append(makeSelect(IMAGE_SIZE, conf.imageSize, v => { conf.imageSize = v; }));
    if ('showDescription' in conf) row.append(makeCheckbox('Afficher la description', conf.showDescription, v => { conf.showDescription = v; }));
    card.append(row);
  }
  const texts = document.createElement('div');
  texts.style.marginTop = '18px';
  card.append(texts);
  renderTextInputs(previewPage, texts);
}

function renderMenuFooter() {
  const menu = document.getElementById('ap-menu');
  menu.innerHTML = '';
  menu.append(hint('Menu :'));
  Object.entries(MENU_LABELS).forEach(([key, label]) => {
    menu.append(makeCheckbox(label, appearance.menu[key] !== false, v => { appearance.menu[key] = v; }));
  });
  const footer = document.getElementById('ap-footer');
  footer.innerHTML = '';
  footer.append(hint('Pied de page :'));
  footer.append(makeCheckbox('Afficher le pied de page', appearance.footer.visible, v => { appearance.footer.visible = v; }));
  Object.entries(FOOTER_COLUMNS).forEach(([key, label]) => {
    footer.append(makeCheckbox(label, appearance.footer.columns[key] !== false, v => { appearance.footer.columns[key] = v; }));
  });
}

function renderPresets() {
  const box = document.getElementById('ap-presets');
  box.innerHTML = '';
  PRESETS.forEach(preset => {
    const btn = document.createElement('button');
    btn.className = 'preset';
    Object.values(preset.colors).forEach(color => {
      const dot = document.createElement('i');
      dot.style.background = color;
      btn.append(dot);
    });
    btn.append(' ' + preset.name);
    btn.onclick = () => { appearance.colors = { ...preset.colors }; renderAppearance(); appearanceChanged(); };
    box.append(btn);
  });
}

function makeSelect(options, value, onChange) {
  const select = document.createElement('select');
  Object.entries(options).forEach(([v, label]) => select.add(new Option(label, v)));
  select.value = value;
  select.onchange = () => { onChange(select.value); appearanceChanged(); };
  return select;
}

function moveBlock(from, to) {
  const blocks = appearance.blocks;
  if (from === to || to < 0 || to >= blocks.length) return;
  const [block] = blocks.splice(from, 1);
  blocks.splice(to, 0, block);
  renderBlocks();
  appearanceChanged();
}

function renderBlocks() {
  const list = document.getElementById('ap-blocks');
  list.innerHTML = '';
  appearance.blocks.forEach((block, index) => {
    const card = document.createElement('div');
    card.className = 'block-card' + (block.visible ? '' : ' hidden-block');
    card.draggable = true;

    const handle = document.createElement('span');
    handle.className = 'block-handle';
    handle.textContent = '⠿';
    const name = document.createElement('span');
    name.className = 'block-name';
    name.textContent = (index + 1) + '. ' + BLOCK_LABELS[block.id];

    const visible = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = block.visible;
    checkbox.onchange = () => { block.visible = checkbox.checked; renderBlocks(); appearanceChanged(); };
    visible.append(checkbox, ' Afficher');
    card.append(handle, name, visible);

    if ('size' in block) card.append(makeSelect(SIZE_OPTIONS, block.size, v => { block.size = v; }));
    if ('columns' in block) card.append(makeSelect(COLUMN_OPTIONS, block.columns, v => { block.columns = v; }));
    if ('background' in block) card.append(makeSelect(BACKGROUND_OPTIONS, block.background, v => { block.background = v; }));

    [['↑', index - 1], ['↓', index + 1]].forEach(([arrow, to]) => {
      const btn = document.createElement('button');
      btn.className = 'block-move';
      btn.textContent = arrow;
      btn.disabled = to < 0 || to >= appearance.blocks.length;
      btn.onclick = () => moveBlock(index, to);
      card.append(btn);
    });

    card.addEventListener('dragstart', e => { dragIndex = index; card.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(index)); });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
    card.addEventListener('dragover', e => { e.preventDefault(); card.classList.add('drag-over'); });
    card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
    card.addEventListener('drop', e => { e.preventDefault(); card.classList.remove('drag-over'); if (dragIndex !== null) moveBlock(dragIndex, index); dragIndex = null; });
    list.append(card);
  });
}

// Champs texte, polices et couleurs : chaque champ indique son réglage dans data-path
document.getElementById('tab-appearance').addEventListener('input', e => {
  const path = e.target.dataset.path;
  if (!path || !appearance) return;
  setPath(appearance, path, e.target.value);
  const code = document.querySelector(`#tab-appearance [data-code="${path}"]`);
  if (code) code.textContent = e.target.value;
  appearanceChanged();
});

async function saveAppearance() {
  const res = await fetch('/api/admin/settings', {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(appearance),
  });
  const data = await res.json().catch(() => ({ error: 'Erreur serveur' }));
  if (!res.ok) { alert(data.error || 'Erreur lors de l\'enregistrement'); return; }
  appearance = clone(data.settings);
  appearanceSaved = clone(data.settings);
  appearanceDirty = false;
  SiteTheme.save(appearance);
  renderAppearance();
  setStatus('✅ Enregistré : c\'est en ligne sur le site');
}

function cancelAppearance() {
  appearance = clone(appearanceSaved);
  appearanceDirty = false;
  renderAppearance();
  setStatus('');
}

function resetAppearance() {
  if (!confirm("Revenir au style d'origine ? Il faudra ensuite cliquer sur « Enregistrer ».")) return;
  appearance = clone(appearanceDefaults);
  renderAppearance();
  appearanceChanged();
}

window.addEventListener('beforeunload', e => {
  if (appearanceDirty) { e.preventDefault(); e.returnValue = ''; }
});
