import { useLanguage } from "@/contexts/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { ShieldCheck, Lock, Eye, FileText } from "lucide-react";

export default function PrivacyPage() {
  const { language, settings } = useLanguage();
  const isAr = language === "ar";
  const siteName = (settings[`site_name_${language}` as keyof typeof settings] as string) || (isAr ? "مكتبة زكريا" : "Zakaria Prom");

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <SEO
        title={`${isAr ? "سياسة الخصوصية" : "Privacy Policy"} - ${siteName}`}
        description={isAr ? "سياسة الخصوصية وحماية البيانات لمكتبة زكريا لمنتجات الدعاية والإعلان." : "Privacy policy and data protection for Zakaria Prom."}
      />
      <Header />

      <main className="flex-1 container py-10 max-w-4xl">
        <div className="bg-white rounded-2xl shadow-sm border p-6 sm:p-10 space-y-8">
          <div className="flex items-center gap-4 border-b pb-6">
            <div className="w-12 h-12 bg-[#00a8a8]/10 text-[#00a8a8] rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {isAr ? "سياسة الخصوصية وحماية البيانات" : "Privacy & Data Protection Policy"}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {isAr ? "آخر تحديث: يوليو 2026" : "Last updated: July 2026"}
              </p>
            </div>
          </div>

          <section className="space-y-4 text-gray-700 leading-relaxed">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#00a8a8]" />
              {isAr ? "1. مقدمة وتعهّد الحماية" : "1. Introduction & Commitment"}
            </h2>
            <p>
              {isAr
                ? `نحن في ${siteName} نولي أهمية قصوى لحماية خصوصيتك وبياناتك الشخصية. توضح سياسة الخصوصية هذه كيفية جمع واستخدام وحماية معلوماتك عند زيارة موقعنا الإلكتروني أو التواصل معنا لطلب منتجات الدعاية والإعلان.`
                : `At ${siteName}, we prioritize protecting your personal data. This Privacy Policy explains how we collect, use, and safeguard your information when visiting our site.`}
            </p>
          </section>

          <section className="space-y-4 text-gray-700 leading-relaxed">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Eye className="w-5 h-5 text-[#00a8a8]" />
              {isAr ? "2. البيانات التي نجمعها" : "2. Information We Collect"}
            </h2>
            <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
              <li>{isAr ? "معلومات الاتصال: الاسم، البريد الإلكتروني، رقم الهاتف، اسم الشركة." : "Contact Info: Name, email, phone number, company name."}</li>
              <li>{isAr ? "بيانات الطلبات: تفاصيل المشتريات، والشعارات المرفقة للطباعة." : "Order Details: Items ordered, logos uploaded for custom printing."}</li>
              <li>{isAr ? "البيانات التقنية: عنوان IP، نوع المتصفح، ومعلومات الجلسة لغرض تحسين تجربة التصفح." : "Technical Data: IP address, browser type, and analytics session info."}</li>
            </ul>
          </section>

          <section className="space-y-4 text-gray-700 leading-relaxed">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#00a8a8]" />
              {isAr ? "3. كيف نستخدم معلوماتك" : "3. How We Use Your Information"}
            </h2>
            <p className="text-sm text-gray-600">
              {isAr
                ? "نستخدم البيانات المجمعة لتقديم عروض الأسعار، وتنفيذ طلبات الطباعة والإنتاج، وتسهيل عملية الشحن والتوصيل، والتواصل المباشر بشأن طلبكم."
                : "We use collected information to process custom quotes, produce printed merchandise, fulfill shipping, and provide customer support."}
            </p>
          </section>

          <section className="bg-gray-50 p-4 rounded-xl border text-sm text-gray-600">
            <p className="font-semibold text-gray-900 mb-1">
              {isAr ? "تواصل معنا بشأن الخصوصية:" : "Contact us regarding privacy:"}
            </p>
            <p>Email: {settings.email || "info@zakariaprom.com"} | Phone: {settings.phone || "+90 542 810 4208"}</p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
