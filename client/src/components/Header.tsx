/*
 * Design: Clean Corporate Catalog
 * Color: Teal/Navy (#0e4a6f primary, #00a8a8 accent)
 * Font: Tajawal (Arabic) + Roboto (Latin)
 */
import { useState, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { useLanguage, type Language } from "@/contexts/LanguageContext";
import { Search, Phone, Mail, Menu, X, Globe, ChevronDown, User, LogIn } from "lucide-react";

const langLabels: Record<Language, string> = {
  ar: "العربية",
  en: "English",
  tr: "Türkçe",
};

export default function Header() {
  const { language, setLanguage, t, settings } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [, navigate] = useLocation();

  const siteName = (settings[`site_name_${language}` as keyof typeof settings] as string) || 
    (language === "ar" ? "زكريا بروم" : "Zakaria Prom");
  const phone = settings.phone || "+90 542 810 4208";
  const email = settings.email || "info@zakariaprom.com";

  const handleSearch = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  }, [searchQuery, navigate]);

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  }, [handleSearch]);

  return (
    <header className="sticky top-0 z-50">
      {/* Top bar */}
      <div className="bg-[#0a2e4a] text-white/90 text-sm">
        <div className="container flex items-center justify-between py-2">
          <div className="flex items-center gap-4">
            <a href={`tel:${phone}`} className="flex items-center gap-1.5 hover:text-[#00d4d4] transition-colors">
              <Phone className="w-3.5 h-3.5" />
              <span dir="ltr">{phone}</span>
            </a>
            <a href={`mailto:${email}`} className="hidden sm:flex items-center gap-1.5 hover:text-[#00d4d4] transition-colors">
              <Mail className="w-3.5 h-3.5" />
              <span>{email}</span>
            </a>
          </div>
          <div className="flex items-center gap-3">
            {/* Login/Register Button */}
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-3 py-1 rounded hover:bg-white/10 transition-colors"
            >
              <User className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{language === "ar" ? "تسجيل الدخول" : language === "tr" ? "Giriş" : "Login"}</span>
            </Link>
            {/* Language Switcher */}
            <div className="relative">
              <button
                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-1 rounded hover:bg-white/10 transition-colors"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{langLabels[language]}</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              {langDropdownOpen && (
                <div className="absolute top-full end-0 mt-1 bg-white rounded-md shadow-lg border overflow-hidden min-w-[140px] z-50">
                  {(["ar", "en", "tr"] as Language[]).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => {
                        setLanguage(lang);
                        setLangDropdownOpen(false);
                      }}
                      className={`w-full text-start px-4 py-2.5 text-sm transition-colors ${
                        language === lang
                          ? "bg-[#0e4a6f] text-white"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {langLabels[lang]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="bg-white shadow-md">
        <div className="container flex items-center justify-between py-3 gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-12 h-12 bg-[#0e4a6f] rounded-lg flex items-center justify-center text-white font-black text-xl tracking-tight">
              ZA
            </div>
            <div className="hidden sm:block">
              <div className="font-bold text-[#0e4a6f] text-lg leading-tight">
                {siteName}
              </div>
              <div className="text-xs text-[#00a8a8] font-medium">
                {t("hero.subtitle")}
              </div>
            </div>
          </Link>

          {/* Search Bar */}
          <div className="flex-1 max-w-xl mx-4 hidden md:block">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder={t("search.placeholder")}
                className="w-full px-4 py-2.5 pe-10 border-2 border-gray-200 rounded-lg text-sm focus:border-[#00a8a8] focus:outline-none transition-colors bg-gray-50"
              />
              <button 
                onClick={() => handleSearch()}
                className="absolute top-1/2 -translate-y-1/2 end-3 text-gray-400 hover:text-[#00a8a8] transition-colors"
              >
                <Search className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {[
              { key: "nav.home", href: "/" },
              { key: "nav.about", href: "/about" },
              { key: "nav.products", href: "/#categories" },
              { key: "nav.contact", href: "/contact" },
            ].map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="px-3 py-2 text-sm font-medium text-[#0e4a6f] hover:text-[#00a8a8] hover:bg-[#00a8a8]/5 rounded-md transition-all"
              >
                {t(item.key)}
              </Link>
            ))}
            <Link
              href="/contact"
              className="ms-2 px-4 py-2 bg-[#00a8a8] text-white text-sm font-medium rounded-lg hover:bg-[#008f8f] transition-colors active:scale-[0.97]"
            >
              {t("general.requestQuote")}
            </Link>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-[#0e4a6f]"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Search */}
        <div className="md:hidden px-4 pb-3">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder={t("search.placeholder")}
              className="w-full px-4 py-2.5 pe-10 border-2 border-gray-200 rounded-lg text-sm focus:border-[#00a8a8] focus:outline-none transition-colors bg-gray-50"
            />
            <button 
              onClick={() => handleSearch()}
              className="absolute top-1/2 -translate-y-1/2 end-3 text-gray-400"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t bg-white">
            <nav className="container py-4 flex flex-col gap-1">
              {[
                { key: "nav.home", href: "/" },
                { key: "nav.about", href: "/about" },
                { key: "nav.products", href: "/#categories" },
                { key: "nav.contact", href: "/contact" },
              ].map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-3 text-[#0e4a6f] font-medium hover:bg-gray-50 rounded-lg transition-colors"
                >
                  {t(item.key)}
                </Link>
              ))}
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-3 text-[#0e4a6f] font-medium hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                {language === "ar" ? "تسجيل الدخول" : language === "tr" ? "Giriş Yap" : "Login"}
              </Link>
              <Link
                href="/contact"
                onClick={() => setMobileMenuOpen(false)}
                className="mx-4 mt-2 px-4 py-3 bg-[#00a8a8] text-white text-center font-medium rounded-lg"
              >
                {t("general.requestQuote")}
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
