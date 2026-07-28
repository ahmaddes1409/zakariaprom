const express = require('express');
const database = require('../database');
const { fetchAndParseProducts, searchProducts, getCategories } = require('../dataService');

function getDb() { return database.db; }

const router = express.Router();

// Get chatbot config
router.get('/config', (req, res) => {
  const db = getDb();
  const enabled = db.prepare("SELECT value FROM settings WHERE key = 'chatbot_enabled'").get();
  const welcomeAr = db.prepare("SELECT value FROM settings WHERE key = 'chatbot_welcome_ar'").get();
  const welcomeEn = db.prepare("SELECT value FROM settings WHERE key = 'chatbot_welcome_en'").get();
  const welcomeTr = db.prepare("SELECT value FROM settings WHERE key = 'chatbot_welcome_tr'").get();
  const whatsapp = db.prepare("SELECT value FROM settings WHERE key = 'whatsapp'").get();

  res.json({
    enabled: enabled && enabled.value === '1',
    welcome: {
      ar: (welcomeAr && welcomeAr.value) || 'مرحباً! كيف يمكنني مساعدتك؟',
      en: (welcomeEn && welcomeEn.value) || 'Hello! How can I help you?',
      tr: (welcomeTr && welcomeTr.value) || 'Merhaba! Size nasıl yardımcı olabilirim?'
    },
    whatsapp: (whatsapp && whatsapp.value) || ''
  });
});

// Chat message handler
router.post('/message', async (req, res) => {
  const db = getDb();
  const { message, lang = 'ar' } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message required' });
  }

  const query = message.toLowerCase().trim();
  let response = null;

  // 1. Check FAQ database for matching keywords
  const faqs = db.prepare('SELECT * FROM chatbot_faq WHERE active = 1 ORDER BY priority DESC').all();
  
  for (const faq of faqs) {
    const keywords = (faq.keywords || '').split(',').map(k => k.trim().toLowerCase()).filter(k => k);
    const matchScore = keywords.reduce((score, keyword) => {
      if (query.includes(keyword)) return score + 1;
      return score;
    }, 0);

    if (matchScore > 0) {
      const answerKey = `answer_${lang}`;
      const questionKey = `question_${lang}`;
      response = {
        type: 'faq',
        answer: faq[answerKey] || faq.answer_ar,
        question: faq[questionKey] || faq.question_ar,
        confidence: matchScore / keywords.length
      };
      break;
    }
  }

  // 2. Try product search if no FAQ match
  if (!response || response.confidence < 0.3) {
    try {
      const products = await fetchAndParseProducts();
      const results = searchProducts(products, query, lang);
      if (results.length > 0) {
        const topResults = results.slice(0, 5);
        const langKey = lang;
        const productList = topResults.map(p => ({
          id: p.id,
          name: p.name[langKey] || p.name.tr,
          image: p.images[0] || '',
          price: p.price
        }));

        const messages = {
          ar: `وجدت ${results.length} منتج مطابق. إليك أبرز النتائج:`,
          en: `Found ${results.length} matching products. Here are the top results:`,
          tr: `${results.length} eşleşen ürün bulundu. İşte en iyi sonuçlar:`
        };

        response = {
          type: 'products',
          answer: messages[lang] || messages.ar,
          products: productList,
          totalFound: results.length
        };
      }
    } catch (e) {
      // Silently fail product search
    }
  }

  // 3. Try category suggestion
  if (!response) {
    try {
      const products = await fetchAndParseProducts();
      const categories = getCategories(products);
      const matchedCat = categories.find(c => {
        return query.includes(c.tr.toLowerCase()) || 
               query.includes(c.ar.toLowerCase()) || 
               query.includes(c.en.toLowerCase());
      });
      if (matchedCat) {
        const messages = {
          ar: `لدينا ${matchedCat.count} منتج في فئة "${matchedCat[lang] || matchedCat.ar}". هل تريد تصفحها؟`,
          en: `We have ${matchedCat.count} products in the "${matchedCat[lang] || matchedCat.en}" category. Would you like to browse?`,
          tr: `"${matchedCat[lang] || matchedCat.tr}" kategorisinde ${matchedCat.count} ürünümüz var. Göz atmak ister misiniz?`
        };
        response = {
          type: 'category',
          answer: messages[lang] || messages.ar,
          category: matchedCat
        };
      }
    } catch (e) {
      // Silently fail
    }
  }

  // 4. Default response
  if (!response) {
    const defaults = {
      ar: 'شكراً لتواصلك! لم أتمكن من فهم سؤالك بالكامل. يمكنك:\n• البحث عن منتج محدد\n• السؤال عن الأسعار والتوصيل\n• التواصل مع فريقنا عبر الواتساب للمساعدة المباشرة',
      en: 'Thanks for reaching out! I couldn\'t fully understand your question. You can:\n• Search for a specific product\n• Ask about prices and delivery\n• Contact our team via WhatsApp for direct help',
      tr: 'İletişime geçtiğiniz için teşekkürler! Sorunuzu tam olarak anlayamadım. Şunları yapabilirsiniz:\n• Belirli bir ürün arayın\n• Fiyatlar ve teslimat hakkında sorun\n• Doğrudan yardım için WhatsApp üzerinden ekibimizle iletişime geçin'
    };
    response = {
      type: 'default',
      answer: defaults[lang] || defaults.ar
    };
  }

  // Add quick replies based on context
  const quickReplies = {
    ar: ['كيف أطلب عرض سعر؟', 'ما هي طرق الدفع؟', 'كم يستغرق التوصيل؟', 'تواصل مع واتساب'],
    en: ['How to request a quote?', 'Payment methods?', 'Delivery time?', 'Contact WhatsApp'],
    tr: ['Nasıl teklif isteyebilirim?', 'Ödeme yöntemleri?', 'Teslimat süresi?', 'WhatsApp ile iletişim']
  };

  response.quickReplies = quickReplies[lang] || quickReplies.ar;
  res.json(response);
});

module.exports = router;
