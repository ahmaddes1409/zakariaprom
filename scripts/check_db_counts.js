const database = require('../src/database');

async function check() {
  await database.initDatabaseAsync();
  const total = database.db.prepare('SELECT count(*) as count FROM local_products').get();
  const etkin = database.db.prepare("SELECT count(*) as count FROM local_products WHERE product_id LIKE 'etkin_%'").get();
  const xml = database.db.prepare("SELECT count(*) as count FROM local_products WHERE product_id NOT LIKE 'etkin_%' AND product_id IS NOT NULL").get();
  const manual = database.db.prepare("SELECT count(*) as count FROM local_products WHERE product_id IS NULL OR product_id LIKE 'local_%'").get();

  console.log('--- DATABASE PRODUCTS SUMMARY ---');
  console.log('Total Products in DB:', total ? total.count : 0);
  console.log('Etkin Promosyon Products:', etkin ? etkin.count : 0);
  console.log('Karmedya XML Products:', xml ? xml.count : 0);
  console.log('Manual Local Products:', manual ? manual.count : 0);
}

check().catch(console.error);
