import { useLanguage } from "@/contexts/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { Truck, MapPin, Clock } from "lucide-react";

export default function ShippingPolicyPage() {
  const { language, settings } = useLanguage();
  const isAr = language === "ar";
  const siteName = (settings[`site_name_${language}` as keyof typeof settings] as string) || (isAr ? "مكتبة زكريا" : "Zakaria Prom");

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <SEO
        title={`${isAr ? "سياسة الشحن والتوصيل" : "Shipping & Delivery Policy"} - ${siteName}`}
        description={isAr ? "معلومات الشحن والتوصيل الداخلي والدولي لمنتجات الدعاية والإعلان والهدايا الترويجية." : "Shipping & international logistics policy for Zakaria Prom."}
      />
      <Header />

      <main className="flex-1 container py-10 max-w-4xl">
        <div className="bg-white rounded-2xl shadow-sm border p-6 sm:p-10 space-y-8">
          <div className="flex items-center gap-4 border-b pb-6">
            <div className="w-12 h-12 bg-[#00a8a8]/10 text-[#00a8a8] rounded-xl flex items-center justify-center">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {isAr ? "سياسة الشحن والتوصيل" : "Shipping & Delivery Policy"}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {isAr ? "خدمات الشحن المحلي والدولي" : "Domestic & International Shipping Services"}
              </p>
            </div>
          </div>

          <section className="space-y-4 text-gray-700 leading-relaxed">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#00a8a8]" />
              {isAr ? "1. مناطق الشحن والتوزيع" : "1. Shipping Destinations"}
            </h2>
            <p className="text-sm text-gray-600">
              {isAr
                ? "نوفر الشحن والتوصيل إلى كافة الولايات التركية والمحافظات السورية، بالإضافة إلى الشحن الدولي لدول الخليج والشرق الأوسط وأوروبا عبر شركات الشحن السريع المعتمدة."
                : "We deliver across all provinces of Turkey and Syria, as well as international shipping to Gulf states, Middle East, and Europe via premier express freight carriers."}
            </p>
          </section>

          <section className="space-y-4 text-gray-700 leading-relaxed">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#00a8a8]" />
              {isAr ? "2. مدد التجهيز والشحن" : "2. Lead Times & Shipping Windows"}
            </h2>
            <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
              <li>{isAr ? "المنتجات الجاهزة بدون طباعة: يتم الشحن خلال 24 - 48 ساعة." : "Plain stock items: Shipped within 24-48 hours."}</li>
              <li>{isAr ? "المنتجات المطبوعة بشعار مخصص: يستغرق الإنتاج والطباعة عادةً من 3 إلى 7 أيام عمل بحسب حجم الكمية." : "Custom printed items: Production takes 3-7 business days depending on volume."}</li>
              <li>{isAr ? "الشحن الدولي: يستغرق من 4 إلى 8 أيام عمل." : "Express International Freight: 4-8 business days."}</li>
            </ul>
          </section>

          <section className="bg-blue-50 p-4 rounded-xl border border-blue-200 text-sm text-blue-900">
            <p className="font-semibold mb-1">
              {isAr ? "متابعة وتتبع الشحنات:" : "Shipment Tracking:"}
            </p>
            <p>{isAr ? "يتم تزويد العميل برقم تتبع الشحنة فور تسليمها لشركة الشحن لمتابعة خط سير الشحنة حتى وصولها." : "Tracking numbers are issued to clients immediately upon carrier dispatch."}</p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
