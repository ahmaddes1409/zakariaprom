const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// Flexible DB Path with fallback detection for Hostinger nodejs structure
let DB_PATH = null;

function findBestDatabasePath() {
  const candidatePaths = [
    process.env.DB_PATH,
    path.join(__dirname, '..', 'data', 'zakariaprom.db'),
    path.join(process.cwd(), 'data', 'zakariaprom.db'),
    path.join(process.cwd(), 'nodejs', 'data', 'zakariaprom.db'),
    path.join(__dirname, '..', '..', 'data', 'zakariaprom.db'),
    path.join(__dirname, '..', '..', 'nodejs', 'data', 'zakariaprom.db'),
    path.join(__dirname, 'data', 'zakariaprom.db'),
    path.join(process.cwd(), '..', 'data', 'zakariaprom.db'),
    path.join(process.cwd(), '..', 'nodejs', 'data', 'zakariaprom.db')
  ].filter(Boolean);

  let bestPath = null;
  let maxBytes = -1;

  for (const cand of candidatePaths) {
    try {
      const resolved = path.resolve(cand);
      if (fs.existsSync(resolved)) {
        const stats = fs.statSync(resolved);
        console.log(`[DB Search] Candidate "${resolved}" exists (${stats.size} bytes)`);
        if (stats.size > maxBytes) {
          maxBytes = stats.size;
          bestPath = resolved;
        }
      }
    } catch (e) {
      // ignore
    }
  }

  if (bestPath && maxBytes > 0) {
    console.log(`[DB Init] Selected best database file: "${bestPath}" (${maxBytes} bytes)`);
    return bestPath;
  }

  const defaultPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'zakariaprom.db');
  const resolvedDefault = path.resolve(defaultPath);
  console.log(`[DB Init] No pre-existing non-empty DB found. Will use path: "${resolvedDefault}"`);
  return resolvedDefault;
}

function resolveWasmFile(file) {
  try {
    const sqlWasmJsPath = require.resolve('sql.js/dist/sql-wasm.js');
    const sqlDistDir = path.dirname(sqlWasmJsPath);
    const wasmPath = path.join(sqlDistDir, file);
    if (fs.existsSync(wasmPath)) {
      return wasmPath;
    }
  } catch (e) {}

  try {
    const sqlMain = require.resolve('sql.js');
    const sqlDir = path.dirname(sqlMain);
    const wasmPath = path.join(sqlDir, 'dist', file);
    if (fs.existsSync(wasmPath)) {
      return wasmPath;
    }
    const directWasmPath = path.join(sqlDir, file);
    if (fs.existsSync(directWasmPath)) {
      return directWasmPath;
    }
  } catch (e) {}

  const candidates = [
    path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', file),
    path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file),
    path.join(process.cwd(), '..', 'node_modules', 'sql.js', 'dist', file),
    path.join(__dirname, '..', '..', 'node_modules', 'sql.js', 'dist', file)
  ];

  for (const cand of candidates) {
    if (fs.existsSync(cand)) {
      return cand;
    }
  }

  return file;
}

// sql.js wrapper to mimic better-sqlite3 API
let database = null;

// Save database to file safely
function saveDatabase() {
  if (database && DB_PATH) {
    try {
      const data = database.export();
      const buffer = Buffer.from(data);
      const targetDir = path.dirname(DB_PATH);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      fs.writeFileSync(DB_PATH, buffer);
    } catch (err) {
      console.error('[DB Save Error]:', err.message);
    }
  }
}

// Helper to normalize parameter bindings for sql.js
function formatParams(params) {
  if (params.length === 1 && Array.isArray(params[0])) {
    return params[0];
  }
  return params;
}

// Auto-save interval handle
let saveInterval = null;

// Wrapper class to mimic better-sqlite3 API
class DatabaseWrapper {
  constructor(sqliteDb) {
    this.sqliteDb = sqliteDb;
  }

