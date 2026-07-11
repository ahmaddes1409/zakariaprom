/*
 * Design: Clean Corporate Catalog - Teal/Navy
 * Dynamic product detail page - fetches from API
 */
import { useState, useEffect } from "react";
import { Link, useParams } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { fetchProduct, type ApiProduct } from "@/lib/api";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ChevronLeft, ChevronRight, MessageCircle, Package } from "lucide-react";
import { motion } from "framer-motion";

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const { language, t, settings } = useLanguage();
  const isRTL = language === "ar";

  const [product, setProduct] = useState<ApiProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    if (id) {
      setLoading(true);
      fetchProduct(id).then((data) => {
        setProduct(data);
        setLoading(false);
      });
    }
  }, [id]);

  const getProductName = (p: ApiProduct) => {
    if (language === "ar") return p.name.ar;
    if (language === "tr") return p.name.tr;
    return p.name.en;
  };

  const getCategoryName = (p: ApiProduct) => {
    if (language === "ar") return p.topCategory?.ar || "";
    if (language === "tr") return p.topCategory?.tr || "";
    return p.topCategory?.en || "";
  };

  const whatsapp = settings.whatsapp || "905428104208";

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-[#00a8a8] border-t-transparent rounded-full"></div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center flex-col gap-4">
          <Package className="w-16 h-16 text-gray-300" />
          <p className="text-gray-500">{t("general.noProducts")}</p>
          <Link href="/" className="text-[#00a8a8] hover:underline">
            {t("nav.home")}
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Breadcrumb */}
      <div className="bg-[#f5f7fa] border-b">
        <div className="container py-3">
          <nav className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
            <Link href="/" className="hover:text-[#00a8a8] transition-colors">
              {t("nav.home")}
            </Link>
            <span>/</span>
            {product.topCategory?.tr && (
              <>
                <Link
                  href={`/category/${encodeURIComponent(product.topCategory.tr)}`}
                  className="hover:text-[#00a8a8] transition-colors"
                >
                  {getCategoryName(product)}
                </Link>
                <span>/</span>
              </>
            )}
            <span className="text-[#0e4a6f] font-medium line-clamp-1">
              {getProductName(product)}
            </span>
          </nav>
        </div>
      </div>

      <div className="flex-1 bg-white">
        <div className="container py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          >
            {/* Product Images */}
            <div>
              <div className="aspect-square bg-gray-50 rounded-xl overflow-hidden mb-4">
                <img
                  src={product.images?.[selectedImage] || product.images?.[0] || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=600&fit=crop"}
                  alt={getProductName(product)}
                  className="w-full h-full object-contain"
                />
              </div>
              {product.images && product.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {product.images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedImage(i)}
                      className={`w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 transition-colors ${
                        selectedImage === i ? "border-[#00a8a8]" : "border-gray-200"
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div>
              <p className="text-sm text-[#00a8a8] font-mono mb-2">{product.model}</p>
              <h1 className="text-2xl md:text-3xl font-black text-[#0e4a6f] mb-4">
                {getProductName(product)}
              </h1>

              {product.topCategory?.tr && (
                <Link
                  href={`/category/${encodeURIComponent(product.topCategory.tr)}`}
                  className="inline-block px-3 py-1 bg-[#0e4a6f]/10 text-[#0e4a6f] text-xs font-medium rounded-full mb-4"
                >
                  {getCategoryName(product)}
                </Link>
              )}

              {product.description && (
                <div className="text-gray-600 text-sm leading-relaxed mb-6 whitespace-pre-line">
                  {product.description}
                </div>
              )}

              {/* Options */}
              {product.options && product.options.length > 0 && (
                <div className="space-y-4 mb-6">
                  {product.options.map((option, i) => {
                    const optionValues = option.values || option.items || [];
                    return (
                      <div key={i}>
                        <h3 className="text-sm font-bold text-[#0e4a6f] mb-2">{option.name}</h3>
                        <div className="flex flex-wrap gap-2">
                          {optionValues.map((val: any, j: number) => (
                            <span
                              key={j}
                              className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs rounded-md"
                            >
                              {typeof val === 'string' ? val : val?.name || (typeof val === 'object' ? '---' : String(val))}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Price */}
              {product.price_usd > 0 && (
                <div className="text-xl font-bold text-[#0e4a6f] mb-6">
                  ${product.price_usd}
                </div>
              )}

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(
                    language === "ar"
                      ? `مرحباً، أريد الاستفسار عن المنتج: ${getProductName(product)} (${product.model})`
                      : language === "tr"
                      ? `Merhaba, bu ürün hakkında bilgi almak istiyorum: ${getProductName(product)} (${product.model})`
                      : `Hello, I'd like to inquire about: ${getProductName(product)} (${product.model})`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#25d366] text-white font-bold rounded-lg hover:bg-[#20bd5a] transition-all active:scale-[0.97]"
                >
                  <MessageCircle className="w-5 h-5" />
                  WhatsApp
                </a>
                <Link
                  href="/contact"
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#00a8a8] text-white font-bold rounded-lg hover:bg-[#008f8f] transition-all active:scale-[0.97]"
                >
                  {t("general.requestQuote")}
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
