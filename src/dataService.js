const { parseStringPromise } = require('xml2js');
const { translateProductName, translateCategory } = require('./translations');

const XML_URL = 'https://karmedya.com/xml/xml_export_product.xml';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour cache

let cachedProducts = null;
let lastFetchTime = 0;

async function fetchXML() {
  const localBackup = path.join(__dirname, '..', 'data', 'xml_export_product.xml');
  try {
    const response = await fetch(XML_URL, { signal: AbortSignal.timeout(15000) });
    if (response.ok) {
      let text = await response.text();
      if (text && text.includes('<SHOP>')) {
        if (text.includes('<')) text = text.substring(text.indexOf('<'));
        try {
          const targetDir = path.dirname(localBackup);
          if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
          fs.writeFileSync(localBackup, text, 'utf8');
        } catch(e) {}
        return text;
      }
    }
  } catch(e) {
    console.warn('[XML Fetch Warning] Remote fetch failed, attempting local backup:', e.message);
  }
  if (fs.existsSync(localBackup)) {
    console.log('[XML Fetch] Reading from local backup file...');
    let text = fs.readFileSync(localBackup, 'utf8');
    if (text.includes('<')) text = text.substring(text.indexOf('<'));
    return text;
  }
  throw new Error('Could not fetch XML from remote or local backup');
}

async function fetchAndParseProducts() {
  const now = Date.now();
  if (cachedProducts && (now - lastFetchTime) < CACHE_DURATION) {
    return cachedProducts;
  }

  try {
    console.log('Fetching XML data from karmedya.com...');
    const xml = await fetchXML();
    const result = await parseStringPromise(xml, { explicitArray: false, trim: true });

    const items = Array.isArray(result.SHOP.SHOPITEM) ? result.SHOP.SHOPITEM : [result.SHOP.SHOPITEM];

    const products = items
      .filter(item => {
        const cats = extractCategories(item);
        return !cats.includes('--Kapalı Ürünler Kategorisi');
      })
      .map(item => parseProduct(item));

    cachedProducts = products;
    lastFetchTime = now;
    console.log(`Parsed ${products.length} products successfully`);
    return products;
  } catch (error) {
    console.error('Error fetching/parsing XML:', error);
    if (cachedProducts) return cachedProducts;
    throw error;
  }
}

function extractCategories(item) {
  if (!item.CATEGORIES || !item.CATEGORIES.CATEGORY) return [];
  const cats = item.CATEGORIES.CATEGORY;
  if (Array.isArray(cats)) return cats;
  return [cats];
}

function parseProduct(item) {
  let categories = extractCategories(item)
    .filter(c => c !== '--Kapalı Ürünler Kategorisi');

  const textCats = categories.filter(c => !c.match(/^\d+$/));
  if (textCats.length > 0) {
    categories = textCats;
  } else {
    categories = ['Promosyon Ürünleri'];
  }

  const images = [];
  if (item.IMAGES) {
    for (let i = 1; i <= 5; i++) {
      const imgKey = `IMAGE_${i}`;
      if (item.IMAGES[imgKey]) {
        images.push(item.IMAGES[imgKey].trim());
      }
    }
  }

  const priceStr = item.PRICE || '0';
  const price = parseFloat(priceStr.replace('TL', '').replace(',', '.')) || 0;

  const options = [];
  if (item.PRODUCT_OPTIONS && item.PRODUCT_OPTIONS.OPTION) {
    const opts = Array.isArray(item.PRODUCT_OPTIONS.OPTION)
      ? item.PRODUCT_OPTIONS.OPTION
      : [item.PRODUCT_OPTIONS.OPTION];

    for (const opt of opts) {
      if (opt.ITEMS && opt.ITEMS.ITEM) {
        const optItems = Array.isArray(opt.ITEMS.ITEM) ? opt.ITEMS.ITEM : [opt.ITEMS.ITEM];
        options.push({
          name: opt.NAME || '',
          items: optItems.map(oi => ({
            name: oi.NAME || '',
            price: oi.PRICE || '',
            quantity: parseInt(oi.QUANTITY) || 0
          }))
        });
      }
    }
  }

  const nameTr = item.NAME || '';
  const nameAr = translateProductName(nameTr, 'ar');
  const nameEn = translateProductName(nameTr, 'en');

  const categoriesTr = categories;
  const categoriesAr = categories.map(c => translateCategory(c, 'ar'));
  const categoriesEn = categories.map(c => translateCategory(c, 'en'));

  // Clean description HTML
  const desc = (item.DESCRIPTION || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '');

  return {
    id: item.PRODUCT_ID || '',
    name: { tr: nameTr, ar: nameAr, en: nameEn },
    model: item.MODEL || '',
    categories: { tr: categoriesTr, ar: categoriesAr, en: categoriesEn },
    topCategory: {
      tr: categoriesTr.length > 0 ? categoriesTr[0].split(' > ')[0] : '',
      ar: categoriesAr.length > 0 ? categoriesAr[0].split(' > ')[0] : '',
      en: categoriesEn.length > 0 ? categoriesEn[0].split(' > ')[0] : ''
    },
    description: desc,
    price,
    quantity: parseInt(item.QUANTITY) || 0,
    images,
    options,
    status: item.STATUS === '1'
  };
}

