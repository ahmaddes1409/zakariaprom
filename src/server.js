const express = require('express');
const path = require('path');
const fs = require("fs");
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { initializeDatabase, initDatabaseAsync } = require('./database');
const { fetchAndParseProducts, getCategories, getProductsByCategory, searchProducts, getProductById } = require('./dataService');
const { uiTranslations, categoryTranslations, translateCategory, normalizeCategoryName, normalizeImageUrl, fixMojikake } = require('./translations');
const { optionalUserAuth } = require('./auth');

// === Exchange Rate Auto-Update ===
let cachedExchangeRate = null;
let lastRateFetch = 0;
const RATE_CACHE_DURATION = 60 * 60 * 1000; // 1 hour

async function getExchangeRate(db) {
  const now = Date.now();
  if (cachedExchangeRate && (now - lastRateFetch) < RATE_CACHE_DURATION) {
    return cachedExchangeRate;
  }
  try {
    const https = require('https');
    const data = await new Promise((resolve, reject) => {
      const req = https.get('https://open.er-api.com/v6/latest/USD', (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => { try { resolve(JSON.parse(body)); } catch(e) { reject(e); } });
      });
      req.on('error', reject);
      req.setTimeout(8000, () => { req.destroy(); reject(new Error('timeout')); });
    });
    if (data.result === 'success' && data.rates && data.rates.TRY) {
      const tryPerUsd = data.rates.TRY;
      const usdPerTry = 1 / tryPerUsd;
      cachedExchangeRate = { tryPerUsd, usdPerTry, updatedAt: new Date().toISOString() };
      lastRateFetch = now;
      try { db.prepare('UPDATE currencies SET rate_from_try = ?, updated_at = CURRENT_TIMESTAMP WHERE code = ?').run(usdPerTry, 'USD'); } catch(e) {}
      console.log('[Exchange Rate] Updated: 1 USD = ' + tryPerUsd.toFixed(2) + ' TRY');
      return cachedExchangeRate;
    }
  } catch(e) { console.error('[Exchange Rate] Fetch error:', e.message); }
  if (!cachedExchangeRate) {
    try {
      const row = db.prepare('SELECT rate_from_try FROM currencies WHERE code = ?').get('USD');
      cachedExchangeRate = row ? { tryPerUsd: 1/row.rate_from_try, usdPerTry: row.rate_from_try, updatedAt: 'from_db' } : { tryPerUsd: 38, usdPerTry: 0.0263, updatedAt: 'fallback' };
    } catch(e) { cachedExchangeRate = { tryPerUsd: 38, usdPerTry: 0.0263, updatedAt: 'fallback' }; }
    lastRateFetch = now;
  }
  return cachedExchangeRate;
}
// === End Exchange Rate ===

let cachedEtkinRaw = null;
let lastEtkinFetch = 0;

async function getCachedEtkinRaw(db) {
  const now = Date.now();
  if (cachedEtkinRaw && (now - lastEtkinFetch < 30 * 60 * 1000)) {
    return cachedEtkinRaw;
  }
  try {
    const { fetchEtkinApi } = require('./services/etkinService');
    const raw = await fetchEtkinApi(db, 'tum_urunler');
    if (raw && Array.isArray(raw) && raw.length > 0) {
      cachedEtkinRaw = raw;
      lastEtkinFetch = now;
      console.log(`[Etkin Raw Cache] Updated cache with ${raw.length} products`);
      return cachedEtkinRaw;
    }
  } catch(e) {
    console.error('[Etkin Raw Cache Fetch Error]:', e.message);
  }
  return cachedEtkinRaw || [];
}


const app = express();
const PORT = process.env.PORT || 3000;

// Dynamic XML Sitemap Generator (Full SEO Coverage for 3,550+ Products)
app.get('/sitemap.xml', async (req, res) => {
  try {
    await ensureDbReady();
    const db = database.db;
    res.header('Content-Type', 'application/xml');

    const baseUrl = 'https://zakariaprom.com';
    const today = new Date().toISOString().split('T')[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n`;

    // Static Pages
    const staticPages = [
      { url: '/', priority: '1.0', changefreq: 'daily' },
      { url: '/about', priority: '0.8', changefreq: 'monthly' },
      { url: '/contact', priority: '0.8', changefreq: 'monthly' },
      { url: '/products', priority: '0.9', changefreq: 'daily' },
      { url: '/blog', priority: '0.7', changefreq: 'weekly' },
      { url: '/privacy', priority: '0.5', changefreq: 'monthly' },
      { url: '/terms', priority: '0.5', changefreq: 'monthly' },
      { url: '/refund-policy', priority: '0.5', changefreq: 'monthly' },
      { url: '/shipping', priority: '0.5', changefreq: 'monthly' },
    ];

    staticPages.forEach(p => {
      xml += `  <url>\n    <loc>${baseUrl}${p.url}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>\n`;
    });

    if (db) {
      // Dynamic Products (All 3,550+ Products)
      const products = db.prepare('SELECT id, updated_at FROM local_products WHERE hidden = 0').all();
      products.forEach(prod => {
        const lastmod = prod.updated_at ? String(prod.updated_at).split(' ')[0] : today;
        xml += `  <url>\n    <loc>${baseUrl}/product/${encodeURIComponent(prod.id)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
      });
    }

    xml += `</urlset>`;
    res.send(xml);
  } catch(e) {
    console.error('[Sitemap Error]:', e.message);
    res.status(500).send('Error generating sitemap');
  }
});

// Serve static files (React build + admin panel) with no-cache headers to prevent stale JS bundle
app.use(express.static(path.join(__dirname, '..', 'public'), {
  etag: false,
  lastModified: false,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}));

