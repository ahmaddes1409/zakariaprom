const { translateCategory, translateProductName } = require('../translations');

const ETKIN_API_URL = 'http://www.birikimpromosyon.com/api/json/';
const DEFAULT_HASH = '655af889baa94a38ae39ec4703be2021';
const DEFAULT_EMAIL = 'info@karmedya.com';
const SITE_DOMAIN = 'zakariaprom.com';

async function fetchEtkinApi(db, tip = 'tum_urunler', extraParams = {}) {
  let eposta = DEFAULT_EMAIL;
  let hash = DEFAULT_HASH;

  if (db) {
    try {
      const emailRow = db.prepare("SELECT value FROM settings WHERE key = 'etkin_ebayi_eposta'").get();
      const hashRow = db.prepare("SELECT value FROM settings WHERE key = 'etkin_hash'").get();
      if (emailRow && emailRow.value && emailRow.value.trim()) {
        eposta = emailRow.value.trim();
      }
      if (hashRow && hashRow.value && hashRow.value.trim()) {
        hash = hashRow.value.trim();
      }
    } catch(e) {}
  }

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
    if (items.length > 0) {
      console.log('[Etkin Sample Item Keys]:', Object.keys(items[0]));
      console.log('[Etkin Sample Item]:', JSON.stringify(items[0]).substring(0, 300));
    }

    let inserted = 0;
    const categorySet = new Map();

    db.exec('BEGIN TRANSACTION');

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO local_products 
      (product_id, name_tr, name_ar, name_en, model, description, price, quantity, category_tr, category_ar, category_en, colors, sizes, images, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    for (const item of items) {
      try {
        const rawId = item.urun_id || item.id || `etkin_${inserted}`;
        const pId = 'etkin_' + rawId;
        const nameTr = item.urun_baslik || item.urun_isim || item.name || '';
        const nameAr = translateProductName(nameTr, 'ar');
        const nameEn = translateProductName(nameTr, 'en');

        const model = item.urun_kodu || item.model || '';
        let desc = item.urun_aciklama || item.description || '';
        desc = desc.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

        const priceStr = (item.urun_fiyat || item.fiyat || '0').toString().replace(',', '.').trim();
        const price = parseFloat(priceStr) || 0;
        const quantity = parseInt(item.toplam_stok || item.stok || 0) || 0;

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

        // Collect images resim1..resim9
        const images = [];
        for (let i = 1; i <= 9; i++) {
          const k = `resim${i}`;
          if (item[k] && typeof item[k] === 'string' && item[k].trim()) {
            images.push(item[k].trim());
          }
        }

        let colors = [];
        if (item.urun_renk) colors = [item.urun_renk];
        let sizes = [];
        if (item.urun_ebat) sizes = [item.urun_ebat];

        stmt.run(
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
          JSON.stringify(sizes),
          JSON.stringify(images)
        );

        inserted++;
      } catch(itemErr) {
        console.error('[Etkin Item Error]:', itemErr.message);
      }
    }

    const catStmt = db.prepare('INSERT OR IGNORE INTO custom_categories (name_tr, name_ar, name_en) VALUES (?, ?, ?)');
    for (const [key, c] of categorySet) {
      try { catStmt.run(c.tr, c.ar, c.en); } catch(e) {}
    }

    db.exec('COMMIT');

    if (typeof saveDatabase === 'function') {
      saveDatabase();
    }

    console.log(`[Etkin Sync Success] Synced ${inserted} products into database.`);
    return { success: true, count: inserted, sampleKeys: items[0] ? Object.keys(items[0]) : [], sampleItem: items[0] || null };
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
