const fs = require('fs');
const path = require('path');
const { parseStringPromise } = require('xml2js');
const { translateProductName, translateCategory, fixMojikake, normalizeCategoryName } = require('./translations');

const XML_URL = 'https://karmedya.com/xml/xml_export_product.xml';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hour cache

let cachedProducts = null;
let lastFetchTime = 0;

function resolveStrictCategory(catStr, nameStr) {
  const origCatTr = fixMojikake(catStr ? catStr.split('>').pop().trim() : 'Genel');
  const nameTr = fixMojikake(nameStr || '').toLowerCase();
  const origCatLower = origCatTr.toLowerCase();

  let catTr = origCatTr;
  let catAr = translateCategory(origCatTr, 'ar');
  let catEn = translateCategory(origCatTr, 'en');

  // 1. PLAQUES & TROPHIES (PLAKETLER & ÖDÜLLER) - MUST BE CHECKED FIRST TO AVOID BOX/SET CONFUSION
  const isPlaque = origCatLower.includes('plaket') ||
                   nameTr.includes('plaket') ||
                   nameTr.includes('kristal ödül') ||
                   nameTr.includes('kristal odul') ||
                   nameTr.includes('kristal odül') ||
                   origCatLower.includes('kupa ve madalya') ||
                   origCatLower.includes('kupalar ve madalyalar') ||
                   (origCatLower.includes('kristal') && !origCatLower.includes('masa'));

  if (isPlaque) {
    if (origCatLower.includes('ahşap') || origCatLower.includes('ahsap') || nameTr.includes('ahşap') || nameTr.includes('ahsap')) {
      catTr = 'Ahşap Plaketler';
      catAr = 'دروع خشبية';
      catEn = 'Wooden Plaques';
    } else if (origCatLower.includes('albüm') || origCatLower.includes('album') || nameTr.includes('albüm') || nameTr.includes('album') || origCatLower.includes('kadife')) {
      catTr = 'Albüm Plaketler';
      catAr = 'دروع تكريم وألبومات';
      catEn = 'Plaque Albums';
    } else if (origCatLower.includes('kupa') || origCatLower.includes('madalya') || nameTr.includes('madalya') || nameTr.includes('kupa')) {
      catTr = 'Kupalar ve Madalyalar';
      catAr = 'كؤوس وميداليات';
      catEn = 'Cups & Medals';
    } else {
      // Crystal & Glass Plaques (Cam Plaket, Kristal Plaket, Kutulu Kristal Plaket)
      catTr = 'Kristal Plaketler';
      catAr = 'دروع زجاجية وكريستال';
      catEn = 'Crystal & Glass Plaques';
    }
    return { catTr, catAr, catEn };
  }

  // 2. PEN SETS SEPARATION (MUST BE CHECKED BEFORE GENERAL PENS AND GENERAL SETS)
  const isPenSet = origCatTr === 'Kalem Setleri' || 
                   origCatTr === 'Set Kalemleri' ||
                   origCatTr === 'Kalem Seti' ||
                   origCatTr === 'Hediyelik Kalem Setleri' ||
                   origCatTr === 'Lüks Kalem Setleri (2 li)' ||
                   origCatTr === 'Lüks Kalem Setleri (Tekli)' ||
                   origCatLower.includes('kalem set') ||
                   origCatLower.includes('set kalem') ||
                   ((origCatTr.includes('Kalem') || origCatTr.includes('Hediyelik')) && (nameTr.includes('kalem seti') || nameTr.includes('set kalem') || nameTr.includes('kalem set') || nameTr.includes('ikili set') || nameTr.includes('2 li set') || nameTr.includes('3 lü set')));

  if (isPenSet) {
    catTr = 'Kalem Setleri';
    catAr = 'أطقم أقلام';
    catEn = 'Pen Sets';
    return { catTr, catAr, catEn };
  }

  // 3. PLANT GROWING SETS
  if (origCatLower.includes('bitki') || nameTr.includes('bitki yetiştirme') || nameTr.includes('tohum')) {
    catTr = 'Bitki Yetiştirme Setleri';
    catAr = 'مجموعات زراعة نباتات';
    catEn = 'Plant Growing Sets';
    return { catTr, catAr, catEn };
  }

  // 4. DESK SETS
  if (origCatLower.includes('masa set') || origCatLower.includes('sümen') || origCatLower.includes('sumen') || nameTr.includes('masa seti') || nameTr.includes('sümen takımı')) {
    catTr = 'Masa Setleri';
    catAr = 'أطقم مكتبية';
    catEn = 'Desk Sets';
    return { catTr, catAr, catEn };
  }

  // 5. BOXES & ACCESSORIES (EMPTY GIFT BOXES, PEN BOXES, ETC.)
  if (origCatTr === 'Kutu - Aksesuar' || origCatTr === 'Kutu' || origCatTr === 'Hediyelik Kutular' || origCatTr === 'Kalem ve Set Kutuları' || (origCatTr.includes('Kutu') && !origCatTr.includes('Set') && !origCatTr.includes('Plaket'))) {
    catTr = 'Kutu - Aksesuar';
    catAr = 'علب وإكسسوارات';
    catEn = 'Boxes & Accessories';
    return { catTr, catAr, catEn };
  }

  // 6. ORGANIZERS
  if (origCatLower.includes('organizer')) {
    if (origCatLower.includes('powerbank')) {
      catTr = 'Powerbank Organizerler';
      catAr = 'منظمات باوربانك';
      catEn = 'Powerbank Organizers';
    } else if (origCatLower.includes('masaüstü') || origCatLower.includes('masaustu')) {
      catTr = 'Masaüstü Organizerler';
      catAr = 'منظمات مكتبية';
      catEn = 'Desk Organizers';
    } else {
      catTr = 'Organizerler';
      catAr = 'منظمات ومفكرات';
      catEn = 'Organizers';
    }
    return { catTr, catAr, catEn };
  }

  // 7. TRUE PROMOTIONAL GIFT SETS (KUTULU SETLER / HEDİYELİK SETLER)
  // Strictly only actual gift sets (VIP sets, notebook+pen, mug+notebook sets, etc.)
  if (origCatTr === 'Kutulu Setler' || origCatTr === 'Hediyelik Setler' || origCatTr === 'Kutulu Hediyelik Setler' || origCatTr === 'Hediyelik Set - Kişisel Ürünler' || origCatTr === 'Hediye Setleri' || origCatLower.includes('hediye set') || origCatLower.includes('hediyelik set') || nameTr.includes('hediyelik set') || nameTr.includes('hediye seti') || nameTr.includes('vip set')) {
    catTr = 'Kutulu Setler';
    catAr = 'أطقم هدايا بعلب';
    catEn = 'Boxed Gift Sets';
    return { catTr, catAr, catEn };
  }

  // 8. PENS SEPARATION
  else if (origCatTr === 'Kalemler' || origCatTr === 'Promosyon Kalemler' || origCatTr === 'Promosyon Kalem' || origCatTr.includes('Kalem')) {
    if (origCatTr.includes('Metal') || nameTr.includes('metal') || nameTr.includes('roller') || nameTr.includes('lüks') || nameTr.includes('luks')) {
      catTr = 'Metal Kalemler';
      catAr = 'أقلام معدنية';
      catEn = 'Metal Pens';
    } else if (nameTr.includes('kurşun') || nameTr.includes('kursun') || nameTr.includes('bambu') || nameTr.includes('ahşap') || origCatTr.includes('Kurşun')) {
      catTr = 'Kurşun Kalemler';
      catAr = 'أقلام رصاص';
      catEn = 'Pencils';
    } else if (nameTr.includes('dokunmatik') || origCatTr.includes('Dokunmatik')) {
      catTr = 'Dokunmatik Ekran Kalemleri';
      catAr = 'أقلام شاشة لمس';
      catEn = 'Touchscreen Pens';
    } else {
      catTr = 'Plastik Kalemler';
      catAr = 'أقلام بلاستيكية';
      catEn = 'Plastic Pens';
    }
    return { catTr, catAr, catEn };
  }

  // 9. AGENDAS & NOTEBOOKS SEPARATION
  else if (origCatTr.includes('Ajanda') || origCatTr.includes('Defter') || origCatTr.includes('Notluk') || origCatTr.includes('Bloknot')) {
    if (nameTr.includes('tarihli') || nameTr.includes('2026') || nameTr.includes('2025') || origCatTr.includes('Tarihli') || origCatTr.includes('2026')) {
      catTr = 'Tarihli Ajandalar';
      catAr = 'أجندات مؤرخة';
      catEn = 'Dated Agendas';
    } else if (nameTr.includes('ajanda') || origCatTr.startsWith('Ajanda')) {
      catTr = 'Ajandalar';
      catAr = 'أجندات';
      catEn = 'Agendas';
    } else {
      catTr = 'Defterler';
      catAr = 'دفاتر ملاحظات';
      catEn = 'Notebooks';
    }
    return { catTr, catAr, catEn };
  }

  // 10. KEYCHAINS & BADGES SEPARATION
  else if (origCatTr.includes('Anahtarlık') || origCatTr.includes('Rozet')) {
    if (nameTr.includes('rozet') || origCatTr === 'Rozetler') {
      catTr = 'Rozetler';
      catAr = 'شارات';
      catEn = 'Badges';
    } else {
      catTr = 'Anahtarlıklar';
      catAr = 'ميداليات';
      catEn = 'Keychains';
    }
    return { catTr, catAr, catEn };
  }

  // 11. CLOCKS SEPARATION
  else if (origCatTr.includes('Saat')) {
    if (origCatTr.includes('Metal Duvar') || nameTr.includes('metal duvar')) {
      catTr = 'Metal Duvar Saatleri';
      catAr = 'ساعات حائط معدنية';
      catEn = 'Metal Wall Clocks';
    } else if (origCatTr.includes('Bombe') || nameTr.includes('bombe cam')) {
      catTr = 'Bombe Cam Duvar Saatleri';
      catAr = 'ساعات حائط زجاج محدب';
      catEn = 'Convex Glass Wall Clocks';
    } else if (origCatTr.includes('Metalize') || nameTr.includes('metalize')) {
      catTr = 'Metalize Duvar Saatleri';
      catAr = 'ساعات حائط ممعدنة';
      catEn = 'Metallized Wall Clocks';
    } else if (origCatTr.includes('Akıllı') || nameTr.includes('akıllı saat')) {
      catTr = 'Akıllı Saatler';
      catAr = 'ساعات ذكية';
      catEn = 'Smart Watches';
    } else {
      catTr = 'Plastik Duvar Saatleri';
      catAr = 'ساعات حائط بلاستيكية';
      catEn = 'Plastic Wall Clocks';
    }
    return { catTr, catAr, catEn };
  }

  return { catTr, catAr, catEn };
}

