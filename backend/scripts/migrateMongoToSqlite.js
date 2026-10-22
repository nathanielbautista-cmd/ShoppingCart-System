const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { MongoClient, ObjectId } = require('mongodb');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { db, databasePath, closeDB } = require('../config/db');
const User = require('../models/User');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const Transaction = require('../models/Transaction');

const collections = [
  { name: 'users', model: User },
  { name: 'products', model: Product },
  { name: 'carts', model: Cart },
  { name: 'transactions', model: Transaction }
];

const normalizeBson = (value) => {
  if (value instanceof Date) return new Date(value.getTime());
  if (value instanceof ObjectId) return value.toHexString();
  if (Array.isArray(value)) return value.map(normalizeBson);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, normalizeBson(child)]));
  }
  return value;
};

const run = async () => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI is missing from backend/.env');

  const client = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 5000 });
  try {
    await client.connect();
    const mongo = client.db();
    const source = {};

    for (const collection of collections) {
      source[collection.name] = (await mongo.collection(collection.name).find({}).toArray()).map(normalizeBson);
    }

    const total = Object.values(source).reduce((sum, rows) => sum + rows.length, 0);
    if (total === 0) {
      console.log('MongoDB contains no iCart records. SQLite was not changed.');
      return;
    }

    const existingRows = db.prepare('SELECT COUNT(*) AS count FROM documents').get().count;
    if (existingRows > 0) {
      const backupDirectory = path.join(__dirname, '..', 'backups');
      fs.mkdirSync(backupDirectory, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(backupDirectory, `pre-mongo-migration-${stamp}.db`);
      await db.backup(backupPath);
      console.log(`Existing SQLite database backed up to ${backupPath}`);
    }

    for (const collection of collections) await collection.model.deleteMany({});
    for (const collection of collections) {
      for (const document of source[collection.name]) await collection.model.create(document);
    }

    console.log(`MongoDB to SQLite migration completed: ${databasePath}`);
    console.log(JSON.stringify(Object.fromEntries(collections.map(({ name }) => [name, source[name].length]))));
  } finally {
    await client.close();
  }
};

run()
  .catch((error) => {
    console.error(`Migration failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(closeDB);
