const database = require('../src/database');

async function inspect() {
  await database.initDatabaseAsync();
  const rows = database.db.prepare("SELECT product_id, name_tr, name_ar FROM local_products WHERE product_id LIKE 'etkin_%' LIMIT 10").all();
  console.log('--- SAMPLE ETKIN PRODUCTS IN DB ---');
  console.log(rows);
}

inspect().catch(console.error);
