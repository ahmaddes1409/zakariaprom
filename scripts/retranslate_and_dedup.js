const database = require('../src/database');
const { translateProductName, translateCategory } = require('../src/translations');

async function retranslateAndDedup() {
  console.log('[Clean DB] Initializing database...');
  await database.initDatabaseAsync();
  const db = database.db;

  db.exec('BEGIN TRANSACTION');

  console.log('[Clean DB] Fetching all products from local_products...');
  const rows = db.prepare('SELECT * FROM local_products').all();
  console.log(`[Clean DB] Total raw rows: ${rows.length}`);

  const seenIds = new Set();
  const seenModels = new Set();
  const keepRows = [];
  const deleteIds = [];

  for (const row of rows) {
    const pId = row.product_id || ('local_' + row.id);
    const model = (row.model || '').trim();
    const nameTr = (row.name_tr || '').trim();

    // Check duplicate by product_id
    if (seenIds.has(pId)) {
      deleteIds.push(row.id);
      continue;
    }

    // Check duplicate by model if model exists
    if (model && model.length > 2 && seenModels.has(model)) {
      deleteIds.push(row.id);
      continue;
    }

    seenIds.add(pId);
    if (model && model.length > 2) seenModels.add(model);
    keepRows.push(row);
  }

  console.log(`[Clean DB] Keeping ${keepRows.length} unique products. Deleting ${deleteIds.length} duplicate rows.`);

  if (deleteIds.length > 0) {
    const delStmt = db.prepare('DELETE FROM local_products WHERE id = ?');
    for (const id of deleteIds) {
      delStmt.run(id);
    }
  }

  // Update translations for kept rows
  const updateStmt = db.prepare(`
    UPDATE local_products 
    SET name_ar = ?, name_en = ?, category_ar = ?, category_en = ? 
    WHERE id = ?
  `);

  for (const row of keepRows) {
    const nameTr = row.name_tr || '';
    const catTr = row.category_tr || '';

    const nameAr = translateProductName(nameTr, 'ar');
    const nameEn = translateProductName(nameTr, 'en');

    const catAr = translateCategory(catTr, 'ar');
    const catEn = translateCategory(catTr, 'en');

    updateStmt.run(nameAr, nameEn, catAr, catEn, row.id);
  }

  db.exec('COMMIT');
  database.saveDatabase();

  const finalCount = db.prepare('SELECT count(*) as count FROM local_products').get();
  console.log(`[Clean DB Success] Done! Final unique product count in database: ${finalCount.count}`);
}

retranslateAndDedup().catch(console.error);
