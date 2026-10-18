const { db } = require('../config/database');

const categoryModel = {
  getAll(includeInactive = false) {
    const query = includeInactive
      ? 'SELECT * FROM categories ORDER BY display_order ASC, name ASC'
      : 'SELECT * FROM categories WHERE is_active = 1 ORDER BY display_order ASC, name ASC';
    return db.prepare(query).all();
  },

  getBySlug(slug) {
    return db.prepare('SELECT * FROM categories WHERE slug = ?').get(slug);
  },

  getById(id) {
    return db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  },

  getHomepageCategories() {
    return db.prepare('SELECT * FROM categories WHERE is_active = 1 AND show_on_homepage = 1 ORDER BY display_order ASC, name ASC').all();
  },

  toggleHomepage(id) {
    return db.prepare('UPDATE categories SET show_on_homepage = CASE WHEN show_on_homepage = 1 THEN 0 ELSE 1 END WHERE id = ?').run(id);
  },

  toggleActive(id) {
    return db.prepare('UPDATE categories SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = ?').run(id);
  },

  create({ name, slug, description, image_url, display_order = 0, is_active = 1, show_on_homepage = 1 }) {
    const stmt = db.prepare(`
      INSERT INTO categories (name, slug, description, image_url, display_order, is_active, show_on_homepage)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const res = stmt.run(name, slug, description || '', image_url || '', display_order, is_active ? 1 : 0, show_on_homepage ? 1 : 0);
    return res.lastInsertRowid;
  },

  update(id, { name, slug, description, image_url, display_order, is_active, show_on_homepage = 1 }) {
    const stmt = db.prepare(`
      UPDATE categories
      SET name = ?, slug = ?, description = ?, image_url = ?, display_order = ?, is_active = ?, show_on_homepage = ?
      WHERE id = ?
    `);
    return stmt.run(name, slug, description || '', image_url || '', display_order, is_active ? 1 : 0, show_on_homepage ? 1 : 0, id);
  },

  delete(id) {
    const count = db.prepare('SELECT count(*) as count FROM products WHERE category_id = ? AND is_deleted = 0').get(id);
    if (count.count > 0) {
      throw new Error(`Cannot delete category: ${count.count} active products are assigned to it. Move or archive them first.`);
    }
    return db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  }
};

module.exports = categoryModel;
