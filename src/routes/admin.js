const path = require("path");
const fs = require("fs");
const express = require('express');
const multer = require('multer');
const database = require('../database');
const { adminAuth, adminLogin } = require('../auth');
const { fetchAndParseProducts, getCategories } = require('../dataService');
function getDb() { return database.db; }

function normalizeImageUrl(url) {
  if (!url || typeof url !== 'string') return '';
  url = url.trim();
  const matchFile = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchFile) {
    return `https://lh3.googleusercontent.com/d/${matchFile[1]}`;
  }
  const matchId = url.match(/drive\.google\.com\/[a-zA-Z0-9_/?&=]+(?:id=|\/d\/)([a-zA-Z0-9_-]+)/);
  if (matchId) {
    return `https://lh3.googleusercontent.com/d/${matchId[1]}`;
  }
  return url;
}

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

// Export active database binary file
router.get('/export-database', adminAuth, (req, res) => {
  try {
    const dbPath = database.getDbPath ? database.getDbPath() : null;
    if (!dbPath || !fs.existsSync(dbPath)) {
      return res.status(404).json({ error: 'Database file not found' });
    }
    res.download(dbPath, 'zakariaprom.db');
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List all uploaded media files on server
router.get('/list-uploads', adminAuth, (req, res) => {
  try {
    const hostingerBase = '/home/u424368414/domains/zakariaprom.com';
    const catDir = fs.existsSync(hostingerBase) 
      ? path.join(hostingerBase, 'uploads', 'categories') 
      : path.join(__dirname, '..', '..', 'public', 'uploads', 'categories');
    const prodDir = fs.existsSync(hostingerBase) 
      ? path.join(hostingerBase, 'uploads', 'products') 
      : path.join(__dirname, '..', '..', 'public', 'uploads', 'products');

    const catFiles = fs.existsSync(catDir) ? fs.readdirSync(catDir).map(f => ({ name: f, type: 'categories', url: '/uploads/categories/' + f })) : [];
    const prodFiles = fs.existsSync(prodDir) ? fs.readdirSync(prodDir).map(f => ({ name: f, type: 'products', url: '/uploads/products/' + f })) : [];

    res.json({ categories: catFiles, products: prodFiles });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Deep scan across entire server filesystem for blog posts in any active or historical DB / backups / free pages
router.get('/deep-find-posts', adminAuth, async (req, res) => {
  try {
    const initSqlJs = require('sql.js');
    let SQL = null;
    try { SQL = await initSqlJs(); } catch(e) {}

    const results = {
      activeDbPath: database.getDbPath ? database.getDbPath() : 'unknown',
      activeDbPosts: [],
      activeDbSequence: [],
      databasesFound: [],
      postsFoundAcrossFiles: [],
      rawTextMatches: [],
      serverInfo: {}
    };

    const currentDb = getDb();
    if (currentDb) {
      try {
        results.activeDbPosts = currentDb.prepare('SELECT * FROM posts').all();
      } catch(e) {
        results.activeDbPostsError = e.message;
      }
      try {
        results.activeDbSequence = currentDb.prepare('SELECT * FROM sqlite_sequence').all();
      } catch(e) {}
    }

    const visited = new Set();
    const foundDbFiles = [];

    function scan(dir, depth = 0) {
      if (depth > 6 || !fs.existsSync(dir)) return;
      try {
        const list = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of list) {
          const full = path.join(dir, item.name);
          if (item.isDirectory()) {
            if (item.name === 'node_modules' || item.name === '.npm' || item.name === '.cache') continue;
            scan(full, depth + 1);
          } else if (item.isFile()) {
            const nameLower = item.name.toLowerCase();
            if (
              nameLower.endsWith('.db') || 
              nameLower.endsWith('.sqlite') || 
              nameLower.endsWith('.sqlite3') || 
              nameLower.includes('zakariaprom') || 
              nameLower.includes('backup') || 
              nameLower.includes('.bak') ||
              nameLower.includes('posts')
            ) {
              if (!visited.has(full)) {
                visited.add(full);
                try {
                  const stat = fs.statSync(full);
                  if (stat.size > 500) {
                    foundDbFiles.push({ path: full, size: stat.size, mtime: stat.mtime });
                  }
                } catch(e) {}
              }
            }
          }
        }
      } catch(e) {}
    }

    const searchRoots = [
      '/home/u424368414/domains/zakariaprom.com/nodejs',
      '/home/u424368414/domains/zakariaprom.com/public_html',
      '/home/u424368414/domains/zakariaprom.com',
      '/home/u424368414/hbuilds',
      '/home/u424368414/backups',
      '/home/u424368414/.trash',
      '/home/u424368414/data',
      '/home/u424368414',
      path.resolve(path.join(__dirname, '..', '..'))
    ];

    for (const root of searchRoots) {
      if (fs.existsSync(root)) {
        scan(root, 0);
      }
    }

    results.databasesFound = foundDbFiles;

    for (const f of foundDbFiles) {
      try {
        const buf = fs.readFileSync(f.path);
        
        // Try opening as SQLite database
        if (SQL) {
          try {
            const testDb = new SQL.Database(buf);
            const tablesRes = testDb.exec("SELECT name FROM sqlite_master WHERE type='table'");
            const tableNames = (tablesRes.length > 0 && tablesRes[0].values) ? tablesRes[0].values.map(v => v[0]) : [];
            if (tableNames.includes('posts')) {
              const pRes = testDb.exec("SELECT * FROM posts");
              if (pRes.length > 0) {
                const cols = pRes[0].columns;
                const rows = pRes[0].values.map(vals => {
                  const obj = {};
                  cols.forEach((col, idx) => { obj[col] = vals[idx]; });
                  return obj;
                });
                results.postsFoundAcrossFiles.push({
                  sourceFile: f.path,
                  modifiedAt: f.mtime,
                  count: rows.length,
                  posts: rows
                });
              }
            }
            testDb.close();
          } catch(dbErr) {}
        }

        // Scan raw buffer for Arabic text strings that might be deleted or uncommitted posts
        const text = buf.toString('utf8');
        const matches = text.match(/[\u0600-\u06FF\s\d\.\,\!\?\:\-\(\)]{20,}/g);
        if (matches && matches.length > 0) {
          const interesting = matches
            .map(m => m.trim())
            .filter(m => m.length >= 25 && (m.includes('مقال') || m.includes('مدونة') || m.includes('طباعة') || m.includes('نقدم') || m.includes('أعلام') || m.includes('هدايا') || m.includes('تسويق') || m.includes('دعاية')))
            .slice(0, 10);
          if (interesting.length > 0) {
            results.rawTextMatches.push({
              sourceFile: f.path,
              snippets: interesting
            });
          }
        }
      } catch(e) {}
    }

    // Git inspection on server
    try {
      const { execSync } = require('child_process');
      if (req.query.pull === 'true') {
        const pullOutput = execSync('git pull origin main', { timeout: 15000, encoding: 'utf8' }).trim();
        results.serverInfo.gitPull = pullOutput;
      }
      const gitLog = execSync('git log -n 5 --oneline', { timeout: 3000, encoding: 'utf8' }).trim();
      results.serverInfo.gitLog = gitLog;
    } catch(e) {
      results.serverInfo.gitError = e.message;
    }

    res.json(results);
  } catch(err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// Git pull trigger for admin deployment
router.post('/git-pull', adminAuth, async (req, res) => {
  try {
    const { execSync } = require('child_process');
    const output = execSync('git pull origin main', { timeout: 15000, encoding: 'utf8' });
    try {
      const fs = require('fs');
      const restartPath = path.join(__dirname, '..', '..', 'tmp', 'restart.txt');
      fs.writeFileSync(restartPath, `v2.2.0 - ${Date.now()}\n`);
    } catch(e) {}
    res.json({ success: true, output });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Restore/inject multiple blog posts into active database
router.post('/restore-posts', adminAuth, async (req, res) => {
  try {
    const { posts } = req.body || {};
    if (!Array.isArray(posts) || posts.length === 0) {
      return res.status(400).json({ error: 'Array of posts required' });
    }

    const db = getDb();
    if (!db) return res.status(500).json({ error: 'Database not available' });

    let inserted = 0;
    const stmt = db.prepare(`
      INSERT INTO posts (title_ar, title_en, title_tr, content_ar, content_en, content_tr, image, published)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const p of posts) {
      const titleAr = p.title_ar || p.title || '';
      const contentAr = p.content_ar || p.content || '';
      stmt.run(
        titleAr,
        p.title_en || '',
        p.title_tr || '',
        contentAr,
        p.content_en || '',
        p.content_tr || '',
        p.image || '',
        p.published !== undefined ? (p.published ? 1 : 0) : 1
      );
      inserted++;
    }

    database.saveDatabase();
    res.json({ success: true, inserted });
  } catch(err) {
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

// Synchronize Karmedya XML Feed permanently disabled in favor of Etkin Promosyon
router.post('/sync-karmedya-xml', adminAuth, async (req, res) => {
  res.json({
    success: false,
    message: 'تم إيقاف مزامنة خلاصة Karmedya بشكل دائم والاعتماد الحصري على منتجات Etkin Promosyon.'
  });
});

// Sync All feeds (Purge Karmedya + Sync Etkin API) into permanent database
router.post('/sync-all-feeds', adminAuth, async (req, res) => {
  try {
    const db = database.db;

    // 1. Purge any Karmedya products
    const purgeResult = db.prepare(`
      DELETE FROM local_products 
      WHERE (
        (product_id NOT LIKE 'etkin_%' AND (product_id IS NOT NULL AND product_id != ''))
        AND product_id NOT LIKE 'prod_%' 
        AND product_id NOT LIKE 'local_%' 
        AND id NOT IN (133477, 137094, 137095)
      ) OR images LIKE '%karmedya.com%'
    `).run();
    console.log(`[Admin Sync All Feeds] Purged ${purgeResult.changes} Karmedya products.`);

    // 2. Sync Etkin API products
    const { syncEtkinProducts } = require('../services/etkinService');
    const etkinResult = await syncEtkinProducts(db, database.saveDatabase);

    const totalRow = db.prepare('SELECT count(*) as count FROM local_products WHERE hidden = 0').get();
    const etkinRow = db.prepare("SELECT count(*) as count FROM local_products WHERE product_id LIKE 'etkin_%' AND hidden = 0").get();
    const localRow = db.prepare("SELECT count(*) as count FROM local_products WHERE product_id NOT LIKE 'etkin_%' AND images NOT LIKE '%karmedya.com%' AND hidden = 0").get();

    res.json({
      success: true,
      etkin: etkinResult,
      dbCounts: {
        total: totalRow ? totalRow.count : 0,
        xml: 0,
        etkin: etkinRow ? etkinRow.count : 0,
        local: localRow ? localRow.count : 0
      }
    });
  } catch(err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// ===== DASHBOARD =====
router.get('/dashboard', adminAuth, async (req, res) => {
  try {
    const db = getDb();
    const totalProductsRow = db.prepare('SELECT COUNT(*) as count FROM local_products WHERE hidden = 0').get();
    const totalCategoriesRow = db.prepare("SELECT COUNT(DISTINCT category_tr) as count FROM local_products WHERE category_tr IS NOT NULL AND category_tr != '' AND hidden = 0").get();
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

    // Get categories directly from database (local_products and custom_categories)
    const catRows = db.prepare("SELECT DISTINCT category_tr as category, category_ar, category_en FROM local_products WHERE category_tr IS NOT NULL AND category_tr != '' AND hidden = 0").all() || [];
    const customCatRows = db.prepare("SELECT name_tr as category, name_ar as category_ar, name_en as category_en FROM custom_categories WHERE active = 1 AND name_tr IS NOT NULL AND name_tr != ''").all() || [];
    const seenCats = new Set();
    const combinedCats = [...catRows, ...customCatRows].filter(c => {
      if (!c || !c.category || seenCats.has(c.category)) return false;
      seenCats.add(c.category);
      return true;
    });
    
    const categories = combinedCats.map(cat => ({
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
    
    // Read all products from local_products database table (excluding Karmedya)
    let products = db.prepare("SELECT product_id as id, model, name_tr, name_ar, name_en FROM local_products WHERE hidden = 0 AND images NOT LIKE '%karmedya.com%'").all();
    
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

// ===== QUICK PRODUCT COUNTS =====
router.get('/product-counts', adminAuth, (req, res) => {
  try {
    const db = getDb();
    const etkinRow = db.prepare("SELECT count(*) as count FROM local_products WHERE product_id LIKE 'etkin_%' AND (hidden = 0 OR hidden IS NULL OR hidden = 'false')").get();
    const localRow = db.prepare("SELECT count(*) as count FROM local_products WHERE (product_id NOT LIKE 'etkin_%' OR product_id IS NULL) AND (images NOT LIKE '%karmedya.com%' OR images IS NULL) AND (hidden = 0 OR hidden IS NULL OR hidden = 'false')").get();
    const etkin = etkinRow ? etkinRow.count : 0;
    const local = localRow ? localRow.count : 0;

    res.json({
      total: etkin + local,
      xml: 0,
      etkin,
      local
    });
  } catch (err) {
    res.status(500).json({ error: err.message, total: 0, xml: 0, etkin: 0, local: 0 });
  }
});

// ===== PRODUCTS LIST (Admin) =====
router.get('/products', adminAuth, async (req, res) => {
  try {
    const db = getDb();
    const { search, category, source = 'all', page = 1, limit = 20 } = req.query;

    let dbRows = db.prepare("SELECT * FROM local_products WHERE images NOT LIKE '%karmedya.com%'").all();
    let products = dbRows.map(lp => {
      let images = [];
      try { images = JSON.parse(lp.images || '[]'); } catch(e) { if (lp.images) images = [lp.images]; }
      let colors = [];
      try { colors = JSON.parse(lp.colors || '[]'); } catch(e) { if (lp.colors) colors = [lp.colors]; }
      let sizes = [];
      try { sizes = JSON.parse(lp.sizes || '[]'); } catch(e) { if (lp.sizes) sizes = [lp.sizes]; }

      const pId = lp.product_id || ('local_' + lp.id);
      const isEtkin = pId.startsWith('etkin_');
      const isLocal = !isEtkin;

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
        source: isEtkin ? 'etkin' : 'local'
      };
    });

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

    // Category filter (support exact & partial match on Turkish & Arabic names)
    if (category) {
      const catLower = category.toLowerCase().trim();
      products = products.filter(p => {
        const topTr = ((p.topCategory && p.topCategory.tr) || "").toLowerCase().trim();
        const topAr = ((p.topCategory && p.topCategory.ar) || "").toLowerCase().trim();
        const catsTr = (p.categories && Array.isArray(p.categories.tr)) ? p.categories.tr.map(c => c.toLowerCase().trim()) : [];
        const catsAr = (p.categories && Array.isArray(p.categories.ar)) ? p.categories.ar.map(c => c.toLowerCase().trim()) : [];
        return topTr === catLower || 
               topAr === catLower ||
               topTr.includes(catLower) || 
               topAr.includes(catLower) ||
               catsTr.some(c => c === catLower || c.includes(catLower)) ||
               catsAr.some(c => c === catLower || c.includes(catLower));
      });
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
    const rawNumericId = String(pId).replace(/^(local_|etkin_|xml_)/, '');
    const numId = !isNaN(Number(rawNumericId)) ? Number(rawNumericId) : -1;

    // Search local_products first
    const row = db.prepare(`
      SELECT * FROM local_products 
      WHERE product_id = ? 
         OR model = ? 
         OR id = ? 
         OR ('local_' || id) = ? 
         OR ('etkin_' || id) = ?
         OR (id = ? AND ? > 0)
    `).get(pId, pId, pId, pId, pId, numId, numId);

    let product = null;

    if (row) {
      let images = [];
      try { images = JSON.parse(row.images || '[]'); } catch(e) { if (row.images) images = [row.images]; }
      let colors = [];
      try { colors = JSON.parse(row.colors || '[]'); } catch(e) { if (row.colors) colors = [row.colors]; }
      let sizes = [];
      try { sizes = JSON.parse(row.sizes || '[]'); } catch(e) { if (row.sizes) sizes = [row.sizes]; }

      const actualId = row.product_id || ('local_' + row.id);
      const isLocal = row.is_local === 1 || actualId.startsWith('local_') || !row.product_id;

      product = {
        id: actualId,
        product_id: actualId,
        localId: row.id,
        isLocal,
        source: actualId.startsWith('etkin_') ? 'etkin' : (isLocal ? 'local' : 'xml'),
        name: { tr: row.name_tr || '', ar: row.name_ar || row.name_tr || '', en: row.name_en || row.name_tr || '' },
        name_tr: row.name_tr || '',
        name_ar: row.name_ar || '',
        name_en: row.name_en || '',
        model: row.model || '',
        description: row.description || '',
        price: row.price || 0,
        quantity: row.quantity || 0,
        category_tr: row.category_tr || '',
        category_ar: row.category_ar || '',
        category_en: row.category_en || '',
        categories: { tr: [row.category_tr || ''], ar: [row.category_ar || ''], en: [row.category_en || ''] },
        topCategory: {
          tr: (row.category_tr || '').split(' > ')[0].trim(),
          ar: (row.category_ar || '').split(' > ')[0].trim(),
          en: (row.category_en || '').split(' > ')[0].trim()
        },
        images,
        colors,
        sizes
      };
    }

    if (!product) return res.status(404).json({ error: 'Product not found' });
    
    // Check for name overrides
    const overrides = db.prepare("SELECT lang, translation FROM translation_overrides WHERE type = 'product' AND original_key IN (?, ?, ?)").all(product.id, product.model || '', (product.name && product.name.tr) || '');
    if (overrides.length > 0) {
      if (!product.name) product.name = {};
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
    const rawNumericId = String(pId).replace(/^(local_|etkin_|xml_)/, '');
    const numId = !isNaN(Number(rawNumericId)) ? Number(rawNumericId) : -1;
    const { name_tr, name_ar, name_en, price, description, model: newModel, quantity, category_tr, category_ar, category_en } = req.body;

    const row = db.prepare(`
      SELECT * FROM local_products 
      WHERE product_id = ? 
         OR model = ? 
         OR id = ? 
         OR ('local_' || id) = ? 
         OR ('etkin_' || id) = ?
         OR (id = ? AND ? > 0)
    `).get(pId, pId, pId, pId, pId, numId, numId);

    if (row) {
      db.prepare(`
        UPDATE local_products
        SET name_tr = COALESCE(NULLIF(?, ''), name_tr),
            name_ar = COALESCE(NULLIF(?, ''), name_ar),
            name_en = COALESCE(NULLIF(?, ''), name_en),
            price = CASE WHEN ? >= 0 THEN ? ELSE price END,
            description = COALESCE(NULLIF(?, ''), description),
            model = COALESCE(NULLIF(?, ''), model),
            quantity = CASE WHEN ? IS NOT NULL THEN ? ELSE quantity END,
            category_tr = COALESCE(NULLIF(?, ''), category_tr),
            category_ar = COALESCE(NULLIF(?, ''), category_ar),
            category_en = COALESCE(NULLIF(?, ''), category_en),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        name_tr || '', name_ar || '', name_en || '',
        price !== undefined ? parseFloat(price) : -1, price !== undefined ? parseFloat(price) : 0,
        description || '',
        newModel || '',
        quantity !== undefined ? parseInt(quantity) : null, quantity !== undefined ? parseInt(quantity) : 0,
        category_tr || '', category_ar || '', category_en || '',
        row.id
      );
    }

    const targetId = row ? (row.product_id || ('local_' + row.id)) : pId;
    const model = row ? row.model : pId;

    // Save Arabic override
    if (name_ar) {
      db.prepare(`
        INSERT INTO translation_overrides (type, original_key, lang, translation, updated_at)
        VALUES ('product', ?, 'ar', ?, CURRENT_TIMESTAMP)
        ON CONFLICT(type, original_key, lang) DO UPDATE SET translation = ?, updated_at = CURRENT_TIMESTAMP
      `).run(targetId, name_ar, name_ar);
      if (model && model !== targetId) {
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
      if (model && model !== targetId) {
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
      if (model && model !== targetId) {
        db.prepare(`
          INSERT INTO translation_overrides (type, original_key, lang, translation, updated_at)
          VALUES ('product', ?, 'tr', ?, CURRENT_TIMESTAMP)
          ON CONFLICT(type, original_key, lang) DO UPDATE SET translation = ?, updated_at = CURRENT_TIMESTAMP
        `).run(model, name_tr, name_tr);
      }
    }

    if (price !== undefined && parseFloat(price) > 0) {
      try {
        db.prepare(`
          INSERT INTO product_overrides (product_id, price, updated_at)
          VALUES (?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(product_id) DO UPDATE SET price = ?, updated_at = CURRENT_TIMESTAMP
        `).run(targetId, parseFloat(price), parseFloat(price));
      } catch(e) {}
    }

    database.saveDatabase();
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

// Category Uploads Directory & Multer setup
function getHostingerCategoryUploadsDir() {
  const hostingerBase = '/home/u424368414/domains/zakariaprom.com';
  if (fs.existsSync(hostingerBase)) {
    const perm = path.join(hostingerBase, 'uploads', 'categories');
    if (!fs.existsSync(perm)) {
      try { fs.mkdirSync(perm, { recursive: true, mode: 0o777 }); } catch(e) {}
    }
    return perm;
  }
  return null;
}

const categoryUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(__dirname, '..', '..', 'public', 'uploads', 'categories');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      getHostingerCategoryUploadsDir();
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || '.jpg';
      cb(null, 'cat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6) + ext);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 }
});

async function cacheExternalCategoryImageUrl(url, catName = 'category') {
  if (!url || typeof url !== 'string') return '';
  url = url.trim();

  // If already a local uploaded file, keep it
  if (url.startsWith('/uploads/') || url.startsWith('uploads/')) {
    return url.startsWith('/') ? url : '/' + url;
  }

  // Check if it's an external URL
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return url;
  }

  // Check if it matches a Google Drive link
  let downloadUrl = url;
  const driveFileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  const driveIdMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  const userContentMatch = url.match(/googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
  const driveId = driveFileMatch ? driveFileMatch[1] : (driveIdMatch ? driveIdMatch[1] : (userContentMatch ? userContentMatch[1] : null));

  if (driveId) {
    downloadUrl = `https://lh3.googleusercontent.com/d/${driveId}`;
  }

  try {
    const axios = require('axios');
    const response = await axios.get(downloadUrl, {
      responseType: 'arraybuffer',
      timeout: 12000,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      validateStatus: status => status >= 200 && status < 400
    });

    const contentType = (response.headers['content-type'] || '').toLowerCase();
    
    // If it returned HTML, it redirected to Google Login page because permissions are restricted
    if (contentType.includes('text/html') || contentType.includes('application/xhtml')) {
      console.warn(`[Category Image] URL returned HTML instead of image (likely Google Login redirect): ${url}`);
      throw new Error('رابط Google Drive هذا غير متاح للعامة أو يتطلب تسجيل الدخول. يرجى ضبط مشاركة الملف في Drive إلى "أي شخص لديه الرابط"، أو استخدم زر "رفع صورة من جهازك" لرفع الصورة مباشرة.');
    }

    let ext = '.jpg';
    if (contentType.includes('png')) ext = '.png';
    else if (contentType.includes('webp')) ext = '.webp';
    else if (contentType.includes('gif')) ext = '.gif';
    else if (contentType.includes('svg')) ext = '.svg';

    const safeName = (catName || 'cat')
      .toLowerCase()
      .replace(/[^a-z0-9]/gi, '_')
      .replace(/_+/g, '_')
      .substring(0, 20);
    const filename = `cat_${safeName}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}${ext}`;

    const localDir = path.join(__dirname, '..', '..', 'public', 'uploads', 'categories');
    if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });
    const filePath = path.join(localDir, filename);

    fs.writeFileSync(filePath, Buffer.from(response.data));

    const permDir = getHostingerCategoryUploadsDir();
    if (permDir) {
      try {
        fs.writeFileSync(path.join(permDir, filename), Buffer.from(response.data));
      } catch(e) {}
    }

    console.log(`[Category Image Cached] Saved ${url} -> /uploads/categories/${filename}`);
    return '/uploads/categories/' + filename;
  } catch (err) {
    console.error(`[Category Image Cache Error] Failed to download ${url}:`, err.message);
    if (err.message.includes('Google Drive') || err.message.includes('مشاركة الملف')) throw err;
    return url;
  }
}

// Upload category image endpoint
router.post('/upload-category-image', adminAuth, categoryUpload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'لم يتم اختيار أي ملف صورة' });
    }
    const filename = req.file.filename;
    const localPath = path.join(__dirname, '..', '..', 'public', 'uploads', 'categories', filename);
    const permDir = getHostingerCategoryUploadsDir();
    if (permDir && fs.existsSync(localPath)) {
      try {
        fs.copyFileSync(localPath, path.join(permDir, filename));
      } catch(e) {}
    }
    const publicUrl = '/uploads/categories/' + filename;
    res.json({ success: true, url: publicUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== CATEGORIES MANAGEMENT =====
router.get('/categories', adminAuth, async (req, res) => {
  try {
    const db = getDb();
    
    // Read all products from local_products database table
    const { fixMojikake, translateCategory } = require('../translations');
    let dbRows = db.prepare("SELECT * FROM local_products WHERE hidden = 0 AND images NOT LIKE '%karmedya.com%'").all();
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
        image: normalizeImageUrl(imageMap[cleanTr] || '')
      });
    });

    // Add custom categories only if not already added
    const customCats = db.prepare("SELECT * FROM custom_categories").all();
    customCats.forEach(cc => {
      if (!cc) return;
      let cleanTr = fixMojikake(cc.name_tr || '');
      let cleanAr = fixMojikake(cc.name_ar || '');
      let cleanEn = fixMojikake(cc.name_en || '');
      let cleanImg = cc.image_url || '';

      // Auto-detect if user entered a URL into name_tr by mistake
      if (cleanTr.startsWith('http://') || cleanTr.startsWith('https://')) {
        cleanImg = cleanTr;
        cleanTr = cleanEn && !cleanEn.startsWith('http') ? cleanEn : 'Ofset Baskı';
        try {
          db.prepare('UPDATE custom_categories SET name_tr = ?, image_url = ? WHERE id = ?').run(cleanTr, cleanImg, cc.id);
        } catch(e) {}
      }

      if (seenCategoryKeys.has(cleanTr)) return;
      seenCategoryKeys.add(cleanTr);
      const ov = overrideMap[cleanTr] || {};
      result.push({
        id: cc.id,
        tr: cleanTr,
        ar: ov.ar || cleanAr || translateCategory(cleanTr, 'ar'),
        en: ov.en || cleanEn || translateCategory(cleanTr, 'en'),
        count: 0,
        hidden: hiddenCats.includes(cleanTr) || cc.active === 0,
        image: normalizeImageUrl(imageMap[cleanTr] || cleanImg || ""),
        isCustom: true
      });
    });

    // Filter out categories with 0 products (strictly count > 0)
    const activeCategories = result.filter(c => c && typeof c.count === 'number' && c.count > 0);
    res.json({ categories: activeCategories });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/categories/:name', adminAuth, async (req, res) => {
  try {
    const db = getDb();
    const { normalizeImageUrl } = require('../translations');
    const catName = decodeURIComponent(req.params.name);
    let dbRows = db.prepare("SELECT * FROM local_products WHERE hidden = 0 AND images NOT LIKE '%karmedya.com%'").all();
    let products = dbRows.map(lp => ({
      id: lp.product_id,
      model: lp.model,
      categories: { tr: [lp.category_tr || ''], ar: [lp.category_ar || ''], en: [lp.category_en || ''] }
    }));

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

router.put('/categories', adminAuth, async (req, res) => {
  const db = getDb();
  const { category_tr, new_tr, ar, en, hidden, image } = req.body;
  if (!category_tr) return res.status(400).json({ error: 'category_tr required' });

  const { normalizeCategoryName } = require('../translations');
  const normCat = normalizeCategoryName(category_tr);

  // If Turkish name is being renamed (e.g. fixing mistaken URL in name_tr)
  if (new_tr && new_tr.trim() && new_tr.trim() !== category_tr) {
    const cleanNewTr = new_tr.trim();
    try {
      db.prepare('UPDATE custom_categories SET name_tr = ? WHERE name_tr = ? OR name_tr = ?').run(cleanNewTr, category_tr, normCat);
      db.prepare('UPDATE category_images SET category_name = ? WHERE category_name = ? OR category_name = ?').run(cleanNewTr, category_tr, normCat);
      db.prepare("UPDATE translation_overrides SET original_key = ? WHERE type = 'category' AND (original_key = ? OR original_key = ?)").run(cleanNewTr, category_tr, normCat);
      db.prepare('UPDATE hidden_categories SET category_name = ? WHERE category_name = ? OR category_name = ?').run(cleanNewTr, category_tr, normCat);
      db.prepare('UPDATE local_products SET category_tr = ? WHERE category_tr = ? OR category_tr = ?').run(cleanNewTr, category_tr, normCat);
    } catch(renErr) {}
  }

  // Handle caching image if external
  let finalImage = image;
  if (image !== undefined && image) {
    try {
      finalImage = await cacheExternalCategoryImageUrl(image, category_tr);
    } catch(imgErr) {
      return res.status(400).json({ error: imgErr.message });
    }
  }

  // Update custom_categories table if present
  const customCat = db.prepare("SELECT * FROM custom_categories WHERE name_tr = ? OR name_tr = ?").get(category_tr, normCat);
  if (customCat) {
    if (ar || en || image !== undefined || hidden !== undefined) {
      const updates = [];
      const params = [];
      if (ar) { updates.push('name_ar = ?'); params.push(ar); }
      if (en) { updates.push('name_en = ?'); params.push(en); }
      if (image !== undefined) { updates.push('image_url = ?'); params.push(finalImage || ''); }
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
    if (finalImage) {
      db.prepare('INSERT OR REPLACE INTO category_images (category_name, image_url, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)').run(category_tr, finalImage);
      if (normCat !== category_tr) {
        db.prepare('INSERT OR REPLACE INTO category_images (category_name, image_url, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)').run(normCat, finalImage);
      }
    } else {
      db.prepare('DELETE FROM category_images WHERE category_name = ? OR category_name = ?').run(category_tr, normCat);
    }
  }

  database.saveDatabase();
  res.json({ success: true, image: finalImage });
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

router.delete('/categories/:name', adminAuth, (req, res) => {
  try {
    const db = getDb();
    const name = decodeURIComponent(req.params.name);
    const { normalizeCategoryName } = require('../translations');
    const normCat = normalizeCategoryName(name);

    // Delete from custom_categories
    db.prepare('DELETE FROM custom_categories WHERE name_tr = ? OR name_tr = ? OR name_en = ? OR name_ar = ?').run(name, normCat, name, name);

    // Clean from category_images, hidden_categories, translation_overrides
    db.prepare('DELETE FROM category_images WHERE category_name = ? OR category_name = ?').run(name, normCat);
    db.prepare('DELETE FROM hidden_categories WHERE category_name = ? OR category_name = ?').run(name, normCat);
    db.prepare("DELETE FROM translation_overrides WHERE type = 'category' AND (original_key = ? OR original_key = ?)").run(name, normCat);

    database.saveDatabase();
    res.json({ success: true, message: `Category "${name}" deleted` });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
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

router.post('/custom-categories', adminAuth, async (req, res) => {
  try {
    const db = getDb();
    const { name_tr, name_ar, name_en, image_url, sort_order = 0 } = req.body;
    const cleanTr = (name_tr || name_ar || '').trim();
    const cleanAr = (name_ar || name_tr || '').trim();
    const cleanEn = (name_en || name_tr || '').trim();

    if (!cleanTr) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    let finalImage = image_url || '';
    if (image_url) {
      try {
        finalImage = await cacheExternalCategoryImageUrl(image_url, cleanTr);
      } catch(imgErr) {
        return res.status(400).json({ error: imgErr.message });
      }
    }

    const stmt = db.prepare(`
      INSERT INTO custom_categories (name_tr, name_ar, name_en, image_url, sort_order, active, created_at)
      VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
    `);
    stmt.run(cleanTr, cleanAr, cleanEn, finalImage || '', sort_order);

    if (cleanAr) {
      db.prepare(`DELETE FROM translation_overrides WHERE type = 'category' AND original_key = ? AND lang = 'ar'`).run(cleanTr);
      db.prepare(`INSERT INTO translation_overrides (type, original_key, lang, translation, updated_at) VALUES ('category', ?, 'ar', ?, CURRENT_TIMESTAMP)`).run(cleanTr, cleanAr);
    }
    if (cleanEn) {
      db.prepare(`DELETE FROM translation_overrides WHERE type = 'category' AND original_key = ? AND lang = 'en'`).run(cleanTr);
      db.prepare(`INSERT INTO translation_overrides (type, original_key, lang, translation, updated_at) VALUES ('category', ?, 'en', ?, CURRENT_TIMESTAMP)`).run(cleanTr, cleanEn);
    }
    if (finalImage) {
      db.prepare('INSERT OR REPLACE INTO category_images (category_name, image_url, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)').run(cleanTr, finalImage);
    }

    database.saveDatabase();
    res.json({ success: true, message: 'Category added successfully', image: finalImage });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/custom-categories/:id', adminAuth, async (req, res) => {
  try {
    const db = getDb();
    const { name_tr, name_ar, name_en, image_url, active, sort_order } = req.body;
    const catId = req.params.id;
    const existing = db.prepare('SELECT * FROM custom_categories WHERE id = ?').get(catId);
    if (!existing) return res.status(404).json({ error: 'Category not found' });

    let finalImage = image_url;
    if (image_url !== undefined && image_url) {
      try {
        finalImage = await cacheExternalCategoryImageUrl(image_url, existing.name_tr);
      } catch(imgErr) {
        return res.status(400).json({ error: imgErr.message });
      }
    }

    const updates = [];
    const params = [];
    if (name_tr !== undefined) { updates.push('name_tr = ?'); params.push(name_tr); }
    if (name_ar !== undefined) { updates.push('name_ar = ?'); params.push(name_ar); }
    if (name_en !== undefined) { updates.push('name_en = ?'); params.push(name_en); }
    if (image_url !== undefined) { updates.push('image_url = ?'); params.push(finalImage || ''); }
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
      if (finalImage) {
        db.prepare('INSERT OR REPLACE INTO category_images (category_name, image_url, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)').run(targetTr, finalImage);
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
    res.json({ success: true, image: finalImage });
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
  const normalized = (banners || []).map(b => ({
    ...b,
    image_url: normalizeImageUrl(b.image_url)
  }));
  res.json(normalized);
});

router.post('/banners', adminAuth, (req, res) => {
  const db = getDb();
  const { title_ar, title_en, title_tr, subtitle_ar, subtitle_en, subtitle_tr, image_url, link, sort_order } = req.body;
  if (!image_url) return res.status(400).json({ error: 'Image URL required' });
  const cleanImg = normalizeImageUrl(image_url);
  const result = db.prepare(
    'INSERT INTO banners (title_ar, title_en, title_tr, subtitle_ar, subtitle_en, subtitle_tr, image_url, link, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(title_ar || '', title_en || '', title_tr || '', subtitle_ar || '', subtitle_en || '', subtitle_tr || '', cleanImg, link || '', sort_order || 0);
  res.json({ success: true, id: result.lastInsertRowid });
});

router.put('/banners/:id', adminAuth, (req, res) => {
  const db = getDb();
  const { title_ar, title_en, title_tr, subtitle_ar, subtitle_en, subtitle_tr, image_url, link, sort_order, active } = req.body;
  const cleanImg = normalizeImageUrl(image_url);
  db.prepare(
    'UPDATE banners SET title_ar=?, title_en=?, title_tr=?, subtitle_ar=?, subtitle_en=?, subtitle_tr=?, image_url=?, link=?, sort_order=?, active=? WHERE id=?'
  ).run(title_ar || '', title_en || '', title_tr || '', subtitle_ar || '', subtitle_en || '', subtitle_tr || '', cleanImg, link || '', sort_order || 0, active !== undefined ? (active ? 1 : 0) : 1, req.params.id);
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

function getHostingerUploadsDir() {
  const hostingerBase = '/home/u424368414/domains/zakariaprom.com';
  if (fs.existsSync(hostingerBase)) {
    const perm = path.join(hostingerBase, 'uploads', 'products');
    if (!fs.existsSync(perm)) {
      try { fs.mkdirSync(perm, { recursive: true, mode: 0o777 }); } catch(e) {}
    }
    return perm;
  }
  return null;
}

const localProductUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(__dirname, '..', '..', 'public', 'uploads', 'products');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      getHostingerUploadsDir(); // Ensure permanent storage directory exists
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, 'prod_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6) + ext);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Force scan and restore all uploaded product photos from older Hostinger builds/backups
router.post('/recover-uploads', adminAuth, (req, res) => {
  try {
    const hostingerBase = '/home/u424368414/domains/zakariaprom.com';
    const permDir = getHostingerUploadsDir() || path.join(__dirname, '..', '..', 'public', 'uploads', 'products');
    const localDir = path.join(__dirname, '..', '..', 'public', 'uploads', 'products');
    
    if (!fs.existsSync(permDir)) fs.mkdirSync(permDir, { recursive: true, mode: 0o777 });
    if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true, mode: 0o777 });

    const searchRoots = [
      path.join(hostingerBase, 'hbuilds'),
      path.join(hostingerBase, 'public_html'),
      path.join(hostingerBase, 'nodejs'),
      hostingerBase,
      '/home/u424368414/backups'
    ];

    let recovered = [];
    function scan(dir, depth = 0) {
      if (depth > 6 || !fs.existsSync(dir)) return;
      try {
        const list = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of list) {
          const full = path.join(dir, item.name);
          if (item.isDirectory()) {
            if (item.name === 'node_modules' || item.name === '.git' || item.name === '.cache') continue;
            scan(full, depth + 1);
          } else if (item.isFile() && item.name.startsWith('prod_')) {
            const targetPerm = path.join(permDir, item.name);
            const targetLocal = path.join(localDir, item.name);
            if (!fs.existsSync(targetPerm)) {
              try { fs.copyFileSync(full, targetPerm); } catch(e) {}
            }
            if (!fs.existsSync(targetLocal)) {
              try { fs.copyFileSync(full, targetLocal); } catch(e) {}
            }
            recovered.push({ name: item.name, from: full });
          }
        }
      } catch(e) {}
    }

    for (const root of searchRoots) {
      if (fs.existsSync(root)) scan(root, 0);
    }

    res.json({ success: true, count: recovered.length, recovered });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
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
  const rawId = String(req.params.id).replace(/^(local_|etkin_|xml_)/, '');
  const numId = !isNaN(Number(rawId)) ? Number(rawId) : -1;
  const p = db.prepare(`
    SELECT * FROM local_products 
    WHERE id = ? 
       OR product_id = ? 
       OR ('local_' || id) = ?
       OR (id = ? AND ? > 0)
  `).get(req.params.id, req.params.id, req.params.id, numId, numId);
  if (!p) return res.status(404).json({ error: 'Product not found' });
  res.json({ product: { ...p, colors: JSON.parse(p.colors || '[]'), sizes: JSON.parse(p.sizes || '[]'), images: JSON.parse(p.images || '[]') } });
});

// POST add new local product
router.post('/local-products', adminAuth, localProductUpload.array('images', 10), (req, res) => {
  try {
    const db = getDb();
    const { name_tr, name_ar, name_en, model, description, price, quantity, category_tr, category_ar, category_en, colors, sizes } = req.body;
    const images = (req.files || []).map(f => '/uploads/products/' + f.filename);

    // Mirror to permanent Hostinger storage
    const permDir = getHostingerUploadsDir();
    if (permDir && req.files && req.files.length > 0) {
      req.files.forEach(f => {
        try { fs.copyFileSync(f.path, path.join(permDir, f.filename)); } catch(e) {}
      });
    }

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
    const rawId = String(req.params.id).replace(/^(local_|etkin_|xml_)/, '');
    const numId = !isNaN(Number(rawId)) ? Number(rawId) : -1;
    const { name_tr, name_ar, name_en, model, description, price, quantity, category_tr, category_ar, category_en, colors, sizes, existing_images } = req.body;
    const newImages = (req.files || []).map(f => '/uploads/products/' + f.filename);
    const keepImages = existing_images ? (typeof existing_images === 'string' ? JSON.parse(existing_images) : existing_images) : [];
    const allImages = [...keepImages, ...newImages];

    // Mirror to permanent Hostinger storage
    const permDir = getHostingerUploadsDir();
    if (permDir && req.files && req.files.length > 0) {
      req.files.forEach(f => {
        try { fs.copyFileSync(f.path, path.join(permDir, f.filename)); } catch(e) {}
      });
    }

    const existing = db.prepare(`
      SELECT id FROM local_products 
      WHERE id = ? 
         OR product_id = ? 
         OR ('local_' || id) = ?
         OR (id = ? AND ? > 0)
    `).get(req.params.id, req.params.id, req.params.id, numId, numId);

    const targetRowId = existing ? existing.id : numId;

    db.prepare(
      'UPDATE local_products SET name_tr=?, name_ar=?, name_en=?, model=?, description=?, price=?, quantity=?, category_tr=?, category_ar=?, category_en=?, colors=?, sizes=?, images=?, updated_at=CURRENT_TIMESTAMP WHERE id=?'
    ).run(
      name_tr || '', name_ar || '', name_en || '', model || '', description || '',
      parseFloat(price) || 0, parseInt(quantity) || 0,
      category_tr || '', category_ar || '', category_en || '',
      colors || '[]',
      sizes || '[]',
      JSON.stringify(allImages),
      targetRowId
    );
    database.saveDatabase();
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// DELETE local product
router.delete('/local-products/:id', adminAuth, (req, res) => {
  const db = getDb();
  const rawId = String(req.params.id).replace(/^(local_|etkin_|xml_)/, '');
  const numId = !isNaN(Number(rawId)) ? Number(rawId) : -1;
  db.prepare(`
    DELETE FROM local_products 
    WHERE id = ? 
       OR product_id = ? 
       OR ('local_' || id) = ?
       OR (id = ? AND ? > 0)
  `).run(req.params.id, req.params.id, req.params.id, numId, numId);
  database.saveDatabase();
  res.json({ success: true });
});

// Toggle local product visibility
router.put('/local-products/:id/visibility', adminAuth, (req, res) => {
  const db = getDb();
  const { hidden } = req.body;
  const id = req.params.id;
  const rawId = String(id).replace(/^(local_|etkin_|xml_)/, '');
  const numId = !isNaN(Number(rawId)) ? Number(rawId) : -1;

  const lp = db.prepare(`
    SELECT * FROM local_products 
    WHERE id = ? 
       OR product_id = ? 
       OR ('local_' || id) = ?
       OR (id = ? AND ? > 0)
  `).get(id, id, id, numId, numId);

  const pId = lp ? (lp.product_id || ('local_' + lp.id)) : String(id);
  const cleanRawId = pId.replace(/^(etkin_|xml_|local_)/, '');

  db.prepare(`
    UPDATE local_products 
    SET hidden = ? 
    WHERE id = ? OR product_id = ? OR ('local_' || id) = ? OR (id = ? AND ? > 0)
  `).run(hidden ? 1 : 0, id, id, id, numId, numId);

  if (hidden) {
    db.prepare('INSERT OR IGNORE INTO hidden_products (product_id) VALUES (?)').run(pId);
    db.prepare('INSERT OR IGNORE INTO hidden_products (product_id) VALUES (?)').run(cleanRawId);
    db.prepare('INSERT OR IGNORE INTO hidden_products (product_id) VALUES (?)').run(String(id));
  } else {
    db.prepare('DELETE FROM hidden_products WHERE product_id = ? OR product_id = ? OR product_id = ?').run(pId, cleanRawId, String(id));
  }
  database.saveDatabase();
  res.json({ success: true });
});

// ========== PRODUCT CATEGORY OVERRIDE ==========
// Change the category of a product (XML, Etkin, or local)
router.post('/products/:id/category', adminAuth, (req, res) => {
  try {
    const db = getDb();
    const { new_category_tr, new_category_ar, new_category_en } = req.body;
    if (!new_category_tr) return res.status(400).json({ error: 'new_category_tr required' });

    const rawId = String(req.params.id).replace(/^(local_|etkin_|xml_)/, '');
    const numId = !isNaN(Number(rawId)) ? Number(rawId) : -1;

    // Update in local_products directly if present
    db.prepare(`
      UPDATE local_products 
      SET category_tr = ?, 
          category_ar = COALESCE(NULLIF(?, ''), category_ar), 
          category_en = COALESCE(NULLIF(?, ''), category_en),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? OR product_id = ? OR ('local_' || id) = ? OR (id = ? AND ? > 0)
    `).run(new_category_tr, new_category_ar || '', new_category_en || '', req.params.id, req.params.id, req.params.id, numId, numId);

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

// Full Audit & Sync for Etkin Promosyon (Verifies 100% catalog completeness)
router.post('/audit-and-sync-etkin', adminAuth, async (req, res) => {
  try {
    const db = getDb();
    const { fetchEtkinApi, syncEtkinProducts } = require('../services/etkinService');

    // 1. Purge any leftover Karmedya products
    const purge = db.prepare(`
      DELETE FROM local_products 
      WHERE (
        (product_id NOT LIKE 'etkin_%' AND (product_id IS NOT NULL AND product_id != ''))
        AND product_id NOT LIKE 'prod_%' 
        AND product_id NOT LIKE 'local_%' 
        AND id NOT IN (133477, 137094, 137095)
      ) OR images LIKE '%karmedya.com%'
    `).run();

    // 2. Purge orphaned empty categories with 0 products
    const purgeEmpty = db.prepare(`
      DELETE FROM custom_categories 
      WHERE name_tr NOT IN (
        SELECT DISTINCT category_tr FROM local_products 
        WHERE hidden = 0 AND images NOT LIKE '%karmedya.com%' AND category_tr IS NOT NULL AND category_tr != ''
      )
    `).run();

    // 3. Fetch all products from Etkin API
    const items = await fetchEtkinApi(db, 'tum_urunler');
    const totalApiProducts = Array.isArray(items) ? items.length : 0;

    // 4. Perform synchronization into database
    const syncResult = await syncEtkinProducts(db, database.saveDatabase);

    // 5. Verify count in DB
    const etkinInDb = db.prepare("SELECT count(*) as c FROM local_products WHERE product_id LIKE 'etkin_%'").get().c;
    const localInDb = db.prepare("SELECT count(*) as c FROM local_products WHERE product_id NOT LIKE 'etkin_%' AND images NOT LIKE '%karmedya.com%'").get().c;
    const karmedyaInDb = db.prepare("SELECT count(*) as c FROM local_products WHERE images LIKE '%karmedya.com%'").get().c;

    const isComplete = (etkinInDb >= totalApiProducts && totalApiProducts > 0);

    res.json({
      success: true,
      audit: {
        etkinApiTotal: totalApiProducts,
        etkinDbTotal: etkinInDb,
        isCatalogComplete: isComplete,
        missingCount: Math.max(0, totalApiProducts - etkinInDb),
        localManualProducts: localInDb,
        karmedyaRemaining: karmedyaInDb,
        purgedKarmedyaCount: purge.changes,
        purgedEmptyCategories: purgeEmpty.changes
      },
      syncResult
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message, stack: err.stack });
  }
});

// Trigger Full Synchronization (Etkin Promosyon only)
router.post('/sync-all', async (req, res) => {
  try {
    const db = getDb();
    const { syncEtkinProducts } = require('../services/etkinService');

    // 1. Purge Karmedya
    db.prepare(`
      DELETE FROM local_products 
      WHERE (
        (product_id NOT LIKE 'etkin_%' AND (product_id IS NOT NULL AND product_id != ''))
        AND product_id NOT LIKE 'prod_%' 
        AND product_id NOT LIKE 'local_%' 
        AND id NOT IN (133477, 137094, 137095)
      ) OR images LIKE '%karmedya.com%'
    `).run();

    // 2. Purge orphaned empty categories with 0 products
    db.prepare(`
      DELETE FROM custom_categories 
      WHERE name_tr NOT IN (
        SELECT DISTINCT category_tr FROM local_products 
        WHERE hidden = 0 AND images NOT LIKE '%karmedya.com%' AND category_tr IS NOT NULL AND category_tr != ''
      )
    `).run();

    // 3. Sync Etkin products
    const etkinResult = await syncEtkinProducts(db, database.saveDatabase);

    const totalRow = db.prepare('SELECT COUNT(*) as count FROM local_products WHERE hidden = 0').get();
    const total = totalRow ? totalRow.count : 0;
    res.json({ success: true, totalProducts: total, etkinResult });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
