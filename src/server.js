const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const { initializeDatabase, db } = require('./database');
const { fetchAndParseProducts, getCategories, getProductsByCategory, searchProducts, getProductById } = require('./dataService');
const { uiTranslations } = require('./translations');
const { optionalUserAuth } = require('./auth');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/user');
const chatbotRoutes = require('./routes/chatbot');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
initializeDatabase();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static files
app.use(express.static(path.join(__dirname, '..', 'public')));

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
    const { category, search, page = 1, limit = 24, sort, lang = 'tr' } = req.query;
    let products = await fetchAndParseProducts();

    // Filter hidden products
    const hiddenProducts = db.prepare('SELECT product_id FROM hidden_products').all().map(h => h.product_id);
    products = products.filter(p => !hiddenProducts.includes(p.id));

    // Filter hidden categories
    const hiddenCategories = db.prepare('SELECT category_name FROM hidden_categories').all().map(h => h.category_name);
    products = products.filter(p => !p.categories.tr.some(c => hiddenCategories.includes(c.split(' > ')[0])));

    // Apply translation overrides
    const overrides = db.prepare("SELECT * FROM translation_overrides WHERE type = 'product'").all();
    if (overrides.length > 0) {
      const overrideMap = {};
      overrides.forEach(o => {
        if (!overrideMap[o.original_key]) overrideMap[o.original_key] = {};
        overrideMap[o.original_key][o.lang] = o.translation;
      });
      products = products.map(p => {
        if (overrideMap[p.id]) {
          return { ...p, name: { ...p.name, ...overrideMap[p.id] } };
        }
        return p;
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

    res.json({
      products: paginatedProducts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.get('/api/categories', async (req, res) => {
  try {
    let products = await fetchAndParseProducts();

    // Filter hidden categories
    const hiddenCategories = db.prepare('SELECT category_name FROM hidden_categories').all().map(h => h.category_name);
    products = products.filter(p => !p.categories.tr.some(c => hiddenCategories.includes(c.split(' > ')[0])));

    const categories = getCategories(products);

    // Apply category translation overrides
    const overrides = db.prepare("SELECT * FROM translation_overrides WHERE type = 'category'").all();
    if (overrides.length > 0) {
      const overrideMap = {};
      overrides.forEach(o => {
        if (!overrideMap[o.original_key]) overrideMap[o.original_key] = {};
        overrideMap[o.original_key][o.lang] = o.translation;
      });
      return res.json(categories.map(cat => {
        if (overrideMap[cat.tr]) {
          return { ...cat, ...overrideMap[cat.tr] };
        }
        return cat;
      }));
    }

    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

app.get('/api/product/:id', async (req, res) => {
  try {
    const products = await fetchAndParseProducts();
    const product = getProductById(products, req.params.id);
    if (product) {
      // Apply translation override if exists
      const overrides = db.prepare("SELECT * FROM translation_overrides WHERE type = 'product' AND original_key = ?").all(req.params.id);
      if (overrides.length > 0) {
        const nameOverrides = {};
        overrides.forEach(o => { nameOverrides[o.lang] = o.translation; });
        product.name = { ...product.name, ...nameOverrides };
      }
      res.json(product);
    } else {
      res.status(404).json({ error: 'Product not found' });
    }
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

// Public settings
app.get('/api/settings/public', (req, res) => {
  const settings = db.prepare('SELECT * FROM settings').all();
  const settingsObj = {};
  settings.forEach(s => { settingsObj[s.key] = s.value; });
  // Only expose public settings
  const publicKeys = ['site_name_ar', 'site_name_en', 'site_name_tr', 'site_slogan_ar', 'site_slogan_en', 'site_slogan_tr', 
    'phone', 'whatsapp', 'email', 'address_ar', 'address_en', 'address_tr', 'currency',
    'social_facebook', 'social_instagram', 'social_twitter', 'chatbot_enabled',
    'chatbot_welcome_ar', 'chatbot_welcome_en', 'chatbot_welcome_tr'];
  const publicSettings = {};
  publicKeys.forEach(k => { if (settingsObj[k]) publicSettings[k] = settingsObj[k]; });
  res.json(publicSettings);
});

// Blog posts (public)
app.get('/api/posts', (req, res) => {
  const posts = db.prepare('SELECT * FROM posts WHERE published = 1 ORDER BY created_at DESC').all();
  res.json(posts);
});

// SPA fallback - serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Zakaria Prom server running on port ${PORT}`);
});
