const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const dbPath = process.env.DATABASE_PATH || './data/nina_weaves.sqlite';
const resolvedDbPath = path.resolve(process.cwd(), dbPath);

// Ensure directory exists
const dbDir = path.dirname(resolvedDbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new DatabaseSync(resolvedDbPath);

// Performance and Integrity pragmas
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA synchronous = NORMAL;');

// Initialize schema
function initSchema() {
  const schemaPath = path.join(__dirname, '../models/schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schemaSql);
}

// Transaction helper with nested savepoint support
let transactionDepth = 0;

function transaction(fn) {
  if (transactionDepth === 0) {
    db.exec('BEGIN IMMEDIATE');
    transactionDepth++;
    try {
      const result = fn(db);
      db.exec('COMMIT');
      return result;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    } finally {
      transactionDepth = 0;
    }
  } else {
    // Nested transaction inside an existing one -> use SAVEPOINT
    const sp = `sp_${transactionDepth}`;
    db.exec(`SAVEPOINT ${sp}`);
    transactionDepth++;
    try {
      const result = fn(db);
      db.exec(`RELEASE SAVEPOINT ${sp}`);
      return result;
    } catch (error) {
      db.exec(`ROLLBACK TO SAVEPOINT ${sp}`);
      throw error;
    } finally {
      transactionDepth--;
    }
  }
}

// Initialize on start
initSchema();

module.exports = {
  db,
  transaction,
  initSchema
};
