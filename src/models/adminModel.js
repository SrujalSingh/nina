const bcrypt = require('bcryptjs');
const { db } = require('../config/database');

const adminModel = {
  findByUsername(username) {
    return db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
  },

  findById(id) {
    return db.prepare('SELECT id, username, email, name, role, created_at, last_login_at FROM admins WHERE id = ?').get(id);
  },

  verifyPassword(plainPassword, passwordHash) {
    return bcrypt.compareSync(plainPassword, passwordHash);
  },

  updateLastLogin(id) {
    return db.prepare('UPDATE admins SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
  },

  updateProfile(id, { name, email }) {
    return db.prepare('UPDATE admins SET name = ?, email = ? WHERE id = ?').run(name, email, id);
  },

  updatePassword(id, newPassword) {
    const hash = bcrypt.hashSync(newPassword, 10);
    return db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(hash, id);
  }
};

module.exports = adminModel;
