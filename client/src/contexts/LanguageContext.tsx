import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { fetchTranslations, fetchSettings, type ApiTranslations, type ApiSettings } from "@/lib/api";

export type Language = "ar" | "en" | "tr";

// Local fallback translations (used until API loads)
const fallbackTranslations: Record<Language, Record<string, string>> = {
  ar: {
    "nav.home": "الرئيسية",
    "nav.about": "من نحن",
    "nav.products": "المنتجات",
    "nav.contact": "اتصل بنا",
    "search.placeholder": "ابحث عن المنتجات...",
    "hero.title": "منتجات الدعاية والإعلان",
    "hero.subtitle": "إنتاج واستيراد - بيع بالجملة",
    "hero.cta": "تصفح المنتجات",
    "hero.tagline": "علامتك التجارية... شغفنا",
    "general.categories": "الفئات",
    "general.featuredProducts": "المنتجات المميزة",
    "general.requestQuote": "اطلب عرض سعر",
    "general.viewAll": "عرض الكل",
    "services.customPrint": "طباعة مخصصة",
    "services.customPrintDesc": "طباعة شعارك على جميع المنتجات بأعلى جودة",
    "services.wholesale": "بيع بالجملة",
    "services.wholesaleDesc": "أسعار خاصة للطلبات الكبيرة والشركات",
    "services.design": "تصميم إبداعي",
    "services.designDesc": "فريق تصميم محترف لإنشاء هوية بصرية مميزة",
    "services.delivery": "شحن وتوصيل",
    "services.deliveryDesc": "نوصل طلباتكم إلى جميع أنحاء تركيا وسوريا والمنطقة",
    "about.title": "من نحن",
    "about.desc": "زكريا بروم شركة رائدة في مجال إنتاج واستيراد منتجات الدعاية والإعلان والهدايا الترويجية.",
    "contact.title": "تواصل معنا",
    "contact.name": "الاسم",
    "contact.email": "البريد الإلكتروني",
    "contact.message": "الرسالة",
    "contact.send": "إرسال",
    "footer.rights": "جميع الحقوق محفوظة",
    "footer.quickLinks": "روابط سريعة",
    "footer.followUs": "تابعنا",
    "footer.turkey": "فرع تركيا",
    "footer.syria": "فرع سوريا",
    "general.loading": "جاري التحميل...",
    "general.noProducts": "لا توجد منتجات",
    "general.productsCount": "منتج",
  },
  en: {
    "nav.home": "Home",
    "nav.about": "About Us",
    "nav.products": "Products",
    "nav.contact": "Contact Us",
    "search.placeholder": "Search products...",
    "hero.title": "Promotional Products",
    "hero.subtitle": "Production & Import - Wholesale",
    "hero.cta": "Browse Products",
    "hero.tagline": "Your Brand... Our Passion",
    "general.categories": "Categories",
    "general.featuredProducts": "Featured Products",
    "general.requestQuote": "Request a Quote",
    "general.viewAll": "View All",
    "services.customPrint": "Custom Printing",
    "services.customPrintDesc": "Print your logo on all products with the highest quality",
    "services.wholesale": "Wholesale",
    "services.wholesaleDesc": "Special prices for bulk orders and companies",
    "services.design": "Creative Design",
    "services.designDesc": "Professional design team to create a distinctive visual identity",
    "services.delivery": "Shipping & Delivery",
    "services.deliveryDesc": "We deliver your orders across Turkey, Syria and the region",
    "about.title": "About Us",
    "about.desc": "Zakaria Prom is a leading company in the production and import of promotional and advertising products.",
    "contact.title": "Contact Us",
    "contact.name": "Name",
    "contact.email": "Email",
    "contact.message": "Message",
    "contact.send": "Send",
    "footer.rights": "All rights reserved",
    "footer.quickLinks": "Quick Links",
    "footer.followUs": "Follow Us",
    "footer.turkey": "Turkey Branch",
    "footer.syria": "Syria Branch",
    "general.loading": "Loading...",
    "general.noProducts": "No products found",
    "general.productsCount": "products",
  },
  tr: {
    "nav.home": "Ana Sayfa",
    "nav.about": "Hakkımızda",
    "nav.products": "Ürünler",
    "nav.contact": "İletişim",
    "search.placeholder": "Ürün ara...",
    "hero.title": "Promosyon Ürünleri",
    "hero.subtitle": "Üretim ve İthalat - Toptan Satış",
    "hero.cta": "Ürünleri İncele",
    "hero.tagline": "Markanız... Tutkumuz",
    "general.categories": "Kategoriler",
    "general.featuredProducts": "Öne Çıkan Ürünler",
    "general.requestQuote": "Fiyat Teklifi İsteyin",
    "general.viewAll": "Tümünü Gör",
    "services.customPrint": "Özel Baskı",
    "services.customPrintDesc": "Logonuzu tüm ürünlere en yüksek kalitede basıyoruz",
    "services.wholesale": "Toptan Satış",
    "services.wholesaleDesc": "Toplu siparişler ve şirketler için özel fiyatlar",
    "services.design": "Yaratıcı Tasarım",
    "services.designDesc": "Özgün bir görsel kimlik oluşturmak için profesyonel tasarım ekibi",
    "services.delivery": "Kargo ve Teslimat",
    "services.deliveryDesc": "Siparişlerinizi Türkiye, Suriye ve bölge geneline ulaştırıyoruz",
    "about.title": "Hakkımızda",
    "about.desc": "Zakaria Prom, promosyon ve reklam ürünleri üretim ve ithalatında lider bir firmadır.",
    "contact.title": "İletişim",
    "contact.name": "İsim",
    "contact.email": "E-posta",
    "contact.message": "Mesaj",
    "contact.send": "Gönder",
    "footer.rights": "Tüm hakları saklıdır",
    "footer.quickLinks": "Hızlı Bağlantılar",
    "footer.followUs": "Bizi Takip Edin",
    "footer.turkey": "Türkiye Şubesi",
    "footer.syria": "Suriye Şubesi",
    "general.loading": "Yükleniyor...",
    "general.noProducts": "Ürün bulunamadı",
    "general.productsCount": "ürün",
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  dir: "rtl" | "ltr";
  settings: ApiSettings;
  apiTranslations: ApiTranslations | null;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("ar");
  const [settings, setSettings] = useState<ApiSettings>({});
  const [apiTranslations, setApiTranslations] = useState<ApiTranslations | null>(null);

  // Fetch settings once
  useEffect(() => {
    fetchSettings().then(setSettings);
  }, []);

  // Fetch translations when language changes
  useEffect(() => {
    fetchTranslations(language).then((data) => {
      if (data) setApiTranslations(data);
    });
  }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, []);

  const t = useCallback(
    (key: string) => {
      // First check local fallback translations
      const local = fallbackTranslations[language]?.[key];
      if (local) return local;

      // Then check API translations with key mapping
      if (apiTranslations) {
        const apiKeyMap: Record<string, string> = {
          "nav.home": "home",
          "nav.about": "about",
          "nav.products": "products",
          "nav.contact": "contact",
          "search.placeholder": "searchPlaceholder",
          "hero.title": "siteSlogan",
          "general.categories": "categories",
          "general.requestQuote": "requestQuote",
          "general.loading": "loading",
          "general.noProducts": "noProducts",
          "general.productsCount": "productsCount",
          "about.title": "about",
          "about.desc": "aboutText",
          "footer.rights": "footerText",
        };
        const apiKey = apiKeyMap[key];
        if (apiKey && apiTranslations[apiKey]) {
          return apiTranslations[apiKey]!;
        }
      }

      // Check settings for dynamic values
      if (key === "site.name") {
        return settings[`site_name_${language}` as keyof ApiSettings] as string || 
          (language === "ar" ? "زكريا بروم" : "Zakaria Prom");
      }
      if (key === "site.slogan") {
        return settings[`site_slogan_${language}` as keyof ApiSettings] as string || 
          fallbackTranslations[language]["hero.title"] || "";
      }

      return key;
    },
    [language, apiTranslations, settings]
  );

  const dir = language === "ar" ? "rtl" : "ltr";

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir, settings, apiTranslations }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}
