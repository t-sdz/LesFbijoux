const bcrypt = require('bcrypt');
const db = require('../db/database');

async function createUser(email, password) {
    const hashed = bcrypt.hashSync(password, 10);
    const result = await db.execute({
        sql: 'INSERT INTO users (email, password, is_admin) VALUES (?, ?, 0)',
        args: [email, hashed],
    });
    return Number(result.lastInsertRowid);
}

async function findByEmail(email) {
    const result = await db.execute({
        sql: 'SELECT * FROM users WHERE email = ?',
        args: [email],
    });
    return result.rows[0] || null;
}

async function findById(id) {
    const result = await db.execute({
        sql: 'SELECT id, email, is_admin FROM users WHERE id = ?',
        args: [id],
    });
    return result.rows[0] || null;
}

function verifyPassword(plain, hashed) {
    return bcrypt.compareSync(plain, hashed);
}

module.exports = { createUser, findByEmail, findById, verifyPassword };
