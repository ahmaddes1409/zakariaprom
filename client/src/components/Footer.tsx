import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { Phone, Mail, MapPin, MessageCircle, Facebook, Instagram } from "lucide-react";

export default function Footer() {
  const { language, t, settings } = useLanguage();

  const siteName = (settings[`site_name_${language}` as keyof typeof settings] as string) || 
    (language === "ar" ? "زكريا بروم" : "Zakaria Prom");
  
  const phone = settings.phone || "+90 542 810 4208";
  const email = settings.email || "info@zakariaprom.com";
  const whatsapp = settings.whatsapp || "905428104208";
  
  const addressKey = `address_${language}` as keyof typeof settings;
  const address = (settings[addressKey] as string) || 
    (language === "ar" ? "إسطنبول، تركيا" : language === "tr" ? "İstanbul, Türkiye" : "Istanbul, Turkey");

  return (
    <footer className="bg-[#0a2e4a] text-white/90">
      <div className="container py-8 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {/* Company Info */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-[#00a8a8] rounded-lg flex items-center justify-center text-white font-black text-lg">
                ZA
              </div>
              <div>
                <div className="font-bold text-white text-lg">{siteName}</div>
              </div>
            </div>
            <p className="text-white/60 text-sm leading-relaxed">
              {t("about.desc")}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-bold text-white mb-4 text-lg">{t("footer.quickLinks")}</h3>
            <ul className="space-y-2.5">
              {[
                { key: "nav.home", href: "/" },
                { key: "nav.about", href: "/about" },
                { key: "nav.products", href: "/#categories" },
                { key: "nav.contact", href: "/contact" },
              ].map((item) => (
                <li key={item.key}>
                  <Link href={item.href} className="text-white/60 hover:text-[#00d4d4] transition-colors text-sm">
                    {t(item.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="font-bold text-white mb-4 text-lg">{t("footer.turkey")}</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-1 text-[#00a8a8] shrink-0" />
                <span className="text-white/60 text-sm">{address}</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#00a8a8] shrink-0" />
                <a href={`tel:${phone}`} dir="ltr" className="text-white/60 hover:text-[#00d4d4] text-sm transition-colors">
                  {phone}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#00a8a8] shrink-0" />
                <a href={`mailto:${email}`} className="text-white/60 hover:text-[#00d4d4] text-sm transition-colors">
                  {email}
                </a>
              </li>
            </ul>
          </div>

          {/* Social & WhatsApp */}
          <div>
            <h3 className="font-bold text-white mb-4 text-lg">{t("footer.followUs")}</h3>
            <div className="flex gap-3 mb-4">
              {settings.social_facebook && (
                <a href={settings.social_facebook} target="_blank" rel="noopener noreferrer" className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center hover:bg-[#00a8a8] transition-colors">
                  <Facebook className="w-4 h-4" />
                </a>
              )}
              {settings.social_instagram && (
                <a href={settings.social_instagram} target="_blank" rel="noopener noreferrer" className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center hover:bg-[#00a8a8] transition-colors">
                  <Instagram className="w-4 h-4" />
                </a>
              )}
              <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center hover:bg-[#25d366] transition-colors">
                <MessageCircle className="w-4 h-4" />
              </a>
            </div>
            <a
              href={`https://wa.me/${whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#25d366] text-white text-sm font-medium rounded-lg hover:bg-[#20bd5a] transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </a>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="container py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-white/40 text-xs">
            &copy; {new Date().getFullYear()} {siteName}. {t("footer.rights")}.
          </p>
          <p className="text-white/30 text-xs">zakariaprom.com</p>
        </div>
      </div>
    </footer>
  );
}
