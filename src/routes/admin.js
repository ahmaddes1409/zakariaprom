const express = require('express');
const { db } = require('../database');
const { adminAuth, adminLogin } = require('../auth');
const { fetchAndParseProducts, getCategories } = require('../dataService');

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
router.get('/translations', adminAuth, (req, res) => {
  const overrides = db.prepare('SELECT * FROM translation_overrides ORDER BY type, original_key').all();
  res.json(overrides);
});

router.post('/translations', adminAuth, (req, res) => {
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

router.delete('/translations/:id', adminAuth, (req, res) => {
  db.prepare('DELETE FROM translation_overrides WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ===== PRODUCTS MANAGEMENT =====
router.get('/products/hidden', adminAuth, (req, res) => {
  const hidden = db.prepare('SELECT * FROM hidden_products').all();
  res.json(hidden);
});

router.post('/products/hide', adminAuth, (req, res) => {
  const { product_id } = req.body;
  db.prepare('INSERT OR IGNORE INTO hidden_products (product_id) VALUES (?)').run(product_id);
  res.json({ success: true });
});

router.post('/products/show', adminAuth, (req, res) => {
  const { product_id } = req.body;
  db.prepare('DELETE FROM hidden_products WHERE product_id = ?').run(product_id);
  res.json({ success: true });
});

// ===== CATEGORIES MANAGEMENT =====
router.get('/categories/hidden', adminAuth, (req, res) => {
  const hidden = db.prepare('SELECT * FROM hidden_categories').all();
  res.json(hidden);
});

router.post('/categories/hide', adminAuth, (req, res) => {
  const { category_name } = req.body;
  db.prepare('INSERT OR IGNORE INTO hidden_categories (category_name) VALUES (?)').run(category_name);
  res.json({ success: true });
});

router.post('/categories/show', adminAuth, (req, res) => {
  const { category_name } = req.body;
  db.prepare('DELETE FROM hidden_categories WHERE category_name = ?').run(category_name);
  res.json({ success: true });
});

// ===== ORDERS =====
router.get('/orders', adminAuth, (req, res) => {
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
  const { status } = req.body;
  const validStatuses = ['new', 'processing', 'quoted', 'confirmed', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  db.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, req.params.id);
  res.json({ success: true });
});

router.delete('/orders/:id', adminAuth, (req, res) => {
  db.prepare('DELETE FROM orders WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ===== USERS =====
router.get('/users', adminAuth, (req, res) => {
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
  const settings = db.prepare('SELECT * FROM settings').all();
  const settingsObj = {};
  settings.forEach(s => { settingsObj[s.key] = s.value; });
  res.json(settingsObj);
});

router.put('/settings', adminAuth, (req, res) => {
  const updates = req.body;
  const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)');
  const transaction = db.transaction((items) => {
    for (const [key, value] of Object.entries(items)) {
      stmt.run(key, value);
    }
  });
  transaction(updates);
  res.json({ success: true });
});

// ===== COUPONS =====
router.get('/coupons', adminAuth, (req, res) => {
  const coupons = db.prepare('SELECT * FROM coupons ORDER BY created_at DESC').all();
  res.json(coupons);
});

router.post('/coupons', adminAuth, (req, res) => {
  const { code, discount_type, discount_value, min_items, max_uses, expires_at } = req.body;
  if (!code || !discount_value) {
    return res.status(400).json({ error: 'Code and discount value required' });
  }
  const result = db.prepare(
    'INSERT INTO coupons (code, discount_type, discount_value, min_items, max_uses, expires_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(code.toUpperCase(), discount_type || 'percentage', discount_value, min_items || 0, max_uses || 0, expires_at || null);
  res.json({ success: true, id: result.lastInsertRowid });
});

router.put('/coupons/:id', adminAuth, (req, res) => {
  const { active } = req.body;
  db.prepare('UPDATE coupons SET active = ? WHERE id = ?').run(active ? 1 : 0, req.params.id);
  res.json({ success: true });
});

router.delete('/coupons/:id', adminAuth, (req, res) => {
  db.prepare('DELETE FROM coupons WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ===== BLOG/NEWS =====
router.get('/posts', adminAuth, (req, res) => {
  const posts = db.prepare('SELECT * FROM posts ORDER BY created_at DESC').all();
  res.json(posts);
});

router.post('/posts', adminAuth, (req, res) => {
  const { title_ar, title_en, title_tr, content_ar, content_en, content_tr, image, published } = req.body;
  const result = db.prepare(
    'INSERT INTO posts (title_ar, title_en, title_tr, content_ar, content_en, content_tr, image, published) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(title_ar, title_en || '', title_tr || '', content_ar, content_en || '', content_tr || '', image || '', published ? 1 : 0);
  res.json({ success: true, id: result.lastInsertRowid });
});

router.put('/posts/:id', adminAuth, (req, res) => {
  const { title_ar, title_en, title_tr, content_ar, content_en, content_tr, image, published } = req.body;
  db.prepare(
    'UPDATE posts SET title_ar=?, title_en=?, title_tr=?, content_ar=?, content_en=?, content_tr=?, image=?, published=?, updated_at=CURRENT_TIMESTAMP WHERE id=?'
  ).run(title_ar, title_en || '', title_tr || '', content_ar, content_en || '', content_tr || '', image || '', published ? 1 : 0, req.params.id);
  res.json({ success: true });
});

router.delete('/posts/:id', adminAuth, (req, res) => {
  db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ===== CHATBOT FAQ =====
router.get('/chatbot', adminAuth, (req, res) => {
  const faqs = db.prepare('SELECT * FROM chatbot_faq ORDER BY priority DESC').all();
  res.json(faqs);
});

router.post('/chatbot', adminAuth, (req, res) => {
  const { question_ar, question_en, question_tr, answer_ar, answer_en, answer_tr, keywords, priority } = req.body;
  const result = db.prepare(
    'INSERT INTO chatbot_faq (question_ar, question_en, question_tr, answer_ar, answer_en, answer_tr, keywords, priority) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(question_ar, question_en || '', question_tr || '', answer_ar, answer_en || '', answer_tr || '', keywords || '', priority || 0);
  res.json({ success: true, id: result.lastInsertRowid });
});

router.put('/chatbot/:id', adminAuth, (req, res) => {
  const { question_ar, question_en, question_tr, answer_ar, answer_en, answer_tr, keywords, priority, active } = req.body;
  db.prepare(
    'UPDATE chatbot_faq SET question_ar=?, question_en=?, question_tr=?, answer_ar=?, answer_en=?, answer_tr=?, keywords=?, priority=?, active=? WHERE id=?'
  ).run(question_ar, question_en || '', question_tr || '', answer_ar, answer_en || '', answer_tr || '', keywords || '', priority || 0, active ? 1 : 0, req.params.id);
  res.json({ success: true });
});

router.delete('/chatbot/:id', adminAuth, (req, res) => {
  db.prepare('DELETE FROM chatbot_faq WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ===== ANALYTICS =====
router.get('/analytics', adminAuth, (req, res) => {
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

module.exports = router;
