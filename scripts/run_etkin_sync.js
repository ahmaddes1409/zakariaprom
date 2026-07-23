const database = require('../src/database');
const { syncEtkinProducts } = require('../src/services/etkinService');

async function run() {
  console.log('[Runner] Initializing database...');
  await database.initDatabaseAsync();
  database.initializeDatabase();
  console.log('[Runner] Syncing Etkin products...');
  const res = await syncEtkinProducts(database.db, database.saveDatabase);
  console.log('[Runner] Result:', res);
}

run().catch(console.error);
