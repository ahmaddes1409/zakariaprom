const express = require('express');
const database = require('../database');
const { adminAuth, adminLogin } = require('../auth');
const { fetchAndParseProducts, getCategories } = require('../dataService');

function getDb() { return database.db; }

const router = express.Router();

// Admin Login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  const result = adminLogin(username, password);
  if (!result) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  res.cookie('admin_token', result.token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.json(result);
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

// ===== DASHBOARD =====
router.get('/dashboard', adminAuth, async (req, res) => {
  try {
    const db = getDb();
    const products = await fetchAndParseProducts();
    const categories = getCategories(products);
    const totalOrders = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
    const newOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'new'").get().count;
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const totalVisits = db.prepare('SELECT COUNT(*) as count FROM analytics WHERE created_at > datetime("now", "-30 days")').get().count;
    const recentOrders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 10').all();
    const topProducts = db.prepare('SELECT product_id, COUNT(*) as views FROM analytics WHERE product_id IS NOT NULL AND action = "view" GROUP BY product_id ORDER BY views DESC LIMIT 10').all();

    res.json({
      stats: {
        totalProducts: products.length,
        totalCategories: categories.length,
        totalOrders,
        newOrders,
        totalUsers,
        totalVisits
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
  const overrides = db.prepare('SELECT * FROM translation_overrides ORDER BY type, original_key').all();
  
  // Build override map
  const overrideMap = {};
  overrides.forEach(o => {
    if (!overrideMap[o.type]) overrideMap[o.type] = {};
    if (!overrideMap[o.type][o.original_key]) overrideMap[o.type][o.original_key] = {};
    overrideMap[o.type][o.original_key][o.lang] = o.translation;
  });

  // Get all categories from products
  try {
    const products = await fetchAndParseProducts();
    const allCategories = getCategories(products);
    
    // Merge categories with overrides
    const categories = allCategories.map(cat => ({
      tr: cat.tr,
      ar: overrideMap.category?.[cat.tr]?.ar || cat.ar,
      en: overrideMap.category?.[cat.tr]?.en || cat.en
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
    // Fallback: just return overrides grouped
    const categories = [];
    const terms = [];
    overrides.forEach(o => {
      const list = o.type === 'category' ? categories : terms;
      let existing = list.find(i => i.tr === o.original_key);
      if (!existing) { existing = { tr: o.original_key, ar: '', en: '' }; list.push(existing); }
      existing[o.lang] = o.translation;
    });
    res.json({ categories, terms });
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
  res.json({ success: true });
});

// GET /translations/products - paginated product translations with search
router.get('/translations/products', adminAuth, async (req, res) => {
  try {
    const db = getDb();
    const { page = 1, limit = 20, search = '' } = req.query;
    let products = await fetchAndParseProducts();
    
    // Apply search filter
    if (search) {
      const q = search.toLowerCase();
      products = products.filter(p => 
        (p.name?.tr || '').toLowerCase().includes(q) ||
        (p.name?.ar || '').toLowerCase().includes(q) ||
        (p.name?.en || '').toLowerCase().includes(q) ||
        (p.model || '').toLowerCase().includes(q)
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
    
    const result = paginated.map(p => ({
      model: p.model,
      tr: p.name?.tr || '',
      ar: overrideMap[p.model]?.ar || p.name?.ar || '',
      en: overrideMap[p.model]?.en || p.name?.en || ''
    }));
    
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
    const { search, page = 1, limit = 20 } = req.query;
    let products = await fetchAndParseProducts();
    if (search) {
      const q = search.toLowerCase();
      products = products.filter(p => 
        (p.name?.tr || '').toLowerCase().includes(q) ||
        (p.name?.ar || '').toLowerCase().includes(q) ||
        (p.model || '').toLowerCase().includes(q)
      );
    }
    // Add hidden status
    const db = getDb();
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
    const products = await fetchAndParseProducts();
    const product = products.find(p => p.id === req.params.id || p.model === req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    
    // Check for name overrides
    const db = getDb();
    const overrides = db.prepare("SELECT lang, translation FROM translation_overrides WHERE type = 'product' AND original_key = ?").all(product.model);
    if (overrides.length > 0) {
      overrides.forEach(o => { product.name[o.lang] = o.translation; });
    }
    
    res.json({ product });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /products/:id - update product name translations
router.put('/products/:id', adminAuth, async (req, res) => {
  try {
    const db = getDb();
    const { name_tr, name_ar, name_en, price } = req.body;
    const products = await fetchAndParseProducts();
    const product = products.find(p => p.id === req.params.id || p.model === req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    
    const model = product.model;
    // Save Arabic override
    if (name_ar) {
      db.prepare(`
        INSERT INTO translation_overrides (type, original_key, lang, translation, updated_at)
        VALUES ('product', ?, 'ar', ?, CURRENT_TIMESTAMP)
        ON CONFLICT(type, original_key, lang) DO UPDATE SET translation = ?, updated_at = CURRENT_TIMESTAMP
      `).run(model, name_ar, name_ar);
    }
    // Save English override
    if (name_en) {
      db.prepare(`
        INSERT INTO translation_overrides (type, original_key, lang, translation, updated_at)
        VALUES ('product', ?, 'en', ?, CURRENT_TIMESTAMP)
        ON CONFLICT(type, original_key, lang) DO UPDATE SET translation = ?, updated_at = CURRENT_TIMESTAMP
      `).run(model, name_en, name_en);
    }
    // Save Turkish override (only if different from original)
    if (name_tr && name_tr !== product.name.tr) {
      db.prepare(`
        INSERT INTO translation_overrides (type, original_key, lang, translation, updated_at)
        VALUES ('product', ?, 'tr', ?, CURRENT_TIMESTAMP)
        ON CONFLICT(type, original_key, lang) DO UPDATE SET translation = ?, updated_at = CURRENT_TIMESTAMP
      `).run(model, name_tr, name_tr);
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
    const productId = req.params.id;
    if (hidden) {
      db.prepare('INSERT OR IGNORE INTO hidden_products (product_id) VALUES (?)').run(productId);
    } else {
      db.prepare('DELETE FROM hidden_products WHERE product_id = ?').run(productId);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== CATEGORIES MANAGEMENT =====
router.get('/categories', adminAuth, async (req, res) => {
  try {
    const db = getDb();
    const products = await fetchAndParseProducts();
    const categories = getCategories(products);
    const hiddenCats = db.prepare('SELECT category_name FROM hidden_categories').all().map(h => h.category_name);
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
    const result = categories.map(cat => ({
      ...cat,
      ...(overrideMap[cat.tr] || {}),
      hidden: hiddenCats.includes(cat.tr),
      image: imageMap[cat.tr] || ''
    }));
    res.json({ categories: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/categories/:name', adminAuth, async (req, res) => {
  try {
    const db = getDb();
    const catName = decodeURIComponent(req.params.name);
    const products = await fetchAndParseProducts();
    const categories = getCategories(products);
    const cat = categories.find(c => c.tr === catName);
    if (!cat) return res.status(404).json({ error: 'Category not found' });
    const hiddenCats = db.prepare('SELECT category_name FROM hidden_categories').all().map(h => h.category_name);
    const overrides = db.prepare("SELECT * FROM translation_overrides WHERE type = 'category' AND original_key = ?").all(catName);
    const overrideObj = {};
    overrides.forEach(o => { overrideObj[o.lang] = o.translation; });
    const imageRow = db.prepare('SELECT image_url FROM category_images WHERE category_name = ?').get(catName);
    res.json({ category: { ...cat, ...overrideObj, hidden: hiddenCats.includes(catName), image: imageRow?.image_url || '' } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/categories', adminAuth, (req, res) => {
  const db = getDb();
  const { category_tr, ar, en, hidden, image } = req.body;
  if (!category_tr) return res.status(400).json({ error: 'category_tr required' });
  // Save translations
  if (ar) {
    db.prepare(`INSERT INTO translation_overrides (type, original_key, lang, translation, updated_at)
      VALUES ('category', ?, 'ar', ?, CURRENT_TIMESTAMP)
      ON CONFLICT(type, original_key, lang) DO UPDATE SET translation = ?, updated_at = CURRENT_TIMESTAMP`
    ).run(category_tr, ar, ar);
  }
  if (en) {
    db.prepare(`INSERT INTO translation_overrides (type, original_key, lang, translation, updated_at)
      VALUES ('category', ?, 'en', ?, CURRENT_TIMESTAMP)
      ON CONFLICT(type, original_key, lang) DO UPDATE SET translation = ?, updated_at = CURRENT_TIMESTAMP`
    ).run(category_tr, en, en);
  }
  // Handle hidden state
  if (hidden) {
    db.prepare('INSERT OR IGNORE INTO hidden_categories (category_name) VALUES (?)').run(category_tr);
  } else {
    db.prepare('DELETE FROM hidden_categories WHERE category_name = ?').run(category_tr);
  }
  // Handle image
  if (image !== undefined) {
    if (image) {
      db.prepare('INSERT OR REPLACE INTO category_images (category_name, image_url, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)').run(category_tr, image);
    } else {
      db.prepare('DELETE FROM category_images WHERE category_name = ?').run(category_tr);
    }
  }
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
  db.prepare('INSERT OR IGNORE INTO hidden_categories (category_name) VALUES (?)').run(category_name);
  res.json({ success: true });
});

router.post('/categories/show', adminAuth, (req, res) => {
  const db = getDb();
  const { category_name } = req.body;
  db.prepare('DELETE FROM hidden_categories WHERE category_name = ?').run(category_name);
  res.json({ success: true });
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
  res.json(posts);
});

router.post('/posts', adminAuth, (req, res) => {
  const db = getDb();
  const { title_ar, title_en, title_tr, content_ar, content_en, content_tr, image, published } = req.body;
  const result = db.prepare(
    'INSERT INTO posts (title_ar, title_en, title_tr, content_ar, content_en, content_tr, image, published) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(title_ar, title_en || '', title_tr || '', content_ar, content_en || '', content_tr || '', image || '', published ? 1 : 0);
  res.json({ success: true, id: result.lastInsertRowid });
});

router.put('/posts/:id', adminAuth, (req, res) => {
  const db = getDb();
  const { title_ar, title_en, title_tr, content_ar, content_en, content_tr, image, published } = req.body;
  db.prepare(
    'UPDATE posts SET title_ar=?, title_en=?, title_tr=?, content_ar=?, content_en=?, content_tr=?, image=?, published=?, updated_at=CURRENT_TIMESTAMP WHERE id=?'
  ).run(title_ar, title_en || '', title_tr || '', content_ar, content_en || '', content_tr || '', image || '', published ? 1 : 0, req.params.id);
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
  const result = db.prepare(
    'INSERT INTO chatbot_faq (question_ar, question_en, question_tr, answer_ar, answer_en, answer_tr, keywords, priority) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(question_ar, question_en || '', question_tr || '', answer_ar, answer_en || '', answer_tr || '', keywords || '', priority || 0);
  res.json({ success: true, id: result.lastInsertRowid });
});

router.put('/chatbot/:id', adminAuth, (req, res) => {
  const db = getDb();
  const { question_ar, question_en, question_tr, answer_ar, answer_en, answer_tr, keywords, priority, active } = req.body;
  db.prepare(
    'UPDATE chatbot_faq SET question_ar=?, question_en=?, question_tr=?, answer_ar=?, answer_en=?, answer_tr=?, keywords=?, priority=?, active=? WHERE id=?'
  ).run(question_ar, question_en || '', question_tr || '', answer_ar, answer_en || '', answer_tr || '', keywords || '', priority || 0, active ? 1 : 0, req.params.id);
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

module.exports = router;
