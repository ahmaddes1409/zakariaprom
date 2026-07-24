const path = require('path');
const fs = require('fs');
const { parseStringPromise } = require('xml2js');
const database = require('../src/database');
const { translateCategory, translateProductName } = require('../src/translations');

const XML_URL = 'https://karmedya.com/xml/xml_export_product.xml';
const ETKIN_API_URL = 'http://www.birikimpromosyon.com/api/json/';
const DEFAULT_HASH = '655af889baa94a38ae39ec4703be2021';
const DEFAULT_EMAIL = 'info@karmedya.com';

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
  let clean = rawStr;
  if (clean.includes('|')) clean = clean.split('|')[0].trim();
  const parts = clean.split('>').map(p => p.trim()).filter(Boolean);
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
    return { tr: catTr, ar: `${topMap.ar} > ${subTr}`, en: `${topMap.en} > ${subTr}` };
  }
  return { tr: topTr, ar: topMap.ar, en: topMap.en };
}

async function syncAllFeeds() {
  console.log('[ALL FEEDS SYNC] Initializing Database...');
  await database.initDatabaseAsync();
  const db = database.db;

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO local_products 
    (product_id, name_tr, name_ar, name_en, model, description, price, quantity, category_tr, category_ar, category_en, colors, sizes, images, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);

  db.exec('BEGIN TRANSACTION');

  // --- 1. SYNC KARMEDYA XML FEED ---
  let xmlCount = 0;
  try {
    console.log('[ALL FEEDS SYNC] Fetching Karmedya XML feed...');
    const res = await fetch(XML_URL);
    const xmlText = await res.text();
    const result = await parseStringPromise(xmlText, { explicitArray: false, trim: true });
    const rawItems = Array.isArray(result.SHOP.SHOPITEM) ? result.SHOP.SHOPITEM : [result.SHOP.SHOPITEM];

    for (const item of rawItems) {
      const allCats = extractCategories(item).filter(c => c !== '--Kapalı Ürünler Kategorisi');
      if (allCats.length === 0) continue;

      const textCats = allCats.filter(c => !c.match(/^\d+$/));
      const chosenCat = textCats.length > 0 ? textCats.reduce((a, b) => b.length > a.length ? b : a, textCats[0]) : 'Promosyon Ürünleri';

      const cleanCatTr = cleanCategoryString(chosenCat);
      const catTrans = getCategoryTranslations(cleanCatTr);

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
      const productId = (item.PRODUCT_ID || `xml_${xmlCount}`).toString();

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
        JSON.stringify([]),
        JSON.stringify([]),
        JSON.stringify(images)
      ]);
      xmlCount++;
    }
    console.log(`[ALL FEEDS SYNC] Successfully processed ${xmlCount} Karmedya XML products.`);
  } catch(err) {
    console.error('[ALL FEEDS SYNC Error] Karmedya XML sync failed:', err.message);
  }

  // --- 2. SYNC ETKIN PROMOSYON API ---
  let etkinCount = 0;
  try {
    console.log('[ALL FEEDS SYNC] Fetching Etkin Promosyon products...');
    const payload = {
      ebayi_eposta: DEFAULT_EMAIL,
      hash: DEFAULT_HASH,
      tip: 'tum_urunler',
      siralama_tipi: 'urun_id',
      siralama: 'DESC'
    };

    const response = await fetch(ETKIN_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'zakariaprom.com' },
      body: JSON.stringify(payload)
    });

    const items = await response.json();
    if (Array.isArray(items)) {
      for (const item of items) {
        const rawId = item.urun_id || item.id || `etkin_${etkinCount}`;
        const pId = 'etkin_' + rawId;
        const nameTr = item.urun_baslik || item.urun_isim || item.name || '';
        const nameAr = translateProductName(nameTr, 'ar');
        const nameEn = translateProductName(nameTr, 'en');

        const model = item.urun_kodu || item.model || '';
        const desc = item.urun_aciklama || item.description || '';

        const priceStr = (item.urun_fiyat || item.fiyat || '0').toString().replace(',', '.').trim();
        const price = parseFloat(priceStr) || 0;
        const quantity = parseInt(item.toplam_stok || item.stok || 0) || 0;

        let catTr = item.kategori_adi || item.kategori || 'Etkin Promosyon';
        if (catTr.includes('|')) catTr = catTr.split('|')[0].trim();
        const catAr = translateCategory(catTr, 'ar');
        const catEn = translateCategory(catTr, 'en');

        const images = [];
        for (let i = 1; i <= 9; i++) {
          const k = `resim${i}`;
          if (item[k] && typeof item[k] === 'string' && item[k].trim()) {
            images.push(item[k].trim());
          }
        }

        let colors = [];
        if (item.urun_renk) colors = [item.urun_renk];

        stmt.run([
          pId,
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
          JSON.stringify(colors),
          JSON.stringify([]),
          JSON.stringify(images)
        ]);
        etkinCount++;
      }
    }
    console.log(`[ALL FEEDS SYNC] Successfully processed ${etkinCount} Etkin Promosyon products.`);
  } catch(err) {
    console.error('[ALL FEEDS SYNC Error] Etkin Promosyon sync failed:', err.message);
  }

  db.exec('COMMIT');

  console.log('[ALL FEEDS SYNC] Saving database to disk...');
  database.saveDatabase();

  const total = db.prepare('SELECT count(*) as count FROM local_products WHERE hidden = 0').get();
  console.log(`[ALL FEEDS SYNC Complete] Total active products in database: ${total ? total.count : 0} (XML: ${xmlCount}, Etkin: ${etkinCount})`);
}

syncAllFeeds().catch(console.error);
