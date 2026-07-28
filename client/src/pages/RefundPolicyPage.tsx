import { useLanguage } from "@/contexts/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { RefreshCw, CheckCircle, ShieldAlert } from "lucide-react";

export default function RefundPolicyPage() {
  const { language, settings } = useLanguage();
  const isAr = language === "ar";
  const siteName = (settings[`site_name_${language}` as keyof typeof settings] as string) || (isAr ? "مكتبة زكريا" : "Zakaria Prom");

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <SEO
        title={`${isAr ? "سياسة الإرجاع والاستبدال" : "Refund & Return Policy"} - ${siteName}`}
        description={isAr ? "سياسة الإرجاع والضمان والاستبدال لمنتجات الدعاية والإعلان في مكتبة زكريا." : "Return & refund policy for Zakaria Prom products."}
      />
      <Header />

      <main className="flex-1 container py-10 max-w-4xl">
        <div className="bg-white rounded-2xl shadow-sm border p-6 sm:p-10 space-y-8">
          <div className="flex items-center gap-4 border-b pb-6">
            <div className="w-12 h-12 bg-[#00a8a8]/10 text-[#00a8a8] rounded-xl flex items-center justify-center">
              <RefreshCw className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {isAr ? "سياسة الإرجاع والاستبدال" : "Refund & Return Policy"}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {isAr ? "ضمان الجودة وحماية المشتريات" : "Quality Assurance & Return Terms"}
              </p>
            </div>
          </div>

          <section className="space-y-4 text-gray-700 leading-relaxed">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-[#00a8a8]" />
              {isAr ? "1. ضمان الجودة والمنتجات المتضررة" : "1. Quality Guarantee & Damaged Goods"}
            </h2>
            <p className="text-sm text-gray-600">
              {isAr
                ? "في حال وصول المنتجات بها تلف مصنعي أو خطأ في الطباعة مغاير للنموذج المعتمد، نلتزم بإعادة طباعة المنتجات المتضررة أو تعويض القيمة فوراً وبدون تكلفة إضافية على العميل."
                : "If items arrive with manufacturing defects or printing errors that deviate from the approved proof, we will reprint or refund affected items at no extra cost."}
            </p>
          </section>

          <section className="space-y-4 text-gray-700 leading-relaxed">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-[#00a8a8]" />
              {isAr ? "2. المنتجات المطبوعة بطلب خاص" : "2. Custom Printed Items"}
            </h2>
            <p className="text-sm text-gray-600">
              {isAr
                ? "ظراً لأن المنتجات المخصصة تتم طباعتها بشعار واسم العميل خصيصاً، فإن المنتجات الخالية من العيوب لا يمكن إرجاعها بعد اعتماد نموذج الطباعة وبدء التجهيز."
                : "Because custom-printed promotional items bear your specific logo, non-defective custom items cannot be returned once production has started."}
            </p>
          </section>

          <section className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 text-sm text-emerald-900">
            <p className="font-semibold mb-1">
              {isAr ? "كيفية التقديم لطلب الاستبدال أو الإرجاع:" : "How to request a return or replacement:"}
            </p>
            <p>{isAr ? "تواصل مع فريق خدمة العملاء خلال 7 أيام من استلام الطلبية عبر WhatsApp أو البريد الإلكتروني مع إرفاق صور التلف إن وجد." : "Contact our customer support within 7 days of receiving your order via WhatsApp or email with photos of the defect."}</p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
