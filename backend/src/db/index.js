const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

function openDb(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(schema);
  return db;
}

module.exports = { openDb };
