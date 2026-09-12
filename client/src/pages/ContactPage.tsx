import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Phone, Mail, MapPin, Send, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function ContactPage() {
  const { language, t, settings } = useLanguage();
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [loading, setLoading] = useState(false);

  const phoneTurkey = settings.phone || "+905428104208";
  const phoneSyria = settings.phone2 || "+963112242368";
  const email = settings.email || "info@zakariaprom.com";
  const whatsapp = settings.whatsapp || "905428104208";

  const addressKey = `address_${language}` as keyof typeof settings;
  const fullAddress = (settings[addressKey] as string) || "";

  // Parse branches cleanly
  let syriaAddress = "";
  let turkeyAddress = "";
  if (fullAddress.includes("|")) {
    const parts = fullAddress.split("|").map((s) => s.trim());
    syriaAddress = parts[0] || "";
    turkeyAddress = parts[1] || "";
  } else {
    turkeyAddress = fullAddress;
  }
  syriaAddress = syriaAddress.replace(/^(فرع سوريا\s*:\s*|Suriye\s*:\s*|Syria\s*:\s*)/i, "").trim();
  turkeyAddress = turkeyAddress.replace(/^(فرع تركيا\s*:\s*|T[uü]rkiye\s*:\s*|Turkey\s*:\s*)/i, "").trim();

  if (!syriaAddress) {
    syriaAddress = language === "ar" ? "دمشق - الحلبوني - بناء صلاح وخولي" : language === "tr" ? "Şam - Halbouni - Salah ve Khawli Binası" : "Damascus - Halbouni - Salah & Khawli Bldg";
  }
  if (!turkeyAddress) {
    turkeyAddress = language === "ar" ? "إسطنبول - التوب كبي - مجمع المطابع - TÜRKİYE / İSTANBUL / TOPKAPI / 2.MATBAACILAR SİT. C Blok" : "İstanbul / Topkapı / 2.Matbaacılar Sit. C Blok";
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send');

      toast.success(
        language === "ar"
          ? "تم إرسال رسالتك وعرض السعر بنجاح إلى البريد الإلكتروني! سنتواصل معك قريباً."
          : language === "tr"
          ? "Mesajınız ve teklif talebiniz başarıyla gönderildi! En kısa sürede size dönüş yapacağız."
          : "Your quote request has been sent successfully to email! We will contact you soon."
      );
      setFormData({ name: "", email: "", message: "" });
    } catch (err: any) {
      toast.error(err.message || (language === "ar" ? "حدث خطأ أثناء الإرسال" : "Failed to send message"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Hero */}
      <section className="bg-[#0e4a6f] py-16">
        <div className="container text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-3xl md:text-5xl font-black text-white mb-3"
          >
            {t("contact.title")}
          </motion.h1>
          <p className="text-white/70 text-lg">
            {language === "ar" ? "تواصل معنا الآن" : language === "tr" ? "Bize Ulaşın" : "Get in Touch"}
          </p>
        </div>
      </section>

      <section className="py-12 bg-[#f5f7fa] flex-1">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Contact Info Cards */}
            <div className="space-y-4">
              {/* Turkey Branch */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4 }}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl">🇹🇷</span>
                  <h3 className="font-bold text-[#0e4a6f] text-lg">{t("footer.turkey")}</h3>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-[#00a8a8] shrink-0 mt-0.5" />
                    <span className="text-gray-600 text-sm leading-relaxed">{turkeyAddress}</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-[#00a8a8] shrink-0" />
                    <a href={`tel:${phoneTurkey}`} dir="ltr" className="text-gray-600 hover:text-[#00a8a8] text-sm font-medium transition-colors">
                      {phoneTurkey}
                    </a>
                  </li>
                  <li className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-[#00a8a8] shrink-0" />
                    <a href={`mailto:${email}`} className="text-gray-600 hover:text-[#00a8a8] text-sm transition-colors">
                      {email}
                    </a>
                  </li>
                </ul>
              </motion.div>

              {/* Syria Branch */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl">🇸🇾</span>
                  <h3 className="font-bold text-[#0e4a6f] text-lg">{t("footer.syria")}</h3>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-[#00a8a8] shrink-0 mt-0.5" />
                    <span className="text-gray-600 text-sm leading-relaxed">{syriaAddress}</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-[#00a8a8] shrink-0" />
                    <a href={`tel:${phoneSyria}`} dir="ltr" className="text-gray-600 hover:text-[#00a8a8] text-sm font-medium transition-colors">
                      {phoneSyria}
                    </a>
                  </li>
                  <li className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-[#00a8a8] shrink-0" />
                    <a href={`mailto:${email}`} className="text-gray-600 hover:text-[#00a8a8] text-sm transition-colors">
                      {email}
                    </a>
                  </li>
                </ul>
              </motion.div>

              {/* WhatsApp */}
              <motion.a
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                href={`https://wa.me/${whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-[#25D366] text-white rounded-xl p-4 shadow-sm hover:bg-[#20bd5a] transition-colors"
              >
                <MessageCircle className="w-6 h-6" />
                <div>
                  <div className="font-bold text-sm">WhatsApp</div>
                  <div className="text-white/80 text-xs">
                    {language === "ar" ? "تواصل معنا مباشرة عبر واتساب" : language === "tr" ? "Doğrudan WhatsApp'tan yazın" : "Contact us directly on WhatsApp"}
                  </div>
                </div>
              </motion.a>
            </div>

            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              className="lg:col-span-2"
            >
              <form onSubmit={handleSubmit} className="bg-white rounded-xl p-8 shadow-sm">
                <h2 className="text-xl font-bold text-[#0e4a6f] mb-6">
                  {language === "ar" ? "تواصل معنا الآن" : language === "tr" ? "Bize Ulaşın" : "Get in Touch"}
                </h2>
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("contact.name")}</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:border-[#00a8a8] focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("contact.email")}</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:border-[#00a8a8] focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("contact.message")}</label>
                    <textarea
                      required
                      rows={5}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:border-[#00a8a8] focus:outline-none transition-colors resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#00a8a8] text-white font-bold rounded-lg hover:bg-[#008f8f] transition-all active:scale-[0.97] disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    {loading ? (language === "ar" ? "جاري الإرسال..." : language === "tr" ? "Gönderiliyor..." : "Sending...") : t("contact.send")}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