  prepare(sql) {
    const self = this;
    return {
      get(...params) {
        try {
          const stmt = self.sqliteDb.prepare(sql);
          const boundParams = formatParams(params);
          if (boundParams.length > 0) {
            stmt.bind(boundParams);
          }
          if (stmt.step()) {
            const row = stmt.getAsObject();
            stmt.free();
            return row;
          }
          stmt.free();
          return undefined;
        } catch (e) {
          console.error('DB get error:', sql, params, e.message);
          return undefined;
        }
      },
      all(...params) {
        try {
          const results = [];
          const stmt = self.sqliteDb.prepare(sql);
          const boundParams = formatParams(params);
          if (boundParams.length > 0) {
            stmt.bind(boundParams);
          }
          while (stmt.step()) {
            results.push(stmt.getAsObject());
          }
          stmt.free();
          return results;
        } catch (e) {
          console.error('DB all error:', sql, params, e.message);
          return [];
        }
      },
      run(...params) {
        try {
          const boundParams = formatParams(params);
          self.sqliteDb.run(sql, boundParams);
          saveDatabase();
          let lastId = 0;
          try {
            const res = self.sqliteDb.exec("SELECT last_insert_rowid() as id");
            if (res && res.length > 0 && res[0].values && res[0].values.length > 0) {
              lastId = res[0].values[0][0];
            }
          } catch(err) {
            // Ignore last_insert_rowid error
          }
          const changes = typeof self.sqliteDb.getRowsModified === 'function' ? self.sqliteDb.getRowsModified() : 0;
          return {
            lastInsertRowid: lastId,
            changes: changes
          };
        } catch (e) {
          console.error('DB run error:', sql, params, e.message);
          return { lastInsertRowid: 0, changes: 0 };
        }
      }
    };
  }

  exec(sql) {
    try {
      this.sqliteDb.exec(sql);
      saveDatabase();
    } catch (e) {
      console.error('DB exec error:', e.message);
    }
  }

  pragma(pragma) {
    try {
      this.sqliteDb.exec(`PRAGMA ${pragma}`);
    } catch (e) {
      // Ignore pragma errors
    }
  }

  transaction(fn) {
    const self = this;
    return function(...args) {
      self.sqliteDb.exec('BEGIN TRANSACTION');
      try {
        const result = fn(...args);
        self.sqliteDb.exec('COMMIT');
        saveDatabase();
        return result;
      } catch (e) {
        self.sqliteDb.exec('ROLLBACK');
        throw e;
      }
    };
  }
}

// The db object - initialized asynchronously via initDatabaseAsync
let db = null;

// Async initialization (preferred for sql.js WASM)
async function initDatabaseAsync() {
  let SQL;
  try {
    SQL = await initSqlJs();
  } catch (err1) {
    console.warn('[DB Init Warning] Standard sql.js init failed, trying with custom locateFile:', err1.message);
    try {
      SQL = await initSqlJs({
        locateFile: file => resolveWasmFile(file)
      });
    } catch (err2) {
      console.error('[DB Init Error] Failed to initialize sql.js engine:', err2.message);
      throw err2;
    }
  }
  
  DB_PATH = findBestDatabasePath();

  const targetDir = path.dirname(DB_PATH);
  if (!fs.existsSync(targetDir)) {
    try {
      fs.mkdirSync(targetDir, { recursive: true });
    } catch (err) {
      console.error('[DB Init] Could not create target data directory:', err.message);
    }
  }

  console.log(`[DB Init] Active database file path: ${DB_PATH}`);

  let sqliteDb;
  if (fs.existsSync(DB_PATH)) {
    try {
      const fileBuffer = fs.readFileSync(DB_PATH);
      if (fileBuffer.length > 0) {
        sqliteDb = new SQL.Database(fileBuffer);
        console.log(`[DB Init] Loaded existing database file (${fileBuffer.length} bytes)`);
      } else {
        console.log('[DB Init] DB file is 0 bytes. Initializing new SQLite instance');
        sqliteDb = new SQL.Database();
      }
    } catch (e) {
      console.error(`[DB Init Error] Failed to load DB file at ${DB_PATH}:`, e.message);
      console.log('[DB Init] Fallback: initializing empty SQLite database in memory');
      sqliteDb = new SQL.Database();
    }
  } else {
    console.log('[DB Init] No existing DB file found. Creating a new SQLite database.');
    sqliteDb = new SQL.Database();
  }

  database = sqliteDb;
  db = new DatabaseWrapper(sqliteDb);

  // Save immediately to ensure path & file exist
  saveDatabase();

  if (saveInterval) clearInterval(saveInterval);
  saveInterval = setInterval(saveDatabase, 30000);

  process.on('exit', saveDatabase);
  process.on('SIGINT', () => { saveDatabase(); process.exit(); });
  process.on('SIGTERM', () => { saveDatabase(); process.exit(); });

  return db;
}

function initializeDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabaseAsync() first.');
  }

  // Admin users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Users (customers) table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      company TEXT,
      country TEXT,
      language TEXT DEFAULT 'ar',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME
    )
  `);

  // Cart items table
  db.exec(`
    CREATE TABLE IF NOT EXISTS cart_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      session_id TEXT,
      product_id TEXT NOT NULL,
      product_name TEXT,
      product_image TEXT,
      quantity INTEGER DEFAULT 1,
      options TEXT,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Orders (quote requests) table
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      user_id INTEGER,
      guest_name TEXT,
      guest_email TEXT,
      guest_phone TEXT,
      guest_company TEXT,
      items TEXT NOT NULL,
      notes TEXT,
      status TEXT DEFAULT 'new',
      total_items INTEGER DEFAULT 0,
      language TEXT DEFAULT 'ar',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Wishlist table
  db.exec(`
    CREATE TABLE IF NOT EXISTS wishlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product_id TEXT NOT NULL,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, product_id)
    )
  `);

  // Translation overrides table
  db.exec(`
    CREATE TABLE IF NOT EXISTS translation_overrides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      original_key TEXT NOT NULL,
      lang TEXT NOT NULL,
      translation TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(type, original_key, lang)
    )
  `);

  // Site settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Hidden products table
  db.exec(`
    CREATE TABLE IF NOT EXISTS hidden_products (
      product_id TEXT PRIMARY KEY,
      hidden_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Hidden categories table
  db.exec(`
    CREATE TABLE IF NOT EXISTS hidden_categories (
      category_name TEXT PRIMARY KEY,
      hidden_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Category images table
  db.exec(`
    CREATE TABLE IF NOT EXISTS category_images (
      category_name TEXT PRIMARY KEY,
      image_url TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Coupons table
  db.exec(`
    CREATE TABLE IF NOT EXISTS coupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      discount_type TEXT DEFAULT 'percentage',
      discount_value REAL NOT NULL,
      min_items INTEGER DEFAULT 0,
      max_uses INTEGER DEFAULT 0,
      used_count INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Blog/News table
  db.exec(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title_ar TEXT NOT NULL,
      title_en TEXT,
      title_tr TEXT,
      content_ar TEXT NOT NULL,
      content_en TEXT,
      content_tr TEXT,
      image TEXT,
      published INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Chatbot FAQ table
  db.exec(`
    CREATE TABLE IF NOT EXISTS chatbot_faq (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_ar TEXT,
      question_en TEXT,
      question_tr TEXT,
      answer_ar TEXT,
      answer_en TEXT,
      answer_tr TEXT,
      keywords TEXT,
      priority INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Page visits / analytics
  db.exec(`
    CREATE TABLE IF NOT EXISTS analytics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page TEXT NOT NULL,
      product_id TEXT,
      category TEXT,
      action TEXT DEFAULT 'view',
      session_id TEXT,
      user_agent TEXT,
      ip TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Banners table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS banners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title_ar TEXT DEFAULT '',
      title_en TEXT DEFAULT '',
      title_tr TEXT DEFAULT '',
      subtitle_ar TEXT DEFAULT '',
      subtitle_en TEXT DEFAULT '',
      subtitle_tr TEXT DEFAULT '',
      image_url TEXT NOT NULL,
      link TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // Staff/employees table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'editor',
      permissions TEXT DEFAULT '{}',
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME
    )
  `).run();

  // Currency rates table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS currencies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name_ar TEXT DEFAULT '',
      name_en TEXT DEFAULT '',
      name_tr TEXT DEFAULT '',
      symbol TEXT DEFAULT '',
      rate_from_try REAL DEFAULT 1.0,
      active INTEGER DEFAULT 1,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // Custom categories table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS custom_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name_ar TEXT NOT NULL,
      name_en TEXT DEFAULT '',
      name_tr TEXT DEFAULT '',
      image_url TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // Create default admin if not exists
  const adminExists = db.prepare('SELECT id FROM admins WHERE username = ?').get('admin');
  if (!adminExists) {
    const hashedPassword = bcrypt.hashSync('Sy0988509972@sy', 10);
    db.prepare('INSERT INTO admins (username, password, role) VALUES (?, ?, ?)').run('admin', hashedPassword, 'superadmin');
  }

  // Insert default settings
  const defaultSettings = {
    site_name_ar: 'زكريا بروم',
    site_name_en: 'Zakaria Prom',
    site_name_tr: 'Zakaria Prom',
    site_slogan_ar: 'منتجات الدعاية والإعلان',
    site_slogan_en: 'Promotional Products',
    site_slogan_tr: 'Promosyon Ürünleri',
    phone: '+905428104208',
    whatsapp: '905428104208',
    email: 'info@zakariaprom.com',
    address_ar: 'إسطنبول، تركيا',
    address_en: 'Istanbul, Turkey',
    address_tr: 'İstanbul, Türkiye',
    currency: 'TL',
    about_ar: 'زكريا بروم هي شركة متخصصة في منتجات الدعاية والإعلان والهدايا الترويجية. نقدم أكثر من 1600 منتج متنوع بأعلى جودة وأفضل الأسعار. لدينا مطابع في تركيا وسوريا لخدمتكم.',
    about_en: 'Zakaria Prom is a company specialized in promotional and advertising products. We offer over 1600 diverse products with the highest quality and best prices. We have printing facilities in Turkey and Syria to serve you.',
    about_tr: 'Zakaria Prom, promosyon ve reklam ürünleri konusunda uzmanlaşmış bir şirkettir. En yüksek kalite ve en iyi fiyatlarla 1600\'den fazla çeşitli ürün sunuyoruz. Türkiye ve Suriye\'de matbaalarımız bulunmaktadır.',
    social_facebook: '',
    social_instagram: '',
    social_twitter: '',
    chatbot_enabled: '1',
    chatbot_welcome_ar: 'مرحباً! كيف يمكنني مساعدتك؟',
    chatbot_welcome_en: 'Hello! How can I help you?',
    chatbot_welcome_tr: 'Merhaba! Size nasıl yardımcı olabilirim?'
  };

  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const [key, value] of Object.entries(defaultSettings)) {
    insertSetting.run(key, value);
  }

  // Insert default chatbot FAQs
  const faqExists = db.prepare('SELECT id FROM chatbot_faq LIMIT 1').get();
  if (!faqExists) {
    const defaultFAQs = [
      {
        question_ar: 'ما هي طرق الدفع المتاحة؟',
        question_en: 'What payment methods are available?',
        question_tr: 'Hangi ödeme yöntemleri mevcut?',
        answer_ar: 'نقبل التحويل البنكي والدفع نقداً عند الاستلام. للطلبات الكبيرة يمكن الاتفاق على شروط دفع خاصة.',
        answer_en: 'We accept bank transfer and cash on delivery. For large orders, special payment terms can be arranged.',
        answer_tr: 'Banka havalesi ve kapıda ödeme kabul ediyoruz. Büyük siparişler için özel ödeme koşulları düzenlenebilir.',
        keywords: 'دفع,payment,ödeme,بنك,bank,نقد,cash',
        priority: 10
      },
      {
        question_ar: 'كم يستغرق التوصيل؟',
        question_en: 'How long does delivery take?',
        question_tr: 'Teslimat ne kadar sürer?',
        answer_ar: 'التوصيل داخل إسطنبول خلال 1-3 أيام. للمدن الأخرى في تركيا 3-5 أيام. للشحن الدولي 7-14 يوم.',
        answer_en: 'Delivery within Istanbul takes 1-3 days. Other cities in Turkey 3-5 days. International shipping 7-14 days.',
        answer_tr: 'İstanbul içi teslimat 1-3 gün sürer. Türkiye\'nin diğer şehirleri 3-5 gün. Uluslararası kargo 7-14 gün.',
        keywords: 'توصيل,شحن,delivery,shipping,teslimat,kargo',
        priority: 9
      },
      {
        question_ar: 'ما هو الحد الأدنى للطلب؟',
        question_en: 'What is the minimum order quantity?',
        question_tr: 'Minimum sipariş miktarı nedir?',
        answer_ar: 'الحد الأدنى يختلف حسب المنتج. عادةً يبدأ من 50 قطعة للمنتجات المطبوعة. تواصل معنا للتفاصيل.',
        answer_en: 'Minimum order varies by product. Usually starts from 50 pieces for printed products. Contact us for details.',
        answer_tr: 'Minimum sipariş ürüne göre değişir. Genellikle baskılı ürünler için 50 adetten başlar. Detaylar için bizimle iletişime geçin.',
        keywords: 'حد أدنى,minimum,كمية,quantity,miktar,adet',
        priority: 8
      },
      {
        question_ar: 'هل يمكن طباعة الشعار على المنتجات؟',
        question_en: 'Can you print logos on products?',
        question_tr: 'Ürünlere logo basılabilir mi?',
        answer_ar: 'نعم! نوفر خدمات الطباعة والحفر بالليزر والطباعة الحرارية. أرسل لنا شعارك وسنقدم لك عرض سعر.',
        answer_en: 'Yes! We offer printing, laser engraving, and heat transfer services. Send us your logo and we will provide a quote.',
        answer_tr: 'Evet! Baskı, lazer kazıma ve ısı transfer hizmetleri sunuyoruz. Logonuzu gönderin, size teklif verelim.',
        keywords: 'طباعة,شعار,logo,print,baskı,ليزر,laser,lazer',
        priority: 10
      },
      {
        question_ar: 'كيف أطلب عرض سعر؟',
        question_en: 'How do I request a quote?',
        question_tr: 'Nasıl teklif isteyebilirim?',
        answer_ar: 'يمكنك إضافة المنتجات إلى السلة وإرسال طلب عرض سعر، أو التواصل معنا مباشرة عبر الواتساب.',
        answer_en: 'You can add products to cart and submit a quote request, or contact us directly via WhatsApp.',
        answer_tr: 'Ürünleri sepete ekleyip teklif talebi gönderebilir veya doğrudan WhatsApp üzerinden bizimle iletişime geçebilirsiniz.',
        keywords: 'عرض سعر,quote,teklif,طلب,order,sipariş',
        priority: 9
      }
    ];

    const insertFAQ = db.prepare(`
      INSERT INTO chatbot_faq (question_ar, question_en, question_tr, answer_ar, answer_en, answer_tr, keywords, priority)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const faq of defaultFAQs) {
      insertFAQ.run(faq.question_ar, faq.question_en, faq.question_tr, faq.answer_ar, faq.answer_en, faq.answer_tr, faq.keywords, faq.priority);
    }
  }

  // Insert default currencies
  const currencyExists = db.prepare('SELECT id FROM currencies LIMIT 1').get();
  if (!currencyExists) {
    const defaultCurrencies = [
      { code: 'TRY', name_ar: 'ليرة تركية', name_en: 'Turkish Lira', name_tr: 'Türk Lirası', symbol: '₺', rate_from_try: 1.0 },
      { code: 'USD', name_ar: 'دولار أمريكي', name_en: 'US Dollar', name_tr: 'Amerikan Doları', symbol: '$', rate_from_try: 0.029 },
      { code: 'SYP', name_ar: 'ليرة سورية', name_en: 'Syrian Pound', name_tr: 'Suriye Lirası', symbol: 'ل.س', rate_from_try: 380 }
    ];
    const insertCurrency = db.prepare('INSERT OR IGNORE INTO currencies (code, name_ar, name_en, name_tr, symbol, rate_from_try) VALUES (?, ?, ?, ?, ?, ?)');
    for (const c of defaultCurrencies) {
      insertCurrency.run(c.code, c.name_ar, c.name_en, c.name_tr, c.symbol, c.rate_from_try);
    }
  }

  console.log('Database initialized successfully');
}

// Export getter for db that always returns current value
module.exports = {
  get db() { return db; },
  getDbPath: () => DB_PATH,
  initializeDatabase,
  initDatabaseAsync,
  saveDatabase
};
