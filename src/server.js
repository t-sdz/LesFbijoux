require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { sessionFromToken } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Vercel est devant l'app : l'IP réelle du visiteur arrive via X-Forwarded-For
app.set('trust proxy', 1);

// Security headers (CSP, HSTS, X-Content-Type-Options, etc.)
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", 'js.stripe.com'],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
            fontSrc: ["'self'", 'fonts.gstatic.com'],
            imgSrc: ["'self'", 'data:', 'blob:'],
            frameSrc: ['js.stripe.com'],
            connectSrc: ["'self'", 'api.stripe.com'],
        },
    },
    crossOriginEmbedderPolicy: false,
}));

// Middlewares
app.use(cors({ origin: process.env.BASE_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Authentification sans état : cookie JWT signé (compatible serverless / Vercel)
app.use(cookieParser());
app.use(sessionFromToken);

// Rate limiting sur le login — max 10 échecs par IP et par 15 minutes
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    skipSuccessfulRequests: true,
    message: { error: 'Trop de tentatives, réessayez dans 15 minutes.' }
});
app.use('/auth/login', loginLimiter);

// Servir le dossier public
app.use(express.static(path.join(__dirname, '../public')));

// Import des routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const adminRoutes = require('./routes/admin');

app.use('/auth', authRoutes);
app.use('/products', productRoutes);
app.use('/cart', cartRoutes);
app.use('/api/admin', adminRoutes);

// Routes pages
const pages = ['index', 'login', 'register', 'cart', 'admin', 'collection', 'boutique', 'produit', 'confirmation'];
pages.forEach(page => {
    app.get(`/${page}.html`, (req, res) => {
        res.sendFile(path.join(__dirname, `../public/${page}.html`));
    });
});

// Route principale
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Lancer le serveur
app.listen(PORT, () => {
    console.log(`Serveur lancé sur http://localhost:${PORT}`);
});
