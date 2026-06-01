# LesFbijoux — E-commerce de bijoux artisanaux

Application web e-commerce complète pour la vente de bijoux artisanaux, développée dans le cadre du cours « Infrastructure et Programmation Web » en Bachelor 3 à Oteria.

---

## Spécifications fonctionnelles

### Cas d'usage principaux

| Acteur | Action |
|---|---|
| Visiteur | Parcourir le catalogue, consulter les fiches produits, filtrer par collection/catégorie |
| Client connecté | Ajouter des produits au panier, passer commande via Stripe, recevoir un email de confirmation |
| Administrateur | Gérer les produits (CRUD), gérer les collections, personnaliser les images héros, consulter les stats |

### Parcours utilisateur (MVP)

1. **Découverte** → Page d'accueil avec carrousel héros + collections en vedette
2. **Navigation** → Boutique filtrée par catégorie ou page de collection dédiée
3. **Sélection** → Fiche produit détaillée (nom, prix, description, image)
4. **Achat** → Panier → Paiement sécurisé Stripe → Email de confirmation
5. **Compte** → Inscription / Connexion / Déconnexion

### MVP clairement défini

- Catalogue produits avec images
- Panier persistant par utilisateur (base de données)
- Tunnel de paiement Stripe (Checkout Session)
- Email de confirmation après commande
- Espace administrateur protégé (CRUD produits, collections, hero images, stats)

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      CLIENT (Browser)                    │
│   HTML/CSS/JS vanilla  ·  Fetch API  ·  Stripe.js       │
└───────────────────────────┬─────────────────────────────┘
                            │ HTTP/HTTPS
┌───────────────────────────▼─────────────────────────────┐
│                  EXPRESS 5 (Node.js)                     │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌────────┐  ┌──────────┐  │
│  │  /auth   │  │/products │  │ /cart  │  │/api/admin│  │
│  └────┬─────┘  └────┬─────┘  └───┬────┘  └────┬─────┘  │
│       └─────────────┴────────────┴─────────────┘        │
│                      Services Layer                      │
│   authService · productService · cartService · email    │
└───────────────────────────┬─────────────────────────────┘
                            │
          ┌─────────────────┴──────────────┐
          │                                │
┌─────────▼─────────┐           ┌──────────▼────────┐
│  LibSQL / Turso   │           │  Stripe API       │
│  (cloud SQLite)   │           │  (paiement)       │
└───────────────────┘           └───────────────────┘
          │
  [local dev: SQLite fichier]
  [production: Turso cloud]
```

**Déploiement :** Vercel (serverless Node.js)

---

## Stack technique et justification des choix

### Node.js + Express 5
Runtime JavaScript côté serveur. Express 5 apporte la gestion native des erreurs asynchrones sans `try/catch` explicite sur chaque route. Choisi pour sa légèreté et sa compatibilité Vercel.

### LibSQL / Turso
Base de données SQLite compatible avec un client HTTP. Turso permet d'utiliser SQLite en production cloud (serverless) tout en gardant SQLite en local pour le développement. Aucune migration de stack entre dev et prod.

### Stripe Checkout
Solution de paiement clé en main : gestion PCI, 3DS, Apple Pay inclus. Utilisé via Checkout Sessions pour déléguer toute la sécurité du paiement à Stripe.

### Vanilla HTML/CSS/JS
Frontend sans framework pour minimiser la complexité du projet. Les pages sont servies comme fichiers statiques par Express. La Fetch API remplace Axios.

### Vercel
Hébergement serverless avec déploiement automatique sur push (`main`). TLS gratuit, CDN inclus, configuration via `vercel.json`.

### nodemailer
Envoi d'emails transactionnels (confirmation de commande) via SMTP. Compatible avec tous les fournisseurs (Gmail, SendGrid, Mailgun, etc.).

---

## Installation locale

### Prérequis
- Node.js ≥ 18
- npm ≥ 9

### Étapes

```bash
# 1. Cloner le repo
git clone https://github.com/t-sdz/lesfbijoux.git
cd lesfbijoux

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos valeurs (voir section Variables d'environnement)

# 4. Initialiser la base de données
node src/db/init.js

# 5. Peupler avec des données de démo
node src/db/seed.js

# 6. Lancer le serveur
npm start
# → http://localhost:3000
```

---

## Variables d'environnement

Copier `.env.example` en `.env` et renseigner :

```env
# Session
SESSION_SECRET=une_chaine_aleatoire_longue_et_secrete

# Stripe (clés disponibles sur dashboard.stripe.com)
STRIPE_SECRET_KEY=sk_test_...
BASE_URL=http://localhost:3000

# Turso (optionnel — si absent, SQLite local est utilisé)
TURSO_URL=libsql://your-db.turso.io
TURSO_TOKEN=eyJ...

# Email (SMTP pour nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre@email.com
SMTP_PASS=votre_mot_de_passe_application
SMTP_FROM=LesFbijoux <votre@email.com>
```

---

## Compte de démonstration

| Rôle | Email | Mot de passe |
|---|---|---|
| Admin | admin@eclat.fr | *(défini au seeding)* |
| Client | test@test.com | *(défini au seeding)* |

---

## Structure du projet

```
lesfbijoux/
├── public/               # Frontend (HTML/CSS/JS statique)
│   ├── css/style.css
│   ├── js/main.js
│   └── *.html            # Pages (index, boutique, produit, cart, admin…)
├── src/
│   ├── server.js         # Point d'entrée Express
│   ├── routes/           # Couche HTTP (req/res)
│   │   ├── auth.js
│   │   ├── products.js
│   │   ├── cart.js
│   │   └── admin.js
│   ├── services/         # Couche métier (logique et accès données)
│   │   ├── authService.js
│   │   ├── productService.js
│   │   ├── cartService.js
│   │   ├── adminService.js
│   │   └── emailService.js
│   └── db/
│       ├── database.js   # Connexion LibSQL/Turso
│       ├── init.js       # Création tables + indexes
│       └── seed.js       # Données de démonstration
├── .env.example
├── vercel.json
└── dump.sql              # Dump complet pour restauration manuelle
```

---

## Tests paiement Stripe (mode test)

Carte de test : `4242 4242 4242 4242` — date future — CVC quelconque.
