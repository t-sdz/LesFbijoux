const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// En production (Vercel), aucun secret par défaut : sans SESSION_SECRET, la connexion est refusée
const IS_PROD = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
const SECRET = process.env.SESSION_SECRET || (IS_PROD ? null : crypto.randomBytes(32).toString('hex'));
if (!SECRET) console.error('SESSION_SECRET manquant : la connexion est désactivée.');

const COOKIE_NAME = 'token';
const USER_MAX_AGE = 7 * 24 * 60 * 60; // 7 jours (en secondes)
const ADMIN_MAX_AGE = 12 * 60 * 60;    // 12 heures pour un compte admin

// Génère un jeton JWT signé pour un utilisateur
function signToken(payload, maxAgeSeconds) {
    if (!SECRET) throw new Error('SESSION_SECRET manquant');
    return jwt.sign(payload, SECRET, { algorithm: 'HS256', expiresIn: maxAgeSeconds });
}

// Pose le cookie d'authentification (httpOnly, sécurisé en production)
function setAuthCookie(res, payload) {
    const maxAge = payload.isAdmin ? ADMIN_MAX_AGE : USER_MAX_AGE;
    res.cookie(COOKIE_NAME, signToken(payload, maxAge), {
        httpOnly: true,
        secure: IS_PROD,
        sameSite: 'strict',
        maxAge: maxAge * 1000,
    });
}

// Supprime le cookie d'authentification (déconnexion)
function clearAuthCookie(res) {
    res.clearCookie(COOKIE_NAME, { httpOnly: true, secure: IS_PROD, sameSite: 'strict' });
}

// Reconstruit req.session à partir du cookie JWT (sans état, compatible serverless)
function sessionFromToken(req, res, next) {
    req.session = {};
    const token = req.cookies && req.cookies[COOKIE_NAME];
    if (token && SECRET) {
        try {
            const decoded = jwt.verify(token, SECRET, { algorithms: ['HS256'] });
            req.session.userId = decoded.userId;
            req.session.isAdmin = decoded.isAdmin;
        } catch (e) {
            // Jeton invalide ou expiré → session vide
        }
    }
    next();
}

module.exports = { signToken, setAuthCookie, clearAuthCookie, sessionFromToken };
