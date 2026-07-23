const path = require('path');
const fs = require('fs');
const { parseStringPromise } = require('xml2js');
const initSqlJs = require('sql.js');

const XML_URL = 'https://karmedya.com/xml/xml_export_product.xml';

const TOP_CATEGORY_MAP = {
  'Kalemler': { ar: 'أقلام دعاية وإعلان', en: 'Promotional Pens' },
  'Teknoloji Ürünleri': { ar: 'منتجات تكنولوجية وبادج', en: 'Technology Products' },
  'Teknoloji': { ar: 'منتجات تكنولوجية وبادج', en: 'Technology Products' },
  'Termos - Matara': { ar: 'حافظات حرارية وترمس', en: 'Thermos & Flasks' },
  'Termos': { ar: 'حافظات حرارية وترمس', en: 'Thermos & Flasks' },
  'Anahtarlık - Rozet': { ar: 'ميداليات مفاتيح وشعارات', en: 'Keychains & Badges' },
  'Anahtarlık': { ar: 'ميداليات مفاتيح وشعارات', en: 'Keychains & Badges' },
  'Saatler': { ar: 'ساعات حائط ومكتب', en: 'Clocks & Watches' },
  'Kalem Setleri': { ar: 'أطقم أقلام فاخرة', en: 'Pen Sets' },
  'Kırtasiye Ürünleri': { ar: 'أدوات قرطاسية ومكتبية', en: 'Stationery Products' },
  'Kırtasiye': { ar: 'أدوات قرطاسية ومكتبية', en: 'Stationery Products' },
  'Ajanda -Defter': { ar: 'أجندات ودفاتر 2026', en: 'Agendas & Notebooks' },
  'Ajanda': { ar: 'أجندات ودفاتر 2026', en: 'Agendas & Notebooks' },
  'Kutulu Setler': { ar: 'أطقم هدايا دعائية', en: 'Gift Sets' },
  'Çakmaklar': { ar: 'قداحات وولاعات', en: 'Lighters' },
  'Çakmak': { ar: 'قداحات وولاعات', en: 'Lighters' },
  'Masaüstü Ürünler': { ar: 'مستلزمات وطقم مكتب', en: 'Desk Accessories' },
  'Çanta': { ar: 'حقائب دعائية', en: 'Bags' },
  'Matbaa Ürünleri': { ar: 'مطبوعات ورقية وتقاويم', en: 'Printing & Calendars' },
  'Seramik - Cam Ürünler': { ar: 'أكواب سيراميك وزجاج', en: 'Mugs & Glassware' },
  'Kutu - Aksesuar': { ar: 'علب وهدايا', en: 'Boxes & Accessories' },
  'Çeşitli Araç Gereç': { ar: 'أدوات ومستلزمات متنوعة', en: 'Miscellaneous Tools' },
  'Plaket - Ödül Ürünleri': { ar: 'دروع تذكارية وجوائز', en: 'Plaques & Awards' },
  'Plaket': { ar: 'دروع تذكارية وجوائز', en: 'Plaques & Awards' },
  'Byrak': { ar: 'أعلام ورايات', en: 'Flags & Banners' },
  'اعلام': { ar: 'أعلام ورايات', en: 'Flags & Banners' },
  'Şapka - Tişört': { ar: 'قبعات وتيشيرتات', en: 'Caps & T-Shirts' },
  'VIP Setler': { ar: 'مجموعات VIP فاخرة', en: 'VIP Gift Sets' }
};

function extractCategories(item) {
  if (!item.CATEGORIES || !item.CATEGORIES.CATEGORY) return [];
  const cats = item.CATEGORIES.CATEGORY;
  if (Array.isArray(cats)) return cats;
  return [cats];
}

function cleanCategoryString(rawStr) {
  if (!rawStr) return '';
  // Remove redundant pipe duplications like "Anahtarlık - Rozet | Anahtarlık - Rozet > Metal Anahtarlık"
  let clean = rawStr;
  if (clean.includes('|')) {
    clean = clean.split('|')[0].trim();
  }
  const parts = clean.split('>').map(p => p.trim()).filter(Boolean);
  // Deduplicate consecutive parts
  const uniqueParts = [];
  for (const p of parts) {
    if (uniqueParts.length === 0 || uniqueParts[uniqueParts.length - 1] !== p) {
      uniqueParts.push(p);
    }
  }
  return uniqueParts.join(' > ');
}

function getCategoryTranslations(catTr) {
  if (!catTr) return { tr: '', ar: '', en: '' };
  const parts = catTr.split(' > ');
  const topTr = parts[0].trim();
  const topMap = TOP_CATEGORY_MAP[topTr] || { ar: topTr, en: topTr };
  
  if (parts.length > 1) {
    const subTr = parts.slice(1).join(' > ');
    return {
      tr: catTr,
      ar: `${topMap.ar} > ${subTr}`,
      en: `${topMap.en} > ${subTr}`
    };
  }

  return {
    tr: topTr,
    ar: topMap.ar,
    en: topMap.en
  };
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
      name_tr TEXT UNIQUE NOT NULL,
      image_url TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  try {
    sqliteDb.exec("ALTER TABLE local_products ADD COLUMN product_id TEXT");
  } catch (e) {}

  const uniqueTopCategories = new Map();
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

    // Pick longest category path and clean string
    const longestRawCat = rawCats.reduce((a, b) => b.length > a.length ? b : a, rawCats[0]);
    const cleanCatTr = cleanCategoryString(longestRawCat);
    const catTrans = getCategoryTranslations(cleanCatTr);

    const topCatTr = cleanCatTr.split(' > ')[0].trim();
    const topCatTrans = getCategoryTranslations(topCatTr);

    if (topCatTr && !uniqueTopCategories.has(topCatTr)) {
      uniqueTopCategories.set(topCatTr, topCatTrans);
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
    const nameAr = item.NAME || '';
    const nameEn = item.NAME || '';

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
      catTrans.tr,
      catTrans.ar,
      catTrans.en,
      '[]',
      '[]',
      JSON.stringify(images)
    ]);

    insertedCount++;
  }
  stmt.free();

  // Re-populate custom_categories cleanly with unique top categories only
  sqliteDb.exec('DELETE FROM custom_categories');
  const catStmt = sqliteDb.prepare(`
    INSERT OR REPLACE INTO custom_categories (name_tr, name_ar, name_en) VALUES (?, ?, ?)
  `);
  for (const [topTr, cat] of uniqueTopCategories) {
    catStmt.run([cat.tr, cat.ar, cat.en]);
  }
  catStmt.free();

  sqliteDb.exec('COMMIT');

  const exportedData = Buffer.from(sqliteDb.export());
  fs.writeFileSync(dbPath, exportedData);

  console.log(`[XML Sync Success] Inserted/Updated ${insertedCount} products under ${uniqueTopCategories.size} clean top categories into database.`);
}

if (require.main === module) {
  syncXmlToDatabase().catch(err => {
    console.error('[XML Sync Error]:', err);
    process.exit(1);
  });
}

module.exports = { syncXmlToDatabase };
