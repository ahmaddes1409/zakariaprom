/*
 * Design: Clean Corporate Catalog - Teal/Navy
 * Search results page with product grid
 */
import { useState, useEffect } from "react";
import { Link, useSearch } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { fetchProducts, type ApiProduct } from "@/lib/api";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Search } from "lucide-react";
import { motion } from "framer-motion";

export default function SearchPage() {
  const { language, t, settings } = useLanguage();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const query = params.get("q") || "";

  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (query) {
      setLoading(true);
      fetchProducts({ search: query, limit: 100, lang: language }).then((data) => {
        setProducts(data.products || []);
        setTotal(data.pagination?.total || data.products?.length || 0);
        setLoading(false);
      });
    } else {
      setProducts([]);
      setLoading(false);
    }
  }, [query, language]);

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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {products.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.5), duration: 0.3 }}
                  className="group bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-200"
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
                    <div className="p-3">
                      <p className="text-xs text-[#00a8a8] font-mono mb-1">{product.model}</p>
                      <h3 className="font-bold text-[#0e4a6f] text-sm leading-tight mb-2">
                        {getProductName(product)}
                      </h3>
                      {product.price > 0 && (
                        <span className="text-xs text-gray-400">
                          {product.price} {settings.currency || "TL"}
                        </span>
                      )}
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
