import { useLanguage } from "@/contexts/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { FileText, CheckCircle2, AlertCircle } from "lucide-react";

export default function TermsPage() {
  const { language, settings } = useLanguage();
  const isAr = language === "ar";
  const siteName = (settings[`site_name_${language}` as keyof typeof settings] as string) || (isAr ? "مكتبة زكريا" : "Zakaria Prom");

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <SEO
        title={`${isAr ? "الشروط والأحكام" : "Terms & Conditions"} - ${siteName}`}
        description={isAr ? "الشروط والأحكام الخاصة بالطلب والخدمات في مكتبة زكريا لمنتجات الدعاية والإعلان." : "Terms & conditions for Zakaria Prom services and products."}
      />
      <Header />

      <main className="flex-1 container py-10 max-w-4xl">
        <div className="bg-white rounded-2xl shadow-sm border p-6 sm:p-10 space-y-8">
          <div className="flex items-center gap-4 border-b pb-6">
            <div className="w-12 h-12 bg-[#00a8a8]/10 text-[#00a8a8] rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {isAr ? "الشروط والأحكام" : "Terms & Conditions"}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {isAr ? "اتفاقية الاستخدام والخدمة" : "Service & Usage Agreement"}
              </p>
            </div>
          </div>

          <section className="space-y-4 text-gray-700 leading-relaxed">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#00a8a8]" />
              {isAr ? "1. أحكام الشراء والطلبات بالجملة" : "1. Wholesale Ordering Terms"}
            </h2>
            <p className="text-sm text-gray-600">
              {isAr
                ? `جميع الطلبات المقدمة عبر ${siteName} تخضع للتأكيد بعد مراجعة تكيّف التصاميم والشعارات المطلوبة للطباعة ومعاينة الكميات وتحديد أوقات الإنتاج والتسليم.`
                : `All wholesale orders placed at ${siteName} are confirmed after review of artwork specifications, minimum order quantities, and production lead times.`}
            </p>
          </section>

          <section className="space-y-4 text-gray-700 leading-relaxed">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-[#00a8a8]" />
              {isAr ? "2. حقوق الملكية والشعارات" : "2. Intellectual Property & Logos"}
            </h2>
            <p className="text-sm text-gray-600">
              {isAr
                ? "يتحمل العميل المسؤولية الكاملة عن امتلاكه كافة الحقوق القانونية للشعارات والتصاميم المقدمة للطباعة، ويتعهد بفك أي نزاع ملكية يخص العلامات التجارية ذات الصلة."
                : "Clients warrant that they possess all authorized rights for trademark logos provided for custom promotional printing."}
            </p>
          </section>

          <section className="space-y-4 text-gray-700 leading-relaxed">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#00a8a8]" />
              {isAr ? "3. الأسعار والأسعار المعروضة" : "3. Pricing & Quotes"}
            </h2>
            <p className="text-sm text-gray-600">
              {isAr
                ? "الأسعار المعروضة قابلة للتغيير وتعتمد على حجم الطلب ومواصفات الطباعة، ويتم اعتماد العرض الرسمي النهائى المكتوب بين الطرفين."
                : "Displayed prices are subject to formal quote approval depending on order quantities and customization specs."}
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
