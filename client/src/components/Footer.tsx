import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { Phone, Mail, MapPin, MessageCircle } from "lucide-react";
// Social media icons as simple SVG components
const Facebook = ({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>;
const Instagram = ({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/></svg>;
const Twitter = ({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/></svg>;
const Linkedin = ({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2zM4 2a2 2 0 110 4 2 2 0 010-4z"/></svg>;

function fixImageUrl(url: string): string {
  if (!url) return '';
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (driveMatch) {
    return `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
  }
  if (url.startsWith('/')) {
    return `https://zakariaprom.com${url}`;
  }
  return url;
}

export default function Footer() {
  const { language, t, settings } = useLanguage();

  const siteName = (settings[`site_name_${language}` as keyof typeof settings] as string) || 
    (language === "ar" ? "مكتبة زكريا" : "Zakaria Library");
  const logoType = (settings.logo_type as string) || 'text';
  const logoText = (settings.logo_text as string) || 'ZA';
  const logoUrl = (settings.logo_url as string) || '';
  
  const phoneTurkey = settings.phone || "+905428104208";
  const phoneSyria = settings.phone2 || "+963112242368";
  const email = settings.email || "info@zakariaprom.com";
  const whatsapp = settings.whatsapp || "905428104208";
  
  // Parse address into branches (separated by |)
  const addressKey = `address_${language}` as keyof typeof settings;
  const fullAddress = (settings[addressKey] as string) || "";
  const branches = fullAddress.split("|").map(b => b.trim()).filter(Boolean);

  const syriaAddress = branches[0] || (language === "ar" ? "دمشق - الحلبوني - بناء صلاح وخولي" : "Damascus - Halbouni");
  const turkeyAddress = branches[1] || (language === "ar" ? "إسطنبول - التوب كبي - مجمع المطابع" : "Istanbul - Topkapi");

  return (
    <footer className="bg-[#0a2e4a] text-white/90">
      <div className="container py-8 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {/* Company Info */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              {logoUrl ? (
                <img src={fixImageUrl(logoUrl)} alt={siteName} className="w-10 h-10 rounded-lg object-contain" />
              ) : (
                <div className="w-10 h-10 bg-[#00a8a8] rounded-lg flex items-center justify-center text-white font-black text-lg">
                  {logoText}
                </div>
              )}
              <div>
                <div className="font-bold text-white text-lg">{siteName}</div>
              </div>
            </div>
            <p className="text-white/60 text-sm leading-relaxed">
              {t("about.desc")}
            </p>
          </div>

          {/* Syria Branch */}
          <div>
            <h3 className="font-bold text-white mb-4 text-lg">
              {language === "ar" ? "فرع سوريا" : language === "tr" ? "Suriye Şubesi" : "Syria Branch"}
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-1 text-[#00a8a8] shrink-0" />
                <span className="text-white/60 text-sm">{syriaAddress}</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#00a8a8] shrink-0" />
                <a href={`tel:${phoneSyria}`} dir="ltr" className="text-white/60 hover:text-[#00d4d4] text-sm transition-colors">
                  {phoneSyria}
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

          {/* Turkey Branch */}
          <div>
            <h3 className="font-bold text-white mb-4 text-lg">
              {language === "ar" ? "فرع تركيا" : language === "tr" ? "Türkiye Şubesi" : "Turkey Branch"}
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-1 text-[#00a8a8] shrink-0" />
                <span className="text-white/60 text-sm">{turkeyAddress}</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#00a8a8] shrink-0" />
                <a href={`tel:${phoneTurkey}`} dir="ltr" className="text-white/60 hover:text-[#00d4d4] text-sm transition-colors">
                  {phoneTurkey}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-[#25d366] shrink-0" />
                <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-[#25d366] text-sm transition-colors">
                  WhatsApp
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
              {settings.social_twitter && (
                <a href={settings.social_twitter} target="_blank" rel="noopener noreferrer" className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center hover:bg-[#00a8a8] transition-colors">
                  <Twitter className="w-4 h-4" />
                </a>
              )}
              {settings.social_linkedin && (
                <a href={settings.social_linkedin} target="_blank" rel="noopener noreferrer" className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center hover:bg-[#00a8a8] transition-colors">
                  <Linkedin className="w-4 h-4" />
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
