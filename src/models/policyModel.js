const { db } = require('../config/database');

const policyModel = {
  getAll() {
    return db.prepare('SELECT * FROM policies ORDER BY id ASC').all();
  },

  getBySlug(slug) {
    return db.prepare('SELECT * FROM policies WHERE slug = ?').get(slug);
  },

  update(slug, { title, content }) {
    return db.prepare(`
      UPDATE policies
      SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP
      WHERE slug = ?
    `).run(title, content, slug);
  }
};

module.exports = policyModel;
