/*
 * Design: Clean Corporate Catalog - Teal/Navy
 * Layout: Hero banner + Category grid + Featured products + Services
 */
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { categories, featuredProducts } from "@/lib/data";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ArrowLeft, ArrowRight, Printer, Truck, Palette, Package, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

const HERO_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663586966936/fHWUHuB9ZycaiSpMH5YZHk/hero-banner-MAb4gXWzbSKHLEByF7gC74.webp";
const HERO_IMG_2 = "https://d2xsxph8kpxj0f.cloudfront.net/310519663586966936/fHWUHuB9ZycaiSpMH5YZHk/hero-banner-2-Hb83PkY93ca573tYpuRS3b.webp";
const CAT_PENS = "https://d2xsxph8kpxj0f.cloudfront.net/310519663586966936/fHWUHuB9ZycaiSpMH5YZHk/category-pens-RLu2dL2YJyXpYkGxYuWvzq.webp";
const CAT_MUGS = "https://d2xsxph8kpxj0f.cloudfront.net/310519663586966936/fHWUHuB9ZycaiSpMH5YZHk/category-mugs-jGfWqiMZ3dBanNYpc2DbMV.webp";
const CAT_TECH = "https://d2xsxph8kpxj0f.cloudfront.net/310519663586966936/fHWUHuB9ZycaiSpMH5YZHk/category-tech-XFSgoLLXBYULTSG9ip7AhW.webp";

// Map some categories to generated images
const categoryImageOverrides: Record<string, string> = {
  metalPens: CAT_PENS,
  plasticPens: CAT_PENS,
  penSets: CAT_PENS,
  ceramicMugs: CAT_MUGS,
  thermos: CAT_MUGS,
  tech: CAT_TECH,
  powerbank: CAT_TECH,
  wireless: CAT_TECH,
  speakers: CAT_TECH,
  usb: CAT_TECH,
};

export default function Home() {
  const { language, t } = useLanguage();
  const isRTL = language === "ar";
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  const getProductName = (p: typeof featuredProducts[0]) => {
    if (language === "ar") return p.nameAr;
    if (language === "tr") return p.nameTr;
    return p.nameEn;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={HERO_IMG} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-l from-[#0a2e4a]/90 via-[#0a2e4a]/70 to-[#0a2e4a]/40" />
        </div>
        <div className="container relative py-16 md:py-24">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
            className="max-w-xl"
          >
            <div className="inline-block px-3 py-1 bg-[#00a8a8]/20 border border-[#00a8a8]/40 rounded-full text-[#00d4d4] text-sm font-medium mb-4">
              {language === "ar" ? "زكريا بروم" : "Zakaria Prom"} 2026
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white leading-tight mb-4">
              {t("hero.title")}
            </h1>
            <p className="text-lg md:text-xl text-white/80 mb-2">
              {t("hero.subtitle")}
            </p>
            <p className="text-white/60 mb-8">
              {t("hero.tagline")}
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="#categories"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#00a8a8] text-white font-bold rounded-lg hover:bg-[#008f8f] transition-all active:scale-[0.97]"
              >
                {t("hero.cta")}
                <ArrowIcon className="w-4 h-4" />
              </a>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-6 py-3 border-2 border-white/30 text-white font-bold rounded-lg hover:bg-white/10 transition-all"
              >
                {t("general.requestQuote")}
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Services Strip */}
      <section className="bg-white border-b">
        <div className="container py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Printer, key: "services.customPrint", descKey: "services.customPrintDesc" },
              { icon: Package, key: "services.wholesale", descKey: "services.wholesaleDesc" },
              { icon: Palette, key: "services.design", descKey: "services.designDesc" },
              { icon: Truck, key: "services.delivery", descKey: "services.deliveryDesc" },
            ].map((service, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                className="flex items-start gap-3 p-3"
              >
                <div className="w-10 h-10 bg-[#00a8a8]/10 rounded-lg flex items-center justify-center shrink-0">
                  <service.icon className="w-5 h-5 text-[#00a8a8]" />
                </div>
                <div>
                  <h3 className="font-bold text-[#0e4a6f] text-sm">{t(service.key)}</h3>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{t(service.descKey)}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <section id="categories" className="py-12 bg-[#f5f7fa]">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-[#0e4a6f]">
                {t("general.categories")}
              </h2>
              <p className="text-gray-500 mt-1 text-sm">{t("hero.subtitle")}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {categories.map((cat, i) => (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: Math.min(i * 0.03, 0.5), duration: 0.3 }}
              >
                <Link
                  href={`/category/${cat.id}`}
                  className="group block bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-gray-100">
                    <img
                      src={categoryImageOverrides[cat.id] || cat.image}
                      alt={t(cat.nameKey)}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-3 bg-[#0e4a6f] text-white text-center">
                    <h3 className="font-bold text-sm leading-tight">{t(cat.nameKey)}</h3>
                    <p className="text-white/60 text-xs mt-0.5">{cat.productCount} {language === "ar" ? "منتج" : language === "tr" ? "ürün" : "products"}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Second Banner */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={HERO_IMG_2} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-[#0a2e4a]/80" />
        </div>
        <div className="container relative py-16 text-center">
          <h2 className="text-2xl md:text-4xl font-black text-white mb-3">
            {t("hero.tagline")}
          </h2>
          <p className="text-white/70 max-w-2xl mx-auto mb-6">
            {t("about.desc").substring(0, 150)}
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-8 py-3 bg-[#00a8a8] text-white font-bold rounded-lg hover:bg-[#008f8f] transition-all active:scale-[0.97]"
          >
            {t("general.requestQuote")}
          </Link>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-12 bg-white">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl md:text-3xl font-black text-[#0e4a6f]">
              {t("general.featuredProducts")}
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {featuredProducts.map((product, i) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                className="group bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-200"
              >
                <div className="aspect-square overflow-hidden bg-gray-50">
                  <img
                    src={product.image}
                    alt={getProductName(product)}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
                <div className="p-3">
                  <p className="text-xs text-[#00a8a8] font-mono mb-1">{product.code}</p>
                  <h3 className="font-bold text-[#0e4a6f] text-sm leading-tight mb-2">
                    {getProductName(product)}
                  </h3>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      {language === "ar" ? `الحد الأدنى: ${product.minOrder}` : language === "tr" ? `Min: ${product.minOrder}` : `Min: ${product.minOrder}`}
                    </span>
                    <button className="text-xs px-3 py-1.5 bg-[#00a8a8]/10 text-[#00a8a8] font-medium rounded-md hover:bg-[#00a8a8] hover:text-white transition-colors">
                      {t("general.requestQuote")}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
