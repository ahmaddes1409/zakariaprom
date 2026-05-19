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

  const phone = settings.phone || "+90 542 810 4208";
  const email = settings.email || "info@zakariaprom.com";
  const whatsapp = settings.whatsapp || "905428104208";
  const addressKey = `address_${language}` as keyof typeof settings;
  const address = (settings[addressKey] as string) || 
    (language === "ar" ? "إسطنبول، تركيا" : language === "tr" ? "İstanbul, Türkiye" : "Istanbul, Turkey");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success(
      language === "ar"
        ? "تم إرسال رسالتك بنجاح! سنتواصل معك قريباً."
        : language === "tr"
        ? "Mesajınız başarıyla gönderildi! En kısa sürede size dönüş yapacağız."
        : "Your message has been sent successfully! We will contact you soon."
    );
    setFormData({ name: "", email: "", message: "" });
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
              {/* Branch Info */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4 }}
                className="bg-white rounded-xl p-6 shadow-sm"
              >
                <h3 className="font-bold text-[#0e4a6f] mb-4 text-lg">{t("footer.turkey")}</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-[#00a8a8] shrink-0 mt-0.5" />
                    <span className="text-gray-600 text-sm">{address}</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-[#00a8a8] shrink-0" />
                    <a href={`tel:${phone}`} dir="ltr" className="text-gray-600 hover:text-[#00a8a8] text-sm transition-colors">
                      {phone}
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
                    {language === "ar" ? "تواصل معنا مباشرة" : language === "tr" ? "Doğrudan iletişime geçin" : "Contact us directly"}
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
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#00a8a8] text-white font-bold rounded-lg hover:bg-[#008f8f] transition-all active:scale-[0.97]"
                  >
                    <Send className="w-4 h-4" />
                    {t("contact.send")}
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
