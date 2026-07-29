const fs = require('fs');
const path = require('path');
const database = require('../src/database');

async function check() {
  await database.initDatabaseAsync();
  database.initializeDatabase();
  const db = database.db;

  const hidden = db.prepare('SELECT * FROM hidden_categories').all();
  console.log('Hidden categories count:', hidden.length);
  console.log('Hidden categories sample:', hidden.slice(0, 10));

  const totalLocal = db.prepare('SELECT COUNT(*) as c FROM local_products').all();
  console.log('total local_products:', totalLocal);

  const totalLocalNotHidden = db.prepare('SELECT COUNT(*) as c FROM local_products WHERE hidden = 0').all();
  console.log('total local_products hidden=0:', totalLocalNotHidden);

  const catCounts = db.prepare('SELECT category_tr, COUNT(*) as c FROM local_products WHERE hidden = 0 GROUP BY category_tr LIMIT 15').all();
  console.log('Sample category_tr counts in local_products:', catCounts);
}

check().catch(console.error);
