/*
 * Design: Clean Corporate Catalog - Teal/Navy
 * Dynamic category page - fetches real products from API
 * Responsive: mobile-first with collapsible sidebar on small screens
 */
import { useState, useEffect } from "react";
import { Link, useParams } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { fetchCategories, fetchProducts, type ApiCategory, type ApiProduct } from "@/lib/api";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ChevronLeft, ChevronRight, Filter, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function CategoryPage() {
  const { id } = useParams<{ id: string }>();
  const categoryTr = decodeURIComponent(id || "");
  const { language, t, settings } = useLanguage();
  const isRTL = language === "ar";

  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentCategory = categories.find((c) => c.tr === categoryTr);

  useEffect(() => {
    fetchCategories().then(setCategories);
  }, []);

  useEffect(() => {
    setLoading(true);
    setPage(1);
  }, [categoryTr]);

  useEffect(() => {
    setLoading(true);
    fetchProducts({ category: categoryTr, page, limit: 24, lang: language }).then((data) => {
      setProducts(data.products || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotal(data.pagination?.total || 0);
      setLoading(false);
    });
  }, [categoryTr, page, language]);

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

  const categoryName = currentCategory ? getCatName(currentCategory) : categoryTr;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Breadcrumb */}
      <div className="bg-[#f5f7fa] border-b">
        <div className="container py-3">
          <nav className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 overflow-x-auto whitespace-nowrap">
            <Link href="/" className="hover:text-[#00a8a8] transition-colors shrink-0">
              {t("nav.home")}
            </Link>
            <span>/</span>
            <Link href="/#categories" className="hover:text-[#00a8a8] transition-colors shrink-0">
              {t("general.categories")}
            </Link>
            <span>/</span>
            <span className="text-[#0e4a6f] font-medium truncate">{categoryName}</span>
          </nav>
        </div>
      </div>

      <div className="flex-1 bg-[#f5f7fa]">
        <div className="container py-4 sm:py-6 lg:py-8">
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
            
            {/* Mobile Filter Button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden flex items-center gap-2 px-4 py-2.5 bg-white rounded-lg shadow-sm text-sm font-medium text-[#0e4a6f] w-fit"
            >
              <Filter className="w-4 h-4" />
              {t("general.categories")} ({categories.length})
            </button>

            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
              {sidebarOpen && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/40 z-50 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                  />
                  <motion.div
                    initial={{ x: isRTL ? -300 : 300 }}
                    animate={{ x: 0 }}
                    exit={{ x: isRTL ? -300 : 300 }}
                    transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                    className={`fixed top-0 ${isRTL ? "left-0" : "right-0"} h-full w-72 bg-white z-50 shadow-xl lg:hidden overflow-y-auto`}
                  >
                    <div className="flex items-center justify-between p-4 border-b bg-[#0e4a6f] text-white">
                      <h3 className="font-bold">{t("general.categories")}</h3>
                      <button onClick={() => setSidebarOpen(false)} className="p-1 hover:bg-white/10 rounded">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <nav>
                      {categories.map((cat) => (
                        <Link
                          key={cat.tr}
                          href={`/category/${encodeURIComponent(cat.tr)}`}
                          onClick={() => setSidebarOpen(false)}
                          className={`block px-4 py-3 text-sm border-b border-gray-50 transition-colors ${
                            cat.tr === categoryTr
                              ? "bg-[#00a8a8]/10 text-[#00a8a8] font-bold border-s-4 border-s-[#00a8a8]"
                              : "text-gray-600 hover:bg-gray-50 hover:text-[#0e4a6f]"
                          }`}
                        >
                          <span className="flex items-center justify-between">
                            <span>{getCatName(cat)}</span>
                            <span className="text-xs opacity-60">{cat.count}</span>
                          </span>
                        </Link>
                      ))}
                    </nav>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            {/* Desktop Sidebar */}
            <aside className="hidden lg:block lg:w-64 shrink-0">
              <div className="bg-white rounded-xl shadow-sm overflow-hidden sticky top-32">
                <div className="bg-[#0e4a6f] text-white px-4 py-3">
                  <h3 className="font-bold">{t("general.categories")}</h3>
                </div>
                <nav className="max-h-[60vh] overflow-y-auto">
                  {categories.map((cat) => (
                    <Link
                      key={cat.tr}
                      href={`/category/${encodeURIComponent(cat.tr)}`}
                      className={`block px-4 py-2.5 text-sm border-b border-gray-50 transition-colors ${
                        cat.tr === categoryTr
                          ? "bg-[#00a8a8]/10 text-[#00a8a8] font-bold border-s-4 border-s-[#00a8a8]"
                          : "text-gray-600 hover:bg-gray-50 hover:text-[#0e4a6f]"
                      }`}
                    >
                      <span className="flex items-center justify-between">
                        <span>{getCatName(cat)}</span>
                        <span className="text-xs opacity-60">{cat.count}</span>
                      </span>
                    </Link>
                  ))}
                </nav>
              </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-[#0e4a6f]">{categoryName}</h1>
                  <p className="text-gray-500 text-xs sm:text-sm mt-1">
                    {total} {t("general.productsCount")}
                  </p>
                </div>
              </div>

              {/* Products Grid */}
              {loading ? (
                <div className="text-center py-16 text-gray-400">
                  <div className="animate-spin w-8 h-8 border-2 border-[#00a8a8] border-t-transparent rounded-full mx-auto mb-4"></div>
                  {t("general.loading")}
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  {t("general.noProducts")}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                    {products.map((product, i) => (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.03, 0.5), duration: 0.3 }}
                        className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200"
                      >
                        <Link href={`/product/${product.id}`}>
                          <div className="aspect-square overflow-hidden bg-gray-50">
                            <img
                              src={product.images?.[0] || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop"}
                              alt={getProductName(product)}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                          </div>
                          <div className="p-2 sm:p-3">
                            <p className="text-[10px] sm:text-xs text-[#00a8a8] font-mono mb-0.5 sm:mb-1">{product.model}</p>
                            <h3 className="font-bold text-[#0e4a6f] text-xs sm:text-sm leading-tight mb-1.5 sm:mb-2 line-clamp-2">
                              {getProductName(product)}
                            </h3>
                            <div className="flex items-center justify-between flex-wrap gap-1">
                              {product.price > 0 && (
                                <span className="text-[10px] sm:text-xs text-gray-400">
                                  {product.price} {settings.currency || "TL"}
                                </span>
                              )}
                              <span className="text-[10px] sm:text-xs px-2 py-0.5 sm:px-2.5 sm:py-1 bg-[#00a8a8]/10 text-[#00a8a8] font-medium rounded-md">
                                {t("general.requestQuote")}
                              </span>
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-6 sm:mt-8">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-3 py-2 rounded-lg border text-sm disabled:opacity-30 hover:bg-gray-50 transition-colors"
                      >
                        {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                      </button>
                      <span className="text-sm text-gray-600">
                        {page} / {totalPages}
                      </span>
                      <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="px-3 py-2 rounded-lg border text-sm disabled:opacity-30 hover:bg-gray-50 transition-colors"
                      >
                        {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    </div>
                  )}
                </>
              )}
            </main>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
