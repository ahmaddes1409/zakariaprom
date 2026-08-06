const database = require('../src/database');
const { fetchAndParseProducts } = require('../src/dataService');

async function inspect() {
  await database.initDatabaseAsync();
  database.initializeDatabase();
  const db = database.db;

  const localRows = db.prepare('SELECT id, product_id, model, name_tr, category_tr FROM local_products WHERE hidden = 0').all();
  console.log('Total local_products in DB:', localRows.length);

  const xmlProds = await fetchAndParseProducts();
  console.log('Total parsed XML products from feed:', xmlProds.length);

  let etkinCount = 0;
  let karmedyaCount = 0;

  for (const r of localRows) {
    const pId = String(r.product_id || r.id);
    const model = String(r.model || '');
    if (pId.startsWith('etkin_') || model.toUpperCase().startsWith('ETK')) {
      etkinCount++;
    } else {
      karmedyaCount++;
    }
  }

  console.log(`DB Breakup: Etkin = ${etkinCount}, Karmedya = ${karmedyaCount}`);

  // Sample Karmedya DB rows
  const karmedyaSamples = localRows.filter(r => !String(r.product_id).startsWith('etkin_') && !String(r.model).toUpperCase().startsWith('ETK')).slice(0, 5);
  console.log('Sample Karmedya DB Products:', karmedyaSamples);
}

inspect().catch(console.error);
