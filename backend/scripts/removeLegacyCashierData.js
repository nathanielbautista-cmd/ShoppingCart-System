const fs = require('fs');
const path = require('path');
const { db, databasePath, closeDB } = require('../config/db');

const backupDirectory = path.join(__dirname, '..', 'backups');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(backupDirectory, `icart-before-cashier-removal-${stamp}.db`);

const parseRow = (row) => ({ ...row, document: JSON.parse(row.data) });

const run = async () => {
  fs.mkdirSync(backupDirectory, { recursive: true });
  await db.backup(backupPath);

  const selectCollection = db.prepare('SELECT id, data FROM documents WHERE collection = ?');
  const deleteDocument = db.prepare('DELETE FROM documents WHERE collection = ? AND id = ?');
  const updateDocument = db.prepare(
    'UPDATE documents SET data = ?, updated_at = ? WHERE collection = ? AND id = ?'
  );

  let removedUsers = 0;
  let migratedCarts = 0;
  let migratedTransactions = 0;

  db.transaction(() => {
    for (const row of selectCollection.all('users').map(parseRow)) {
      if (row.document.role === 'cashier') {
        removedUsers += deleteDocument.run('users', row.id).changes;
      }
    }

    for (const row of selectCollection.all('carts').map(parseRow)) {
      if (row.document.status !== 'WAITING_FOR_CASHIER') continue;
      row.document.status = 'ACTIVE';
      row.document.pendingTransactionId = null;
      row.document.updatedAt = new Date().toISOString();
      migratedCarts += updateDocument.run(
        JSON.stringify(row.document),
        row.document.updatedAt,
        'carts',
        row.id
      ).changes;
    }

    for (const row of selectCollection.all('transactions').map(parseRow)) {
      let changed = false;
      if (Object.hasOwn(row.document, 'cashierId')) {
        row.document.processedBy = row.document.processedBy || row.document.cashierId;
        delete row.document.cashierId;
        changed = true;
      }
      if (Object.hasOwn(row.document, 'cashierNotes')) {
        row.document.processingNotes = row.document.processingNotes || row.document.cashierNotes;
        delete row.document.cashierNotes;
        changed = true;
      }
      for (const entry of row.document.voids || []) {
        if (Object.hasOwn(entry, 'cashierId')) {
          entry.handledBy = entry.cashierId;
          delete entry.cashierId;
          changed = true;
        }
        if (Object.hasOwn(entry, 'cashierUsername')) {
          entry.handledByName = entry.cashierUsername;
          delete entry.cashierUsername;
          changed = true;
        }
      }
      if (!changed) continue;
      row.document.updatedAt = new Date().toISOString();
      migratedTransactions += updateDocument.run(
        JSON.stringify(row.document),
        row.document.updatedAt,
        'transactions',
        row.id
      ).changes;
    }
  })();

  console.log(`Database backup: ${backupPath}`);
  console.log(`Source database: ${databasePath}`);
  console.log(`Removed cashier users: ${removedUsers}`);
  console.log(`Returned legacy waiting carts to ACTIVE: ${migratedCarts}`);
  console.log(`Renamed legacy transaction attribution fields: ${migratedTransactions}`);
};

run()
  .catch((error) => {
    console.error(`Cashier data migration failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(closeDB);
