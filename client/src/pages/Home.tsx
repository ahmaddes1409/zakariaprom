/*
 * Design: Clean Corporate Catalog - Teal/Navy
 * Layout: Banner slider + Category grid + Featured products + Services
 * Dynamic: Fetches categories, products, and banners from API
 */
import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { fetchCategories, fetchProducts, fetchBanners, type ApiCategory, type ApiProduct, type ApiBanner } from "@/lib/api";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ArrowLeft, ArrowRight, Printer, Truck, Palette, Package, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const HERO_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663586966936/fHWUHuB9ZycaiSpMH5YZHk/hero-banner-MAb4gXWzbSKHLEByF7gC74.webp";
const HERO_IMG_2 = "https://d2xsxph8kpxj0f.cloudfront.net/310519663586966936/fHWUHuB9ZycaiSpMH5YZHk/hero-banner-2-Hb83PkY93ca573tYpuRS3b.webp";
const CAT_PENS = "https://d2xsxph8kpxj0f.cloudfront.net/310519663586966936/fHWUHuB9ZycaiSpMH5YZHk/category-pens-RLu2dL2YJyXpYkGxYuWvzq.webp";
const CAT_MUGS = "https://d2xsxph8kpxj0f.cloudfront.net/310519663586966936/fHWUHuB9ZycaiSpMH5YZHk/category-mugs-jGfWqiMZ3dBanNYpc2DbMV.webp";
const CAT_TECH = "https://d2xsxph8kpxj0f.cloudfront.net/310519663586966936/fHWUHuB9ZycaiSpMH5YZHk/category-tech-XFSgoLLXBYULTSG9ip7AhW.webp";

