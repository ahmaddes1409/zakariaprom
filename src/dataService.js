const fs = require('fs');
const path = require('path');
const { parseStringPromise } = require('xml2js');
const { translateProductName, translateCategory } = require('./translations');

const XML_URL = 'https://karmedya.com/xml/xml_export_product.xml';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour cache

let cachedProducts = null;
let lastFetchTime = 0;

async function fetchXML() {
  const localBackup = path.join(__dirname, '..', 'data', 'xml_export_product.xml');
  
  // Try remote fetch FIRST
  try {
    const response = await fetch(XML_URL, { signal: AbortSignal.timeout(15000), headers: { 'User-Agent': 'Mozilla/5.0' } });
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
    console.warn(`[XML Feed] Remote fetch failed (${e.message}), falling back to local backup.`);
  }

  // Fallback to local backup if remote fetch failed
  if (fs.existsSync(localBackup)) {
    const stats = fs.statSync(localBackup);
    if (stats.size > 1000) {
      let text = fs.readFileSync(localBackup, 'utf8');
      if (text.includes('<')) text = text.substring(text.indexOf('<'));
      return text;
    }
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
        const lower = itemContent.toLowerCase();
        const lStart = lower.indexOf(openTag.toLowerCase());
        if (lStart === -1) return '';
        const lEnd = lower.indexOf(closeTag.toLowerCase(), lStart + openTag.length);
        if (lEnd === -1) return '';
        rawVal = itemContent.substring(lStart + openTag.length, lEnd).trim();
      } else {
        const end = itemContent.indexOf(closeTag, start + openTag.length);
        if (end === -1) return '';
        rawVal = itemContent.substring(start + openTag.length, end).trim();
      }
      if (rawVal.includes('Ã') || rawVal.includes('Å') || rawVal.includes('Ä')) {
        rawVal = rawVal.replace(/Ã¶/g, 'ö').replace(/Ã§/g, 'ç').replace(/ÅŸ/g, 'ş')
                       .replace(/ÄŸ/g, 'ğ').replace(/Ä±/g, 'ı').replace(/Ã¼/g, 'ü')
                       .replace(/Ã–/g, 'Ö').replace(/Ã‡/g, 'Ç').replace(/Åž/g, 'Ş')
                       .replace(/Ä°/g, 'İ').replace(/Ãœ/g, 'Ü');
      }
      return rawVal;
    };

    const productId = getVal('PRODUCT_ID');
    const name = getVal('NAME');
    const model = getVal('MODEL');
    const priceRaw = getVal('PRICE');
    const quantityRaw = getVal('QUANTITY');
    let description = getVal('DESCRIPTION');
    if (description.includes('&lt;')) {
      description = description.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    }
    description = description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

    // Extract categories
    const categories = [];
    const catMatches = itemContent.match(/<CATEGORY>([\s\S]*?)<\/CATEGORY>/gi) || [];
    for (const cTag of catMatches) {
      let cVal = cTag.replace(/<\/?CATEGORY>/gi, '').trim();
      if (cVal.includes('Ã') || cVal.includes('Å') || cVal.includes('Ä')) {
        cVal = cVal.replace(/Ã¶/g, 'ö').replace(/Ã§/g, 'ç').replace(/ÅŸ/g, 'ş')
                   .replace(/ÄŸ/g, 'ğ').replace(/Ä±/g, 'ı').replace(/Ã¼/g, 'ü')
                   .replace(/Ã–/g, 'Ö').replace(/Ã‡/g, 'Ç').replace(/Åž/g, 'Ş')
                   .replace(/Ä°/g, 'İ').replace(/Ãœ/g, 'Ü');
      }
      if (cVal && cVal !== '--Kapalı Ürünler Kategorisi' && !categories.includes(cVal)) {
        categories.push(cVal);
      }
    }

    // Extract images
    const images = [];
    const imgMatches = itemContent.match(/<IMAGE_\d+>([\s\S]*?)<\/IMAGE_\d+>/gi) || [];
    for (const iTag of imgMatches) {
      const url = iTag.replace(/<\/?IMAGE_\d+>/gi, '').trim();
      if (url && !images.includes(url)) {
        images.push(url);
      }
    }

    if (productId && name) {
      const price = parseFloat(priceRaw.replace(/[^0-9.]/g, '')) || 0;
      const quantity = parseInt(quantityRaw, 10) || 0;

      products.push({
        id: productId,
        name: { tr: name },
        model: model,
        categories: { tr: categories },
        description: description,
        price: price,
        quantity: quantity,
        images: images,
        colors: [],
        sizes: []
      });
    }
  }
  return products;
}

async function fetchAndParseProducts() {
  const now = Date.now();
  if (cachedProducts && cachedProducts.length > 0 && (now - lastFetchTime) < CACHE_DURATION) {
    return cachedProducts;
  }

  try {
    console.log('Fetching XML data from karmedya.com...');
    const xml = await fetchXML();
    const products = parseXmlFast(xml);

    if (products && products.length > 0) {
      cachedProducts = products;
      lastFetchTime = now;
      console.log(`[Fast XML Parser] Parsed ${products.length} products successfully`);
      return products;
    }
  } catch (error) {
    console.error('Error fetching/parsing XML:', error);
  }

  if (cachedProducts && cachedProducts.length > 0) return cachedProducts;
  return [];
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
  if (!Array.isArray(products)) return [];

  for (const product of products) {
    if (!product || !product.categories || !Array.isArray(product.categories.tr)) continue;
    const catTrArr = product.categories.tr;
    const catArArr = Array.isArray(product.categories.ar) ? product.categories.ar : catTrArr;
    const catEnArr = Array.isArray(product.categories.en) ? product.categories.en : catTrArr;

    for (let i = 0; i < catTrArr.length; i++) {
      let rawTr = catTrArr[i] || '';
      if (typeof rawTr !== 'string') continue;
      let rawAr = (typeof catArArr[i] === 'string' ? catArArr[i] : rawTr);
      let rawEn = (typeof catEnArr[i] === 'string' ? catEnArr[i] : rawTr);

      if (rawTr.includes('|')) rawTr = rawTr.split('|')[0].trim();
      if (rawAr.includes('|')) rawAr = rawAr.split('|')[0].trim();
      if (rawEn.includes('|')) rawEn = rawEn.split('|')[0].trim();

      const topTr = rawTr.split(' > ')[0].trim();
      const topAr = rawAr.split(' > ')[0].trim();
      const topEn = rawEn.split(' > ')[0].trim();

      if (!topTr) continue;

      if (!catMap[topTr]) {
        catMap[topTr] = { tr: topTr, ar: topAr, en: topEn, count: 0, subcategories: {} };
      }
      catMap[topTr].count++;

      // Subcategories
      const parts = rawTr.split(' > ');
      if (parts.length > 1) {
        const subTr = parts[1].trim();
        const subParts = rawAr.split(' > ');
        const subAr = subParts.length > 1 ? subParts[1].trim() : subTr;
        const subPartsEn = rawEn.split(' > ');
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
