const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function listCategories() {
  const SQL = await initSqlJs();
  const dbPath = path.join(__dirname, '..', 'data', 'zakariaprom.db');
  const db = new SQL.Database(fs.readFileSync(dbPath));

  console.log('--- CUSTOM CATEGORIES TABLE ---');
  const res = db.exec('SELECT id, name_tr, name_ar, name_en FROM custom_categories ORDER BY id ASC');
  if (res.length > 0 && res[0].values) {
    res[0].values.forEach(row => {
      console.log(`[ID: ${row[0]}] TR: "${row[1]}" | AR: "${row[2]}" | EN: "${row[3]}"`);
    });
  }

  console.log('\n--- DISTINCT CATEGORIES IN LOCAL PRODUCTS ---');
  const res2 = db.exec('SELECT DISTINCT category_tr, category_ar, category_en FROM local_products');
  if (res2.length > 0 && res2[0].values) {
    res2[0].values.forEach(row => {
      console.log(`TR: "${row[0]}" | AR: "${row[1]}" | EN: "${row[2]}"`);
    });
  }
}

listCategories().catch(console.error);
