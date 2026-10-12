const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');
const { resolveStrictCategory } = require('../src/dataService');
const { translateCategory, translateProductName, fixMojikake } = require('../src/translations');

async function runMigration() {
  console.log('=== STARTING COMPLETE PRODUCT & CATEGORY MIGRATION ===');
  const dbPath = path.resolve('data/zakariaprom.db');
  const db = new DatabaseSync(dbPath);

  // 1. Load live products dataset (2891 products)
  const liveData = JSON.parse(fs.readFileSync('data/live_products.json', 'utf8'));
  const liveProducts = liveData.products;
  console.log(`Loaded ${liveProducts.length} live products from live_products.json`);

  // 2. Clear hidden_categories and hidden_products
  console.log('Clearing hidden_categories and hidden_products...');
  db.exec("DELETE FROM hidden_categories");
  db.exec("DELETE FROM hidden_products");
  db.exec("DELETE FROM product_category_overrides");

  // 3. Prepare statement for local_products upsert
  const upsertStmt = db.prepare(`
    INSERT INTO local_products 
      (product_id, name_tr, name_ar, name_en, model, description, price, quantity, category_tr, category_ar, category_en, colors, sizes, images, hidden, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
    ON CONFLICT(product_id) DO UPDATE SET
      name_tr = excluded.name_tr,
      name_ar = excluded.name_ar,
      name_en = excluded.name_en,
      model = excluded.model,
      description = excluded.description,
      price = excluded.price,
      quantity = excluded.quantity,
      category_tr = excluded.category_tr,
      category_ar = excluded.category_ar,
      category_en = excluded.category_en,
      colors = excluded.colors,
      sizes = excluded.sizes,
      images = excluded.images,
      hidden = 0,
      updated_at = CURRENT_TIMESTAMP
  `);

  const categoryMap = new Map();
  let insertedCount = 0;

  for (const p of liveProducts) {
    const rawId = p.id;
    let nameTr = fixMojikake(p.name?.tr || p.name_tr || p.name || '').trim();
    let model = (p.model || '').trim();

    // Fix manual local products names if empty or generic
    if (nameTr === 'set' || nameTr === 'set ') nameTr = 'Lüks Hediyelik Set';
    if (nameTr === 'pawer bank' || nameTr === 'pawer bank ') nameTr = 'Powerbank Taşınabilir Şarj Cihazı';
    if (nameTr === 'roll up' || nameTr === 'roll up ') nameTr = 'Roll Up Banner 85x200';
    if (nameTr === 'makam bayrak' || nameTr === 'makam bayrak ') nameTr = 'Makam Bayrağı ve Direği';
    if (nameTr === 'yelken bayrak' || nameTr === 'yelken bayrak ') nameTr = 'Yelken Bayrak';
    if (nameTr === 'masa bayrak' || nameTr === 'masa bayrak ') nameTr = 'Masa Bayrağı';
    if (nameTr === 'Direk' || nameTr === 'Direk ') nameTr = 'Bayrak Direği';
    if (nameTr === 'stand' || nameTr === 'stand ') nameTr = 'Tanıtım Standı';
    if (nameTr === 'ipli stand') nameTr = 'İpli Tanıtım Standı';
    if (nameTr === 'yo-yo' || nameTr === 'yo-yo ') nameTr = 'Yaka Kartı Yoyo Makara';
    if (nameTr === 'rozet' || nameTr === 'rozet ') nameTr = 'Promosyon Yaka Rozeti';
    if (nameTr === 'balon') nameTr = 'Promosyon Baskılı Balon';
    if (nameTr === 'kup blok not' || nameTr === 'kup blok not ') nameTr = 'Küp Bloknot';
    if (nameTr === 'dik kup blok not' || nameTr === 'dik kup blok not ') nameTr = 'Dik Küp Bloknot';
    if (nameTr === 'oto kukosu') nameTr = 'Promosyon Oto Kokusu';
    if (nameTr === 'kapaklı defter') nameTr = 'Kapaklı Ofset Defter';
    if (nameTr === 'tutkalı defter' || nameTr === 'tutkalı defter ') nameTr = 'Tutkallı Ofset Defter';
    if (nameTr === 'siprali defter' || nameTr === 'siprali defter ') nameTr = 'Spiralli Ofset Defter';

    const nameAr = translateProductName(nameTr, 'ar');
    const nameEn = translateProductName(nameTr, 'en');

    let desc = p.description || '';
    const price = typeof p.price === 'number' ? p.price : (parseFloat(p.price) || 0);
    const quantity = typeof p.quantity === 'number' ? p.quantity : (parseInt(p.quantity) || 0);

    const rawCatTr = p.category_tr || (p.category && p.category.tr) || (p.categories && Array.isArray(p.categories.tr) ? p.categories.tr[0] : p.categories && p.categories.tr) || '';
    const resolved = resolveStrictCategory(rawCatTr, nameTr);
    const catTr = resolved.catTr;
    const catAr = resolved.catAr;
    const catEn = resolved.catEn;

    if (!categoryMap.has(catTr)) {
      categoryMap.set(catTr, {
        tr: catTr,
        ar: catAr,
        en: catEn,
        sampleImg: Array.isArray(p.images) && p.images[0] ? p.images[0] : ''
      });
    }

    const colors = Array.isArray(p.colors) ? JSON.stringify(p.colors) : (p.colors || '[]');
    const sizes = Array.isArray(p.sizes) ? JSON.stringify(p.sizes) : (p.sizes || '[]');
    const images = Array.isArray(p.images) ? JSON.stringify(p.images) : (p.images || '[]');

    upsertStmt.run(
      rawId,
      nameTr,
      nameAr,
      nameEn,
      model,
      desc,
      price,
      quantity,
      catTr,
      catAr,
      catEn,
      colors,
      sizes,
      images
    );
    insertedCount++;
  }

  console.log(`Upserted ${insertedCount} products into local_products successfully.`);

  // 4. Clean up any obsolete NULL product_id rows in local_products
  db.exec("DELETE FROM local_products WHERE product_id IS NULL OR product_id = ''");

  // 5. Rebuild custom_categories table cleanly
  console.log(`Rebuilding custom_categories table with ${categoryMap.size} unique categories...`);
  db.exec("DELETE FROM custom_categories");

  // Existing category images map
  const catImagesRows = db.prepare("SELECT category_name, image_url FROM category_images").all();
  const catImgMap = {};
  catImagesRows.forEach(r => { if (r.category_name) catImgMap[r.category_name] = r.image_url; });

  const insertCatStmt = db.prepare(`
    INSERT INTO custom_categories (name_tr, name_ar, name_en, image_url, active)
    VALUES (?, ?, ?, ?, 1)
  `);

  for (const [tr, c] of categoryMap) {
    const img = catImgMap[tr] || c.sampleImg || '';
    insertCatStmt.run(c.tr, c.ar, c.en, img);
  }

  // 6. Verify final database stats
  const finalTotal = db.prepare("SELECT count(*) as count FROM local_products").get();
  const finalEtkin = db.prepare("SELECT count(*) as count FROM local_products WHERE product_id LIKE 'etkin_%'").get();
  const finalLocal = db.prepare("SELECT count(*) as count FROM local_products WHERE product_id LIKE 'local_%'").get();
  const finalCats = db.prepare("SELECT category_tr, count(*) as count FROM local_products GROUP BY category_tr ORDER BY count DESC").all();

  console.log(`\n=== FINAL DATABASE AUDIT ===`);
  console.log(`Total Products: ${finalTotal.count}`);
  console.log(`Etkin Products: ${finalEtkin.count}`);
  console.log(`Local Products: ${finalLocal.count}`);
  console.log(`Unique Categories in DB: ${finalCats.length}`);

  finalCats.forEach(c => {
    const sample = db.prepare("SELECT category_ar, category_en FROM local_products WHERE category_tr = ? LIMIT 1").get(c.category_tr);
    console.log(`  [${c.count}] TR: "${c.category_tr}" | AR: "${sample?.category_ar}" | EN: "${sample?.category_en}"`);
  });

  // 7. Update latest_store_data.json backup
  console.log('\nExporting fresh backup to data/latest_store_data.json...');
  const tables = {};
  const tableNames = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map(t => t.name);
  for (const t of tableNames) {
    tables[t] = db.prepare(`SELECT * FROM ${t}`).all();
  }
  fs.writeFileSync('data/latest_store_data.json', JSON.stringify({
    success: true,
    exportedAt: new Date().toISOString(),
    tables: tables
  }, null, 2));
  console.log('Saved latest_store_data.json successfully.');

  console.log('=== MIGRATION COMPLETED SUCCESSFULLY ===');
}

runMigration().catch(console.error);
