const { translateCategory, translateProductName } = require('../translations');

const ETKIN_API_URL = 'http://www.birikimpromosyon.com/api/json/';
const DEFAULT_HASH = '655af889baa94a38ae39ec4703be2021';
const SITE_DOMAIN = 'zakariaprom.com';

async function fetchEtkinApi(db, tip = 'tum_urunler', extraParams = {}) {
  // Retrieve credentials from settings table
  const emailRow = db.prepare("SELECT value FROM settings WHERE key = 'etkin_ebayi_eposta'").get();
  const hashRow = db.prepare("SELECT value FROM settings WHERE key = 'etkin_hash'").get();
  const defaultEmailRow = db.prepare("SELECT value FROM settings WHERE key = 'email'").get();

  const eposta = (emailRow && emailRow.value) ? emailRow.value : ((defaultEmailRow && defaultEmailRow.value) ? defaultEmailRow.value : 'info@zakariaprom.com');
  const hash = (hashRow && hashRow.value) ? hashRow.value : DEFAULT_HASH;

  const payload = {
    ebayi_eposta: eposta,
    hash: hash,
    tip: tip,
    siralama_tipi: 'urun_id',
    siralama: 'DESC',
    ...extraParams
  };

  console.log(`[Etkin API] Fetching "${tip}" with email: "${eposta}"...`);

  const response = await fetch(ETKIN_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': SITE_DOMAIN
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Etkin API HTTP Error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (data && data.Hata) {
    throw new Error(`Etkin API Error Response: ${data.Hata}`);
  }

  return data;
}

async function syncEtkinProducts(db, saveDatabase) {
  try {
    console.log('[Etkin Sync] Starting Etkin Promosyon product synchronization...');
    const items = await fetchEtkinApi(db, 'tum_urunler');

    if (!items || !Array.isArray(items) || items.length === 0) {
      console.log('[Etkin Sync] No products returned or empty response.');
      return { success: false, message: 'No items returned from API' };
    }

    console.log(`[Etkin Sync] Received ${items.length} items from Etkin API.`);

    let inserted = 0;
    const categorySet = new Map();

    db.exec('BEGIN TRANSACTION');

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO local_products 
      (product_id, name_tr, name_ar, name_en, model, description, price, quantity, category_tr, category_ar, category_en, colors, sizes, images, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    for (const item of items) {
      const pId = (item.urun_id || item.id || item.kod || `etkin_${inserted}`).toString();
      const nameTr = item.urun_adi || item.adi || item.name || '';
      const nameAr = translateProductName(nameTr, 'ar');
      const nameEn = translateProductName(nameTr, 'en');

      const model = item.kod || item.model || '';
      const desc = item.aciklama || item.description || '';

      const price = parseFloat(item.fiyat || item.price || 0) || 0;
      const quantity = parseInt(item.stok || item.quantity || 0) || 0;

      let catTr = item.kategori_adi || item.kategori || 'Etkin Promosyon';
      if (catTr.includes('|')) catTr = catTr.split('|')[0].trim();

      const topCatTr = catTr.split('>')[0].trim();
      const catAr = translateCategory(catTr, 'ar');
      const catEn = translateCategory(catTr, 'en');

      if (topCatTr && !categorySet.has(topCatTr)) {
        categorySet.set(topCatTr, {
          tr: topCatTr,
          ar: translateCategory(topCatTr, 'ar'),
          en: translateCategory(topCatTr, 'en')
        });
      }

      // Collect images
      const images = [];
      if (item.resimler && Array.isArray(item.resimler)) {
        item.resimler.forEach(img => { if (img) images.push(img.trim()); });
      } else {
        ['resim', 'resim1', 'resim2', 'resim3', 'resim4', 'resim5', 'image', 'image_1'].forEach(k => {
          if (item[k] && typeof item[k] === 'string' && item[k].trim()) {
            images.push(item[k].trim());
          }
        });
      }

      stmt.run([
        'etkin_' + pId,
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
        '[]',
        '[]',
        JSON.stringify(images)
      ]);

      inserted++;
    }

    const catStmt = db.prepare('INSERT OR IGNORE INTO custom_categories (name_tr, name_ar, name_en) VALUES (?, ?, ?)');
    for (const [key, c] of categorySet) {
      catStmt.run([c.tr, c.ar, c.en]);
    }

    db.exec('COMMIT');

    if (typeof saveDatabase === 'function') {
      saveDatabase();
    }

    console.log(`[Etkin Sync Success] Synced ${inserted} products into database.`);
    return { success: true, count: inserted };
  } catch (err) {
    console.error('[Etkin Sync Error]:', err.message);
    try { db.exec('ROLLBACK'); } catch(e) {}
    return { success: false, error: err.message };
  }
}

// Schedule daily early-morning sync (default: 03:30 AM local time)
let syncTimer = null;

function scheduleDailySync(db, saveDatabase) {
  function getMsUntilNextSync() {
    const now = new Date();
    const nextSync = new Date(now);
    
    // Set target time to 03:30 AM
    nextSync.setHours(3, 30, 0, 0);

    // If 03:30 AM has already passed today, set to tomorrow
    if (now >= nextSync) {
      nextSync.setDate(nextSync.getDate() + 1);
    }

    return nextSync.getTime() - now.getTime();
  }

  function scheduleNext() {
    const delay = getMsUntilNextSync();
    console.log(`[Etkin Scheduler] Next daily sync scheduled in ${(delay / (1000 * 60 * 60)).toFixed(2)} hours (at 03:30 AM).`);

    if (syncTimer) clearTimeout(syncTimer);

    syncTimer = setTimeout(async () => {
      console.log('[Etkin Scheduler] Triggering daily 03:30 AM early morning sync...');
      await syncEtkinProducts(db, saveDatabase);
      scheduleNext(); // Schedule for next day
    }, delay);
  }

  scheduleNext();
}

module.exports = {
  fetchEtkinApi,
  syncEtkinProducts,
  scheduleDailySync
};
