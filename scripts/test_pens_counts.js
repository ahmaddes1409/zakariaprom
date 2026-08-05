const database = require('../src/database');
const { getProductsByCategory } = require('../src/dataService');

async function testCounts() {
  await database.initDatabaseAsync();
  database.initializeDatabase();
  const db = database.db;

  const rows = db.prepare('SELECT * FROM local_products WHERE hidden = 0').all();
  const products = rows.map(lp => ({
    id: lp.product_id,
    name: { tr: lp.name_tr, ar: lp.name_ar, en: lp.name_en },
    category: { tr: lp.category_tr, ar: lp.category_ar, en: lp.category_en },
    category_tr: lp.category_tr,
    category_ar: lp.category_ar,
    category_en: lp.category_en
  }));

  const plastik = getProductsByCategory(products, 'Plastik Kalemler');
  const metal = getProductsByCategory(products, 'Metal Kalemler');
  const defter = getProductsByCategory(products, 'Defterler');
  const ajanda = getProductsByCategory(products, 'Tarihli Ajandalar');

  console.log('Plastik Kalemler count:', plastik.length);
  console.log('Metal Kalemler count:', metal.length);
  console.log('Defterler count:', defter.length);
  console.log('Tarihli Ajandalar count:', ajanda.length);
}

testCounts().catch(console.error);