async function fetchXML() {
  const localBackup = path.join(__dirname, '..', 'data', 'xml_export_product.xml');

  // 1. Prioritize live remote XML download to get fresh products and prices
  try {
    const response = await fetch(XML_URL, {
      signal: AbortSignal.timeout(15000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/xml, text/xml, */*'
      }
    });
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
    console.warn(`[XML Feed] Remote fetch failed (${e.message}). Falling back to local backup...`);
  }

  // 2. Fall back to local backup file only if remote fetch fails
  if (fs.existsSync(localBackup)) {
    try {
      const stats = fs.statSync(localBackup);
      if (stats.size > 1000) {
        let text = fs.readFileSync(localBackup, 'utf8');
        if (text.includes('<')) text = text.substring(text.indexOf('<'));
        console.log(`[XML Feed] Loaded XML from local backup file (${stats.size} bytes)`);
        return text;
      }
    } catch(e) {}
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
    const nameTr = fixMojikake(getVal('PRODUCT_NAME') || getVal('NAME') || getVal('TITLE'));
    if (!id || !nameTr) continue;

    const model = getVal('PRODUCT_CODE') || getVal('CODE') || getVal('MODEL') || id;
    let descTr = getVal('DESCRIPTION') || getVal('DETAIL') || '';
    if (descTr) {
      descTr = descTr.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    }
    const price = parseFloat(getVal('PRICE') || getVal('PRICE_VAT') || '0') || 0;
    const stock = parseInt(getVal('STOCK') || getVal('QUANTITY') || '100') || 100;
    
    // Extract CATEGORY items from CATEGORIES block or single CATEGORY tag
    let catStr = '';
    const catMatches = itemContent.match(/<category[^>]*>([\s\S]*?)<\/category>/gi);
    if (catMatches && catMatches.length > 0) {
      const cleanCats = catMatches
        .map(m => m.replace(/<\/?category[^>]*>/gi, '').replace(/&gt;/g, '>').trim())
        .filter(c => c && !c.match(/^\d+$/) && c !== '--Kapalı Ürünler Kategorisi');
      if (cleanCats.length > 0) {
        catStr = cleanCats.reduce((a, b) => b.length > a.length ? b : a, cleanCats[0]);
      }
    }
    if (!catStr) {
      catStr = fixMojikake(getVal('CATEGORY_NAME') || getVal('CATEGORY') || getVal('CATEGORIES') || 'Genel');
    }

    const images = [];
    const mainImg = getVal('IMAGE') || getVal('IMAGE_URL') || getVal('PICTURE');
    if (mainImg) images.push(mainImg.trim());
    
    for (let i = 1; i <= 10; i++) {
      const img = getVal(`IMAGE_${i}`) || getVal(`IMAGE${i}`);
      if (img && !images.includes(img.trim())) images.push(img.trim());
    }

    const { catTr, catAr, catEn } = resolveStrictCategory(catStr, nameTr);

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
        tr: descTr || nameTr,
        ar: descTr || translateProductName(nameTr, 'ar'),
        en: descTr || translateProductName(nameTr, 'en')
      },
      source: 'karmedya'
    });
  }

  return products;
}

async function fetchAndParseProducts(force = false) {
  const now = Date.now();
  if (!force && cachedProducts && cachedProducts.length > 0 && (now - lastFetchTime) < CACHE_DURATION) {
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
    return [];
  } catch (error) {
    console.error('Error fetching/parsing XML:', error.message, error.stack);
    throw error;
  }
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
      const nameStr = (p.name_tr || (p.name && p.name.tr) || '');
      const resolved = resolveStrictCategory(tr, nameStr);
      const cleanTr = resolved.catTr;
      if (cleanTr && cleanTr !== '--Kapalı Ürünler Kategorisi') {
        const existing = catMap.get(cleanTr);
        if (existing) {
          existing.count = (existing.count || 0) + 1;
        } else {
          catMap.set(cleanTr, {
            tr: cleanTr,
            ar: resolved.catAr,
            en: resolved.catEn,
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
  const rawTarget = fixMojikake(String(catName)).trim();
  const target = rawTarget.toLowerCase();
  
  // Normalize Turkish category suffixes like 'setleri' -> 'setler', 'leri' -> 'ler', 'ları' -> 'lar'
  const normTarget = target
    .replace(/setleri$/gi, 'setler')
    .replace(/leri$/gi, 'ler')
    .replace(/ları$/gi, 'lar')
    .replace(/set$/gi, 'setler')
    .trim();

  const normTargetCategoryTr = normalizeCategoryName(rawTarget).toLowerCase();

  return products.filter(p => {
    if (!p) return false;

    const rawCatTr = fixMojikake(p.category_tr || (p.category && p.category.tr) || (p.categories && Array.isArray(p.categories.tr) ? p.categories.tr[0] : p.categories && p.categories.tr) || '');
    const nameTr = (p.name_tr || (p.name && p.name.tr) || '');
    
    const resolved = resolveStrictCategory(rawCatTr, nameTr);
    const catTr = resolved.catTr.toLowerCase();
    const catAr = resolved.catAr.toLowerCase();
    const catEn = resolved.catEn.toLowerCase();
    const normResolvedCatTr = normalizeCategoryName(resolved.catTr).toLowerCase();

    // 1. Direct match check against resolved strict category
    if (catTr === target || catAr === target || catEn === target || catTr === normTarget || normResolvedCatTr === normTargetCategoryTr) {
      return true;
    }

    // 2. Plaques matching (Crystal, Wood, Album) - prevent any cross-bleeding
    const isTargetPlaque = target.includes('plaket') || target.includes('درع') || target.includes('دروع') || target.includes('plaque');
    const isCatPlaque = catTr.includes('plaket');
    if (isTargetPlaque || isCatPlaque) {
      if (!isTargetPlaque || !isCatPlaque) return false;
      if (target.includes('ahşap') || target.includes('ahsap') || target.includes('خشب')) {
        return catTr.includes('ahşap') || catTr.includes('ahsap');
      }
      if (target.includes('albüm') || target.includes('album') || target.includes('ألبوم')) {
        return catTr.includes('albüm') || catTr.includes('album');
      }
      return !catTr.includes('ahşap') && !catTr.includes('ahsap') && !catTr.includes('albüm') && !catTr.includes('album');
    }

    // 3. Gift Sets (Kutulu Setler / Hediyelik Setler) - strictly exclude pen sets, desk sets, plant sets
    const isTargetGiftSet = target === 'kutulu setler' || target === 'hediyelik setler' || target === 'hediye setleri' || target.includes('أطقم هدايا بعلب') || target.includes('boxed gift sets');
    if (isTargetGiftSet) {
      return catTr === 'kutulu setler' || normResolvedCatTr === 'kutulu setler';
    }

    // 4. Desk Sets (Masa Setleri) matching
    const isTargetDeskSet = target.includes('masa set') || target.includes('أطقم مكتب');
    if (isTargetDeskSet) {
      return catTr.includes('masa set') || catTr === 'masa setleri';
    }

    // 5. Plant Sets (Bitki Yetiştirme Setleri) matching
    const isTargetPlantSet = target.includes('bitki') || target.includes('زراعة نباتات');
    if (isTargetPlantSet) {
      return catTr.includes('bitki');
    }

    // 6. Pen Sets (Kalem Setleri) matching
    const isTargetPenSet = (target.includes('set') && target.includes('kalem')) || target.includes('أطقم أقلام') || target.includes('pen sets');
    if (isTargetPenSet) {
      return catTr === 'kalem setleri' || (catTr.includes('kalem') && catTr.includes('set'));
    }

    // 7. Metal Pens matching
    const isTargetMetalPen = (target.includes('metal') && target.includes('kalem')) || target.includes('أقلام معدنية');
    if (isTargetMetalPen) {
      return catTr === 'metal kalemler' || (catTr.includes('metal') && catTr.includes('kalem'));
    }

    // 8. Plastic Pens matching
    const isTargetPlasticPen = (target.includes('plastik') && target.includes('kalem')) || target.includes('أقلام بلاستيكية');
    if (isTargetPlasticPen) {
      return catTr === 'plastik kalemler' || (catTr.includes('plastik') && catTr.includes('kalem'));
    }

    // 9. Agendas & Dated Agendas matching
    const isTargetDatedAgenda = target.includes('tarihli') || target.includes('مؤرخة') || target.includes('dated agenda');
    if (isTargetDatedAgenda) {
      return catTr === 'tarihli ajandalar';
    }

    const translatedAr = fixMojikake(translateCategory(resolved.catTr, 'ar') || '').toLowerCase();
    const translatedTr = fixMojikake(translateCategory(rawTarget, 'tr') || '').toLowerCase();
    const normTranslatedTr = translatedTr.replace(/setleri$/gi, 'setler').replace(/leri$/gi, 'ler').replace(/ları$/gi, 'lar').trim();

    if (translatedAr === target || catTr === translatedTr || normResolvedCatTr === translatedTr) {
      return true;
    }

    return false;
  });
}

function searchProducts(products, query) {
  if (!query) return products;
  const q = fixMojikake(query).toLowerCase().trim();
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

module.exports = { fetchAndParseProducts, fetchXML, parseXmlFast, getCategories, getProductsByCategory, searchProducts, getProductById, resolveStrictCategory };
