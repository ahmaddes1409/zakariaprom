import { useParams, Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { categories, featuredProducts } from "@/lib/data";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

export default function CategoryPage() {
  const { id } = useParams<{ id: string }>();
  const { language, t } = useLanguage();
  const isRTL = language === "ar";

  const category = categories.find((c) => c.id === id);
  const BackIcon = isRTL ? ChevronRight : ChevronLeft;

  // Generate demo products for this category
  const demoProducts = Array.from({ length: 8 }, (_, i) => ({
    id: `${id}-${i + 1}`,
    code: `ZP-${id?.toUpperCase().slice(0, 3)}-${String(i + 1).padStart(3, "0")}`,
    nameAr: `${category ? t(category.nameKey) : ""} - موديل ${i + 1}`,
    nameEn: `${category ? t(category.nameKey) : ""} - Model ${i + 1}`,
    nameTr: `${category ? t(category.nameKey) : ""} - Model ${i + 1}`,
    image: category?.image || "",
    minOrder: [25, 50, 100, 200][i % 4],
  }));

  const getProductName = (p: typeof demoProducts[0]) => {
    if (language === "ar") return p.nameAr;
    if (language === "tr") return p.nameTr;
    return p.nameEn;
  };

  if (!category) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500">Category not found</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="container py-3">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/" className="text-[#00a8a8] hover:underline">{t("nav.home")}</Link>
            <span className="text-gray-300">/</span>
            <Link href="/#categories" className="text-[#00a8a8] hover:underline">{t("general.categories")}</Link>
            <span className="text-gray-300">/</span>
            <span className="text-gray-600 font-medium">{t(category.nameKey)}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-[#f5f7fa]">
        <div className="container py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar - Categories */}
            <aside className="lg:w-64 shrink-0">
              <div className="bg-white rounded-xl shadow-sm overflow-hidden sticky top-32">
                <div className="bg-[#0e4a6f] text-white px-4 py-3">
                  <h3 className="font-bold">{t("general.categories")}</h3>
                </div>
                <nav className="max-h-[60vh] overflow-y-auto">
                  {categories.map((cat) => (
                    <Link
                      key={cat.id}
                      href={`/category/${cat.id}`}
                      className={`block px-4 py-2.5 text-sm border-b border-gray-50 transition-colors ${
                        cat.id === id
                          ? "bg-[#00a8a8]/10 text-[#00a8a8] font-bold border-s-4 border-s-[#00a8a8]"
                          : "text-gray-600 hover:bg-gray-50 hover:text-[#0e4a6f]"
                      }`}
                    >
                      {t(cat.nameKey)}
                    </Link>
                  ))}
                </nav>
              </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-black text-[#0e4a6f]">{t(category.nameKey)}</h1>
                  <p className="text-gray-500 text-sm mt-1">
                    {category.productCount} {language === "ar" ? "منتج" : language === "tr" ? "ürün" : "products"}
                  </p>
                </div>
                <Link
                  href="/"
                  className="flex items-center gap-1 text-sm text-[#00a8a8] hover:underline"
                >
                  <BackIcon className="w-4 h-4" />
                  {t("nav.home")}
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {demoProducts.map((product, i) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.3 }}
                    className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200"
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
                          Min: {product.minOrder}
                        </span>
                        <button className="text-xs px-2.5 py-1 bg-[#00a8a8]/10 text-[#00a8a8] font-medium rounded-md hover:bg-[#00a8a8] hover:text-white transition-colors">
                          {t("general.requestQuote")}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </main>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