function getCategories(products) {
  const catMap = {};

  for (const product of products) {
    for (let i = 0; i < product.categories.tr.length; i++) {
      let rawTr = product.categories.tr[i] || '';
      let rawAr = product.categories.ar[i] || rawTr;
      let rawEn = product.categories.en[i] || rawTr;
      if (rawTr.includes('|')) rawTr = rawTr.split('|')[0].trim();
      if (rawAr.includes('|')) rawAr = rawAr.split('|')[0].trim();
      if (rawEn.includes('|')) rawEn = rawEn.split('|')[0].trim();

      const topTr = rawTr.split(' > ')[0].trim();
      const topAr = rawAr.split(' > ')[0].trim();
      const topEn = rawEn.split(' > ')[0].trim();

      if (!catMap[topTr]) {
        catMap[topTr] = { tr: topTr, ar: topAr, en: topEn, count: 0, subcategories: {} };
      }
      catMap[topTr].count++;

      // Subcategories
      const parts = product.categories.tr[i].split(' > ');
      if (parts.length > 1) {
        const subTr = parts[1].trim();
        const subParts = product.categories.ar[i].split(' > ');
        const subAr = subParts.length > 1 ? subParts[1].trim() : subTr;
        const subPartsEn = product.categories.en[i].split(' > ');
        const subEn = subPartsEn.length > 1 ? subPartsEn[1].trim() : subTr;

        if (!catMap[topTr].subcategories[subTr]) {
          catMap[topTr].subcategories[subTr] = { tr: subTr, ar: subAr, en: subEn, count: 0 };
        }
        catMap[topTr].subcategories[subTr].count++;
      }
    }
  }

  // Convert to array and sort by count
  return Object.values(catMap)
    .map(cat => ({
      ...cat,
      subcategories: Object.values(cat.subcategories).sort((a, b) => b.count - a.count)
    }))
    .sort((a, b) => b.count - a.count);
}

function getProductsByCategory(products, category) {
  return products.filter(p => {
    return p.categories.tr.some(c => c.includes(category)) ||
           p.categories.ar.some(c => c.includes(category)) ||
           p.categories.en.some(c => c.includes(category));
  });
}

function searchProducts(products, query, lang = 'tr') {
  const q = query.toLowerCase();
  return products.filter(p => {
    return p.name.tr.toLowerCase().includes(q) ||
           p.name.ar.toLowerCase().includes(q) ||
           p.name.en.toLowerCase().includes(q) ||
           p.model.toLowerCase().includes(q) ||
           p.id.includes(q);
  });
}

function getProductById(products, id) {
  return products.find(p => p.id === id) || null;
}

module.exports = { fetchAndParseProducts, getCategories, getProductsByCategory, searchProducts, getProductById };
