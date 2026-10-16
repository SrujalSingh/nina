const { db, transaction } = require('../config/database');

const settingModel = {
  getAll() {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const map = {};
    rows.forEach(r => { map[r.key] = r.value; });
    return map;
  },

  get(key, defaultValue = '') {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row ? row.value : defaultValue;
  },

  set(key, value) {
    return db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `).run(key, String(value));
  },

  updateMany(obj) {
    return transaction(() => {
      const stmt = db.prepare(`
        INSERT INTO settings (key, value, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
      `);
      for (const [k, v] of Object.entries(obj)) {
        if (v !== undefined) {
          stmt.run(k, String(v));
        }
      }
    });
  }
};

module.exports = settingModel;
