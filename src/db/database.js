const { createClient } = require('@libsql/client');
const path = require('path');

let db;

// Si on a les credentials Turso → utiliser Turso (production/Vercel)
// Sinon → utiliser SQLite local (développement)
if (process.env.TURSO_URL && process.env.TURSO_TOKEN) {
    db = createClient({
        url: process.env.TURSO_URL,
        authToken: process.env.TURSO_TOKEN,
    });
    console.log('✅ Base de données Turso connectée !');
} else {
    db = createClient({
        url: 'file:' + path.join(__dirname, '../../database.sqlite'),
    });
    console.log('✅ Base de données SQLite locale connectée !');
}

module.exports = db;
