const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const CATEGORY_MAP = {
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

function sanitizeCategoryString(cat) {
  if (!cat) return '';
  let clean = cat;
  if (clean.includes('|')) {
    clean = clean.split('|')[0].trim();
  }
  return clean.trim();
}

function getTranslation(catTr, lang) {
  const clean = sanitizeCategoryString(catTr);
  const top = clean.split('>')[0].trim();
  if (CATEGORY_MAP[top] && CATEGORY_MAP[top][lang]) {
    if (clean.includes('>')) {
      const sub = clean.split('>')[1].trim();
      return `${CATEGORY_MAP[top][lang]} > ${sub}`;
    }
    return CATEGORY_MAP[top][lang];
  }
  return clean;
}

async function cleanCategories() {
  const SQL = await initSqlJs();
  const dbPath = path.join(__dirname, '..', 'data', 'zakariaprom.db');
  console.log('Cleaning database categories at:', dbPath);

  const db = new SQL.Database(fs.readFileSync(dbPath));

  db.exec('BEGIN TRANSACTION');

  // 1. Clean local_products table categories
  const res = db.exec('SELECT id, category_tr FROM local_products');
  if (res.length > 0 && res[0].values) {
    const stmt = db.prepare('UPDATE local_products SET category_tr=?, category_ar=?, category_en=? WHERE id=?');
    for (const row of res[0].values) {
      const id = row[0];
      const origCat = row[1] || '';
      const cleanCatTr = sanitizeCategoryString(origCat);
      const cleanCatAr = getTranslation(cleanCatTr, 'ar');
      const cleanCatEn = getTranslation(cleanCatTr, 'en');

      stmt.run([cleanCatTr, cleanCatAr, cleanCatEn, id]);
    }
    stmt.free();
  }

  // 2. Rebuild custom_categories cleanly
  db.exec('DELETE FROM custom_categories');
  const catRes = db.exec('SELECT DISTINCT category_tr FROM local_products');
  if (catRes.length > 0 && catRes[0].values) {
    const seenMap = new Map();
    const catStmt = db.prepare('INSERT INTO custom_categories (name_tr, name_ar, name_en) VALUES (?, ?, ?)');

    for (const row of catRes[0].values) {
      const catTr = sanitizeCategoryString(row[0] || '');
      if (!catTr) continue;
      const topCatTr = catTr.split('>')[0].trim();
      
      if (!seenMap.has(topCatTr)) {
        const topCatAr = getTranslation(topCatTr, 'ar');
        const topCatEn = getTranslation(topCatTr, 'en');
        seenMap.set(topCatTr, true);
        catStmt.run([topCatTr, topCatAr, topCatEn]);
      }
    }
    catStmt.free();
  }

  db.exec('COMMIT');

  const exportedData = Buffer.from(db.export());
  fs.writeFileSync(dbPath, exportedData);

  console.log('[Clean Categories Success] Cleaned and deduplicated all categories successfully!');
}

cleanCategories().catch(console.error);
