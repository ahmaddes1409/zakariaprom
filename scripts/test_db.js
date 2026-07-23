const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function testDb() {
  const SQL = await initSqlJs();
  const dbPath = path.join(__dirname, '..', 'data', 'zakariaprom.db');
  console.log('Testing DB at:', dbPath);
  const db = new SQL.Database(fs.readFileSync(dbPath));
  const res = db.exec('SELECT COUNT(*) FROM local_products');
  console.log('local_products count:', res[0].values[0][0]);
  const catRes = db.exec('SELECT COUNT(*) FROM custom_categories');
  console.log('custom_categories count:', catRes[0].values[0][0]);
}

testDb().catch(console.error);
