import { useLanguage } from "@/contexts/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Building2, Globe, Award, Users } from "lucide-react";
import { motion } from "framer-motion";

const HERO_IMG_2 = "https://d2xsxph8kpxj0f.cloudfront.net/310519663586966936/fHWUHuB9ZycaiSpMH5YZHk/hero-banner-2-Hb83PkY93ca573tYpuRS3b.webp";

export default function AboutPage() {
  const { language, t } = useLanguage();

  const stats = [
    { icon: Building2, value: "2", labelAr: "مطبعة", labelEn: "Printing Facilities", labelTr: "Matbaa" },
    { icon: Globe, value: "10+", labelAr: "دولة نخدمها", labelEn: "Countries Served", labelTr: "Hizmet Verilen Ülke" },
    { icon: Award, value: "15+", labelAr: "سنة خبرة", labelEn: "Years Experience", labelTr: "Yıllık Deneyim" },
    { icon: Users, value: "500+", labelAr: "عميل راضٍ", labelEn: "Happy Clients", labelTr: "Mutlu Müşteri" },
  ];

  const getStatLabel = (stat: typeof stats[0]) => {
    if (language === "ar") return stat.labelAr;
    if (language === "tr") return stat.labelTr;
    return stat.labelEn;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={HERO_IMG_2} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-[#0a2e4a]/85" />
        </div>
        <div className="container relative py-20 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-3xl md:text-5xl font-black text-white mb-4"
          >
            {t("about.title")}
          </motion.h1>
          <p className="text-white/70 max-w-2xl mx-auto text-lg">
            {language === "ar" ? "زكريا بروم" : "Zakaria Prom"}
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white border-b">
        <div className="container py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="text-center"
              >
                <div className="w-14 h-14 bg-[#00a8a8]/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <stat.icon className="w-7 h-7 text-[#00a8a8]" />
                </div>
                <div className="text-3xl font-black text-[#0e4a6f]">{stat.value}</div>
                <div className="text-sm text-gray-500 mt-1">{getStatLabel(stat)}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* About Content */}
      <section className="py-12 bg-[#f5f7fa]">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-white rounded-2xl p-8 shadow-sm"
            >
              <h2 className="text-2xl font-black text-[#0e4a6f] mb-6">{t("about.title")}</h2>
              <p className="text-gray-600 leading-relaxed text-lg mb-6">
                {t("about.desc")}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                <div className="bg-[#0e4a6f]/5 rounded-xl p-6">
                  <h3 className="font-bold text-[#0e4a6f] mb-2">
                    {language === "ar" ? "رؤيتنا" : language === "tr" ? "Vizyonumuz" : "Our Vision"}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {language === "ar"
                      ? "أن نكون الشريك الأول في مجال منتجات الدعاية والإعلان في منطقة الشرق الأوسط وتركيا، من خلال تقديم منتجات عالية الجودة بأسعار تنافسية."
                      : language === "tr"
                      ? "Yüksek kaliteli ürünleri rekabetçi fiyatlarla sunarak Ortadoğu ve Türkiye'de promosyon ürünleri alanında bir numaralı ortak olmak."
                      : "To be the leading partner in promotional products across the Middle East and Turkey, offering high-quality products at competitive prices."}
                  </p>
                </div>
                <div className="bg-[#00a8a8]/5 rounded-xl p-6">
                  <h3 className="font-bold text-[#0e4a6f] mb-2">
                    {language === "ar" ? "مهمتنا" : language === "tr" ? "Misyonumuz" : "Our Mission"}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {language === "ar"
                      ? "تقديم حلول دعائية متكاملة تساعد عملاءنا على تعزيز هويتهم التجارية وزيادة وعي علامتهم التجارية من خلال منتجات مبتكرة وخدمة متميزة."
                      : language === "tr"
                      ? "Müşterilerimizin marka bilinirliğini artırmalarına yardımcı olan yenilikçi ürünler ve üstün hizmet ile kapsamlı reklam çözümleri sunmak."
                      : "Providing comprehensive promotional solutions that help our clients enhance their brand identity and increase brand awareness through innovative products and excellent service."}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