// Convert Google Drive sharing links to direct image URLs
function fixImageUrl(url: string): string {
  if (!url) return '';
  // Google Drive sharing link pattern
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (driveMatch) {
    return `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
  }
  return url;
}

// Default images for categories based on keywords
function getCategoryDefaultImage(catTr: string): string {
  const lower = catTr.toLowerCase();
  if (lower.includes("kalem") || lower.includes("pen")) return CAT_PENS;
  if (lower.includes("termos") || lower.includes("mug") || lower.includes("bardak") || lower.includes("cam")) return CAT_MUGS;
  if (lower.includes("teknoloji") || lower.includes("powerbank") || lower.includes("usb") || lower.includes("kulaklık") || lower.includes("lcd") || lower.includes("kablo")) return CAT_TECH;
  if (lower.includes("çanta") || lower.includes("bag")) return "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=300&fit=crop";
  if (lower.includes("saat")) return "https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=400&h=300&fit=crop";
  if (lower.includes("anahtarlık") || lower.includes("rozet")) return "https://images.unsplash.com/photo-1622547748225-3fc4abd2cca0?w=400&h=300&fit=crop";
  if (lower.includes("ajanda") || lower.includes("defter") || lower.includes("not")) return "https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=400&h=300&fit=crop";
  if (lower.includes("hediye") || lower.includes("set")) return "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=400&h=300&fit=crop";
  if (lower.includes("matbaa") || lower.includes("print")) return "https://images.unsplash.com/photo-1562654501-a0ccc0fc3fb1?w=400&h=300&fit=crop";
  if (lower.includes("çakmak") || lower.includes("lighter")) return "https://images.unsplash.com/photo-1585011664466-b7bbe92f34ef?w=400&h=300&fit=crop";
  if (lower.includes("şemsiye")) return "https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?w=400&h=300&fit=crop";
  if (lower.includes("kırtasiye")) return "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400&h=300&fit=crop";
  return "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop";
}

export default function Home() {
  const { language, t, settings } = useLanguage();
  const isRTL = language === "ar";
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [banners, setBanners] = useState<ApiBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentBanner, setCurrentBanner] = useState(0);

  useEffect(() => {
    Promise.all([
      fetchCategories(),
      fetchProducts({ limit: 8, lang: language }),
      fetchBanners(),
    ]).then(([cats, prods, bans]) => {
      setCategories(cats);
      setProducts(prods.products || []);
      setBanners(bans);
      setLoading(false);
    });
  }, [language]);

  // Auto-slide banners
  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [banners.length]);

  const nextBanner = useCallback(() => {
    setCurrentBanner((prev) => (prev + 1) % banners.length);
  }, [banners.length]);

  const prevBanner = useCallback(() => {
    setCurrentBanner((prev) => (prev - 1 + banners.length) % banners.length);
  }, [banners.length]);

  const getCatName = (cat: ApiCategory) => {
    if (language === "ar") return cat.ar;
    if (language === "tr") return cat.tr;
    return cat.en;
  };

  const getProductName = (p: ApiProduct) => {
    if (language === "ar") return p.name.ar;
    if (language === "tr") return p.name.tr;
    return p.name.en;
  };

  const getBannerTitle = (b: ApiBanner) => {
    if (language === "ar") return b.title_ar;
    if (language === "tr") return b.title_tr;
    return b.title_en;
  };

  const getBannerSubtitle = (b: ApiBanner) => {
    if (language === "ar") return b.subtitle_ar;
    if (language === "tr") return b.subtitle_tr;
    return b.subtitle_en;
  };

  const siteName = settings[`site_name_${language}` as keyof typeof settings] as string || 
    (language === "ar" ? "مكتبة زكريا" : "Zakaria Library");

  // Default hero if no banners
  const hasApiBanners = banners.length > 0;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Banner Slider / Hero Section */}
      {hasApiBanners ? (
        <section className="relative overflow-hidden h-[250px] sm:h-[350px] md:h-[500px] lg:h-[600px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentBanner}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0"
            >
              <img
                src={fixImageUrl(banners[currentBanner]?.image_url || '')}
                alt=""
                className="w-full h-full object-contain sm:object-cover"
              />

            </motion.div>
          </AnimatePresence>

          <div className="container relative h-full flex items-center">
            <motion.div
              key={`text-${currentBanner}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="max-w-xl"
            >
              {getBannerTitle(banners[currentBanner]) && (
                <h1 className="text-2xl sm:text-3xl md:text-5xl font-black text-white leading-tight mb-3">
                  {getBannerTitle(banners[currentBanner])}
                </h1>
              )}
              {getBannerSubtitle(banners[currentBanner]) && (
                <p className="text-base sm:text-lg md:text-xl text-white/80 mb-6">
                  {getBannerSubtitle(banners[currentBanner])}
                </p>
              )}
              {banners[currentBanner]?.link && (
                banners[currentBanner].link.startsWith('http') ? (
                  <a
                    href={banners[currentBanner].link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#00a8a8] text-white font-bold rounded-lg hover:bg-[#008f8f] transition-all active:scale-[0.97]"
                  >
                    {t("hero.cta")}
                    <ArrowIcon className="w-4 h-4" />
                  </a>
                ) : (
                  <Link
                    href={banners[currentBanner].link}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#00a8a8] text-white font-bold rounded-lg hover:bg-[#008f8f] transition-all active:scale-[0.97]"
                  >
                    {t("hero.cta")}
                    <ArrowIcon className="w-4 h-4" />
                  </Link>
                )
              )}
            </motion.div>
          </div>

          {/* Navigation arrows */}
          {banners.length > 1 && (
            <>
              <button
                onClick={prevBanner}
                className="absolute start-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
              >
                {isRTL ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
              </button>
              <button
                onClick={nextBanner}
                className="absolute end-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
              >
                {isRTL ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </button>
              {/* Dots */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {banners.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentBanner(i)}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${i === currentBanner ? "bg-[#00a8a8] w-6" : "bg-white/50"}`}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      ) : (
        <section className="relative overflow-hidden">
          <div className="absolute inset-0">
            <img src={HERO_IMG} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-l from-[#0a2e4a]/90 via-[#0a2e4a]/70 to-[#0a2e4a]/40" />
          </div>
          <div className="container relative py-10 sm:py-16 md:py-24">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
              className="max-w-xl"
            >
              <div className="inline-block px-3 py-1 bg-[#00a8a8]/20 border border-[#00a8a8]/40 rounded-full text-[#00d4d4] text-sm font-medium mb-4">
                {siteName} 2026
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-5xl font-black text-white leading-tight mb-3 sm:mb-4">
                {t("hero.title")}
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-white/80 mb-2">
                {t("hero.subtitle")}
              </p>
              <p className="text-white/60 text-sm sm:text-base mb-6 sm:mb-8">
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
      )}

      {/* Services Strip */}
      <section className="bg-white border-b">
        <div className="container py-4 sm:py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
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
      <section id="categories" className="py-8 sm:py-12 bg-[#f5f7fa]">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-[#0e4a6f]">
                {t("general.categories")}
              </h2>
              <p className="text-gray-500 mt-1 text-sm">{t("hero.subtitle")}</p>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-400">{t("general.loading")}</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {categories.map((cat, i) => (
                <motion.div
                  key={cat.tr}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: Math.min(i * 0.03, 0.5), duration: 0.3 }}
                >
                  <Link
                    href={`/category/${encodeURIComponent(cat.tr)}`}
                    className="group block bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200"
                  >
                    <div className="aspect-[4/3] overflow-hidden bg-gray-100">
                      <img
                        src={cat.image ? fixImageUrl(cat.image) : getCategoryDefaultImage(cat.tr)}
                        alt={getCatName(cat)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-3 bg-[#0e4a6f] text-white text-center">
                      <h3 className="font-bold text-sm leading-tight">{getCatName(cat)}</h3>
                      <p className="text-white/60 text-xs mt-0.5">
                        {cat.count} {t("general.productsCount")}
                      </p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
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
            {t("about.desc")}
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
      <section className="py-8 sm:py-12 bg-white">
        <div className="container">
          <div className="flex items-center justify-between mb-5 sm:mb-8">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-[#0e4a6f]">
              {t("general.featuredProducts")}
            </h2>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-400">{t("general.loading")}</div>
          ) : products.length === 0 ? (
            <div className="text-center py-12 text-gray-400">{t("general.noProducts")}</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {products.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                  className="group bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-200"
                >
                  <Link href={`/product/${product.id}`}>
                    <div className="aspect-square overflow-hidden bg-gray-50">
                      <img
                        src={product.images?.[0] ? fixImageUrl(product.images[0]) : "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop"}
                        alt={getProductName(product)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-3">
                      <p className="text-xs text-[#00a8a8] font-mono mb-1">{product.model}</p>
                      <h3 className="font-bold text-[#0e4a6f] text-sm leading-tight mb-2">
                        {getProductName(product)}
                      </h3>
                      <div className="flex items-center justify-between">
                        {product.price_usd > 0 && (
                          <span className="text-xs text-gray-400">
                            ${product.price_usd}
                          </span>
                        )}
                        <span className="text-xs px-3 py-1.5 bg-[#00a8a8]/10 text-[#00a8a8] font-medium rounded-md">
                          {t("general.requestQuote")}
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
