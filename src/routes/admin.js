const path = require("path");
const fs = require("fs");
const express = require('express');
const database = require('../database');
const { adminAuth, adminLogin } = require('../auth');
const { fetchAndParseProducts, getCategories } = require('../dataService');
function getDb() { return database.db; }

const router = express.Router();

// Admin Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'اسم المستخدم وكلمة المرور مطلوبان' });
    }
    const result = adminLogin(username, password);
    if (!result) {
      return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }
    res.cookie('admin_token', result.token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json(result);
  } catch (err) {
    console.error('[POST /api/admin/login error]:', err.message);
    res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
  }
});

// Admin Logout
router.post('/logout', (req, res) => {
  res.clearCookie('admin_token');
  res.json({ success: true });
});

// Check auth status
router.get('/me', adminAuth, (req, res) => {
  res.json({ admin: req.admin });
});

// Check database status and statistics
router.get('/db-status', adminAuth, (req, res) => {
  try {
    const db = getDb();
    const dbPath = database.getDbPath ? database.getDbPath() : 'unknown';
    let fileStats = {};
    if (dbPath && path.isAbsolute(dbPath) && fs.existsSync(dbPath)) {
      const stats = fs.statSync(dbPath);
      fileStats = { sizeBytes: stats.size, modifiedAt: stats.mtime };
    }
    const adminRow = db.prepare('SELECT COUNT(*) as count FROM admins').get();
    const userRow = db.prepare('SELECT COUNT(*) as count FROM users').get();
    const orderRow = db.prepare('SELECT COUNT(*) as count FROM orders').get();
    const adminCount = adminRow ? adminRow.count : 0;
    const userCount = userRow ? userRow.count : 0;
    const orderCount = orderRow ? orderRow.count : 0;
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);

    res.json({
      success: true,
      activeDatabasePath: dbPath,
      fileStats,
      recordCounts: { admins: adminCount, users: userCount, orders: orderCount },
      tables
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Inspect all existing databases and backups across Hostinger server paths
router.get('/inspect-server-databases', adminAuth, async (req, res) => {
  try {
    const initSqlJs = require('sql.js');
    let SQL = null;
    try { SQL = await initSqlJs(); } catch(e) {}

    const results = [];
    const visited = new Set();

    function searchDir(dir, depth = 0) {
      if (depth > 6 || !fs.existsSync(dir)) return;
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const ent of entries) {
          const fullPath = path.join(dir, ent.name);
          if (ent.isDirectory()) {
            if (ent.name === 'node_modules' || ent.name === '.git' || ent.name === '.cache' || ent.name === '.npm') continue;
            searchDir(fullPath, depth + 1);
          } else if (ent.isFile() && (ent.name.endsWith('.db') || ent.name.endsWith('.sqlite') || ent.name.includes('zakariaprom.db'))) {
            if (visited.has(fullPath)) continue;
            visited.add(fullPath);
            try {
              const stat = fs.statSync(fullPath);
              if (stat.size > 1000) {
                const info = {
                  path: fullPath,
                  sizeBytes: stat.size,
                  modifiedAt: stat.mtime
                };
                if (SQL) {
                  try {
                    const buf = fs.readFileSync(fullPath);
                    const tempDb = new SQL.Database(buf);
                    const countSafe = (sql) => {
                      try {
                        const r = tempDb.exec(sql);
                        if (r.length > 0 && r[0].values.length > 0) return r[0].values[0][0];
                      } catch(e) {}
                      return 0;
                    };
                    info.localProductsTotal = countSafe("SELECT COUNT(*) FROM local_products");
                    info.localProductsEtkin = countSafe("SELECT COUNT(*) FROM local_products WHERE product_id LIKE 'etkin_%'");
                    info.localProductsXml = countSafe("SELECT COUNT(*) FROM local_products WHERE product_id NOT LIKE 'etkin_%'");
                    info.translationOverridesCount = countSafe("SELECT COUNT(*) FROM translation_overrides");
                    info.customCategoriesCount = countSafe("SELECT COUNT(*) FROM custom_categories");
                    info.bannersCount = countSafe("SELECT COUNT(*) FROM banners");
                    info.ordersCount = countSafe("SELECT COUNT(*) FROM orders");
                    info.usersCount = countSafe("SELECT COUNT(*) FROM users");
                    
                    try {
                      const tRes = tempDb.exec("SELECT type, original_key, lang, translation FROM translation_overrides LIMIT 10");
                      if (tRes.length > 0 && tRes[0].values) {
                        info.sampleOverrides = tRes[0].values;
                      }
                    } catch(e) {}

                    tempDb.close();
                  } catch(dbErr) {
                    info.error = dbErr.message;
                  }
                }
                results.push(info);
              }
            } catch(e) {}
          }
        }
      } catch(e) {}
    }

    const rootCandidates = [
      '/home/u424368414/domains/zakariaprom.com/nodejs',
      '/home/u424368414/domains/zakariaprom.com/hbuilds',
      '/home/u424368414/domains/zakariaprom.com/data',
      '/home/u424368414/domains/zakariaprom.com',
      '/home/u424368414/backups',
      '/home/u424368414',
      path.resolve(path.join(__dirname, '..', '..'))
    ];

    for (const r of rootCandidates) {
      if (fs.existsSync(r)) {
        searchDir(r, 0);
      }
    }

    const currentDbPath = database.getDbPath ? database.getDbPath() : 'unknown';

    res.json({
      success: true,
      currentActiveDbPath: currentDbPath,
      databasesFoundCount: results.length,
      databases: results.sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt))
    });
  } catch(err) {
    res.status(500).json({ success: false, error: err.message, stack: err.stack });
  }
});

