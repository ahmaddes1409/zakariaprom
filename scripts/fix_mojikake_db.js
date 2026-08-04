const database = require('../src/database');

function fixMojikake(str) {
  if (!str || typeof str !== 'string') return str || '';
  // Check if string contains typical Mojikake patterns like Ã, Å, Ã¼, Ã¶, Ã§, Å\u009f, Ã\u009c, Ã\u0096, Ã\u0087, Â
  if (/[\u00C2-\u00C5][\u0080-\u00BF]/.test(str) || /[\u00C3\u00C4\u00C5]/.test(str)) {
    try {
      const fixed = Buffer.from(str, 'latin1').toString('utf8');
      if (fixed && !fixed.includes('')) {
        return fixed;
      }
    } catch (e) {}
  }
  return str;
}

async function runFix() {
  await database.initDatabaseAsync();
  database.initializeDatabase();
  const db = database.db;

  console.log('Fixing Mojikake in database tables...');

  // 1. Fix local_products
  const rows = db.prepare('SELECT id, name_tr, name_ar, name_en, category_tr, category_ar, category_en FROM local_products').all();
  let updatedCount = 0;
  for (const r of rows) {
    const fixedNameTr = fixMojikake(r.name_tr);
    const fixedNameAr = fixMojikake(r.name_ar);
    const fixedNameEn = fixMojikake(r.name_en);
    const fixedCatTr = fixMojikake(r.category_tr);
    const fixedCatAr = fixMojikake(r.category_ar);
    const fixedCatEn = fixMojikake(r.category_en);

    if (fixedNameTr !== r.name_tr || fixedNameAr !== r.name_ar || fixedNameEn !== r.name_en ||
        fixedCatTr !== r.category_tr || fixedCatAr !== r.category_ar || fixedCatEn !== r.category_en) {
      db.prepare(`
        UPDATE local_products 
        SET name_tr = ?, name_ar = ?, name_en = ?, category_tr = ?, category_ar = ?, category_en = ?
        WHERE id = ?
      `).run(fixedNameTr, fixedNameAr, fixedNameEn, fixedCatTr, fixedCatAr, fixedCatEn, r.id);
      updatedCount++;
    }
  }
  console.log(`Updated ${updatedCount} rows in local_products!`);

  // 2. Fix hidden_categories
  const hidden = db.prepare('SELECT rowid, category_name FROM hidden_categories').all();
  for (const h of hidden) {
    const fixed = fixMojikake(h.category_name);
    if (fixed !== h.category_name) {
      db.prepare('UPDATE hidden_categories SET category_name = ? WHERE rowid = ?').run(fixed, h.rowid);
      console.log(`Fixed hidden_category: "${h.category_name}" -> "${fixed}"`);
    }
  }

  // 3. Fix category_images
  const images = db.prepare('SELECT rowid, category_name FROM category_images').all();
  for (const img of images) {
    const fixed = fixMojikake(img.category_name);
    if (fixed !== img.category_name) {
      db.prepare('UPDATE category_images SET category_name = ? WHERE rowid = ?').run(fixed, img.rowid);
      console.log(`Fixed category_image: "${img.category_name}" -> "${fixed}"`);
    }
  }

  // 4. Fix translation_overrides
  const overrides = db.prepare('SELECT rowid, original_key, translation FROM translation_overrides').all();
  for (const o of overrides) {
    const fixedKey = fixMojikake(o.original_key);
    const fixedVal = fixMojikake(o.translation);
    if (fixedKey !== o.original_key || fixedVal !== o.translation) {
      db.prepare('UPDATE translation_overrides SET original_key = ?, translation = ? WHERE rowid = ?').run(fixedKey, fixedVal, o.rowid);
      console.log(`Fixed override: "${o.original_key}" -> "${fixedKey}"`);
    }
  }

  database.saveDatabase();
  console.log('Database save completed!');
}

runFix().catch(console.error);
