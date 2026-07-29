const database = require('../src/database');
const path = require('path');

async function inspectDb() {
  await database.initDatabaseAsync();
  database.initializeDatabase();
  const db = database.db;

  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('Tables in database:', tables.map(t => t.name));

  for (const t of tables) {
    try {
      const count = db.prepare(`SELECT COUNT(*) as c FROM "${t.name}"`).get().c;
      console.log(`Table [${t.name}]: ${count} rows`);
    } catch(e) {
      console.log(`Table [${t.name}]: error (${e.message})`);
    }
  }

  // Inspect first 3 rows of products / local_products
  try {
    const prods = db.prepare("SELECT * FROM products LIMIT 3").all();
    console.log('\nSample rows from [products]:', prods);
  } catch(e) { console.log('[products] query failed:', e.message); }

  try {
    const localProds = db.prepare("SELECT * FROM local_products LIMIT 3").all();
    console.log('\nSample rows from [local_products]:', localProds);
  } catch(e) { console.log('[local_products] query failed:', e.message); }
}

inspectDb().catch(console.error);
