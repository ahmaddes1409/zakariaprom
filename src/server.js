const express = require('express');
const path = require('path');
const fs = require("fs");
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { initializeDatabase, initDatabaseAsync } = require('./database');
const { fetchAndParseProducts, getCategories, getProductsByCategory, searchProducts, getProductById } = require('./dataService');
const { uiTranslations } = require('./translations');
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


const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static files (React build + admin panel)
app.use(express.static(path.join(__dirname, '..', 'public')));

async function syncXmlToDb(db, saveDatabase) {
  try {
    const { fetchAndParseProducts } = require('./dataService');
    const { translateCategory, translateProductName } = require('./translations');
    console.log('[Auto XML Sync] Starting background sync of Karmedya XML feed to database...');
    const products = await fetchAndParseProducts();
    if (!products || products.length === 0) return;

    let inserted = 0;
    const categoryMap = new Map();

    db.exec('BEGIN TRANSACTION');

    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO local_products 
      (product_id, name_tr, name_ar, name_en, model, description, price, quantity, category_tr, category_ar, category_en, colors, sizes, images, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    for (const p of products) {
      if (!p.id) continue;
      let rawCat = (p.categories && p.categories.tr && p.categories.tr.length > 0) ? p.categories.tr[p.categories.tr.length - 1] : '';
      if (rawCat.includes('|')) {
        rawCat = rawCat.split('|')[0].trim();
      }
      const topCatTr = rawCat.split('>')[0].trim();
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

      insertStmt.run([
        pId,
        nameTr,
        nameAr,
        nameEn,
        p.model || '',
        p.description || '',
        p.price || 0,
        p.quantity || 0,
        catTr,
        catAr,
        catEn,
        JSON.stringify(p.colors || []),
        JSON.stringify(p.sizes || []),
        JSON.stringify(p.images || [])
      ]);
      inserted++;
    }

    const catStmt = db.prepare('INSERT OR IGNORE INTO custom_categories (name_tr, name_ar, name_en) VALUES (?, ?, ?)');
    for (const [key, c] of categoryMap) {
      catStmt.run([c.tr, c.ar, c.en]);
    }

    db.exec('COMMIT');

    if (typeof saveDatabase === 'function') {
      saveDatabase();
    }
    console.log(`[Auto XML Sync] Successfully synced ${inserted} Karmedya XML products and ${categoryMap.size} clean categories to active database!`);
  } catch (err) {
    try { db.exec('ROLLBACK'); } catch(e) {}
    console.error('[Auto XML Sync Error]:', err.message);
  }
}

// Start server after async DB initialization
async function startServer() {
  // Initialize sql.js database
  await initDatabaseAsync();
  
  // Now we can safely require modules that use db
  const { db, saveDatabase } = require('./database');
  const adminRoutes = require('./routes/admin');
  const userRoutes = require('./routes/user');
  const chatbotRoutes = require('./routes/chatbot');
  
  // Initialize schema and seed data
  initializeDatabase();

  // Trigger background sync for both Karmedya XML feed and Etkin Promosyon API
  syncXmlToDb(db, saveDatabase).catch(e => console.error('[XML Sync Startup Error]:', e.message));
  try {
    const { scheduleDailySync, syncEtkinProducts } = require('./services/etkinService');
    syncEtkinProducts(db, saveDatabase).catch(e => console.error('[Etkin Sync Startup Error]:', e.message));
    scheduleDailySync(db, saveDatabase);
  } catch (e) {
    console.error('[Etkin Scheduler Error]:', e.message);
  }

  // API Routes
  app.use('/api/admin', adminRoutes);
  app.use('/api/user', userRoutes);
  app.use('/api/chatbot', chatbotRoutes);

  // Analytics tracking
  app.post('/api/analytics', (req, res) => {
    const { page, product_id, category, action, session_id } = req.body;
    try {
      db.prepare(
        'INSERT INTO analytics (page, product_id, category, action, session_id, user_agent, ip) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(page || '/', product_id || null, category || null, action || 'view', session_id || '', req.headers['user-agent'] || '', req.ip || '');
      res.json({ success: true });
    } catch (e) {
      res.json({ success: false });
    }
  });

  // Public products API
  app.get('/api/products', async (req, res) => {
    try {
      const { category, search, lang = 'ar', page = 1, limit = 24, sort } = req.query;
      const { translateProductName, translateCategory } = require('./translations');

      // Fetch all products directly from local_products database table
      let dbRows = db.prepare('SELECT * FROM local_products WHERE hidden = 0').all();
      
      // Fallback: If DB is empty, trigger sync asynchronously in background
      if (!dbRows || dbRows.length === 0) {
        setImmediate(async () => {
          try {
            await syncXmlToDb(db, saveDatabase);
            const { syncEtkinProducts } = require('./services/etkinService');
            await syncEtkinProducts(db, saveDatabase);
          } catch(e) {}
        });
      }
      
      const hiddenProducts = db.prepare('SELECT product_id FROM hidden_products').all().map(h => h.product_id);
      const hiddenCategories = db.prepare('SELECT category_name FROM hidden_categories').all().map(h => h.category_name);

      const categoryOverrides = db.prepare('SELECT * FROM product_category_overrides').all();
      const categoryOverrideMap = {};
      categoryOverrides.forEach(o => { categoryOverrideMap[o.product_id] = o; });

      const nameOverrides = db.prepare("SELECT * FROM translation_overrides WHERE type = 'product'").all();
      const nameOverrideMap = {};
      nameOverrides.forEach(o => {
        if (!nameOverrideMap[o.original_key]) nameOverrideMap[o.original_key] = {};
        nameOverrideMap[o.original_key][o.lang] = o.translation;
      });

      let products = [];
      const seenProductKeys = new Set();

      for (const lp of dbRows) {
        const pId = lp.product_id || ('local_' + lp.id);
        
        if (hiddenProducts.includes(pId)) continue;

        // Deduplicate by product_id
        if (seenProductKeys.has(pId)) continue;
        seenProductKeys.add(pId);

        let catTr = lp.category_tr || '';
        let catAr = lp.category_ar || translateCategory(catTr, 'ar');
        let catEn = lp.category_en || translateCategory(catTr, 'en');

        // Check category override
        const catOverride = categoryOverrideMap[pId] || categoryOverrideMap[lp.model];
        if (catOverride) {
          catTr = catOverride.new_category_tr;
          catAr = catOverride.new_category_ar || translateCategory(catTr, 'ar');
          catEn = catOverride.new_category_en || translateCategory(catTr, 'en');
        }

        // Skip hidden categories
        const topCatTr = catTr.split(' > ')[0].trim();
        if (hiddenCategories.includes(topCatTr)) continue;

        let nameTr = lp.name_tr || '';
        let nameAr = lp.name_ar || translateProductName(nameTr, 'ar');
        let nameEn = lp.name_en || translateProductName(nameTr, 'en');

        // Check name override
        if (nameOverrideMap[lp.model]) {
          if (nameOverrideMap[lp.model].tr) nameTr = nameOverrideMap[lp.model].tr;
          if (nameOverrideMap[lp.model].ar) nameAr = nameOverrideMap[lp.model].ar;
          if (nameOverrideMap[lp.model].en) nameEn = nameOverrideMap[lp.model].en;
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
        });
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
      }

      // Pagination
      const total = products.length;
      const totalPages = Math.ceil(total / limit);
      const offset = (page - 1) * limit;
      const paginatedProducts = products.slice(offset, offset + parseInt(limit));

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
          page: parseInt(page),
          limit: parseInt(limit),
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
      let products = [];
      try { products = await fetchAndParseProducts(); } catch(xmlErr) { console.error("XML fetch failed, using local only:", xmlErr.message); }
      
      // Apply category overrides to products
      const categoryOverrides = db.prepare('SELECT * FROM product_category_overrides').all();
      if (categoryOverrides.length > 0) {
        const overrideMap = {};
        categoryOverrides.forEach(o => { overrideMap[o.product_id] = o; });
        products = products.map(p => {
          const override = overrideMap[p.id];
          if (override) {
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
      const localProducts = db.prepare('SELECT * FROM local_products WHERE hidden = 0').all();
      if (localProducts.length > 0) {
        const localMapped = localProducts.map(lp => {
          const catTr = lp.category_tr || '';
          const catAr = lp.category_ar || catTr;
          const catEn = lp.category_en || catTr;
          return {
            id: lp.product_id || ('local_' + lp.id),
            categories: { tr: [catTr], ar: [catAr], en: [catEn] },
            topCategory: {
              tr: catTr.split(' > ')[0].trim(),
              ar: catAr.split(' > ')[0].trim(),
              en: catEn.split(' > ')[0].trim()
            }
          };
        });
        const seenIds = new Set(localMapped.map(p => p.id));
        const xmlFiltered = products.filter(p => !seenIds.has(p.id));
        products = [...localMapped, ...xmlFiltered];
      }

      // Filter hidden categories
      const hiddenCategories = db.prepare('SELECT category_name FROM hidden_categories').all().map(h => h.category_name);
      products = products.filter(p => !p.categories.tr.some(c => hiddenCategories.includes(c.split(' > ')[0])));
      const categories = getCategories(products);

      // Apply category translation overrides
      const overrides = db.prepare("SELECT * FROM translation_overrides WHERE type = 'category'").all();
      const overrideMap = {};
      overrides.forEach(o => {
        if (!overrideMap[o.original_key]) overrideMap[o.original_key] = {};
        overrideMap[o.original_key][o.lang] = o.translation;
      });
      // Get category images
      const images = db.prepare('SELECT * FROM category_images').all();
      const imageMap = {};
      images.forEach(i => { imageMap[i.category_name] = i.image_url; });

      // Build result from XML + local products
      // Build custom categories image map as fallback
      const allCustomCats = db.prepare('SELECT name_tr, image_url, name_ar, name_en FROM custom_categories').all();
      const customImageMap = {};
      allCustomCats.forEach(cc => { if (cc.image_url) customImageMap[cc.name_tr] = cc.image_url; });
      let result = categories.map(cat => ({
        ...cat,
        ...(overrideMap[cat.tr] || {}),
        image: imageMap[cat.tr] || customImageMap[cat.tr] || ''
      }));

      // Add custom categories (that are active and not hidden)
      const customCats = db.prepare('SELECT * FROM custom_categories WHERE active = 1').all();
      customCats.forEach(cc => {
        if (!hiddenCategories.includes(cc.name_tr) && !result.find(r => r.tr === cc.name_tr)) {
          // Use category_images override if available, otherwise use custom_categories image_url
          const catImage = imageMap[cc.name_tr] || cc.image_url || '';
          // Also apply translation overrides
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

      res.json(result);
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  });
  app.get('/api/product/:id', async (req, res) => {
    try {
      const { translateProductName, translateCategory } = require('./translations');
      const reqId = req.params.id;

      let lp = null;
      if (reqId.startsWith('etkin_') || reqId.startsWith('xml_') || isNaN(Number(reqId))) {
        lp = db.prepare('SELECT * FROM local_products WHERE product_id = ?').get(reqId);
      } else {
        lp = db.prepare('SELECT * FROM local_products WHERE product_id = ? OR id = ?').get(reqId, Number(reqId));
      }
      
      if (!lp && reqId.startsWith('local_')) {
        const numericId = Number(reqId.replace('local_', '')) || 0;
        lp = db.prepare('SELECT * FROM local_products WHERE id = ?').get(numericId);
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
        const catOverride = db.prepare('SELECT * FROM product_category_overrides WHERE product_id = ?').get(product.id);
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
        try { exRate = await getExchangeRate(db); } catch(e) {}
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
  app.get('/api/settings/public', (req, res) => {
    const settings = db.prepare('SELECT * FROM settings').all();
    const settingsObj = {};
    settings.forEach(s => { settingsObj[s.key] = s.value; });
    // Only expose public settings
    const publicKeys = ['site_name_ar', 'site_name_en', 'site_name_tr', 'site_slogan_ar', 'site_slogan_en', 'site_slogan_tr', 
      'phone', 'phone2', 'whatsapp', 'email', 'address_ar', 'address_en', 'address_tr', 'currency',
      'social_facebook', 'social_instagram', 'social_twitter', 'social_linkedin', 'chatbot_enabled',
      'chatbot_welcome_ar', 'chatbot_welcome_en', 'chatbot_welcome_tr', 'logo_type', 'logo_text', 'logo_url'];
    const publicSettings = {};
    publicKeys.forEach(k => { if (settingsObj[k] !== undefined) publicSettings[k] = settingsObj[k]; });
    res.json(publicSettings);
  });

  // Blog posts (public)
  app.get('/api/posts', (req, res) => {
    const posts = db.prepare('SELECT * FROM posts WHERE published = 1 ORDER BY created_at DESC').all();
    res.json(posts);
  });

  // Public banners
  app.get('/api/banners', (req, res) => {
    const banners = db.prepare('SELECT * FROM banners WHERE active = 1 ORDER BY sort_order ASC, id DESC').all();
    res.json(banners);
  });

  // Public currencies
  
  // Public exchange rate endpoint
  app.get('/api/exchange-rate', async (req, res) => {
    try {
      const rate = await getExchangeRate(db);
      res.json(rate);
    } catch(e) {
      res.status(500).json({ error: 'Failed to get exchange rate' });
    }
  });

  app.get('/api/currencies', (req, res) => {
    const currencies = db.prepare('SELECT * FROM currencies WHERE active = 1 ORDER BY id ASC').all();
    res.json(currencies);
  });


  // Admin panel - serve admin.html
  app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'admin.html'));
  });

  // SPA fallback - serve React index.html for all other routes (client-side routing)
  app.get('*', (req, res) => {
    // Don't serve index.html for API routes or static files with extensions
    if (req.path.startsWith('/api/') || req.path.includes('.')) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  });

  app.listen(PORT, () => {
    console.log(`Zakaria Prom server running on port ${PORT}`);
  });
}

// Start the server
startServer().catch(err => {
  console.error('Failed to start DB or background tasks during server init:', err);
  app.listen(PORT, () => {
    console.log(`Zakaria Prom fallback server running on port ${PORT}`);
  });
});
