/*
 * Design: Clean Corporate Catalog - Teal/Navy
 * Search results page with infinite scroll
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useSearch } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { fetchProducts, type ApiProduct } from "@/lib/api";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Search, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

function fixImageUrl(url: string): string {
  if (!url) return '';
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (driveMatch) {
    return `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
  }
  if (url.startsWith('/')) {
    return `https://zakariaprom.com${url}`;
  }
  return url;
}

export default function SearchPage() {
  const { language, t, settings } = useLanguage();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const query = params.get("q") || "";

  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const observerRef = useRef<IntersectionObserver | null>(null);

  // Reset when query changes
  useEffect(() => {
    setProducts([]);
    setPage(1);
    setHasMore(true);
    setLoading(true);
  }, [query]);

  useEffect(() => {
    if (!query) {
      setProducts([]);
      setLoading(false);
      setHasMore(false);
      return;
    }

    if (page === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    fetchProducts({ search: query, page, limit: 24, lang: language }).then((data) => {
      if (page === 1) {
        setProducts(data.products || []);
      } else {
        setProducts((prev) => [...prev, ...(data.products || [])]);
      }
      setTotal(data.pagination?.total || data.products?.length || 0);
      setHasMore(page < (data.pagination?.totalPages || 1));
      setLoading(false);
      setLoadingMore(false);
    });
  }, [query, page, language]);

  // Intersection Observer for infinite scroll
  const lastProductRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loadingMore) return;
      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore && !loadingMore) {
            setPage((prev) => prev + 1);
          }
        },
        { threshold: 0.1, rootMargin: "200px" }
      );

      if (node) observerRef.current.observe(node);
    },
    [loadingMore, hasMore]
  );

  const getProductName = (p: ApiProduct) => {
    if (language === "ar") return p.name.ar;
    if (language === "tr") return p.name.tr;
    return p.name.en;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <section className="py-8 bg-[#f5f7fa] flex-1">
        <div className="container">
          <div className="flex items-center gap-3 mb-6">
            <Search className="w-6 h-6 text-[#00a8a8]" />
            <h1 className="text-2xl font-black text-[#0e4a6f]">
              {language === "ar" ? `نتائج البحث عن "${query}"` : language === "tr" ? `"${query}" için arama sonuçları` : `Search results for "${query}"`}
            </h1>
            <span className="text-gray-500 text-sm">({total} {language === "ar" ? "منتج" : language === "tr" ? "ürün" : "products"})</span>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-400">{t("general.loading")}</div>
          ) : products.length === 0 ? (
            <div className="text-center py-16">
              <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
                {language === "ar" ? "لم يتم العثور على نتائج" : language === "tr" ? "Sonuç bulunamadı" : "No results found"}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {products.map((product, i) => (
                  <motion.div
                    key={`${product.id}-${i}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min((i % 24) * 0.03, 0.5), duration: 0.3 }}
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
                        {product.price_usd > 0 && (
                          <span className="text-xs text-gray-400">
                            ${product.price_usd}
                          </span>
                        )}
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>

              {/* Infinite Scroll Trigger */}
              {hasMore && (
                <div
                  ref={lastProductRef}
                  className="flex items-center justify-center py-8"
                >
                  {loadingMore && (
                    <div className="flex items-center gap-3 text-gray-500">
                      <Loader2 className="w-5 h-5 animate-spin text-[#00a8a8]" />
                      <span className="text-sm">{t("general.loading")}</span>
                    </div>
                  )}
                </div>
              )}

              {/* End of products indicator */}
              {!hasMore && products.length > 0 && (
                <div className="text-center py-6 text-gray-400 text-sm">
                  {language === "ar" ? `تم عرض جميع النتائج (${total})` : 
                   language === "tr" ? `Tüm sonuçlar gösterildi (${total})` :
                   `All results shown (${total})`}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
