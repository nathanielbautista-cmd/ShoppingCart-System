const { db, databasePath, closeDB } = require('../config/db');

try {
  const integrity = db.pragma('integrity_check');
  const counts = db.prepare(`
    SELECT collection, COUNT(*) AS count
    FROM documents
    GROUP BY collection
    ORDER BY collection
  `).all();
  const healthy = integrity.length === 1 && integrity[0].integrity_check === 'ok';
  console.log(JSON.stringify({ healthy, databasePath, integrity, counts }));
  if (!healthy) process.exitCode = 1;
} finally {
  closeDB();
}
