import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { Phone, Mail, MapPin } from "lucide-react";
import { companyInfo } from "@/lib/data";

export default function Footer() {
  const { language, t } = useLanguage();

  const getAddress = (addr: { ar: string; en: string; tr: string }) => addr[language];

  return (
    <footer className="bg-[#0a2e4a] text-white/90">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-[#00a8a8] rounded-lg flex items-center justify-center text-white font-black text-lg">
                ZA
              </div>
              <div>
                <div className="font-bold text-white text-lg">
                  {language === "ar" ? companyInfo.nameAr : companyInfo.nameEn}
                </div>
              </div>
            </div>
            <p className="text-white/60 text-sm leading-relaxed">
              {t("about.desc").substring(0, 120)}...
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
                { key: "nav.catalog", href: "/#categories" },
              ].map((item) => (
                <li key={item.key}>
                  <Link href={item.href} className="text-white/60 hover:text-[#00d4d4] transition-colors text-sm">
                    {t(item.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Turkey Branch */}
          <div>
            <h3 className="font-bold text-white mb-4 text-lg">{t("footer.turkey")}</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-1 text-[#00a8a8] shrink-0" />
                <span className="text-white/60 text-sm">{getAddress(companyInfo.turkeyAddress)}</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#00a8a8] shrink-0" />
                <a href={`tel:${companyInfo.phone}`} dir="ltr" className="text-white/60 hover:text-[#00d4d4] text-sm transition-colors">
                  {companyInfo.phone}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#00a8a8] shrink-0" />
                <a href={`mailto:${companyInfo.email}`} className="text-white/60 hover:text-[#00d4d4] text-sm transition-colors">
                  {companyInfo.email}
                </a>
              </li>
            </ul>
          </div>

          {/* Syria Branch */}
          <div>
            <h3 className="font-bold text-white mb-4 text-lg">{t("footer.syria")}</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-1 text-[#00a8a8] shrink-0" />
                <span className="text-white/60 text-sm">{getAddress(companyInfo.syriaAddress)}</span>
              </li>
            </ul>
            <div className="mt-6">
              <h4 className="font-medium text-white mb-3 text-sm">{t("footer.followUs")}</h4>
              <div className="flex gap-3">
                {["facebook", "instagram", "whatsapp"].map((social) => (
                  <a
                    key={social}
                    href="#"
                    className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center hover:bg-[#00a8a8] transition-colors"
                  >
                    <span className="text-xs font-bold uppercase">{social[0]}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="container py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-white/40 text-xs">
            &copy; {new Date().getFullYear()} {language === "ar" ? companyInfo.nameAr : companyInfo.nameEn}. {t("footer.rights")}.
          </p>
          <p className="text-white/30 text-xs">zakariaprom.com</p>
        </div>
      </div>
    </footer>
  );
}