async function syncXmlToDb(db, saveDatabase) {
  try {
    const { fetchAndParseProducts } = require('./dataService');
    const { translateCategory, translateProductName } = require('./translations');
    console.log('[Auto XML Sync] Starting background sync of Karmedya XML feed to database...');
    const products = await fetchAndParseProducts(true);
    console.log(`[Auto XML Sync] Parsed ${products ? products.length : 0} products from XML`);
    if (!products || products.length === 0) return;

    // 1. Prepare all formatted data BEFORE starting database transaction
    const preparedRows = [];
    const categoryMap = new Map();

    for (const p of products) {
      if (!p.id) continue;
      const { translateCategory, translateProductName, normalizeCategoryName } = require('./translations');
      let rawCat = (p.categories && p.categories.tr && p.categories.tr.length > 0) ? p.categories.tr[p.categories.tr.length - 1] : 'Promosyon Ürünleri';
      if (rawCat.includes('|')) {
        rawCat = rawCat.split('|')[0].trim();
      }
      rawCat = normalizeCategoryName(rawCat);
      const topCatTr = normalizeCategoryName(rawCat.split('>')[0].trim() || 'Promosyon Ürünleri');
      const catTr = rawCat;
      const catAr = (p.categories && p.categories.ar && p.categories.ar.length > 0) ? p.categories.ar[p.categories.ar.length - 1] : translateCategory(catTr, 'ar');
      const catEn = (p.categories && p.categories.en && p.categories.en.length > 0) ? p.categories.en[p.categories.en.length - 1] : translateCategory(catTr, 'en');

      if (topCatTr && !categoryMap.has(topCatTr)) {
        const topCatAr = translateCategory(topCatTr, 'ar');
        const topCatEn = translateCategory(topCatTr, 'en');
        categoryMap.set(topCatTr, { tr: topCatTr, ar: topCatAr, en: topCatEn });
      }

      const pId = p.id.toString();
      const nameTr = p.name ? (p.name.tr || '') : '';
      const nameAr = p.name ? (p.name.ar || translateProductName(nameTr, 'ar')) : '';
      const nameEn = p.name ? (p.name.en || translateProductName(nameTr, 'en')) : '';

      let descStr = '';
      if (typeof p.description === 'object' && p.description !== null) {
        descStr = p.description.ar || p.description.tr || p.description.en || '';
      } else if (typeof p.description === 'string') {
        descStr = p.description;
      }
      if (descStr) {
        descStr = descStr.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      }

      preparedRows.push([
        pId,
        nameTr,
        nameAr,
        nameEn,
        p.model || '',
        descStr,
        p.price || 0,
        p.quantity || 0,
        catTr,
        catAr,
        catEn,
        JSON.stringify(p.colors || []),
        JSON.stringify(p.sizes || []),
        JSON.stringify(p.images || [])
      ]);
    }

    db.exec('BEGIN TRANSACTION');

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO local_products 
      (product_id, name_tr, name_ar, name_en, model, description, price, quantity, category_tr, category_ar, category_en, colors, sizes, images, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    let count = 0;
    for (const row of preparedRows) {
      try {
        stmt.run(row);
        count++;
      } catch(itemErr) {
        console.error('[XML Item Insert Error]:', itemErr.message);
      }
      if (count % 100 === 0) {
        await new Promise(resolve => setTimeout(resolve, 5));
      }
    }

    const catStmt = db.prepare('INSERT OR IGNORE INTO custom_categories (name_tr, name_ar, name_en) VALUES (?, ?, ?)');
    for (const [key, c] of categoryMap) {
      if (c && c.tr) {
        try { catStmt.run(c.tr, c.ar || c.tr, c.en || c.tr); } catch(e) {}
      }
    }

    db.exec('COMMIT');

    if (typeof saveDatabase === 'function') {
      saveDatabase();
    }
    console.log(`[Auto XML Sync] Successfully synced ${preparedRows.length} Karmedya XML products and ${categoryMap.size} clean categories to active database!`);
  } catch (err) {
    try { db.exec('ROLLBACK'); } catch(e) {}
    console.error('[Auto XML Sync Error]:', err.message, err.stack);
    throw err;
  }
}

const database = require('./database');
const saveDatabase = database.saveDatabase;
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/user');
const chatbotRoutes = require('./routes/chatbot');

function migrateCategories(db) {
  if (!db) return;
  try {
    db.exec(`
      UPDATE local_products SET category_tr = 'Plastik Kalemler', top_category_tr = 'Plastik Kalemler', category_ar = 'أقلام بلاستيكية', category_en = 'Plastic Pens' WHERE category_tr IN ('Kalemler > Plastik Kalem', 'Plastik Kalem', 'Plastik Kalemleri', 'Promosyon Kalemler > Plastik Kalem', 'Metal Kalem');
      UPDATE local_products SET category_tr = 'Metal Kalemler', top_category_tr = 'Metal Kalemler', category_ar = 'أقلام معدنية', category_en = 'Metal Pens' WHERE category_tr IN ('Kalemler > Metal Kalem', 'Metal Kalem', 'Metal Kalemleri', 'Metal Tükenmez - Roller Kalemler');
      UPDATE local_products SET category_tr = 'Kalem Setleri', top_category_tr = 'Kalem Setleri', category_ar = 'أطقم أقلام', category_en = 'Pen Sets' WHERE category_tr IN ('KalemSetleri > Kalem Seti', 'Kalem Setleri > Kalem Seti', 'Kalem Seti', 'Hediyelik Kalem Setleri');
      UPDATE local_products SET category_tr = 'Plastik Duvar Saatleri', top_category_tr = 'Plastik Duvar Saatleri', category_ar = 'ساعات حائط بلاستيكية', category_en = 'Plastic Wall Clocks' WHERE category_tr IN ('Saatler > Plastik Duvar Saati', 'Plastik Duvar Saati', 'Duvar Saatleri', 'Saatler > Duvar Saati');
      UPDATE local_products SET category_tr = 'USB Bellekler', top_category_tr = 'USB Bellekler', category_ar = 'ذاكرة USB', category_en = 'USB Flash Drives' WHERE category_tr IN ('Teknoloji Ürünleri > USB Bellek', 'Usb Bellekler', 'USB Bellek');
      UPDATE local_products SET category_tr = 'Powerbank', top_category_tr = 'Powerbank', category_ar = 'بطاريات متنقلة', category_en = 'Power Banks' WHERE category_tr IN ('Teknoloji Ürünleri > Powerbank', 'Powerbanklar', 'Power Bank');
      UPDATE local_products SET category_tr = 'Termoslar', top_category_tr = 'Termoslar', category_ar = 'ترمسات', category_en = 'Thermoses' WHERE category_tr IN ('Termos - Matara > Diğer Termos - Matara', 'Termos - Mug', 'Termos Bardaklar (Mug)');

      UPDATE custom_categories SET name_tr = 'Metal Kalemler', name_ar = 'أقلام معدنية', name_en = 'Metal Pens' WHERE name_tr IN ('Metal Kalem', 'Metal Kalemleri', 'Kalemler > Metal Kalem');
      UPDATE custom_categories SET name_tr = 'Plastik Kalemler', name_ar = 'أقلام بلاستيكية', name_en = 'Plastic Pens' WHERE name_tr IN ('Plastik Kalem', 'Plastik Kalemleri', 'Kalemler > Plastik Kalem');
      UPDATE custom_categories SET name_tr = 'Bayraklar', name_ar = 'أعلام ورايات', name_en = 'Flags' WHERE name_tr IN ('Byrak', 'اعلام', 'Bayrak');

      -- Clean up corrupted Mojikake categories and entries
      DELETE FROM custom_categories WHERE name_tr LIKE '%Ã%' OR name_tr LIKE '%Ä%' OR name_tr LIKE '%Å%' OR name_tr LIKE '%?%' OR name_tr LIKE '%§%';
      DELETE FROM custom_categories WHERE name_tr LIKE '%Kapalı Ürünler%';
      DELETE FROM custom_categories WHERE id NOT IN (SELECT min(id) FROM custom_categories GROUP BY name_tr);

      DELETE FROM translation_overrides WHERE type = 'category' AND (translation LIKE '%ler' OR translation LIKE '%lar' OR original_key IN ('Metal Kalemler', 'Plastik Kalemler', 'Metal Kalem', 'Plastik Kalem'));
      DELETE FROM translation_overrides WHERE original_key LIKE '%Ã%' OR original_key LIKE '%Ä%' OR original_key LIKE '%Å%' OR original_key LIKE '%?%' OR original_key LIKE '%§%';
      DELETE FROM translation_overrides WHERE translation LIKE '%Ã%' OR translation LIKE '%Ä%' OR translation LIKE '%Å%' OR translation LIKE '%?%' OR translation LIKE '%§%';

      INSERT INTO translation_overrides (type, original_key, lang, translation) VALUES ('category', 'Metal Kalemler', 'ar', 'أقلام معدنية');
      INSERT INTO translation_overrides (type, original_key, lang, translation) VALUES ('category', 'Metal Kalemler', 'en', 'Metal Pens');
      INSERT INTO translation_overrides (type, original_key, lang, translation) VALUES ('category', 'Plastik Kalemler', 'ar', 'أقلام بلاستيكية');
      INSERT INTO translation_overrides (type, original_key, lang, translation) VALUES ('category', 'Plastik Kalemler', 'en', 'Plastic Pens');
    `);

    // Migrate Google Drive sharing links to direct image URLs in DB
    try {
      const driveRows = db.prepare("SELECT id, image_url FROM custom_categories WHERE image_url LIKE '%drive.google.com%'").all();
      for (const r of driveRows) {
        const norm = normalizeImageUrl(r.image_url);
        if (norm && norm !== r.image_url) {
          db.prepare("UPDATE custom_categories SET image_url = ? WHERE id = ?").run(norm, r.id);
        }
      }
      const catImgRows = db.prepare("SELECT category_name, image_url FROM category_images WHERE image_url LIKE '%drive.google.com%'").all();
      for (const r of catImgRows) {
        const norm = normalizeImageUrl(r.image_url);
        if (norm && norm !== r.image_url) {
          db.prepare("UPDATE category_images SET image_url = ? WHERE category_name = ?").run(norm, r.category_name);
        }
      }
      const bannerRows = db.prepare("SELECT id, image_url FROM banners WHERE image_url LIKE '%drive.google.com%'").all();
      for (const r of bannerRows) {
        const norm = normalizeImageUrl(r.image_url);
        if (norm && norm !== r.image_url) {
          db.prepare("UPDATE banners SET image_url = ? WHERE id = ?").run(norm, r.id);
        }
      }
    } catch(imgErr) {}

    if (typeof saveDatabase === 'function') saveDatabase();
    console.log('[Category Migration] Bulk categories merged & custom categories cleaned successfully!');
  } catch(e) {
    console.error('[Category Migration Error]:', e.message);
  }
}

let dbReadyPromise = null;
function ensureDbReady() {
  if (!dbReadyPromise) {
    dbReadyPromise = (async () => {
      await initDatabaseAsync();
      initializeDatabase();
      migrateCategories(database.db);
      setTimeout(async () => {
        try {
          console.log('[Startup Auto Sync] Syncing Karmedya XML feed products...');
          await syncXmlToDb(database.db, saveDatabase);
          console.log('[Startup Auto Sync] Syncing Etkin Promosyon API products...');
          const { syncEtkinProducts, scheduleDailySync } = require('./services/etkinService');
          await syncEtkinProducts(database.db, saveDatabase);
          migrateCategories(database.db);
          scheduleDailySync(database.db, saveDatabase);
        } catch (e) {
          console.error('[Startup Sync Error]:', e.message);
        }
      }, 100);
    })();
  }
  return dbReadyPromise;
}

// Ensure Database is initialized before handling ANY request
app.use(async (req, res, next) => {
  try {
    await ensureDbReady();
  } catch (err) {
    console.error('[DB Middleware Error]:', err.message);
  }
  next();
});

// Middleware
app.use(cors());
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // API Routes
  app.use('/api/admin', adminRoutes);
  app.use('/api/user', userRoutes);
  app.use('/api/chatbot', chatbotRoutes);
  app.use('/api', userRoutes);

  // Analytics tracking
  app.post('/api/analytics', (req, res) => {
    const { page, product_id, category, action, session_id } = req.body;
    try {
      database.db.prepare(
        'INSERT INTO analytics (page, product_id, category, action, session_id, user_agent, ip) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(page || '/', product_id || null, category || null, action || 'view', session_id || '', req.headers['user-agent'] || '', req.ip || '');
      res.json({ success: true });
    } catch (e) {
      res.json({ success: false });
    }
  });

  app.get('/api/restart-node-worker', (req, res) => {
    res.json({ message: 'Restarting Node worker process...' });
    setTimeout(() => {
      process.exit(0);
    }, 100);
  });

  app.get('/api/sync-xml-now', async (req, res) => {
    try {
      console.log('[Manual XML Sync] Starting XML feed sync...');
      await syncXmlToDb(database.db, saveDatabase);
      const total = database.db.prepare('SELECT count(*) as count FROM local_products WHERE hidden = 0').get();
      const xml = database.db.prepare("SELECT count(*) as count FROM local_products WHERE product_id NOT LIKE 'etkin_%' AND hidden = 0").get();
      res.json({ success: true, total: total ? total.count : 0, xml: xml ? xml.count : 0 });
    } catch(e) {
      res.status(500).json({ error: e.message, stack: e.stack });
    }
  });

  app.get('/api/test-xml-parser', async (req, res) => {
    try {
      const { fetchXML, parseXmlFast } = require('./dataService');
      const xml = await fetchXML();
      const products = parseXmlFast(xml);
      res.json({
        success: true,
        xmlLength: xml ? xml.length : 0,
        parsedCount: products ? products.length : 0,
        sample: products && products.length > 0 ? products[0] : null
      });
    } catch(err) {
      res.status(500).json({ success: false, error: err.message, stack: err.stack });
    }
  });

  app.get('/api/db-status', async (req, res) => {
    try {
      const { fetchAndParseProducts } = require('./dataService');
      let xmlParsed = [];
      let xmlError = null;
      try {
        xmlParsed = await fetchAndParseProducts(true);
      } catch(e) {
        xmlError = e.message + (e.stack ? ' | ' + e.stack : '');
      }

      let etkinRawCount = 0;
      let etkinRawErr = null;
      try {
        const raw = await getCachedEtkinRaw(database.db);
        etkinRawCount = raw ? raw.length : 0;
      } catch(e) {
        etkinRawErr = e.message;
      }

      let total = 0, xml = 0, etkin = 0;
      try {
        const tRow = database.db.prepare('SELECT count(*) as count FROM local_products WHERE hidden = 0').get();
        if (tRow) total = tRow.count;
        const xRow = database.db.prepare("SELECT count(*) as count FROM local_products WHERE product_id NOT LIKE 'etkin_%' AND hidden = 0").get();
        if (xRow) xml = xRow.count;
        const eRow = database.db.prepare("SELECT count(*) as count FROM local_products WHERE product_id LIKE 'etkin_%' AND hidden = 0").get();
        if (eRow) etkin = eRow.count;
      } catch(dbErr) {}

      res.json({ success: true, total, xml, etkin, xmlParsedCount: xmlParsed ? xmlParsed.length : 0, xmlError, etkinRawCount, etkinRawErr });
    } catch(e) {
      res.json({ success: false, error: e.message });
    }
  });

  // Public trigger to run full feed sync and get DB counts
  app.get('/api/sync-all-now', async (req, res) => {
    try {
      setTimeout(async () => {
        try {
          console.log('[Background Sync] Starting XML feed sync...');
          await syncXmlToDb(database.db, saveDatabase);
          console.log('[Background Sync] Starting Etkin API sync...');
          const { syncEtkinProducts } = require('./services/etkinService');
          await syncEtkinProducts(database.db, saveDatabase);
        } catch (syncErr) {
          console.error('[Background Sync Trigger Error]:', syncErr.message);
        }
      }, 10);

      let total = 0, xml = 0, etkin = 0;
      try {
        const tRow = database.db.prepare('SELECT count(*) as count FROM local_products WHERE hidden = 0').get();
        if (tRow) total = tRow.count;
        const xRow = database.db.prepare("SELECT count(*) as count FROM local_products WHERE product_id NOT LIKE 'etkin_%' AND hidden = 0").get();
        if (xRow) xml = xRow.count;
        const eRow = database.db.prepare("SELECT count(*) as count FROM local_products WHERE product_id LIKE 'etkin_%' AND hidden = 0").get();
        if (eRow) etkin = eRow.count;
      } catch(dbErr) {}

      res.json({ success: true, message: "Background sync started successfully", total, xml, etkin });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // Public products API
  app.get('/api/products', async (req, res) => {
    try {
      const { category, search, lang = 'ar', page = 1, limit = 24, sort } = req.query;
      const { translateProductName, translateCategory } = require('./translations');
      const { getProductsByCategory, searchProducts, resolveStrictCategory } = require('./dataService');

      // Fetch all products directly from local_products database table
      let dbRows = database.db.prepare('SELECT * FROM local_products WHERE hidden = 0').all();
      
      // Merge Karmedya XML feed products alongside local_products
      try {
        const xmlProds = await fetchAndParseProducts();
        if (xmlProds && xmlProds.length > 0) {
          const existingIds = new Set((dbRows || []).map(r => String(r.product_id || r.id)));
          const mappedXml = xmlProds.filter(p => p && p.id && !existingIds.has(String(p.id))).map(p => {
            const catArray = (p.categories && Array.isArray(p.categories.tr)) ? p.categories.tr : [];
            const catTr = catArray.length > 0 ? (catArray[catArray.length - 1] || 'Promosyon Ürünleri') : 'Promosyon Ürünleri';
            const nameTr = (p.name && typeof p.name.tr === 'string') ? p.name.tr : (typeof p.name === 'string' ? p.name : '');
            const pId = p.id ? p.id.toString() : Math.random().toString(36).substring(7);

            return {
              product_id: pId,
              name_tr: nameTr,
              name_ar: p.name && p.name.ar ? p.name.ar : translateProductName(nameTr, 'ar'),
              name_en: p.name && p.name.en ? p.name.en : translateProductName(nameTr, 'en'),
              model: p.model || '',
              description: typeof p.description === 'object' ? (p.description.ar || p.description.tr || '') : (p.description || ''),
              price: p.price || 0,
              quantity: p.stock || p.quantity || 100,
              category_tr: catTr,
              category_ar: translateCategory(catTr, 'ar'),
              category_en: translateCategory(catTr, 'en'),
              colors: '[]',
              sizes: '[]',
              images: JSON.stringify(p.images || [])
            };
          });
          dbRows = [...dbRows, ...mappedXml];
        }
      } catch(fallbackErr) {
        console.error('[API Products XML Merge Error]:', fallbackErr.message);
      }
      
      let hiddenProducts = [];
      try { hiddenProducts = database.db.prepare('SELECT product_id FROM hidden_products').all().map(h => String(h.product_id)); } catch(e) {}

      let hiddenCategories = [];
      try { hiddenCategories = database.db.prepare('SELECT category_name FROM hidden_categories').all().map(h => h.category_name); } catch(e) {}
      const hiddenCategorySet = new Set(hiddenCategories.map(c => normalizeCategoryName(c)));
      hiddenCategories.forEach(c => hiddenCategorySet.add(c));

      let categoryOverrides = [];
      try { categoryOverrides = database.db.prepare('SELECT * FROM product_category_overrides').all(); } catch(e) {}
      const categoryOverrideMap = {};
      categoryOverrides.forEach(o => { categoryOverrideMap[o.product_id] = o; });

      let nameOverrides = [];
      try { nameOverrides = database.db.prepare("SELECT * FROM translation_overrides WHERE type = 'product'").all(); } catch(e) {}
      const nameOverrideMap = {};
      nameOverrides.forEach(o => {
        if (!nameOverrideMap[o.original_key]) nameOverrideMap[o.original_key] = {};
        nameOverrideMap[o.original_key][o.lang] = o.translation;
      });

      let catTransOverrides = [];
      try { catTransOverrides = database.db.prepare("SELECT * FROM translation_overrides WHERE type = 'category'").all(); } catch(e) {}
      const catTransMap = {};
      catTransOverrides.forEach(o => {
        if (!catTransMap[o.original_key]) catTransMap[o.original_key] = {};
        catTransMap[o.original_key][o.lang] = o.translation;
      });

      let products = [];
      const seenProductKeys = new Set();

      for (const lp of dbRows) {
        if (lp.hidden === 1) continue;
        const pId = String(lp.product_id || ('local_' + lp.id));
        const rawId = pId.replace(/^(etkin_|xml_|local_)/, '');

        if (hiddenProducts.includes(pId) || hiddenProducts.includes(rawId) || hiddenProducts.includes(String(lp.id)) || (lp.model && hiddenProducts.includes(lp.model))) continue;

        // Deduplicate by product_id
        if (seenProductKeys.has(pId)) continue;
        seenProductKeys.add(pId);

        let rawCatTr = lp.category_tr || '';
        let nameTr = lp.name_tr || '';
        let nameAr = lp.name_ar || nameTr;
        let nameEn = lp.name_en || nameTr;

        const { resolveStrictCategory } = require('./dataService');
        const resolved = resolveStrictCategory(rawCatTr, nameTr);
        let catTr = resolved.catTr;
        let catAr = resolved.catAr;
        let catEn = resolved.catEn;

        const topCatTr = catTr.split(' > ')[0].trim();
        // Skip hidden categories
        const normCatTr = normalizeCategoryName(catTr);
        const normTopCatTr = normalizeCategoryName(topCatTr);
        if (hiddenCategorySet.has(topCatTr) || hiddenCategorySet.has(catTr) || hiddenCategorySet.has(normCatTr) || hiddenCategorySet.has(normTopCatTr)) continue;

        // Check name override
        const nameOverride = nameOverrideMap[pId] || nameOverrideMap[lp.model] || nameOverrideMap[lp.name_tr];
        if (nameOverride) {
          if (nameOverride.tr) nameTr = nameOverride.tr;
          if (nameOverride.ar) nameAr = nameOverride.ar;
          if (nameOverride.en) nameEn = nameOverride.en;
        }

        let images = [];
        try { images = JSON.parse(lp.images || '[]'); } catch(e) { if (lp.images) images = [lp.images]; }

        let colors = [];
        try { colors = JSON.parse(lp.colors || '[]'); } catch(e) { if (lp.colors) colors = lp.colors.split(',').map(s=>s.trim()); }

        let sizes = [];
        try { sizes = JSON.parse(lp.sizes || '[]'); } catch(e) { if (lp.sizes) sizes = lp.sizes.split(',').map(s=>s.trim()); }

        products.push({
          id: pId,
          name: { tr: nameTr, ar: nameAr, en: nameEn },
          model: lp.model || ('LP' + lp.id),
          category: { tr: catTr, ar: catAr, en: catEn },
          categories: { tr: [catTr], ar: [catAr], en: [catEn] },
          category_tr: catTr,
          category_ar: catAr,
          category_en: catEn,
          topCategory: {
            tr: topCatTr,
            ar: catAr.split(' > ')[0].trim(),
            en: catEn.split(' > ')[0].trim()
          },
          description: lp.description || '',
          price: lp.price || 0,
          quantity: lp.quantity || 0,
          images: images,
          options: [],
          colors: colors,
          sizes: sizes,
          status: true,
          isLocal: true
        });
      }

      // Merge live Etkin API products directly
      try {
        const rawEtkin = await getCachedEtkinRaw(database.db);
        if (rawEtkin && Array.isArray(rawEtkin) && rawEtkin.length > 0) {
          const etkinProducts = rawEtkin.map(item => {
            const rawId = item.urun_id || item.id || Math.random();
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

            const catAr = translateCategory(catTr, 'ar');
            const catEn = translateCategory(catTr, 'en');

            const images = [];
            for (let i = 1; i <= 9; i++) {
              const k = `resim${i}`;
              if (item[k] && typeof item[k] === 'string' && item[k].trim()) {
                images.push(item[k].trim());
              }
            }

            return {
              id: pId,
              name: { tr: nameTr, ar: nameAr, en: nameEn },
              model,
              categories: { tr: [catTr], ar: [catAr], en: [catEn] },
              topCategory: {
                tr: catTr.split('>')[0].trim(),
                ar: catAr.split('>')[0].trim(),
                en: catEn.split('>')[0].trim()
              },
              description: desc,
              price,
              quantity,
              images,
              options: [],
              colors: item.urun_renk ? [item.urun_renk] : [],
              sizes: item.urun_ebat ? [item.urun_ebat] : [],
              status: true,
              isEtkin: true
            };
          });
          const existingEtkinIds = new Set(products.filter(p => p.id.startsWith('etkin_')).map(p => p.id));
          const newEtkin = etkinProducts.filter(ep => {
            const rawId = String(ep.id).replace(/^etkin_/, '');
            return !existingEtkinIds.has(ep.id) &&
                   !hiddenProducts.includes(ep.id) &&
                   !hiddenProducts.includes(rawId) &&
                   !(ep.model && hiddenProducts.includes(ep.model));
          });
          products = [...products, ...newEtkin];
        }
      } catch(e) {
        console.error('[Etkin Live Products Error]:', e.message);
      }

      // Filter by category
      if (category && category !== 'all') {
        products = getProductsByCategory(products, category);
      }

      // Search
      if (search) {
        products = searchProducts(products, search, lang);
      }

      // Sort
      if (sort === 'price_asc') {
        products.sort((a, b) => a.price - b.price);
      } else if (sort === 'price_desc') {
        products.sort((a, b) => b.price - a.price);
      } else if (sort === 'name') {
        products.sort((a, b) => (a.name[lang] || a.name.tr).localeCompare(b.name[lang] || b.name.tr));
      } else {
        // Interleave Karmedya XML and Etkin products evenly for a balanced mix on Page 1 and every page
        const etkinProds = products.filter(p => String(p.id).startsWith('etkin_') || (p.model && String(p.model).toUpperCase().startsWith('ETK')));
        const karmedyaProds = products.filter(p => !String(p.id).startsWith('etkin_') && (!p.model || !String(p.model).toUpperCase().startsWith('ETK')));
        const mixed = [];
        const maxLen = Math.max(karmedyaProds.length, etkinProds.length);
        for (let i = 0; i < maxLen; i++) {
          if (i < karmedyaProds.length) mixed.push(karmedyaProds[i]);
          if (i < etkinProds.length) mixed.push(etkinProds[i]);
        }
        products = mixed;
      }

      // Pagination
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 24;
      const total = products.length;
      const totalPages = Math.ceil(total / limitNum);
      const start = (pageNum - 1) * limitNum;
      const paginatedProducts = products.slice(start, start + limitNum);

      // Add USD price to products
      let exRate = null;
      try { exRate = await getExchangeRate(db); } catch(e) {}
      const usdRate = exRate ? exRate.usdPerTry : 0.0213;
      const productsWithUsd = paginatedProducts.map(p => ({
        ...p,
        price_usd: p.price ? parseFloat((p.price * usdRate).toFixed(2)) : 0
      }));
      res.json({
        products: productsWithUsd,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages
        },
        exchangeRate: { usdPerTry: usdRate, tryPerUsd: exRate ? exRate.tryPerUsd : 46.98 }
      });
    } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  });

  app.get('/api/categories', async (req, res) => {
    try {
      await ensureDbReady();
      const { fetchAndParseProducts, getCategories } = require('./dataService');

      let products = [];
      try { products = await fetchAndParseProducts(); } catch(xmlErr) { console.error("XML fetch failed, using local only:", xmlErr.message); }
      
      // Safe DB helper
      const safeQuery = (sql) => {
        try { return database.db.prepare(sql).all(); } catch(e) { return []; }
      };

      // Apply category overrides to products
      const categoryOverrides = safeQuery('SELECT * FROM product_category_overrides');
      if (categoryOverrides.length > 0) {
        const overrideMap = {};
        categoryOverrides.forEach(o => { if (o && o.product_id) overrideMap[o.product_id] = o; });
        products = (Array.isArray(products) ? products : []).map(p => {
          if (!p || !p.id) return p;
          const override = overrideMap[p.id];
          if (override && override.new_category_tr) {
            return {
              ...p,
              categories: { tr: [override.new_category_tr], ar: [override.new_category_ar || override.new_category_tr], en: [override.new_category_en || override.new_category_tr] },
              topCategory: { tr: override.new_category_tr.split(' > ')[0], ar: (override.new_category_ar || override.new_category_tr).split(' > ')[0], en: (override.new_category_en || override.new_category_tr).split(' > ')[0] }
            };
          }
          return p;
        });
      }

      // Merge local products
      const localProducts = safeQuery('SELECT * FROM local_products WHERE hidden = 0');
      if (localProducts.length > 0) {
        const localMapped = localProducts.map(lp => {
          if (!lp) return null;
          const catTr = lp.category_tr || '';
          const catAr = lp.category_ar || catTr;
          const catEn = lp.category_en || catTr;
          return {
            id: lp.product_id || ('local_' + lp.id),
            category: { tr: catTr, ar: catAr, en: catEn },
            categories: { tr: [catTr], ar: [catAr], en: [catEn] },
            topCategory: {
              tr: catTr ? catTr.split(' > ')[0].trim() : '',
              ar: catAr ? catAr.split(' > ')[0].trim() : '',
              en: catEn ? catEn.split(' > ')[0].trim() : ''
            }
          };
        }).filter(Boolean);
        const seenIds = new Set(localMapped.map(p => p.id));
        const xmlFiltered = (Array.isArray(products) ? products : []).filter(p => p && p.id && !seenIds.has(p.id));
        products = [...localMapped, ...xmlFiltered];
      }

      // Filter hidden categories
      const hiddenCategories = safeQuery('SELECT category_name FROM hidden_categories').map(h => h ? h.category_name : null).filter(Boolean);
      const hiddenCategorySet = new Set(hiddenCategories.map(c => normalizeCategoryName(c)));
      hiddenCategories.forEach(c => hiddenCategorySet.add(c));
      products = (Array.isArray(products) ? products : []).filter(p => {
        if (!p || !p.categories || !Array.isArray(p.categories.tr)) return true;
        return !p.categories.tr.some(c => {
          if (typeof c !== 'string') return false;
          const top = c.split(' > ')[0].trim();
          const normC = normalizeCategoryName(c);
          const normT = normalizeCategoryName(top);
          return hiddenCategorySet.has(c) || hiddenCategorySet.has(top) || hiddenCategorySet.has(normC) || hiddenCategorySet.has(normT);
        });
      });

      let categories = [];
      try { categories = getCategories(products); } catch(e) { console.error("getCategories error:", e); }

      // Apply category translation overrides
      const overrides = safeQuery("SELECT * FROM translation_overrides WHERE type = 'category'");
      const overrideMap = {};
      overrides.forEach(o => {
        if (o && o.original_key) {
          if (!overrideMap[o.original_key]) overrideMap[o.original_key] = {};
          overrideMap[o.original_key][o.lang] = o.translation;
        }
      });

      // Get category images
      const images = safeQuery('SELECT * FROM category_images');
      const imageMap = {};
      images.forEach(i => { if (i && i.category_name) imageMap[i.category_name] = i.image_url; });

      // Build custom categories image map as fallback
      const allCustomCats = safeQuery('SELECT name_tr, image_url, name_ar, name_en FROM custom_categories');
      const customImageMap = {};
      allCustomCats.forEach(cc => { if (cc && cc.name_tr && cc.image_url) customImageMap[cc.name_tr] = cc.image_url; });

      const { categoryTranslations } = require('./translations');
      const { fixMojikake } = require('./translations');
      let result = (Array.isArray(categories) ? categories : []).map(cat => {
        const cleanTr = fixMojikake(cat.tr);
        const cleanAr = fixMojikake(cat.ar);
        const cleanEn = fixMojikake(cat.en);
        const ov = cleanTr ? (overrideMap[cleanTr] || {}) : {};
        const dict = cleanTr ? (categoryTranslations[cleanTr] || {}) : {};

        let catAr = ov.ar || dict.ar || (cleanAr && cleanAr !== cleanTr ? cleanAr : translateCategory(cleanTr, 'ar'));
        let catEn = ov.en || dict.en || (cleanEn && cleanEn !== cleanTr ? cleanEn : translateCategory(cleanTr, 'en'));

        if (typeof catAr === 'string') catAr = fixMojikake(catAr).replace(/ler$/gi, '').replace(/lar$/gi, '').trim();
        if (typeof catEn === 'string') catEn = fixMojikake(catEn).replace(/ler$/gi, '').replace(/lar$/gi, '').trim();

        return {
          ...cat,
          tr: cleanTr,
          ar: catAr,
          en: catEn,
          image: cleanTr ? normalizeImageUrl(imageMap[cleanTr] || customImageMap[cleanTr] || '') : ''
        };
      });

      // Add custom categories (that are active, not hidden, and not mojikake)
      const customCats = safeQuery('SELECT * FROM custom_categories WHERE active = 1');
      customCats.forEach(cc => {
        if (!cc || !cc.name_tr) return;
        // Skip corrupted mojikake rows
        if (cc.name_tr.includes('Ã') || cc.name_tr.includes('Ä') || cc.name_tr.includes('Å') || cc.name_tr.includes('?') || cc.name_tr.includes('§')) return;
        const normCc = normalizeCategoryName(cc.name_tr);
        if (!hiddenCategorySet.has(cc.name_tr) && !hiddenCategorySet.has(normCc) && !result.find(r => r && (r.tr === cc.name_tr || normalizeCategoryName(r.tr) === normCc))) {
          const catImage = normalizeImageUrl(imageMap[cc.name_tr] || cc.image_url || '');
          const catOverrides = overrideMap[cc.name_tr] || {};
          result.push({
            tr: cc.name_tr || cc.name_ar,
            ar: catOverrides.ar || cc.name_ar,
            en: catOverrides.en || cc.name_en || cc.name_tr || cc.name_ar,
            count: 0,
            subcategories: [],
            image: catImage
          });
        }
      });

      // Filter out hidden categories strictly from public website response
      result = result.filter(c => {
        if (!c || !c.tr) return false;
        const norm = normalizeCategoryName(c.tr);
        return !hiddenCategorySet.has(c.tr) && !hiddenCategorySet.has(norm);
      });

      return res.json(result);
    } catch (error) {
      console.error('Error fetching categories:', error);
      return res.json({ isError500: true, error: error.message, stack: error.stack });
    }
  });
  app.get('/api/product/:id', async (req, res) => {
    try {
      const { translateProductName, translateCategory } = require('./translations');
      const reqId = req.params.id;

      let lp = null;
      if (reqId.startsWith('etkin_') || reqId.startsWith('xml_') || isNaN(Number(reqId))) {
        lp = database.db.prepare('SELECT * FROM local_products WHERE product_id = ?').get(reqId);
      } else {
        lp = database.db.prepare('SELECT * FROM local_products WHERE product_id = ? OR id = ?').get(reqId, Number(reqId));
      }
      
      if (!lp && reqId.startsWith('local_')) {
        const numericId = Number(reqId.replace('local_', '')) || 0;
        lp = database.db.prepare('SELECT * FROM local_products WHERE id = ?').get(numericId);
      }

      let product = null;

      if (lp) {
        let catTr = lp.category_tr || '';
        let catAr = lp.category_ar || translateCategory(catTr, 'ar');
        let catEn = lp.category_en || translateCategory(catTr, 'en');

        let nameTr = lp.name_tr || '';
        let nameAr = lp.name_ar || translateProductName(nameTr, 'ar');
        let nameEn = lp.name_en || translateProductName(nameTr, 'en');

        let images = [];
        try { images = JSON.parse(lp.images || '[]'); } catch(e) { if (lp.images) images = [lp.images]; }

        let colors = [];
        try { colors = JSON.parse(lp.colors || '[]'); } catch(e) { if (lp.colors) colors = lp.colors.split(',').map(s=>s.trim()); }

        let sizes = [];
        try { sizes = JSON.parse(lp.sizes || '[]'); } catch(e) { if (lp.sizes) sizes = lp.sizes.split(',').map(s=>s.trim()); }

        const topCatTr = catTr.split(' > ')[0].trim();

        product = {
          id: lp.product_id || ('local_' + lp.id),
          name: { tr: nameTr, ar: nameAr, en: nameEn },
          model: lp.model || ('LP' + lp.id),
          categories: { tr: [catTr], ar: [catAr], en: [catEn] },
          topCategory: {
            tr: topCatTr,
            ar: catAr.split(' > ')[0].trim(),
            en: catEn.split(' > ')[0].trim()
          },
          description: lp.description || '',
          price: lp.price || 0,
          quantity: lp.quantity || 0,
          images: images,
          options: [],
          colors: colors,
          sizes: sizes,
          status: true,
          isLocal: true
        };
      } else {
        // Fallback to XML live lookup
        let products = [];
        try { products = await fetchAndParseProducts(); } catch(xmlErr) {}
        product = getProductById(products, reqId);
      }

      if (product) {
        // Apply category override if exists
        const catOverride = database.db.prepare('SELECT * FROM product_category_overrides WHERE product_id = ?').get(product.id);
        if (catOverride) {
          product.categories = {
            tr: [catOverride.new_category_tr],
            ar: [catOverride.new_category_ar || catOverride.new_category_tr],
            en: [catOverride.new_category_en || catOverride.new_category_tr]
          };
          product.topCategory = {
            tr: catOverride.new_category_tr.split(' > ')[0].trim(),
            ar: (catOverride.new_category_ar || catOverride.new_category_tr).split(' > ')[0].trim(),
            en: (catOverride.new_category_en || catOverride.new_category_tr).split(' > ')[0].trim()
          };
        }

        // Apply USD price
        let exRate = null;
        try { exRate = await getExchangeRate(database.db); } catch(e) {}
        const usdRate = exRate ? exRate.usdPerTry : 0.0213;
        product.price_usd = product.price ? parseFloat((product.price * usdRate).toFixed(2)) : 0;

        return res.json(product);
      }

      res.status(404).json({ error: 'Product not found' });
    } catch (error) {
      console.error('Error fetching product:', error);
      res.status(500).json({ error: 'Failed to fetch product' });
    }
  });

  app.get('/api/translations/:lang', (req, res) => {
    const lang = req.params.lang;
    if (uiTranslations[lang]) {
      // Merge with settings overrides
      const settings = db.prepare('SELECT * FROM settings').all();
      const settingsObj = {};
      settings.forEach(s => { settingsObj[s.key] = s.value; });

      const merged = { ...uiTranslations[lang] };
      if (settingsObj[`site_name_${lang}`]) merged.siteName = settingsObj[`site_name_${lang}`];
      if (settingsObj[`site_slogan_${lang}`]) merged.siteSlogan = settingsObj[`site_slogan_${lang}`];
      if (settingsObj[`about_${lang}`]) merged.aboutText = settingsObj[`about_${lang}`];
      if (settingsObj[`address_${lang}`]) merged.addressText = settingsObj[`address_${lang}`];
      if (settingsObj.phone) merged.phoneNumber = settingsObj.phone;
      if (settingsObj.whatsapp) merged.whatsappNumber = settingsObj.whatsapp;
      if (settingsObj.email) merged.emailAddress = settingsObj.email;

      res.json(merged);
    } else {
      res.status(404).json({ error: 'Language not found' });
    }
  });
  app.get('/api/settings/public', async (req, res) => {
    try {
      await ensureDbReady();
      const db = database.db;
      if (!db) return res.json({});
      const settings = db.prepare('SELECT * FROM settings').all();
      const settingsObj = {};
      settings.forEach(s => { settingsObj[s.key] = s.value; });

      // Clean social media URLs if they start with extra slashes
      ['social_facebook', 'social_instagram', 'social_twitter', 'social_linkedin'].forEach(sk => {
        if (settingsObj[sk]) {
          let str = String(settingsObj[sk]).trim();
          if (str.startsWith('/http://') || str.startsWith('/https://')) str = str.substring(1);
          settingsObj[sk] = str;
        }
      });

      // Only expose public settings
      const publicKeys = ['site_name_ar', 'site_name_en', 'site_name_tr', 'site_slogan_ar', 'site_slogan_en', 'site_slogan_tr', 
        'phone', 'phone2', 'whatsapp', 'email', 'address_ar', 'address_en', 'address_tr', 'currency',
        'social_facebook', 'social_instagram', 'social_twitter', 'social_linkedin', 'chatbot_enabled',
        'chatbot_welcome_ar', 'chatbot_welcome_en', 'chatbot_welcome_tr', 'logo_type', 'logo_text', 'logo_url'];
      const publicSettings = {};
      publicKeys.forEach(k => { if (settingsObj[k] !== undefined) publicSettings[k] = settingsObj[k]; });
      res.json(publicSettings);
    } catch(e) {
      console.error('[Settings Public Error]:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // Contact & Quote Request Form Endpoint (Sends Email via Hostinger SMTP & Saves to DB)
  app.post('/api/contact', async (req, res) => {
    try {
      await ensureDbReady();
      const { name, email, phone, message, subject } = req.body;
      const cleanName = (name || '').trim();
      const cleanEmail = (email || '').trim();
      const cleanMessage = (message || '').trim();

      if (!cleanName || !cleanEmail || !cleanMessage) {
        return res.status(400).json({ error: 'Name, email, and message are required' });
      }

      // 1. Save message into database
      try {
        database.db.prepare(`
          INSERT INTO contact_messages (name, email, phone, subject, message, created_at)
          VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).run(cleanName, cleanEmail, phone || '', subject || '', cleanMessage);
        database.saveDatabase();
      } catch (dbErr) {
        console.error('[Contact DB Insert Error]:', dbErr.message);
      }

      // 2. Dispatch Email via Hostinger SMTP Mailer Service (Async / Non-blocking for instant UI response)
      const { sendContactEmail } = require('./services/mailer');
      sendContactEmail({
        name: cleanName,
        email: cleanEmail,
        phone: phone || '',
        message: cleanMessage,
        subject: subject || `طلب عرض سعر جديد من: ${cleanName}`
      }).catch(mailErr => {
        console.error('[Async Contact Mailer Error]:', mailErr.message);
      });

      res.json({ success: true, message: 'Message sent and email queued successfully' });
    } catch (error) {
      console.error('[Contact API Error]:', error.message);
      res.status(500).json({ error: 'Failed to send message: ' + error.message });
    }
  });

  // Live SMTP Diagnostic Endpoint
  app.get('/api/test-smtp', async (req, res) => {
    try {
      const nodemailer = require('nodemailer');
      const testUser = 'info@zakariaprom.com';
      const testPass = 'Sy2242368.';

      const configs = [
        { name: 'Hostinger SSL 465', host: 'smtp.hostinger.com', port: 465, secure: true },
        { name: 'Hostinger TLS 587', host: 'smtp.hostinger.com', port: 587, secure: false },
        { name: 'Titan SSL 465', host: 'smtp.titan.email', port: 465, secure: true },
        { name: 'Titan TLS 587', host: 'smtp.titan.email', port: 587, secure: false },
        { name: 'Localhost 25', host: 'localhost', port: 25, secure: false }
      ];

      const results = [];
      let workingConfig = null;

      for (const cfg of configs) {
        const opts = {
          host: cfg.host,
          port: cfg.port,
          secure: cfg.secure,
          tls: { rejectUnauthorized: false },
          connectionTimeout: 6000,
          greetingTimeout: 6000,
          socketTimeout: 6000
        };

        if (cfg.host !== 'localhost') {
          opts.auth = { user: testUser, pass: testPass };
        }

        const tp = nodemailer.createTransport(opts);
        try {
          await tp.verify();
          const resObj = { name: cfg.name, status: 'VERIFIED_SUCCESS' };
          if (!workingConfig) {
            workingConfig = cfg;
            try {
              const sendInfo = await tp.sendMail({
                from: `"Zakaria Prom Test" <${testUser}>`,
                to: testUser,
                subject: `SMTP Test Live - ${cfg.name}`,
                text: `Live diagnostic test success from ${cfg.name} at ${new Date().toISOString()}`
              });
              resObj.sendResult = 'SENT_SUCCESS: ' + sendInfo.messageId;
            } catch (sErr) {
              resObj.sendError = sErr.message;
            }
          }
          results.push(resObj);
        } catch (vErr) {
          results.push({ name: cfg.name, status: 'FAILED', error: vErr.message });
        }
      }

      res.json({
        testedUser: testUser,
        workingConfig,
        results
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // Blog posts (public)
  app.get('/api/posts', async (req, res) => {
    try {
      await ensureDbReady();
      const db = database.db;
      if (!db) return res.json([]);
      const posts = db.prepare('SELECT * FROM posts WHERE published = 1 ORDER BY created_at DESC').all();
      res.json(posts);
    } catch(e) {
      res.json([]);
    }
  });

  // Public banners
  app.get('/api/banners', async (req, res) => {
    try {
      await ensureDbReady();
      const db = database.db;
      if (!db) return res.json([]);
      const banners = db.prepare('SELECT * FROM banners WHERE active = 1 ORDER BY sort_order ASC, id DESC').all();
      const normalized = (banners || []).map(b => ({
        ...b,
        image_url: normalizeImageUrl(b.image_url)
      }));
      res.json(normalized);
    } catch(e) {
      res.json([]);
    }
  });

  // Public exchange rate endpoint
  app.get('/api/exchange-rate', async (req, res) => {
    try {
      await ensureDbReady();
      const db = database.db;
      const rate = await getExchangeRate(db);
      res.json(rate);
    } catch(e) {
      res.status(500).json({ error: 'Failed to get exchange rate' });
    }
  });

  app.get('/api/currencies', async (req, res) => {
    try {
      await ensureDbReady();
      const db = database.db;
      if (!db) return res.json([]);
      const currencies = db.prepare('SELECT * FROM currencies WHERE active = 1 ORDER BY id ASC').all();
      res.json(currencies);
    } catch(e) {
      res.json([]);
    }
  });


  // Admin panel - serve admin.html
  app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'admin.html'));
  });

  // SPA fallback - serve React index.html for all other routes (client-side routing)
  app.get('*', (req, res) => {
    // Don't serve index.html for API routes or static files with extensions
    if (req.path.startsWith('/api/') || (req.path.includes('.') && req.path !== '/sitemap.xml')) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  });

  if (require.main === module) {
    ensureDbReady().then(() => {
      app.listen(PORT, () => {
        console.log(`Zakaria Prom server running on port ${PORT}`);
      });
    });
  }

module.exports = app;
