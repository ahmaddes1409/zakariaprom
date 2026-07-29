const fs = require('fs');
const path = require('path');
const { parseStringPromise } = require('xml2js');
const { translateProductName, translateCategory } = require('./translations');

const XML_URL = 'https://karmedya.com/xml/xml_export_product.xml';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hour cache

let cachedProducts = null;
let lastFetchTime = 0;

async function fetchXML() {
  const localBackup = path.join(__dirname, '..', 'data', 'xml_export_product.xml');
  
  // 1. Try local backup FIRST for instant zero-latency loading
  if (fs.existsSync(localBackup)) {
    try {
      const stats = fs.statSync(localBackup);
      if (stats.size > 1000) {
        let text = fs.readFileSync(localBackup, 'utf8');
        if (text.includes('<')) text = text.substring(text.indexOf('<'));
        return text;
      }
    } catch(e) {}
  }

  // 2. Fallback to remote fetch with short 5s timeout if no local backup file
  try {
    const response = await fetch(XML_URL, { signal: AbortSignal.timeout(5000), headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (response.ok) {
      let text = await response.text();
      if (text && text.includes('<SHOP>')) {
        if (text.includes('<')) text = text.substring(text.indexOf('<'));
        try { fs.writeFileSync(localBackup, text, 'utf8'); } catch(e) {}
        console.log(`[XML Feed] Successfully fetched live XML from remote (${text.length} bytes)`);
        return text;
      }
    }
  } catch(e) {
    console.warn(`[XML Feed] Remote fetch failed (${e.message}).`);
  }

  throw new Error('Could not fetch XML from remote or local backup');
}

function parseXmlFast(xmlText) {
  const products = [];
  if (!xmlText) return products;

  const blocks = xmlText.split(/<\/SHOPITEM>/i);
  for (const block of blocks) {
    const shopItemIdx = block.toLowerCase().indexOf('<shopitem>');
    if (shopItemIdx === -1) continue;

    const itemContent = block.substring(shopItemIdx + 10);

    const getVal = (tag) => {
      const openTag = '<' + tag + '>';
      const closeTag = '</' + tag + '>';
      let rawVal = '';
      const start = itemContent.indexOf(openTag);
      if (start === -1) {
        const startNoCase = itemContent.toLowerCase().indexOf(openTag.toLowerCase());
        if (startNoCase === -1) return '';
        const endNoCase = itemContent.toLowerCase().indexOf(closeTag.toLowerCase(), startNoCase + openTag.length);
        if (endNoCase === -1) return '';
        rawVal = itemContent.substring(startNoCase + openTag.length, endNoCase);
      } else {
        const end = itemContent.indexOf(closeTag, start + openTag.length);
        if (end === -1) return '';
        rawVal = itemContent.substring(start + openTag.length, end);
      }
      return rawVal.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1').trim();
    };

    const id = getVal('ITEM_ID') || getVal('PRODUCT_ID') || getVal('ID');
    const nameTr = getVal('PRODUCT_NAME') || getVal('NAME') || getVal('TITLE');
    if (!id || !nameTr) continue;

    const model = getVal('PRODUCT_CODE') || getVal('CODE') || getVal('MODEL') || id;
    const catStr = getVal('CATEGORY_NAME') || getVal('CATEGORY') || getVal('CATEGORIES');
    const descTr = getVal('DESCRIPTION') || getVal('DETAIL');
    const price = parseFloat(getVal('PRICE') || getVal('PRICE_VAT') || '0') || 0;
    const stock = parseInt(getVal('STOCK') || getVal('QUANTITY') || '100') || 100;
    
    // Images
    const images = [];
    const mainImg = getVal('IMAGE') || getVal('IMAGE_URL') || getVal('PICTURE');
    if (mainImg) images.push(mainImg);
    
    for (let i = 1; i <= 5; i++) {
      const img = getVal(`IMAGE_${i}`) || getVal(`IMAGE${i}`);
      if (img && !images.includes(img)) images.push(img);
    }

    const catTr = catStr ? catStr.split('>').pop().trim() : 'Genel';
    const catAr = translateCategory(catTr, 'ar');
    const catEn = translateCategory(catTr, 'en');

    products.push({
      id,
      model,
      name: {
        tr: nameTr,
        ar: translateProductName(nameTr, 'ar'),
        en: translateProductName(nameTr, 'en')
      },
      category: {
        tr: catTr,
        ar: catAr,
        en: catEn
      },
      categories: {
        tr: [catTr],
        ar: [catAr],
        en: [catEn]
      },
      category_tr: catTr,
      category_ar: catAr,
      category_en: catEn,
      price,
      currency: 'TRY',
      stock,
      images,
      description: {
        tr: descTr,
        ar: descTr,
        en: descTr
      },
      source: 'karmedya'
    });
  }

  return products;
}

async function fetchAndParseProducts() {
  const now = Date.now();
  if (cachedProducts && cachedProducts.length > 0 && (now - lastFetchTime) < CACHE_DURATION) {
    return cachedProducts;
  }

  try {
    const xml = await fetchXML();
    const products = parseXmlFast(xml);

    if (products && products.length > 0) {
      cachedProducts = products;
      lastFetchTime = now;
      console.log(`[Fast XML Parser] Parsed ${products.length} products successfully`);
      return products;
    }
  } catch (error) {
    console.error('Error fetching/parsing XML:', error.message);
  }

  if (cachedProducts && cachedProducts.length > 0) return cachedProducts;
  return [];
}

function getCategories(products = []) {
  const catMap = new Map();
  products.forEach(p => {
    if (!p) return;
    let tr = '';
    let ar = '';
    let en = '';

    if (p.category && p.category.tr) {
      tr = p.category.tr;
      ar = p.category.ar;
      en = p.category.en;
    } else if (p.categories && p.categories.tr) {
      tr = Array.isArray(p.categories.tr) ? p.categories.tr[0] : p.categories.tr;
      ar = Array.isArray(p.categories.ar) ? p.categories.ar[0] : p.categories.ar;
      en = Array.isArray(p.categories.en) ? p.categories.en[0] : p.categories.en;
    } else if (p.category_tr) {
      tr = p.category_tr;
      ar = p.category_ar;
      en = p.category_en;
    }

    if (tr) {
      const cleanTr = String(tr).trim();
      if (cleanTr && cleanTr !== '--Kapalı Ürünler Kategorisi') {
        const existing = catMap.get(cleanTr);
        if (existing) {
          existing.count = (existing.count || 0) + 1;
        } else {
          catMap.set(cleanTr, {
            tr: cleanTr,
            ar: ar || translateCategory(cleanTr, 'ar'),
            en: en || translateCategory(cleanTr, 'en'),
            count: 1
          });
        }
      }
    }
  });
  return Array.from(catMap.values());
}

function getProductsByCategory(products, catName, lang = 'ar') {
  if (!catName || catName === 'all') return products;
  const target = String(catName).toLowerCase().trim();
  
  // Strip common Arabic/Turkish category prefixes/suffixes for robust matching
  const cleanTarget = target.replace(/^(ميداليات|ساعات|دفاتر|أقلام|ترمس|فلاشات|ولاعات|حقائب|تقويمات|أطقم|قرطاسية)\s*[-|]?\s*/gi, '').trim();

  return products.filter(p => {
    if (!p) return false;

    const catTr = (p.category_tr || (p.category && p.category.tr) || (p.categories && Array.isArray(p.categories.tr) ? p.categories.tr[0] : p.categories && p.categories.tr) || '').toLowerCase();
    const catAr = (p.category_ar || (p.category && p.category.ar) || (p.categories && Array.isArray(p.categories.ar) ? p.categories.ar[0] : p.categories && p.categories.ar) || '').toLowerCase();
    const catEn = (p.category_en || (p.category && p.category.en) || (p.categories && Array.isArray(p.categories.en) ? p.categories.en[0] : p.categories && p.categories.en) || '').toLowerCase();

    const topCatTr = (p.topCategory && p.topCategory.tr ? p.topCategory.tr : catTr.split(' > ')[0]).toLowerCase();
    const topCatAr = (p.topCategory && p.topCategory.ar ? p.topCategory.ar : catAr.split(' > ')[0]).toLowerCase();

    // Direct match check
    if (catTr.includes(target) || catAr.includes(target) || catEn.includes(target) || topCatTr.includes(target) || topCatAr.includes(target)) {
      return true;
    }

    if (cleanTarget && cleanTarget.length > 2) {
      if (catTr.includes(cleanTarget) || catAr.includes(cleanTarget) || topCatTr.includes(cleanTarget) || topCatAr.includes(cleanTarget)) {
        return true;
      }
    }

    // Bidirectional translation check
    const translatedAr = (translateCategory(p.category_tr || catTr, 'ar') || '').toLowerCase();
    const translatedTr = (translateCategory(catName, 'tr') || '').toLowerCase();

    if (translatedAr.includes(target) || catTr.includes(translatedTr)) {
      return true;
    }

    // Robust Aliases
    if ((target.includes('ميدالي') || target.includes('anahtar')) && (catTr.includes('anahtar') || catAr.includes('ميدالي'))) {
      return true;
    }
    if ((target.includes('أجند') || target.includes('دفتر') || target.includes('defter') || target.includes('ajanda')) && (catTr.includes('defter') || catTr.includes('ajanda') || catAr.includes('دفتر') || catAr.includes('أجند'))) {
      return true;
    }
    if ((target.includes('قلم') || target.includes('أقلام') || target.includes('kalem') || target.includes('pen')) && (catTr.includes('kalem') || catAr.includes('قلم') || catAr.includes('أقلام'))) {
      return true;
    }
    if ((target.includes('ساع') || target.includes('saat') || target.includes('clock')) && (catTr.includes('saat') || catAr.includes('ساع'))) {
      return true;
    }
    if ((target.includes('ترمس') || target.includes('termos') || target.includes('mug')) && (catTr.includes('termos') || catAr.includes('ترمس'))) {
      return true;
    }
    if ((target.includes('بطاري') || target.includes('powerbank')) && (catTr.includes('powerbank') || catAr.includes('بطاري'))) {
      return true;
    }

    return false;
  });
}

function searchProducts(products, query) {
  if (!query) return products;
  const q = query.toLowerCase().trim();
  return products.filter(p => {
    const nameMatch = (p.name && p.name.tr && p.name.tr.toLowerCase().includes(q)) ||
                      (p.name && p.name.ar && p.name.ar.toLowerCase().includes(q)) ||
                      (p.name && p.name.en && p.name.en.toLowerCase().includes(q)) ||
                      (p.name_tr && p.name_tr.toLowerCase().includes(q)) ||
                      (p.name_ar && p.name_ar.toLowerCase().includes(q));
    const modelMatch = p.model && p.model.toLowerCase().includes(q);
    const catMatch = (p.category_tr && p.category_tr.toLowerCase().includes(q)) ||
                     (p.category_ar && p.category_ar.toLowerCase().includes(q));
    return nameMatch || modelMatch || catMatch;
  });
}

function getProductById(products, id) {
  return products.find(p => String(p.id) === String(id) || String(p.product_id) === String(id));
}

module.exports = { fetchAndParseProducts, getCategories, getProductsByCategory, searchProducts, getProductById };
