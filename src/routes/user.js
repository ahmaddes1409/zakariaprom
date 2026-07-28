const express = require('express');
const database = require('../database');
const { userAuth, optionalUserAuth, registerUser, loginUser } = require('../auth');
const { nanoid } = require('../utils');

function getDb() { return database.db; }

const router = express.Router();

// ===== AUTH =====
router.post('/register', (req, res) => {
  const { email, password, name, phone, company, country, language } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, and name are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  const result = registerUser(email, password, name, phone, company, country, language);
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }
  res.cookie('user_token', result.token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.json(result);
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  const result = loginUser(email, password);
  if (result.error) {
    return res.status(401).json({ error: result.error });
  }
  res.cookie('user_token', result.token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.json(result);
});

router.post('/logout', (req, res) => {
  res.clearCookie('user_token');
  res.json({ success: true });
});

router.get('/me', userAuth, (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id, email, name, phone, company, country, language, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

router.put('/profile', userAuth, (req, res) => {
  const db = getDb();
  const { name, phone, company, country, language } = req.body;
  db.prepare('UPDATE users SET name=?, phone=?, company=?, country=?, language=? WHERE id=?')
    .run(name || '', phone || '', company || '', country || '', language || 'ar', req.user.id);
  res.json({ success: true });
});

// ===== CART =====
router.get('/cart', optionalUserAuth, (req, res) => {
  const db = getDb();
  const sessionId = (req.cookies && req.cookies.session_id) || req.headers['x-session-id'];
  let items;
  if (req.user) {
    items = db.prepare('SELECT * FROM cart_items WHERE user_id = ? ORDER BY added_at DESC').all(req.user.id);
  } else if (sessionId) {
    items = db.prepare('SELECT * FROM cart_items WHERE session_id = ? AND user_id IS NULL ORDER BY added_at DESC').all(sessionId);
  } else {
    items = [];
  }
  res.json(items);
});

router.post('/cart', optionalUserAuth, (req, res) => {
  const db = getDb();
  const { product_id, product_name, product_image, quantity, options, session_id } = req.body;
  if (!product_id) return res.status(400).json({ error: 'product_id required' });

  const userId = req.user ? req.user.id : null;
  const sessId = session_id || (req.cookies && req.cookies.session_id) || null;

  // Check if already in cart
  let existing;
  if (userId) {
    existing = db.prepare('SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?').get(userId, product_id);
  } else if (sessId) {
    existing = db.prepare('SELECT * FROM cart_items WHERE session_id = ? AND product_id = ? AND user_id IS NULL').get(sessId, product_id);
  }

  if (existing) {
    db.prepare('UPDATE cart_items SET quantity = quantity + ? WHERE id = ?').run(quantity || 1, existing.id);
  } else {
    db.prepare(
      'INSERT INTO cart_items (user_id, session_id, product_id, product_name, product_image, quantity, options) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(userId, sessId, product_id, product_name || '', product_image || '', quantity || 1, JSON.stringify(options || {}));
  }

  const count = userId
    ? db.prepare('SELECT COUNT(*) as count FROM cart_items WHERE user_id = ?').get(userId).count
    : db.prepare('SELECT COUNT(*) as count FROM cart_items WHERE session_id = ? AND user_id IS NULL').get(sessId).count;

  res.json({ success: true, count });
});

router.put('/cart/:id', optionalUserAuth, (req, res) => {
  const db = getDb();
  const { quantity } = req.body;
  if (quantity <= 0) {
    db.prepare('DELETE FROM cart_items WHERE id = ?').run(req.params.id);
  } else {
    db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(quantity, req.params.id);
  }
  res.json({ success: true });
});

router.delete('/cart/:id', optionalUserAuth, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM cart_items WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.delete('/cart', optionalUserAuth, (req, res) => {
  const db = getDb();
  if (req.user) {
    db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user.id);
  } else {
    const sessionId = (req.cookies && req.cookies.session_id) || req.headers['x-session-id'];
    if (sessionId) {
      db.prepare('DELETE FROM cart_items WHERE session_id = ? AND user_id IS NULL').run(sessionId);
    }
  }
  res.json({ success: true });
});

// Merge guest cart into user cart after login
router.post('/cart/merge', userAuth, (req, res) => {
  const db = getDb();
  const { session_id } = req.body;
  if (session_id) {
    const guestItems = db.prepare('SELECT * FROM cart_items WHERE session_id = ? AND user_id IS NULL').all(session_id);
    for (const item of guestItems) {
      const existing = db.prepare('SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?').get(req.user.id, item.product_id);
      if (existing) {
        db.prepare('UPDATE cart_items SET quantity = quantity + ? WHERE id = ?').run(item.quantity, existing.id);
        db.prepare('DELETE FROM cart_items WHERE id = ?').run(item.id);
      } else {
        db.prepare('UPDATE cart_items SET user_id = ?, session_id = NULL WHERE id = ?').run(req.user.id, item.id);
      }
    }
  }
  const items = db.prepare('SELECT * FROM cart_items WHERE user_id = ?').all(req.user.id);
  res.json({ success: true, items, count: items.length });
});

// ===== ORDERS (Quote Requests) =====
router.post('/orders', optionalUserAuth, (req, res) => {
  const db = getDb();
  const { guest_name, guest_email, guest_phone, guest_company, notes, language, session_id } = req.body;

  // Get cart items
  let items;
  if (req.user) {
    items = db.prepare('SELECT * FROM cart_items WHERE user_id = ?').all(req.user.id);
  } else if (session_id) {
    items = db.prepare('SELECT * FROM cart_items WHERE session_id = ? AND user_id IS NULL').all(session_id);
  } else {
    return res.status(400).json({ error: 'No cart items found' });
  }

  if (items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty' });
  }

  const orderNumber = 'ZP-' + nanoid(8).toUpperCase();
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  db.prepare(`
    INSERT INTO orders (order_number, user_id, guest_name, guest_email, guest_phone, guest_company, items, notes, total_items, language)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    orderNumber,
    req.user ? req.user.id : null,
    guest_name || '',
    guest_email || '',
    guest_phone || '',
    guest_company || '',
    JSON.stringify(items),
    notes || '',
    totalItems,
    language || 'ar'
  );

  // Clear cart
  if (req.user) {
    db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user.id);
  } else if (session_id) {
    db.prepare('DELETE FROM cart_items WHERE session_id = ? AND user_id IS NULL').run(session_id);
  }

  // Dispatch Email Notification to Admin (info@zakariaprom.com)
  try {
    const { sendContactEmail } = require('../services/mailer');
    const itemsSummary = items.map((it, idx) => `${idx + 1}. ${it.product_name || 'منتج'} (الكمية: ${it.quantity})`).join('\n');
    sendContactEmail({
      name: guest_name || (req.user ? req.user.name : 'عميل الموقع'),
      email: guest_email || (req.user ? req.user.email : ''),
      phone: guest_phone || (req.user ? req.user.phone : ''),
      message: `طلب رقم: ${orderNumber}\nالشركة: ${guest_company || 'غير محدد'}\nملاحظات: ${notes || 'لا يوجد'}\n\nالمنتجات:\n${itemsSummary}`,
      subject: `🛒 طلب سعر جديد رقم ${orderNumber}`
    }).catch(err => console.error('[Order Mailer Error]:', err.message));
  } catch(e) {}

  res.json({ success: true, orderNumber });
});

router.get('/orders', userAuth, (req, res) => {
  const db = getDb();
  const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json({ orders });
});

// ===== WISHLIST =====
router.get('/wishlist', userAuth, (req, res) => {
  const db = getDb();
  const items = db.prepare('SELECT * FROM wishlist WHERE user_id = ? ORDER BY added_at DESC').all(req.user.id);
  res.json({ items });
});

router.post('/wishlist', userAuth, (req, res) => {
  const db = getDb();
  const { product_id } = req.body;
  if (!product_id) return res.status(400).json({ error: 'Product ID required' });
  try {
    db.prepare('INSERT OR IGNORE INTO wishlist (user_id, product_id) VALUES (?, ?)').run(req.user.id, product_id);
    res.json({ success: true });
  } catch (e) {
    res.json({ success: true }); // Already exists
  }
});

router.delete('/wishlist/:product_id', userAuth, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM wishlist WHERE user_id = ? AND product_id = ?').run(req.user.id, req.params.product_id);
  res.json({ success: true });
});

module.exports = router;
