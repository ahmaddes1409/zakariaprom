import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type Language = "ar" | "en" | "tr";

interface Translations {
  [key: string]: { ar: string; en: string; tr: string };
}

const translations: Translations = {
  // Navigation
  "nav.home": { ar: "الرئيسية", en: "Home", tr: "Ana Sayfa" },
  "nav.about": { ar: "من نحن", en: "About Us", tr: "Hakkımızda" },
  "nav.services": { ar: "خدماتنا", en: "Our Services", tr: "Hizmetlerimiz" },
  "nav.catalog": { ar: "الكتالوج", en: "Catalog", tr: "Katalog" },
  "nav.contact": { ar: "اتصل بنا", en: "Contact Us", tr: "İletişim" },
  "nav.products": { ar: "المنتجات", en: "Products", tr: "Ürünler" },
  "nav.faq": { ar: "الأسئلة الشائعة", en: "FAQ", tr: "S.S.S." },

  // Search
  "search.placeholder": { ar: "ابحث عن المنتجات بالاسم أو الكود...", en: "Search products by name or code...", tr: "Ürün adı veya kodu ile arayın..." },

  // Hero
  "hero.title": { ar: "منتجات الدعاية والإعلان", en: "Promotional Products", tr: "Promosyon Ürünleri" },
  "hero.subtitle": { ar: "إنتاج واستيراد - بيع بالجملة", en: "Production & Import - Wholesale", tr: "Üretim ve İthalat - Toptan Satış" },
  "hero.cta": { ar: "تصفح المنتجات", en: "Browse Products", tr: "Ürünleri İncele" },
  "hero.tagline": { ar: "علامتك التجارية... شغفنا", en: "Your Brand... Our Passion", tr: "Markanız... Tutkumuz" },

  // Categories
  "cat.tech": { ar: "منتجات تكنولوجية", en: "Technology Products", tr: "Teknoloji Ürünleri" },
  "cat.powerbank": { ar: "باور بانك", en: "Power Banks", tr: "Powerbanklar" },
  "cat.wireless": { ar: "شواحن لاسلكية", en: "Wireless Chargers", tr: "Wireless Şarj İstasyonları" },
  "cat.speakers": { ar: "سماعات بلوتوث", en: "Bluetooth Speakers", tr: "Bluetooth Hoparlörler" },
  "cat.usb": { ar: "فلاش ميموري", en: "USB Flash Drives", tr: "USB Bellekler" },
  "cat.metalPens": { ar: "أقلام معدنية", en: "Metal Pens", tr: "Metal Kalemler" },
  "cat.plasticPens": { ar: "أقلام بلاستيكية", en: "Plastic Pens", tr: "Plastik Kalemler" },
  "cat.penSets": { ar: "أطقم أقلام هدايا", en: "Gift Pen Sets", tr: "Hediye Kalem Setleri" },
  "cat.notebooks": { ar: "دفاتر وأجندات", en: "Notebooks & Agendas", tr: "Defterler ve Ajandalar" },
  "cat.thermos": { ar: "ترمس ومج", en: "Thermos & Mugs", tr: "Termos ve Mug" },
  "cat.ceramicMugs": { ar: "أكواب سيراميك", en: "Ceramic Mugs", tr: "Seramik Kupalar" },
  "cat.keychains": { ar: "ميداليات", en: "Keychains", tr: "Anahtarlıklar" },
  "cat.badges": { ar: "شارات وبروشات", en: "Badges & Pins", tr: "Rozetler" },
  "cat.lighters": { ar: "ولاعات معدنية فاخرة", en: "Luxury Metal Lighters", tr: "Lüks Metal Çakmaklar" },
  "cat.promoLighters": { ar: "ولاعات دعائية", en: "Promotional Lighters", tr: "Promosyon Çakmaklar" },
  "cat.deskSets": { ar: "أطقم مكتبية", en: "Desk Sets", tr: "Masa Setleri" },
  "cat.bags": { ar: "حقائب ظهر", en: "Backpacks", tr: "Sırt Çantaları" },
  "cat.wallets": { ar: "محافظ", en: "Wallets", tr: "Cüzdanlar" },
  "cat.umbrellas": { ar: "مظلات", en: "Umbrellas", tr: "Şemsiyeler" },
  "cat.giftSets": { ar: "أطقم هدايا فاخرة", en: "Luxury Gift Sets", tr: "Kutulu Hediye Setleri" },
  "cat.clocks": { ar: "ساعات دعائية", en: "Promotional Clocks", tr: "Promosyon Saatler" },
  "cat.printing": { ar: "منتجات مطبعة", en: "Printing Products", tr: "Matbaa Ürünleri" },
  "cat.textile": { ar: "منتجات نسيجية", en: "Textile Products", tr: "Tekstil Ürünleri" },
  "cat.knives": { ar: "سكاكين جيب وكشافات", en: "Pocket Knives & Flashlights", tr: "Çakı ve El Feneri" },

  // Footer
  "footer.address": { ar: "عنواننا", en: "Our Address", tr: "Adresimiz" },
  "footer.phone": { ar: "الهاتف", en: "Phone", tr: "Telefon" },
  "footer.email": { ar: "البريد الإلكتروني", en: "Email", tr: "E-posta" },
  "footer.rights": { ar: "جميع الحقوق محفوظة", en: "All rights reserved", tr: "Tüm hakları saklıdır" },
  "footer.turkey": { ar: "فرع تركيا", en: "Turkey Branch", tr: "Türkiye Şubesi" },
  "footer.syria": { ar: "فرع سوريا", en: "Syria Branch", tr: "Suriye Şubesi" },
  "footer.followUs": { ar: "تابعنا", en: "Follow Us", tr: "Bizi Takip Edin" },
  "footer.quickLinks": { ar: "روابط سريعة", en: "Quick Links", tr: "Hızlı Bağlantılar" },

  // About
  "about.title": { ar: "من نحن", en: "About Us", tr: "Hakkımızda" },
  "about.desc": { ar: "زكريا بروم شركة رائدة في مجال إنتاج واستيراد منتجات الدعاية والإعلان والهدايا الترويجية. نمتلك مطابع في تركيا وسوريا ونقدم خدماتنا للشركات والمؤسسات في جميع أنحاء المنطقة.", en: "Zakaria Prom is a leading company in the production and import of promotional and advertising products. We have printing facilities in Turkey and Syria, serving businesses across the region.", tr: "Zakaria Prom, promosyon ve reklam ürünleri üretim ve ithalatında lider bir firmadır. Türkiye ve Suriye'de matbaalarımız bulunmakta olup bölgedeki işletmelere hizmet vermekteyiz." },

  // Services
  "services.customPrint": { ar: "طباعة مخصصة", en: "Custom Printing", tr: "Özel Baskı" },
  "services.customPrintDesc": { ar: "طباعة شعارك على جميع المنتجات بأعلى جودة", en: "Print your logo on all products with the highest quality", tr: "Logonuzu tüm ürünlere en yüksek kalitede basıyoruz" },
  "services.wholesale": { ar: "بيع بالجملة", en: "Wholesale", tr: "Toptan Satış" },
  "services.wholesaleDesc": { ar: "أسعار خاصة للطلبات الكبيرة والشركات", en: "Special prices for bulk orders and companies", tr: "Toplu siparişler ve şirketler için özel fiyatlar" },
  "services.design": { ar: "تصميم إبداعي", en: "Creative Design", tr: "Yaratıcı Tasarım" },
  "services.designDesc": { ar: "فريق تصميم محترف لإنشاء هوية بصرية مميزة", en: "Professional design team to create a distinctive visual identity", tr: "Özgün bir görsel kimlik oluşturmak için profesyonel tasarım ekibi" },
  "services.delivery": { ar: "شحن وتوصيل", en: "Shipping & Delivery", tr: "Kargo ve Teslimat" },
  "services.deliveryDesc": { ar: "نوصل طلباتكم إلى جميع أنحاء تركيا وسوريا والمنطقة", en: "We deliver your orders across Turkey, Syria and the region", tr: "Siparişlerinizi Türkiye, Suriye ve bölge geneline ulaştırıyoruz" },

  // Contact
  "contact.title": { ar: "تواصل معنا", en: "Contact Us", tr: "İletişim" },
  "contact.name": { ar: "الاسم", en: "Name", tr: "İsim" },
  "contact.email": { ar: "البريد الإلكتروني", en: "Email", tr: "E-posta" },
  "contact.message": { ar: "الرسالة", en: "Message", tr: "Mesaj" },
  "contact.send": { ar: "إرسال", en: "Send", tr: "Gönder" },
  "contact.getInTouch": { ar: "تواصل معنا الآن", en: "Get in Touch", tr: "Bize Ulaşın" },

  // General
  "general.viewAll": { ar: "عرض الكل", en: "View All", tr: "Tümünü Gör" },
  "general.readMore": { ar: "اقرأ المزيد", en: "Read More", tr: "Daha Fazla" },
  "general.categories": { ar: "الفئات", en: "Categories", tr: "Kategoriler" },
  "general.featuredProducts": { ar: "المنتجات المميزة", en: "Featured Products", tr: "Öne Çıkan Ürünler" },
  "general.newArrivals": { ar: "وصل حديثاً", en: "New Arrivals", tr: "Yeni Ürünler" },
  "general.requestQuote": { ar: "اطلب عرض سعر", en: "Request a Quote", tr: "Fiyat Teklifi İsteyin" },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  dir: "rtl" | "ltr";
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("ar");

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, []);

  const t = useCallback(
    (key: string) => {
      const entry = translations[key];
      if (!entry) return key;
      return entry[language] || entry.ar || key;
    },
    [language]
  );

  const dir = language === "ar" ? "rtl" : "ltr";

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}