// Restore/replace active database file from a chosen server database path
router.post('/restore-database', adminAuth, async (req, res) => {
  try {
    const { sourcePath } = req.body || {};
    if (!sourcePath || !fs.existsSync(sourcePath)) {
      return res.status(400).json({ error: 'Valid sourcePath required and file must exist on server' });
    }

    const activeDbPath = database.getDbPath ? database.getDbPath() : null;
    if (!activeDbPath) {
      return res.status(500).json({ error: 'Active DB path not resolved' });
    }

    // Ensure destination directory exists
    const targetDir = path.dirname(activeDbPath);
    if (!fs.existsSync(targetDir)) {
      try { fs.mkdirSync(targetDir, { recursive: true, mode: 0o777 }); } catch(e) {}
    }

    // Backup active DB if it exists
    if (fs.existsSync(activeDbPath)) {
      const backupPath = activeDbPath + '.bak_' + Date.now();
      try { fs.copyFileSync(activeDbPath, backupPath); } catch(e) {}
    }

    // Copy source to active DB
    fs.copyFileSync(sourcePath, activeDbPath);
    try { fs.chmodSync(activeDbPath, 0o666); } catch(e) {}

    // Reload active database instance
    const reloaded = database.reloadDatabaseFromDisk ? database.reloadDatabaseFromDisk() : false;

    res.json({
      success: true,
      message: 'Database restored successfully',
      activeDbPath,
      sourcePath,
      reloaded
    });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Merge user amendments (translation overrides, categories, banners, settings) from any database into active DB
router.post('/merge-amendments', adminAuth, async (req, res) => {
  try {
    const { sourcePath } = req.body || {};
    if (!sourcePath || !fs.existsSync(sourcePath)) {
      return res.status(400).json({ error: 'Valid sourcePath required and file must exist on server' });
    }

    const initSqlJs = require('sql.js');
    const SQL = await initSqlJs();
    const sourceBuf = fs.readFileSync(sourcePath);
    const sourceDb = new SQL.Database(sourceBuf);
    const targetDb = database.db;

    const stats = { translationsMerged: 0, categoriesMerged: 0, bannersMerged: 0 };

    // 1. Merge translation_overrides
    try {
      const trans = sourceDb.exec("SELECT type, original_key, lang, translation FROM translation_overrides");
      if (trans.length > 0 && trans[0].values) {
        const stmt = targetDb.prepare(`
          INSERT INTO translation_overrides (type, original_key, lang, translation, updated_at)
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(type, original_key, lang) DO UPDATE SET translation = ?, updated_at = CURRENT_TIMESTAMP
        `);
        for (const row of trans[0].values) {
          try {
            stmt.run(row[0], row[1], row[2], row[3], row[3]);
            stats.translationsMerged++;
          } catch(e) {}
        }
      }
    } catch(e) {}

    // 2. Merge custom_categories
    try {
      const cats = sourceDb.exec("SELECT name_ar, name_en, name_tr, image_url, sort_order, active FROM custom_categories");
      if (cats.length > 0 && cats[0].values) {
        const stmt = targetDb.prepare(`
          INSERT INTO custom_categories (name_ar, name_en, name_tr, image_url, sort_order, active)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(name_tr) DO UPDATE SET name_ar = ?, name_en = ?, image_url = ?, sort_order = ?, active = ?
        `);
        for (const r of cats[0].values) {
          try {
            stmt.run(r[0], r[1], r[2], r[3], r[4], r[5], r[0], r[1], r[3], r[4], r[5]);
            stats.categoriesMerged++;
          } catch(e) {}
        }
      }
    } catch(e) {}

    // 3. Merge banners
    try {
      const banners = sourceDb.exec("SELECT title_ar, title_en, title_tr, subtitle_ar, subtitle_en, subtitle_tr, image_url, link_url, button_text_ar, button_text_en, button_text_tr, sort_order, active FROM banners");
      if (banners.length > 0 && banners[0].values) {
        const stmt = targetDb.prepare(`
          INSERT INTO banners (title_ar, title_en, title_tr, subtitle_ar, subtitle_en, subtitle_tr, image_url, link_url, button_text_ar, button_text_en, button_text_tr, sort_order, active)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const r of banners[0].values) {
          try {
            stmt.run(r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8], r[9], r[10], r[11], r[12]);
            stats.bannersMerged++;
          } catch(e) {}
        }
      }
    } catch(e) {}

    database.saveDatabase();
    sourceDb.close();

    res.json({ success: true, message: 'Amendments merged successfully', stats });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});


// ===== DASHBOARD =====
router.get('/dashboard', adminAuth, async (req, res) => {
  try {
    const db = getDb();
    const totalProductsRow = db.prepare('SELECT COUNT(*) as count FROM products').get();
    const totalCategoriesRow = db.prepare('SELECT COUNT(DISTINCT category) as count FROM products').get();
    const totalProducts = totalProductsRow ? totalProductsRow.count : 0;
    const totalCategories = totalCategoriesRow ? totalCategoriesRow.count : 0;
    const totalOrdersRow = db.prepare('SELECT COUNT(*) as count FROM orders').get();
    const newOrdersRow = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'new'").get();
    const totalUsersRow = db.prepare('SELECT COUNT(*) as count FROM users').get();
    const totalVisitsRow = db.prepare('SELECT COUNT(*) as count FROM analytics WHERE created_at > datetime("now", "-30 days")').get();
    const recentOrders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 10').all() || [];
    const topProducts = db.prepare('SELECT product_id, COUNT(*) as views FROM analytics WHERE product_id IS NOT NULL AND action = "view" GROUP BY product_id ORDER BY views DESC LIMIT 10').all() || [];

    res.json({
      stats: {
        totalProducts,
        totalCategories,
        totalOrders: totalOrdersRow ? totalOrdersRow.count : 0,
        newOrders: newOrdersRow ? newOrdersRow.count : 0,
        totalUsers: totalUsersRow ? totalUsersRow.count : 0,
        totalVisits: totalVisitsRow ? totalVisitsRow.count : 0
      },
      recentOrders,
      topProducts
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== TRANSLATIONS =====
router.get('/translations', adminAuth, async (req, res) => {
  const db = getDb();
  try {
    const overrides = db.prepare('SELECT * FROM translation_overrides ORDER BY type, original_key').all() || [];
    
    // Build override map
    const overrideMap = {};
    overrides.forEach(o => {
      if (!overrideMap[o.type]) overrideMap[o.type] = {};
      if (!overrideMap[o.type][o.original_key]) overrideMap[o.type][o.original_key] = {};
      overrideMap[o.type][o.original_key][o.lang] = o.translation;
    });

    // Get categories directly from database
    const catRows = db.prepare('SELECT DISTINCT category, category_ar, category_en FROM products WHERE category IS NOT NULL AND category != ""').all() || [];
    
    const categories = catRows.map(cat => ({
      tr: cat.category,
      ar: (overrideMap.category && overrideMap.category[cat.category] && overrideMap.category[cat.category].ar) || cat.category_ar || cat.category,
      en: (overrideMap.category && overrideMap.category[cat.category] && overrideMap.category[cat.category].en) || cat.category_en || cat.category
    }));

    // Get term overrides
    const terms = [];
    if (overrideMap.term) {
      Object.keys(overrideMap.term).forEach(key => {
        terms.push({
          tr: key,
          ar: overrideMap.term[key].ar || '',
          en: overrideMap.term[key].en || ''
        });
      });
    }

    res.json({ categories, terms });
  } catch (error) {
    res.json({ categories: [], terms: [] });
  }
});

router.post('/translations', adminAuth, (req, res) => {
  const db = getDb();
  const { type, original_key, lang, translation } = req.body;
  if (!type || !original_key || !lang || !translation) {
    return res.status(400).json({ error: 'All fields required' });
  }
  db.prepare(`
    INSERT INTO translation_overrides (type, original_key, lang, translation, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(type, original_key, lang) DO UPDATE SET translation = ?, updated_at = CURRENT_TIMESTAMP
  `).run(type, original_key, lang, translation, translation);
  res.json({ success: true });
});

// PUT /translations - update translation (used by admin panel editTranslation)
router.put('/translations', adminAuth, (req, res) => {
  const db = getDb();
  const { type, key, ar, en } = req.body;
  if (!type || !key) {
    return res.status(400).json({ error: 'Type and key required' });
  }
  // Save Arabic translation
  if (ar) {
    db.prepare(`
      INSERT INTO translation_overrides (type, original_key, lang, translation, updated_at)
      VALUES (?, ?, 'ar', ?, CURRENT_TIMESTAMP)
      ON CONFLICT(type, original_key, lang) DO UPDATE SET translation = ?, updated_at = CURRENT_TIMESTAMP
    `).run(type, key, ar, ar);
  }
  // Save English translation
  if (en) {
    db.prepare(`
      INSERT INTO translation_overrides (type, original_key, lang, translation, updated_at)
      VALUES (?, ?, 'en', ?, CURRENT_TIMESTAMP)
      ON CONFLICT(type, original_key, lang) DO UPDATE SET translation = ?, updated_at = CURRENT_TIMESTAMP
    `).run(type, key, en, en);
  }

  // Update underlying tables so main site updates immediately
  if (type === 'product') {
    try {
      db.prepare(`
        UPDATE local_products 
        SET name_ar = CASE WHEN ? <> '' THEN ? ELSE name_ar END,
            name_en = CASE WHEN ? <> '' THEN ? ELSE name_en END,
            updated_at = CURRENT_TIMESTAMP
        WHERE product_id = ? OR model = ? OR name_tr = ?
      `).run(ar || '', ar || '', en || '', en || '', key, key, key);
    } catch(e) {}
  } else if (type === 'category') {
    try {
      db.prepare(`
        UPDATE custom_categories 
        SET name_ar = CASE WHEN ? <> '' THEN ? ELSE name_ar END,
            name_en = CASE WHEN ? <> '' THEN ? ELSE name_en END
        WHERE name_tr = ?
      `).run(ar || '', ar || '', en || '', en || '', key);

      db.prepare(`
        UPDATE local_products 
        SET category_ar = CASE WHEN ? <> '' THEN ? ELSE category_ar END,
            category_en = CASE WHEN ? <> '' THEN ? ELSE category_en END
        WHERE category_tr = ? OR category_tr LIKE ?
      `).run(ar || '', ar || '', en || '', en || '', key, key + ' > %');
    } catch(e) {}
  }

  res.json({ success: true });
});

// GET /translations/products - paginated product translations with search
router.get('/translations/products', adminAuth, async (req, res) => {
  try {
    const db = getDb();
    const { page = 1, limit = 20, search = '' } = req.query;
    
    // Read all products from local_products database table
    let products = db.prepare('SELECT product_id as id, model, name_tr, name_ar, name_en FROM local_products WHERE hidden = 0').all();
    if (products.length === 0) {
      products = await fetchAndParseProducts();
    }
    
    // Apply search filter
    if (search) {
      const q = search.toLowerCase();
      products = products.filter(p => 
        (p.name_tr || (p.name && p.name.tr) || '').toLowerCase().includes(q) ||
        (p.name_ar || (p.name && p.name.ar) || '').toLowerCase().includes(q) ||
        (p.name_en || (p.name && p.name.en) || '').toLowerCase().includes(q) ||
        (p.model || '').toLowerCase().includes(q) ||
        (p.id || '').toLowerCase().includes(q)
      );
    }
    
    const total = products.length;
    const totalPages = Math.ceil(total / parseInt(limit));
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const paginated = products.slice(offset, offset + parseInt(limit));
    
    // Get product name overrides
    const overrides = db.prepare("SELECT * FROM translation_overrides WHERE type = 'product'").all();
    const overrideMap = {};
    overrides.forEach(o => {
      if (!overrideMap[o.original_key]) overrideMap[o.original_key] = {};
      overrideMap[o.original_key][o.lang] = o.translation;
    });
    
    const result = paginated.map(p => {
      const pId = p.id || p.product_id;
      const pModel = p.model || pId;
      const pTr = p.name_tr || (p.name && p.name.tr) || '';
      const pAr = p.name_ar || (p.name && p.name.ar) || '';
      const pEn = p.name_en || (p.name && p.name.en) || '';
      const ov = overrideMap[pId] || overrideMap[pModel] || overrideMap[pTr] || {};
      return {
        id: pId,
        model: pModel,
        tr: pTr,
        ar: ov.ar || pAr || pTr,
        en: ov.en || pEn || pTr
      };
    });
    
    res.json({ products: result, total, totalPages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /translations/:type/:key - get current translation for a specific item
router.get('/translations/:type/:key', adminAuth, (req, res) => {
  const db = getDb();
  const { type, key } = req.params;
  const decodedKey = decodeURIComponent(key);
  const overrides = db.prepare('SELECT lang, translation FROM translation_overrides WHERE type = ? AND original_key = ?').all(type, decodedKey);
  const result = { tr: decodedKey, ar: '', en: '' };
  overrides.forEach(o => { result[o.lang] = o.translation; });
  res.json(result);
});

router.delete('/translations/:id', adminAuth, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM translation_overrides WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ===== PRODUCTS MANAGEMENT =====
router.get('/products/hidden', adminAuth, (req, res) => {
  const db = getDb();
  const hidden = db.prepare('SELECT * FROM hidden_products').all();
  res.json(hidden);
});

router.post('/products/hide', adminAuth, (req, res) => {
  const db = getDb();
  const { product_id } = req.body;
  db.prepare('INSERT OR IGNORE INTO hidden_products (product_id) VALUES (?)').run(product_id);
  res.json({ success: true });
});

router.post('/products/show', adminAuth, (req, res) => {
  const db = getDb();
  const { product_id } = req.body;
  db.prepare('DELETE FROM hidden_products WHERE product_id = ?').run(product_id);
  res.json({ success: true });
});

// ===== PRODUCTS LIST (Admin) =====
router.get('/products', adminAuth, async (req, res) => {
  try {
    const db = getDb();
    const { search, category, source = 'all', page = 1, limit = 20 } = req.query;

    let dbRows = db.prepare('SELECT * FROM local_products').all();
    let products = dbRows.map(lp => {
      let images = [];
      try { images = JSON.parse(lp.images || '[]'); } catch(e) { if (lp.images) images = [lp.images]; }
      let colors = [];
      try { colors = JSON.parse(lp.colors || '[]'); } catch(e) { if (lp.colors) colors = [lp.colors]; }
      let sizes = [];
      try { sizes = JSON.parse(lp.sizes || '[]'); } catch(e) { if (lp.sizes) sizes = [lp.sizes]; }

      const pId = lp.product_id || ('local_' + lp.id);
      const isEtkin = pId.startsWith('etkin_');
      const isLocal = lp.is_local === 1 || pId.startsWith('local_');

      return {
        id: pId,
        product_id: pId,
        name: { tr: lp.name_tr || '', ar: lp.name_ar || lp.name_tr || '', en: lp.name_en || lp.name_tr || '' },
        model: lp.model || '',
        description: lp.description || '',
        price: lp.price || 0,
        quantity: lp.quantity || 0,
        categories: { tr: [lp.category_tr || ''], ar: [lp.category_ar || ''], en: [lp.category_en || ''] },
        topCategory: {
          tr: (lp.category_tr || '').split(' > ')[0].trim(),
          ar: (lp.category_ar || '').split(' > ')[0].trim(),
          en: (lp.category_en || '').split(' > ')[0].trim()
        },
        images,
        colors,
        sizes,
        isEtkin,
        isLocal,
        source: isEtkin ? 'etkin' : (isLocal ? 'local' : 'xml')
      };
    });

    // Fallback if local_products table is empty
    if (products.length === 0) {
      const xml = await fetchAndParseProducts();
      products = xml.map(p => ({ ...p, source: 'xml' }));
    }

    // Source filter
    if (source && source !== 'all') {
      products = products.filter(p => p.source === source);
    }

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      products = products.filter(p => 
        ((p.name && p.name.tr) || '').toLowerCase().includes(q) ||
        ((p.name && p.name.ar) || '').toLowerCase().includes(q) ||
        ((p.name && p.name.en) || '').toLowerCase().includes(q) ||
        (p.model || '').toLowerCase().includes(q) ||
        (p.id || '').toLowerCase().includes(q)
      );
    }

    // Category filter
    if (category) {
      const catLower = category.toLowerCase().trim();
      products = products.filter(p => 
        ((p.topCategory && p.topCategory.tr) || "").toLowerCase().includes(catLower) ||
        ((p.categories && Array.isArray(p.categories.tr)) ? p.categories.tr : []).some(c => c.toLowerCase().includes(catLower))
      );
    }

    // Add hidden status
    const hiddenIds = db.prepare('SELECT product_id FROM hidden_products').all().map(r => r.product_id);
    products = products.map(p => ({ ...p, hidden: hiddenIds.includes(p.id) || hiddenIds.includes(p.model) }));

    const total = products.length;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const paginatedProducts = products.slice(offset, offset + parseInt(limit));
    res.json({ products: paginatedProducts, total, totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /products/:id - get single product details
router.get('/products/:id', adminAuth, async (req, res) => {
  try {
    const db = getDb();
    const pId = req.params.id;
    const row = db.prepare('SELECT * FROM local_products WHERE product_id = ? OR model = ? OR id = ?').get(pId, pId, pId);
    let product = null;

    if (row) {
      let images = [];
      try { images = JSON.parse(row.images || '[]'); } catch(e) { if (row.images) images = [row.images]; }
      let colors = [];
      try { colors = JSON.parse(row.colors || '[]'); } catch(e) { if (row.colors) colors = [row.colors]; }
      let sizes = [];
      try { sizes = JSON.parse(row.sizes || '[]'); } catch(e) { if (row.sizes) sizes = [row.sizes]; }

      product = {
        id: row.product_id || ('local_' + row.id),
        product_id: row.product_id,
        name: { tr: row.name_tr || '', ar: row.name_ar || '', en: row.name_en || '' },
        model: row.model || '',
        description: row.description || '',
        price: row.price || 0,
        quantity: row.quantity || 0,
        category_tr: row.category_tr || '',
        categories: { tr: [row.category_tr || ''], ar: [row.category_ar || ''], en: [row.category_en || ''] },
        images,
        colors,
        sizes
      };
    } else {
      const products = await fetchAndParseProducts();
      product = products.find(p => p.id === pId || p.model === pId);
    }

    if (!product) return res.status(404).json({ error: 'Product not found' });
    
    // Check for name overrides
    const overrides = db.prepare("SELECT lang, translation FROM translation_overrides WHERE type = 'product' AND original_key IN (?, ?, ?)").all(product.id, product.model, (product.name && product.name.tr) || '');
    if (overrides.length > 0) {
      overrides.forEach(o => { product.name[o.lang] = o.translation; });
    }
    
    res.json({ product });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /products/:id - update product name translations and details
router.put('/products/:id', adminAuth, async (req, res) => {
  try {
    const db = getDb();
    const pId = req.params.id;
    const { name_tr, name_ar, name_en, price, description } = req.body;

    const row = db.prepare('SELECT * FROM local_products WHERE product_id = ? OR model = ? OR id = ?').get(pId, pId, pId);
    const targetId = row ? row.product_id : pId;
    const model = row ? row.model : pId;

    // Direct DB update in local_products table
    db.prepare(`
      UPDATE local_products
      SET name_tr = COALESCE(NULLIF(?, ''), name_tr),
          name_ar = COALESCE(NULLIF(?, ''), name_ar),
          name_en = COALESCE(NULLIF(?, ''), name_en),
          price = CASE WHEN ? > 0 THEN ? ELSE price END,
          description = COALESCE(NULLIF(?, ''), description),
          updated_at = CURRENT_TIMESTAMP
      WHERE product_id = ? OR model = ?
    `).run(name_tr || '', name_ar || '', name_en || '', parseFloat(price) || 0, parseFloat(price) || 0, description || '', targetId, model);

    // Save Arabic override
    if (name_ar) {
      db.prepare(`
        INSERT INTO translation_overrides (type, original_key, lang, translation, updated_at)
        VALUES ('product', ?, 'ar', ?, CURRENT_TIMESTAMP)
        ON CONFLICT(type, original_key, lang) DO UPDATE SET translation = ?, updated_at = CURRENT_TIMESTAMP
      `).run(targetId, name_ar, name_ar);
      if (model) {
        db.prepare(`
          INSERT INTO translation_overrides (type, original_key, lang, translation, updated_at)
          VALUES ('product', ?, 'ar', ?, CURRENT_TIMESTAMP)
          ON CONFLICT(type, original_key, lang) DO UPDATE SET translation = ?, updated_at = CURRENT_TIMESTAMP
        `).run(model, name_ar, name_ar);
      }
    }
    // Save English override
    if (name_en) {
      db.prepare(`
        INSERT INTO translation_overrides (type, original_key, lang, translation, updated_at)
        VALUES ('product', ?, 'en', ?, CURRENT_TIMESTAMP)
        ON CONFLICT(type, original_key, lang) DO UPDATE SET translation = ?, updated_at = CURRENT_TIMESTAMP
      `).run(targetId, name_en, name_en);
      if (model) {
        db.prepare(`
          INSERT INTO translation_overrides (type, original_key, lang, translation, updated_at)
          VALUES ('product', ?, 'en', ?, CURRENT_TIMESTAMP)
          ON CONFLICT(type, original_key, lang) DO UPDATE SET translation = ?, updated_at = CURRENT_TIMESTAMP
        `).run(model, name_en, name_en);
      }
    }
    // Save Turkish override
    if (name_tr) {
      db.prepare(`
        INSERT INTO translation_overrides (type, original_key, lang, translation, updated_at)
        VALUES ('product', ?, 'tr', ?, CURRENT_TIMESTAMP)
        ON CONFLICT(type, original_key, lang) DO UPDATE SET translation = ?, updated_at = CURRENT_TIMESTAMP
      `).run(targetId, name_tr, name_tr);
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /products/:id/visibility - toggle product visibility
router.put('/products/:id/visibility', adminAuth, async (req, res) => {
  try {
    const db = getDb();
    const { hidden } = req.body;
    const productId = String(req.params.id);
    const rawId = productId.replace(/^(etkin_|xml_|local_)/, '');

    if (hidden) {
      db.prepare('INSERT OR IGNORE INTO hidden_products (product_id) VALUES (?)').run(productId);
      db.prepare('INSERT OR IGNORE INTO hidden_products (product_id) VALUES (?)').run(rawId);
      db.prepare('INSERT OR IGNORE INTO hidden_products (product_id) VALUES (?)').run('etkin_' + rawId);
      db.prepare('INSERT OR IGNORE INTO hidden_products (product_id) VALUES (?)').run('xml_' + rawId);
      db.prepare('UPDATE local_products SET hidden = 1 WHERE product_id = ? OR id = ? OR product_id = ?').run(productId, Number(rawId) || 0, rawId);
    } else {
      db.prepare('DELETE FROM hidden_products WHERE product_id = ? OR product_id = ? OR product_id = ? OR product_id = ?').run(productId, rawId, 'etkin_' + rawId, 'xml_' + rawId);
      db.prepare('UPDATE local_products SET hidden = 0 WHERE product_id = ? OR id = ? OR product_id = ?').run(productId, Number(rawId) || 0, rawId);
    }
    database.saveDatabase();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== CATEGORIES MANAGEMENT =====
router.get('/categories', adminAuth, async (req, res) => {
  try {
    const db = getDb();
    
    // Read all products from local_products database table
    const { fixMojikake, translateCategory } = require('../translations');
    let dbRows = db.prepare('SELECT * FROM local_products WHERE hidden = 0').all();
    let products = dbRows.map(lp => {
      const cTr = fixMojikake(lp.category_tr || '');
      const cAr = fixMojikake(lp.category_ar || '');
      const cEn = fixMojikake(lp.category_en || '');
      return {
        id: lp.product_id,
        model: lp.model,
        category: { tr: cTr, ar: cAr, en: cEn },
        categories: { tr: [cTr], ar: [cAr], en: [cEn] }
      };
    });
    if (products.length === 0) {
      products = await fetchAndParseProducts();
    }

    const categories = getCategories(products);
    const hiddenCats = db.prepare('SELECT category_name FROM hidden_categories').all().map(h => fixMojikake(h.category_name));
    const overrides = db.prepare("SELECT * FROM translation_overrides WHERE type = 'category'").all();
    const overrideMap = {};
    overrides.forEach(o => {
      const k = fixMojikake(o.original_key);
      const v = fixMojikake(o.translation);
      if (!overrideMap[k]) overrideMap[k] = {};
      overrideMap[k][o.lang] = v;
    });

    const images = db.prepare('SELECT * FROM category_images').all();
    const imageMap = {};
    images.forEach(i => { if (i && i.category_name) imageMap[fixMojikake(i.category_name)] = i.image_url; });

    const seenCategoryKeys = new Set();
    const result = [];

    categories.forEach(cat => {
      if (!cat || !cat.tr) return;
      const cleanTr = fixMojikake(cat.tr);
      const cleanAr = fixMojikake(cat.ar);
      const cleanEn = fixMojikake(cat.en);
      if (seenCategoryKeys.has(cleanTr)) return;
      seenCategoryKeys.add(cleanTr);

      const ov = overrideMap[cleanTr] || {};
      const arVal = ov.ar || (cleanAr && cleanAr !== cleanTr ? cleanAr : translateCategory(cleanTr, 'ar'));
      const enVal = ov.en || (cleanEn && cleanEn !== cleanTr ? cleanEn : translateCategory(cleanTr, 'en'));

      result.push({
        ...cat,
        tr: cleanTr,
        ar: arVal,
        en: enVal,
        hidden: hiddenCats.includes(cleanTr),
        image: imageMap[cleanTr] || ''
      });
    });

    // Add custom categories only if not already added
    const customCats = db.prepare("SELECT * FROM custom_categories").all();
    customCats.forEach(cc => {
      if (!cc || !cc.name_tr) return;
      const cleanTr = fixMojikake(cc.name_tr);
      if (seenCategoryKeys.has(cleanTr)) return;
      seenCategoryKeys.add(cleanTr);
      const ov = overrideMap[cleanTr] || {};
      result.push({
        tr: cleanTr,
        ar: ov.ar || fixMojikake(cc.name_ar) || translateCategory(cleanTr, 'ar'),
        en: ov.en || fixMojikake(cc.name_en) || translateCategory(cleanTr, 'en'),
        count: 0,
        hidden: hiddenCats.includes(cleanTr) || cc.active === 0,
        image: imageMap[cleanTr] || cc.image_url || "",
        isCustom: true
      });
    });

    res.json({ categories: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/categories/:name', adminAuth, async (req, res) => {
  try {
    const db = getDb();
    const catName = decodeURIComponent(req.params.name);
    let dbRows = db.prepare('SELECT * FROM local_products WHERE hidden = 0').all();
    let products = dbRows.map(lp => ({
      id: lp.product_id,
      model: lp.model,
      categories: { tr: [lp.category_tr || ''], ar: [lp.category_ar || ''], en: [lp.category_en || ''] }
    }));
    if (products.length === 0) products = await fetchAndParseProducts();

    const categories = getCategories(products);
    let cat = categories.find(c => c.tr === catName);
    const customCat = db.prepare("SELECT * FROM custom_categories WHERE name_tr = ?").get(catName);
    if (!cat && !customCat) return res.status(404).json({ error: 'Category not found' });
    if (!cat && customCat) {
      cat = { tr: customCat.name_tr, ar: customCat.name_ar, en: customCat.name_en, count: 0, isCustom: true };
    }
    const hiddenCats = db.prepare('SELECT category_name FROM hidden_categories').all().map(h => h.category_name);
    const overrides = db.prepare("SELECT * FROM translation_overrides WHERE type = 'category' AND original_key = ?").all(catName);
    const overrideObj = {};
    overrides.forEach(o => { overrideObj[o.lang] = o.translation; });
    const imageRow = db.prepare('SELECT image_url FROM category_images WHERE category_name = ?').get(catName);
    const image = (imageRow && imageRow.image_url) || (customCat ? customCat.image_url : '') || '';
    const isHidden = hiddenCats.includes(catName) || (customCat && customCat.active === 0);
    res.json({ category: { ...cat, ...overrideObj, hidden: isHidden, image: image, isCustom: !!customCat } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/categories', adminAuth, (req, res) => {
  const db = getDb();
  const { category_tr, ar, en, hidden, image } = req.body;
  if (!category_tr) return res.status(400).json({ error: 'category_tr required' });

  const { normalizeCategoryName } = require('../translations');
  const normCat = normalizeCategoryName(category_tr);

  // Update custom_categories table if present
  const customCat = db.prepare("SELECT * FROM custom_categories WHERE name_tr = ? OR name_tr = ?").get(category_tr, normCat);
  if (customCat) {
    if (ar || en || image !== undefined || hidden !== undefined) {
      const updates = [];
      const params = [];
      if (ar) { updates.push('name_ar = ?'); params.push(ar); }
      if (en) { updates.push('name_en = ?'); params.push(en); }
      if (image !== undefined) { updates.push('image_url = ?'); params.push(image || ''); }
      if (hidden !== undefined) { updates.push('active = ?'); params.push(hidden ? 0 : 1); }
      if (updates.length > 0) {
        params.push(customCat.id);
        db.prepare('UPDATE custom_categories SET ' + updates.join(', ') + ' WHERE id = ?').run(...params);
      }
    }
  }

  // Update local_products category translations
  if (ar || en) {
    try {
      db.prepare(`
        UPDATE local_products 
        SET category_ar = CASE WHEN ? <> '' THEN ? ELSE category_ar END,
            category_en = CASE WHEN ? <> '' THEN ? ELSE category_en END
        WHERE category_tr = ? OR category_tr = ? OR category_tr LIKE ?
      `).run(ar || '', ar || '', en || '', en || '', category_tr, normCat, category_tr + ' > %');
    } catch(e) {}
  }

  // Save translation overrides
  if (ar) {
    db.prepare(`DELETE FROM translation_overrides WHERE type = 'category' AND original_key = ? AND lang = 'ar'`).run(category_tr);
    db.prepare(`INSERT INTO translation_overrides (type, original_key, lang, translation, updated_at) VALUES ('category', ?, 'ar', ?, CURRENT_TIMESTAMP)`).run(category_tr, ar);
    if (normCat !== category_tr) {
      db.prepare(`DELETE FROM translation_overrides WHERE type = 'category' AND original_key = ? AND lang = 'ar'`).run(normCat);
      db.prepare(`INSERT INTO translation_overrides (type, original_key, lang, translation, updated_at) VALUES ('category', ?, 'ar', ?, CURRENT_TIMESTAMP)`).run(normCat, ar);
    }
  }
  if (en) {
    db.prepare(`DELETE FROM translation_overrides WHERE type = 'category' AND original_key = ? AND lang = 'en'`).run(category_tr);
    db.prepare(`INSERT INTO translation_overrides (type, original_key, lang, translation, updated_at) VALUES ('category', ?, 'en', ?, CURRENT_TIMESTAMP)`).run(category_tr, en);
    if (normCat !== category_tr) {
      db.prepare(`DELETE FROM translation_overrides WHERE type = 'category' AND original_key = ? AND lang = 'en'`).run(normCat);
      db.prepare(`INSERT INTO translation_overrides (type, original_key, lang, translation, updated_at) VALUES ('category', ?, 'en', ?, CURRENT_TIMESTAMP)`).run(normCat, en);
    }
  }

  // Handle hidden state
  if (hidden !== undefined) {
    if (hidden) {
      db.prepare('INSERT OR IGNORE INTO hidden_categories (category_name) VALUES (?)').run(category_tr);
      if (normCat !== category_tr) {
        db.prepare('INSERT OR IGNORE INTO hidden_categories (category_name) VALUES (?)').run(normCat);
      }
    } else {
      db.prepare('DELETE FROM hidden_categories WHERE category_name = ? OR category_name = ?').run(category_tr, normCat);
    }
  }

  // Handle image
  if (image !== undefined) {
    if (image) {
      db.prepare('INSERT OR REPLACE INTO category_images (category_name, image_url, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)').run(category_tr, image);
      if (normCat !== category_tr) {
        db.prepare('INSERT OR REPLACE INTO category_images (category_name, image_url, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)').run(normCat, image);
      }
    } else {
      db.prepare('DELETE FROM category_images WHERE category_name = ? OR category_name = ?').run(category_tr, normCat);
    }
  }

  database.saveDatabase();
  res.json({ success: true });
});

router.get('/categories/hidden', adminAuth, (req, res) => {
  const db = getDb();
  const hidden = db.prepare('SELECT * FROM hidden_categories').all();
  res.json(hidden);
});

router.post('/categories/hide', adminAuth, (req, res) => {
  const db = getDb();
  const { category_name } = req.body;
  const { normalizeCategoryName } = require('../translations');
  const normCat = normalizeCategoryName(category_name);

  db.prepare('INSERT OR IGNORE INTO hidden_categories (category_name) VALUES (?)').run(category_name);
  if (normCat !== category_name) {
    db.prepare('INSERT OR IGNORE INTO hidden_categories (category_name) VALUES (?)').run(normCat);
  }
  db.prepare('UPDATE custom_categories SET active = 0 WHERE name_tr = ? OR name_tr = ?').run(category_name, normCat);

  database.saveDatabase();
  res.json({ success: true });
});

router.post('/categories/show', adminAuth, (req, res) => {
  const db = getDb();
  const { category_name } = req.body;
  const { normalizeCategoryName } = require('../translations');
  const normCat = normalizeCategoryName(category_name);

  db.prepare('DELETE FROM hidden_categories WHERE category_name = ? OR category_name = ?').run(category_name, normCat);
  db.prepare('UPDATE custom_categories SET active = 1 WHERE name_tr = ? OR name_tr = ?').run(category_name, normCat);

  database.saveDatabase();
  res.json({ success: true });
});

// ===== CUSTOM CATEGORIES ENDPOINTS =====
router.get('/custom-categories', adminAuth, (req, res) => {
  try {
    const db = getDb();
    const categories = db.prepare('SELECT * FROM custom_categories ORDER BY sort_order ASC, id ASC').all();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/custom-categories', adminAuth, (req, res) => {
  try {
    const db = getDb();
    const { name_tr, name_ar, name_en, image_url, sort_order = 0 } = req.body;
    const cleanTr = (name_tr || name_ar || '').trim();
    const cleanAr = (name_ar || name_tr || '').trim();
    const cleanEn = (name_en || name_tr || '').trim();

    if (!cleanTr) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const stmt = db.prepare(`
      INSERT INTO custom_categories (name_tr, name_ar, name_en, image_url, sort_order, active, created_at)
      VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
    `);
    stmt.run(cleanTr, cleanAr, cleanEn, image_url || '', sort_order);

    if (cleanAr) {
      db.prepare(`DELETE FROM translation_overrides WHERE type = 'category' AND original_key = ? AND lang = 'ar'`).run(cleanTr);
      db.prepare(`INSERT INTO translation_overrides (type, original_key, lang, translation, updated_at) VALUES ('category', ?, 'ar', ?, CURRENT_TIMESTAMP)`).run(cleanTr, cleanAr);
    }
    if (cleanEn) {
      db.prepare(`DELETE FROM translation_overrides WHERE type = 'category' AND original_key = ? AND lang = 'en'`).run(cleanTr);
      db.prepare(`INSERT INTO translation_overrides (type, original_key, lang, translation, updated_at) VALUES ('category', ?, 'en', ?, CURRENT_TIMESTAMP)`).run(cleanTr, cleanEn);
    }
    if (image_url) {
      db.prepare('INSERT OR REPLACE INTO category_images (category_name, image_url, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)').run(cleanTr, image_url);
    }

    database.saveDatabase();
    res.json({ success: true, message: 'Category added successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/custom-categories/:id', adminAuth, (req, res) => {
  try {
    const db = getDb();
    const { name_tr, name_ar, name_en, image_url, active, sort_order } = req.body;
    const catId = req.params.id;
    const existing = db.prepare('SELECT * FROM custom_categories WHERE id = ?').get(catId);
    if (!existing) return res.status(404).json({ error: 'Category not found' });

    const updates = [];
    const params = [];
    if (name_tr !== undefined) { updates.push('name_tr = ?'); params.push(name_tr); }
    if (name_ar !== undefined) { updates.push('name_ar = ?'); params.push(name_ar); }
    if (name_en !== undefined) { updates.push('name_en = ?'); params.push(name_en); }
    if (image_url !== undefined) { updates.push('image_url = ?'); params.push(image_url); }
    if (active !== undefined) { updates.push('active = ?'); params.push(active ? 1 : 0); }
    if (sort_order !== undefined) { updates.push('sort_order = ?'); params.push(sort_order); }

    if (updates.length > 0) {
      params.push(catId);
      db.prepare('UPDATE custom_categories SET ' + updates.join(', ') + ' WHERE id = ?').run(...params);
    }

    const targetTr = name_tr || existing.name_tr;
    if (name_ar) {
      db.prepare(`DELETE FROM translation_overrides WHERE type = 'category' AND original_key = ? AND lang = 'ar'`).run(targetTr);
      db.prepare(`INSERT INTO translation_overrides (type, original_key, lang, translation, updated_at) VALUES ('category', ?, 'ar', ?, CURRENT_TIMESTAMP)`).run(targetTr, name_ar);
    }
    if (name_en) {
      db.prepare(`DELETE FROM translation_overrides WHERE type = 'category' AND original_key = ? AND lang = 'en'`).run(targetTr);
      db.prepare(`INSERT INTO translation_overrides (type, original_key, lang, translation, updated_at) VALUES ('category', ?, 'en', ?, CURRENT_TIMESTAMP)`).run(targetTr, name_en);
    }
    if (image_url !== undefined) {
      if (image_url) {
        db.prepare('INSERT OR REPLACE INTO category_images (category_name, image_url, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)').run(targetTr, image_url);
      } else {
        db.prepare('DELETE FROM category_images WHERE category_name = ?').run(targetTr);
      }
    }

    if (active !== undefined) {
      if (active === 0 || active === false) {
        db.prepare('INSERT OR IGNORE INTO hidden_categories (category_name) VALUES (?)').run(targetTr);
      } else {
        db.prepare('DELETE FROM hidden_categories WHERE category_name = ?').run(targetTr);
      }
    }

    database.saveDatabase();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/custom-categories/:id', adminAuth, (req, res) => {
  try {
    const db = getDb();
    const catId = req.params.id;
    const existing = db.prepare('SELECT * FROM custom_categories WHERE id = ?').get(catId);
    if (existing) {
      db.prepare('DELETE FROM custom_categories WHERE id = ?').run(catId);
      db.prepare('DELETE FROM category_images WHERE category_name = ?').run(existing.name_tr);
      db.prepare('DELETE FROM hidden_categories WHERE category_name = ?').run(existing.name_tr);
      db.prepare("DELETE FROM translation_overrides WHERE type = 'category' AND original_key = ?").run(existing.name_tr);
    }
    database.saveDatabase();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== ORDERS =====
router.get('/orders', adminAuth, (req, res) => {
  const db = getDb();
  const { status, page = 1, limit = 20 } = req.query;
  let query = 'SELECT * FROM orders';
  const params = [];
  if (status && status !== 'all') {
    query += ' WHERE status = ?';
    params.push(status);
  }
  const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count');
  const total = db.prepare(countQuery).get(...params).count;
  
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
  const orders = db.prepare(query).all(...params);
  
  res.json({ orders, total, totalPages: Math.ceil(total / limit) });
});

router.put('/orders/:id/status', adminAuth, (req, res) => {
  const db = getDb();
  const { status } = req.body;
  const validStatuses = ['new', 'processing', 'quoted', 'confirmed', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  db.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, req.params.id);
  res.json({ success: true });
});

router.delete('/orders/:id', adminAuth, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM orders WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ===== USERS =====
router.get('/users', adminAuth, (req, res) => {
  const db = getDb();
  const { page = 1, limit = 20, search } = req.query;
  let query = 'SELECT id, email, name, phone, company, country, language, created_at, last_login FROM users';
  const params = [];
  if (search) {
    query += ' WHERE name LIKE ? OR email LIKE ? OR company LIKE ?';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  const countQuery = query.replace('SELECT id, email, name, phone, company, country, language, created_at, last_login', 'SELECT COUNT(*) as count');
  const total = db.prepare(countQuery).get(...params).count;
  
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
  const users = db.prepare(query).all(...params);
  
  res.json({ users, total, totalPages: Math.ceil(total / limit) });
});

// ===== SETTINGS =====
router.get('/settings', adminAuth, (req, res) => {
  const db = getDb();
  const settings = db.prepare('SELECT * FROM settings').all();
  const settingsObj = {};
  settings.forEach(s => { settingsObj[s.key] = s.value; });
  res.json(settingsObj);
});

router.put('/settings', adminAuth, (req, res) => {
  const db = getDb();
  const updates = req.body;
  const transaction = db.transaction((items) => {
    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)');
    for (const [key, value] of Object.entries(items)) {
      stmt.run(key, value);
    }
  });
  transaction(updates);
  res.json({ success: true });
});

// Change admin password
router.put('/change-password', adminAuth, (req, res) => {
  const db = getDb();
  const bcrypt = require('bcryptjs');
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) return res.status(400).json({ error: 'Both passwords required' });
  const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(req.admin.id);
  if (!admin || !bcrypt.compareSync(current_password, admin.password)) {
    return res.status(400).json({ error: 'كلمة المرور الحالية غير صحيحة' });
  }
  const hashed = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE admins SET password = ? WHERE id = ?').run(hashed, req.admin.id);
  res.json({ success: true });
});

// ===== COUPONS =====
router.get('/coupons', adminAuth, (req, res) => {
  const db = getDb();
  const coupons = db.prepare('SELECT * FROM coupons ORDER BY created_at DESC').all();
  res.json(coupons);
});

router.post('/coupons', adminAuth, (req, res) => {
  const db = getDb();
  const { code, discount_type, discount_value, type, value, min_items, min_order, max_uses, expires_at } = req.body;
  const dType = discount_type || type || 'percentage';
  const dValue = discount_value || value;
  if (!code || !dValue) {
    return res.status(400).json({ error: 'Code and discount value required' });
  }
  const result = db.prepare(
    'INSERT INTO coupons (code, discount_type, discount_value, min_items, max_uses, expires_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(code.toUpperCase(), dType, dValue, min_items || min_order || 0, max_uses || 0, expires_at || null);
  res.json({ success: true, id: result.lastInsertRowid });
});

router.put('/coupons/:id', adminAuth, (req, res) => {
  const db = getDb();
  const { active } = req.body;
  db.prepare('UPDATE coupons SET active = ? WHERE id = ?').run(active ? 1 : 0, req.params.id);
  res.json({ success: true });
});

router.delete('/coupons/:id', adminAuth, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM coupons WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ===== BLOG/NEWS =====
router.get('/posts', adminAuth, (req, res) => {
  const db = getDb();
  const posts = db.prepare('SELECT * FROM posts ORDER BY created_at DESC').all();
  // Add title/content aliases for frontend compatibility
  const mapped = posts.map(p => ({...p, title: p.title_ar, content: p.content_ar}));
  res.json(mapped);
});

router.post('/posts', adminAuth, (req, res) => {
  const db = getDb();
  const { title, title_ar, title_en, title_tr, content, content_ar, content_en, content_tr, image, published } = req.body;
  const finalTitle = title_ar || title || '';
  const finalContent = content_ar || content || '';
  const result = db.prepare(
    'INSERT INTO posts (title_ar, title_en, title_tr, content_ar, content_en, content_tr, image, published) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(finalTitle, title_en || '', title_tr || '', finalContent, content_en || '', content_tr || '', image || '', published ? 1 : 0);
  res.json({ success: true, id: result.lastInsertRowid });
});

router.put('/posts/:id', adminAuth, (req, res) => {
  const db = getDb();
  const { title, title_ar, title_en, title_tr, content, content_ar, content_en, content_tr, image, published } = req.body;
  const finalTitle = title_ar || title || '';
  const finalContent = content_ar || content || '';
  db.prepare(
    'UPDATE posts SET title_ar=?, title_en=?, title_tr=?, content_ar=?, content_en=?, content_tr=?, image=?, published=?, updated_at=CURRENT_TIMESTAMP WHERE id=?'
  ).run(finalTitle, title_en || '', title_tr || '', finalContent, content_en || '', content_tr || '', image || '', published ? 1 : 0, req.params.id);
  res.json({ success: true });
});

router.delete('/posts/:id', adminAuth, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ===== CHATBOT FAQ =====
router.get('/chatbot', adminAuth, (req, res) => {
  const db = getDb();
  const faqs = db.prepare('SELECT * FROM chatbot_faq ORDER BY priority DESC').all();
  res.json(faqs);
});

router.post('/chatbot', adminAuth, (req, res) => {
  const db = getDb();
  const { question_ar, question_en, question_tr, answer_ar, answer_en, answer_tr, keywords, priority } = req.body;
  const qAr = question_ar || keywords || '';
  const result = db.prepare(
    'INSERT INTO chatbot_faq (question_ar, question_en, question_tr, answer_ar, answer_en, answer_tr, keywords, priority) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(qAr, question_en || '', question_tr || '', answer_ar || '', answer_en || '', answer_tr || '', keywords || '', priority || 0);
  res.json({ success: true, id: result.lastInsertRowid });
});

router.put('/chatbot/:id', adminAuth, (req, res) => {
  const db = getDb();
  const { question_ar, question_en, question_tr, answer_ar, answer_en, answer_tr, keywords, priority, active } = req.body;
  const qAr = question_ar || keywords || '';
  db.prepare(
    'UPDATE chatbot_faq SET question_ar=?, question_en=?, question_tr=?, answer_ar=?, answer_en=?, answer_tr=?, keywords=?, priority=?, active=? WHERE id=?'
  ).run(qAr, question_en || '', question_tr || '', answer_ar || '', answer_en || '', answer_tr || '', keywords || '', priority || 0, active !== undefined ? (active ? 1 : 0) : 1, req.params.id);
  res.json({ success: true });
});

router.delete('/chatbot/:id', adminAuth, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM chatbot_faq WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ===== ANALYTICS =====
router.get('/analytics', adminAuth, (req, res) => {
  const db = getDb();
  const { days = 30 } = req.query;
  const visitsByDay = db.prepare(`
    SELECT DATE(created_at) as date, COUNT(*) as visits 
    FROM analytics 
    WHERE created_at > datetime('now', '-${parseInt(days)} days')
    GROUP BY DATE(created_at) ORDER BY date
  `).all();
  
  const topPages = db.prepare(`
    SELECT page, COUNT(*) as visits 
    FROM analytics 
    WHERE created_at > datetime('now', '-${parseInt(days)} days')
    GROUP BY page ORDER BY visits DESC LIMIT 10
  `).all();
  
  const topProducts = db.prepare(`
    SELECT product_id, COUNT(*) as views 
    FROM analytics 
    WHERE product_id IS NOT NULL AND created_at > datetime('now', '-${parseInt(days)} days')
    GROUP BY product_id ORDER BY views DESC LIMIT 20
  `).all();

  const topCategories = db.prepare(`
    SELECT category, COUNT(*) as views 
    FROM analytics 
    WHERE category IS NOT NULL AND created_at > datetime('now', '-${parseInt(days)} days')
    GROUP BY category ORDER BY views DESC LIMIT 10
  `).all();

  res.json({ visitsByDay, topPages, topProducts, topCategories });
});

// ===== BANNERS =====
router.get('/banners', adminAuth, (req, res) => {
  const db = getDb();
  const banners = db.prepare('SELECT * FROM banners ORDER BY sort_order ASC, id DESC').all();
  res.json(banners);
});

router.post('/banners', adminAuth, (req, res) => {
  const db = getDb();
  const { title_ar, title_en, title_tr, subtitle_ar, subtitle_en, subtitle_tr, image_url, link, sort_order } = req.body;
  if (!image_url) return res.status(400).json({ error: 'Image URL required' });
  const result = db.prepare(
    'INSERT INTO banners (title_ar, title_en, title_tr, subtitle_ar, subtitle_en, subtitle_tr, image_url, link, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(title_ar || '', title_en || '', title_tr || '', subtitle_ar || '', subtitle_en || '', subtitle_tr || '', image_url, link || '', sort_order || 0);
  res.json({ success: true, id: result.lastInsertRowid });
});

router.put('/banners/:id', adminAuth, (req, res) => {
  const db = getDb();
  const { title_ar, title_en, title_tr, subtitle_ar, subtitle_en, subtitle_tr, image_url, link, sort_order, active } = req.body;
  db.prepare(
    'UPDATE banners SET title_ar=?, title_en=?, title_tr=?, subtitle_ar=?, subtitle_en=?, subtitle_tr=?, image_url=?, link=?, sort_order=?, active=? WHERE id=?'
  ).run(title_ar || '', title_en || '', title_tr || '', subtitle_ar || '', subtitle_en || '', subtitle_tr || '', image_url || '', link || '', sort_order || 0, active !== undefined ? (active ? 1 : 0) : 1, req.params.id);
  res.json({ success: true });
});

router.delete('/banners/:id', adminAuth, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM banners WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ===== STAFF/EMPLOYEES =====
router.get('/staff', adminAuth, (req, res) => {
  const db = getDb();
  const staff = db.prepare('SELECT id, username, name, role, permissions, active, created_at, last_login FROM staff ORDER BY created_at DESC').all();
  res.json(staff);
});

router.post('/staff', adminAuth, (req, res) => {
  const db = getDb();
  const bcrypt = require('bcryptjs');
  const { username, password, name, role, permissions } = req.body;
  if (!username || !password || !name) return res.status(400).json({ error: 'Username, password and name required' });
  const existing = db.prepare('SELECT id FROM staff WHERE username = ?').get(username);
  if (existing) return res.status(400).json({ error: 'Username already exists' });
  const hashedPassword = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO staff (username, password, name, role, permissions) VALUES (?, ?, ?, ?, ?)'
  ).run(username, hashedPassword, name, role || 'editor', JSON.stringify(permissions || {}));
  res.json({ success: true, id: result.lastInsertRowid });
});

router.put('/staff/:id', adminAuth, (req, res) => {
  const db = getDb();
  const bcrypt = require('bcryptjs');
  const { name, role, permissions, active, password } = req.body;
  if (password) {
    const hashedPassword = bcrypt.hashSync(password, 10);
    db.prepare('UPDATE staff SET name=?, role=?, permissions=?, active=?, password=? WHERE id=?').run(name, role || 'editor', JSON.stringify(permissions || {}), active ? 1 : 0, hashedPassword, req.params.id);
  } else {
    db.prepare('UPDATE staff SET name=?, role=?, permissions=?, active=? WHERE id=?').run(name, role || 'editor', JSON.stringify(permissions || {}), active ? 1 : 0, req.params.id);
  }
  res.json({ success: true });
});

router.delete('/staff/:id', adminAuth, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM staff WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ===== CURRENCIES =====
router.get('/currencies', adminAuth, (req, res) => {
  const db = getDb();
  const currencies = db.prepare('SELECT * FROM currencies ORDER BY id ASC').all();
  res.json(currencies);
});

router.put('/currencies', adminAuth, (req, res) => {
  const db = getDb();
  const { currencies } = req.body;
  if (!currencies || !Array.isArray(currencies)) return res.status(400).json({ error: 'Currencies array required' });
  for (const c of currencies) {
    db.prepare('UPDATE currencies SET rate_from_try = ?, active = ?, updated_at = CURRENT_TIMESTAMP WHERE code = ?').run(c.rate_from_try, c.active ? 1 : 0, c.code);
  }
  res.json({ success: true });
});

router.post('/currencies', adminAuth, (req, res) => {
  const db = getDb();
  const { code, name_ar, name_en, name_tr, symbol, rate_from_try } = req.body;
  if (!code || !symbol) return res.status(400).json({ error: 'Code and symbol required' });
  const result = db.prepare(
    'INSERT OR REPLACE INTO currencies (code, name_ar, name_en, name_tr, symbol, rate_from_try) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(code.toUpperCase(), name_ar || '', name_en || '', name_tr || '', symbol, rate_from_try || 1.0);
  res.json({ success: true, id: result.lastInsertRowid });
});

// ===== CUSTOM CATEGORIES =====
router.get('/custom-categories', adminAuth, (req, res) => {
  const db = getDb();
  const categories = db.prepare('SELECT * FROM custom_categories ORDER BY sort_order ASC, id DESC').all();
  res.json(categories);
});

router.post('/custom-categories', adminAuth, (req, res) => {
  const db = getDb();
  const { name_ar, name_en, name_tr, image_url, sort_order } = req.body;
  if (!name_ar) return res.status(400).json({ error: 'Arabic name required' });
  const result = db.prepare(
    'INSERT INTO custom_categories (name_ar, name_en, name_tr, image_url, sort_order) VALUES (?, ?, ?, ?, ?)'
  ).run(name_ar, name_en || '', name_tr || '', image_url || '', sort_order || 0);
  res.json({ success: true, id: result.lastInsertRowid });
});

router.put('/custom-categories/:id', adminAuth, (req, res) => {
  const db = getDb();
  const { name_ar, name_en, name_tr, image_url, sort_order, active } = req.body;
  db.prepare(
    'UPDATE custom_categories SET name_ar=?, name_en=?, name_tr=?, image_url=?, sort_order=?, active=? WHERE id=?'
  ).run(name_ar || '', name_en || '', name_tr || '', image_url || '', sort_order || 0, active !== undefined ? (active ? 1 : 0) : 1, req.params.id);
  res.json({ success: true });
});

router.delete('/custom-categories/:id', adminAuth, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM custom_categories WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});


// ========== LOCAL PRODUCTS (Add/Edit/Delete manual products) ==========
const multer = require('multer');

const localProductUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(__dirname, '..', '..', 'public', 'uploads', 'products');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, 'prod_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6) + ext);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 }
});

// GET all local products
router.get('/local-products', adminAuth, (req, res) => {
  const db = getDb();
  const { page = 1, limit = 20, search } = req.query;
  let query = 'SELECT * FROM local_products';
  let countQuery = 'SELECT COUNT(*) as total FROM local_products';
  const params = [];
  if (search) {
    const where = " WHERE name_tr LIKE ? OR name_ar LIKE ? OR model LIKE ?";
    query += where;
    countQuery += where;
    params.push('%' + search + '%', '%' + search + '%', '%' + search + '%');
  }
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  const total = db.prepare(countQuery).get(...params);
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const products = db.prepare(query).all(...params, parseInt(limit), offset);
  res.json({
    products: products.map(p => ({ ...p, colors: JSON.parse(p.colors || '[]'), sizes: JSON.parse(p.sizes || '[]'), images: JSON.parse(p.images || '[]') })),
    total: total ? total.total : 0,
    totalPages: Math.ceil((total ? total.total : 0) / parseInt(limit))
  });
});

// GET single local product
router.get('/local-products/:id', adminAuth, (req, res) => {
  const db = getDb();
  const p = db.prepare('SELECT * FROM local_products WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Product not found' });
  res.json({ product: { ...p, colors: JSON.parse(p.colors || '[]'), sizes: JSON.parse(p.sizes || '[]'), images: JSON.parse(p.images || '[]') } });
});

// POST add new local product
router.post('/local-products', adminAuth, localProductUpload.array('images', 10), (req, res) => {
  try {
    const db = getDb();
    const { name_tr, name_ar, name_en, model, description, price, quantity, category_tr, category_ar, category_en, colors, sizes } = req.body;
    const images = (req.files || []).map(f => '/uploads/products/' + f.filename);

    const result = db.prepare(
      'INSERT INTO local_products (name_tr, name_ar, name_en, model, description, price, quantity, category_tr, category_ar, category_en, colors, sizes, images) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      name_tr || '', name_ar || '', name_en || '', model || '', description || '',
      parseFloat(price) || 0, parseInt(quantity) || 0,
      category_tr || '', category_ar || '', category_en || '',
      colors || '[]',
      sizes || '[]',
      JSON.stringify(images)
    );
    database.saveDatabase();
    res.json({ success: true, id: result.lastInsertRowid });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// PUT update local product
router.put('/local-products/:id', adminAuth, localProductUpload.array('images', 10), (req, res) => {
  try {
    const db = getDb();
    const { name_tr, name_ar, name_en, model, description, price, quantity, category_tr, category_ar, category_en, colors, sizes, existing_images } = req.body;
    const newImages = (req.files || []).map(f => '/uploads/products/' + f.filename);
    const keepImages = existing_images ? (typeof existing_images === 'string' ? JSON.parse(existing_images) : existing_images) : [];
    const allImages = [...keepImages, ...newImages];

    db.prepare(
      'UPDATE local_products SET name_tr=?, name_ar=?, name_en=?, model=?, description=?, price=?, quantity=?, category_tr=?, category_ar=?, category_en=?, colors=?, sizes=?, images=?, updated_at=CURRENT_TIMESTAMP WHERE id=?'
    ).run(
      name_tr || '', name_ar || '', name_en || '', model || '', description || '',
      parseFloat(price) || 0, parseInt(quantity) || 0,
      category_tr || '', category_ar || '', category_en || '',
      colors || '[]',
      sizes || '[]',
      JSON.stringify(allImages),
      req.params.id
    );
    database.saveDatabase();
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// DELETE local product
router.delete('/local-products/:id', adminAuth, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM local_products WHERE id = ?').run(req.params.id);
  database.saveDatabase();
  res.json({ success: true });
});

// Toggle local product visibility
router.put('/local-products/:id/visibility', adminAuth, (req, res) => {
  const db = getDb();
  const { hidden } = req.body;
  const id = req.params.id;
  const lp = db.prepare('SELECT * FROM local_products WHERE id = ? OR product_id = ?').get(Number(id) || 0, id);
  const pId = lp ? (lp.product_id || ('local_' + lp.id)) : String(id);
  const rawId = pId.replace(/^(etkin_|xml_|local_)/, '');

  db.prepare('UPDATE local_products SET hidden = ? WHERE id = ? OR product_id = ?').run(hidden ? 1 : 0, Number(id) || 0, id);
  if (hidden) {
    db.prepare('INSERT OR IGNORE INTO hidden_products (product_id) VALUES (?)').run(pId);
    db.prepare('INSERT OR IGNORE INTO hidden_products (product_id) VALUES (?)').run(rawId);
    db.prepare('INSERT OR IGNORE INTO hidden_products (product_id) VALUES (?)').run(String(id));
  } else {
    db.prepare('DELETE FROM hidden_products WHERE product_id = ? OR product_id = ? OR product_id = ?').run(pId, rawId, String(id));
  }
  database.saveDatabase();
  res.json({ success: true });
});

// ========== PRODUCT CATEGORY OVERRIDE ==========
// Change the category of an XML product
router.post('/products/:id/category', adminAuth, (req, res) => {
  try {
    const db = getDb();
    const { new_category_tr, new_category_ar, new_category_en } = req.body;
    if (!new_category_tr) return res.status(400).json({ error: 'new_category_tr required' });

    db.prepare(
      'INSERT OR REPLACE INTO product_category_overrides (product_id, new_category_tr, new_category_ar, new_category_en) VALUES (?, ?, ?, ?)'
    ).run(req.params.id, new_category_tr, new_category_ar || '', new_category_en || '');
    database.saveDatabase();
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Remove category override (revert to original)
router.delete('/products/:id/category', adminAuth, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM product_category_overrides WHERE product_id = ?').run(req.params.id);
  database.saveDatabase();
  res.json({ success: true });
});

// GET all category overrides
router.get('/category-overrides', adminAuth, (req, res) => {
  const db = getDb();
  const overrides = db.prepare('SELECT * FROM product_category_overrides').all();
  res.json({ overrides });
});

// Trigger Etkin Promosyon API Synchronization
router.post('/sync-etkin', adminAuth, async (req, res) => {
  try {
    const db = getDb();
    const { syncEtkinProducts } = require('../services/etkinService');
    const result = await syncEtkinProducts(db, database.saveDatabase);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Trigger Full Synchronization for all feeds (Karmedya XML + Etkin Promosyon)
router.post('/sync-all', async (req, res) => {
  try {
    const db = getDb();
    const { syncEtkinProducts } = require('../services/etkinService');
    const { fetchAndParseProducts } = require('../dataService');
    const { translateCategory, translateProductName } = require('../translations');

    // 1. Sync XML products
    const products = await fetchAndParseProducts();
    let xmlCount = 0;
    if (products && products.length > 0) {
      db.exec('BEGIN TRANSACTION');
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO local_products 
        (product_id, name_tr, name_ar, name_en, model, description, price, quantity, category_tr, category_ar, category_en, colors, sizes, images, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);
      for (const p of products) {
        if (!p.id) continue;
        let catTr = (p.categories && p.categories.tr && p.categories.tr.length > 0) ? p.categories.tr[p.categories.tr.length - 1] : '';
        if (catTr.includes('|')) catTr = catTr.split('|')[0].trim();
        const catAr = (p.categories && p.categories.ar && p.categories.ar.length > 0) ? p.categories.ar[p.categories.ar.length - 1] : translateCategory(catTr, 'ar');
        const catEn = (p.categories && p.categories.en && p.categories.en.length > 0) ? p.categories.en[p.categories.en.length - 1] : translateCategory(catTr, 'en');

        stmt.run([
          p.id.toString(),
          p.name ? (p.name.tr || '') : '',
          p.name ? (p.name.ar || translateProductName(p.name.tr || '', 'ar')) : '',
          p.name ? (p.name.en || translateProductName(p.name.tr || '', 'en')) : '',
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
        xmlCount++;
      }
      db.exec('COMMIT');
    }

    // 2. Sync Etkin products
    const etkinResult = await syncEtkinProducts(db, database.saveDatabase);

    const totalRow = db.prepare('SELECT COUNT(*) as count FROM local_products WHERE hidden = 0').get();
    const total = totalRow ? totalRow.count : 0;
    res.json({ success: true, totalProducts: total, xmlSynced: xmlCount, etkinResult });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
