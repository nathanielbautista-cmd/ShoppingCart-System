const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const defaultDatabasePath = path.join(__dirname, '..', 'data', 'icart.db');
const databasePath = path.resolve(process.env.SQLITE_DB_PATH || defaultDatabasePath);

fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const db = new Database(databasePath);
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

db.exec(`
  CREATE TABLE IF NOT EXISTS documents (
    collection TEXT NOT NULL,
    id TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (collection, id)
  );

  CREATE INDEX IF NOT EXISTS idx_documents_collection_updated
    ON documents (collection, updated_at);
`);

let announced = false;

const connectDB = async () => {
  if (!announced) {
    console.log(`SQLite connected successfully: ${databasePath}`);
    announced = true;
  }
  return db;
};

const closeDB = () => {
  if (db.open) db.close();
};

module.exports = connectDB;
module.exports.db = db;
module.exports.databasePath = databasePath;
module.exports.closeDB = closeDB;
