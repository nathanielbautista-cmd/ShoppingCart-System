const fs = require('fs');
const path = require('path');
const { db, databasePath, closeDB } = require('../config/db');

const backupDirectory = path.resolve(process.env.SQLITE_BACKUP_DIR || path.join(__dirname, '..', 'backups'));
const retentionCount = Math.max(1, Number(process.env.SQLITE_BACKUP_RETENTION) || 14);

const run = async () => {
  fs.mkdirSync(backupDirectory, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const destination = path.join(backupDirectory, `icart-${timestamp}.db`);

  await db.backup(destination);

  const oldBackups = fs.readdirSync(backupDirectory)
    .filter((name) => /^icart-.*\.db$/.test(name))
    .map((name) => ({ name, modified: fs.statSync(path.join(backupDirectory, name)).mtimeMs }))
    .sort((left, right) => right.modified - left.modified)
    .slice(retentionCount);

  for (const backup of oldBackups) fs.unlinkSync(path.join(backupDirectory, backup.name));

  console.log(`SQLite backup created: ${destination}`);
  console.log(`Source database: ${databasePath}`);
};

run()
  .catch((error) => {
    console.error(`SQLite backup failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(closeDB);
