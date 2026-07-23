const path = require('path');
const fs = require('fs');
const { parseStringPromise } = require('xml2js');
const initSqlJs = require('sql.js');
const { translateProductName, translateCategory } = require('../src/translations');

const XML_URL = 'https://karmedya.com/xml/xml_export_product.xml';

function extractCategories(item) {
  if (!item.CATEGORIES || !item.CATEGORIES.CATEGORY) return [];
  const cats = item.CATEGORIES.CATEGORY;
  if (Array.isArray(cats)) return cats;
  return [cats];
}

async function syncXmlToDatabase() {
  console.log('[XML Sync] Downloading XML from:', XML_URL);
  const res = await fetch(XML_URL);
  const xmlText = await res.text();

  console.log('[XML Sync] Parsing XML feed...');
  const result = await parseStringPromise(xmlText, { explicitArray: false, trim: true });
  const rawItems = Array.isArray(result.SHOP.SHOPITEM) ? result.SHOP.SHOPITEM : [result.SHOP.SHOPITEM];

  console.log(`[XML Sync] Found ${rawItems.length} total items in XML.`);

  const SQL = await initSqlJs();
  const dbPath = path.join(__dirname, '..', 'data', 'zakariaprom.db');

  let dbBuffer = null;
  if (fs.existsSync(dbPath)) {
    dbBuffer = fs.readFileSync(dbPath);
  }
  const sqliteDb = dbBuffer && dbBuffer.length > 0 ? new SQL.Database(dbBuffer) : new SQL.Database();

  // Create tables if not exist
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS local_products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id TEXT UNIQUE,
      name_tr TEXT DEFAULT '',
      name_ar TEXT DEFAULT '',
      name_en TEXT DEFAULT '',
      model TEXT DEFAULT '',
      description TEXT DEFAULT '',
      price REAL DEFAULT 0,
      quantity INTEGER DEFAULT 0,
      category_tr TEXT DEFAULT '',
      category_ar TEXT DEFAULT '',
      category_en TEXT DEFAULT '',
      colors TEXT DEFAULT '[]',
      sizes TEXT DEFAULT '[]',
      images TEXT DEFAULT '[]',
      hidden INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS custom_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name_ar TEXT NOT NULL,
      name_en TEXT DEFAULT '',
      name_tr TEXT DEFAULT '',
      image_url TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  try {
    sqliteDb.exec("ALTER TABLE local_products ADD COLUMN product_id TEXT");
  } catch (e) {
    // Column already exists
  }

  const categoryMap = new Map();
  let insertedCount = 0;

  sqliteDb.exec('BEGIN TRANSACTION');

  const stmt = sqliteDb.prepare(`
    INSERT OR REPLACE INTO local_products 
    (product_id, name_tr, name_ar, name_en, model, description, price, quantity, category_tr, category_ar, category_en, colors, sizes, images, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);

  for (const item of rawItems) {
    const rawCats = extractCategories(item).filter(c => !c.match(/^\d+$/) && c !== '--Kapalı Ürünler Kategorisi');
    if (rawCats.length === 0) continue;

    // Determine main subcategory and top category
    const mainCategoryTr = rawCats[rawCats.length - 1].split('>').pop().trim() || rawCats[0].split('>')[0].trim();
    const mainCategoryAr = translateCategory(mainCategoryTr, 'ar');
    const mainCategoryEn = translateCategory(mainCategoryTr, 'en');

    if (!categoryMap.has(mainCategoryTr)) {
      categoryMap.set(mainCategoryTr, { tr: mainCategoryTr, ar: mainCategoryAr, en: mainCategoryEn });
    }

    const images = [];
    if (item.IMAGES) {
      for (let i = 1; i <= 10; i++) {
        const imgKey = `IMAGE_${i}`;
        if (item.IMAGES[imgKey] && item.IMAGES[imgKey].trim()) {
          images.push(item.IMAGES[imgKey].trim());
        }
      }
    }

    const nameTr = item.NAME || '';
    const nameAr = translateProductName(nameTr, 'ar');
    const nameEn = translateProductName(nameTr, 'en');

    const priceStr = (item.PRICE || '0').replace('TL', '').replace(',', '.').trim();
    const price = parseFloat(priceStr) || 0;
    const quantity = parseInt(item.QUANTITY) || 0;
    const productId = (item.PRODUCT_ID || `xml_${insertedCount}`).toString();

    stmt.run([
      productId,
      nameTr,
      nameAr,
      nameEn,
      item.MODEL || '',
      item.DESCRIPTION || '',
      price,
      quantity,
      mainCategoryTr,
      mainCategoryAr,
      mainCategoryEn,
      '[]',
      '[]',
      JSON.stringify(images)
    ]);

    insertedCount++;
  }
  stmt.free();

  // Insert categories into custom_categories table
  const catStmt = sqliteDb.prepare(`
    INSERT OR IGNORE INTO custom_categories (name_tr, name_ar, name_en) VALUES (?, ?, ?)
  `);
  for (const [key, c] of categoryMap) {
    catStmt.run([c.tr, c.ar, c.en]);
  }
  catStmt.free();

  sqliteDb.exec('COMMIT');

  const exportedData = Buffer.from(sqliteDb.export());
  fs.writeFileSync(dbPath, exportedData);

  console.log(`[XML Sync Success] Inserted/Updated ${insertedCount} products under ${categoryMap.size} categories into database.`);
}

if (require.main === module) {
  syncXmlToDatabase().catch(err => {
    console.error('[XML Sync Error]:', err);
    process.exit(1);
  });
}

module.exports = { syncXmlToDatabase };
