const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', 'data', 'zakariaprom.db');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// sql.js wrapper to mimic better-sqlite3 API
let database = null;

// Save database to file periodically
function saveDatabase() {
  if (database) {
    const data = database.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

// Auto-save every 30 seconds
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
          if (params.length > 0) {
            stmt.bind(params);
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
          if (params.length > 0) {
            stmt.bind(params);
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
          self.sqliteDb.run(sql, params);
          saveDatabase();
          const lastId = self.sqliteDb.exec("SELECT last_insert_rowid() as id")[0];
          const changes = self.sqliteDb.getRowsModified();
          return {
            lastInsertRowid: lastId ? lastId.values[0][0] : 0,
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

// The db object - will be initialized synchronously via initSync
let db = null;

function initSync() {
  // Load sql.js synchronously using require
  const SQL = require('sql.js/dist/sql-wasm.js');
  
  // Check if we need to use the factory function
  if (typeof SQL === 'function') {
    // sql.js returns a promise in newer versions, but we need sync
    // Use the bundled version that works synchronously
    throw new Error('sql.js async init not supported in sync mode');
  }
  
  let sqliteDb;
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    sqliteDb = new SQL.Database(fileBuffer);
  } else {
    sqliteDb = new SQL.Database();
  }
  
  database = sqliteDb;
  db = new DatabaseWrapper(sqliteDb);
  return db;
}

// Async initialization (preferred)
async function initDatabaseAsync() {
  const SQL = await initSqlJs();
  
  let sqliteDb;
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    sqliteDb = new SQL.Database(fileBuffer);
  } else {
    sqliteDb = new SQL.Database();
  }
  
  database = sqliteDb;
  db = new DatabaseWrapper(sqliteDb);
  
  // Auto-save every 30 seconds
  saveInterval = setInterval(saveDatabase, 30000);
  
  // Save on process exit
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

  console.log('Database initialized successfully');
}

// Export a getter for db that always returns current value
module.exports = {
  get db() { return db; },
  initializeDatabase,
  initDatabaseAsync,
  saveDatabase
};
