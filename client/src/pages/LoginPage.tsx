/*
 * Design: Clean Corporate Catalog - Teal/Navy
 * Login/Register page for customers
 */
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { loginUser, registerUser } from "@/lib/api";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { User, Mail, Lock, Phone, Building2, LogIn } from "lucide-react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";

export default function LoginPage() {
  const { language } = useLanguage();
  const [, navigate] = useLocation();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");

  const texts = {
    ar: {
      login: "تسجيل الدخول",
      register: "إنشاء حساب",
      email: "البريد الإلكتروني",
      password: "كلمة المرور",
      name: "الاسم الكامل",
      phone: "رقم الهاتف",
      company: "اسم الشركة (اختياري)",
      loginBtn: "دخول",
      registerBtn: "تسجيل",
      noAccount: "ليس لديك حساب؟",
      hasAccount: "لديك حساب بالفعل؟",
      createAccount: "إنشاء حساب جديد",
      loginHere: "سجل دخولك",
      successRegister: "تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول.",
      successLogin: "تم تسجيل الدخول بنجاح!",
    },
    en: {
      login: "Login",
      register: "Register",
      email: "Email",
      password: "Password",
      name: "Full Name",
      phone: "Phone Number",
      company: "Company Name (optional)",
      loginBtn: "Sign In",
      registerBtn: "Sign Up",
      noAccount: "Don't have an account?",
      hasAccount: "Already have an account?",
      createAccount: "Create Account",
      loginHere: "Login here",
      successRegister: "Account created successfully! You can now login.",
      successLogin: "Login successful!",
    },
    tr: {
      login: "Giriş Yap",
      register: "Kayıt Ol",
      email: "E-posta",
      password: "Şifre",
      name: "Ad Soyad",
      phone: "Telefon",
      company: "Şirket Adı (isteğe bağlı)",
      loginBtn: "Giriş",
      registerBtn: "Kayıt",
      noAccount: "Hesabınız yok mu?",
      hasAccount: "Zaten hesabınız var mı?",
      createAccount: "Hesap Oluştur",
      loginHere: "Giriş yapın",
      successRegister: "Hesap başarıyla oluşturuldu! Şimdi giriş yapabilirsiniz.",
      successLogin: "Giriş başarılı!",
    },
  };

  const txt = texts[language] || texts.ar;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (isLogin) {
        const res = await loginUser(email, password);
        if (res.error) {
          setError(res.error);
        } else {
          if (res.token) localStorage.setItem("user_token", res.token);
          setSuccess(txt.successLogin);
          setTimeout(() => navigate("/"), 1500);
        }
      } else {
        const res = await registerUser({ name, email, password, phone, company });
        if (res.error) {
          setError(res.error);
        } else {
          setSuccess(txt.successRegister);
          setIsLogin(true);
        }
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <section className="py-12 bg-[#f5f7fa] flex-1 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          className="w-full max-w-md mx-4"
        >
          <div className="bg-white rounded-2xl shadow-lg p-8">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-[#0e4a6f] rounded-xl flex items-center justify-center text-white mx-auto mb-4">
                <LogIn className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-black text-[#0e4a6f]">
                {isLogin ? txt.login : txt.register}
              </h1>
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
                {success}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="relative">
                  <User className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={txt.name}
                    required
                    className="w-full ps-10 pe-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:border-[#00a8a8] focus:outline-none transition-colors"
                  />
                </div>
              )}

              <div className="relative">
                <Mail className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={txt.email}
                  required
                  className="w-full ps-10 pe-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:border-[#00a8a8] focus:outline-none transition-colors"
                />
              </div>

              <div className="relative">
                <Lock className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={txt.password}
                  required
                  className="w-full ps-10 pe-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:border-[#00a8a8] focus:outline-none transition-colors"
                />
              </div>

              {!isLogin && (
                <>
                  <div className="relative">
                    <Phone className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={txt.phone}
                      className="w-full ps-10 pe-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:border-[#00a8a8] focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="relative">
                    <Building2 className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder={txt.company}
                      className="w-full ps-10 pe-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:border-[#00a8a8] focus:outline-none transition-colors"
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#00a8a8] text-white font-bold rounded-lg hover:bg-[#008f8f] transition-colors active:scale-[0.97] disabled:opacity-50"
              >
                {loading ? "..." : isLogin ? txt.loginBtn : txt.registerBtn}
              </button>
            </form>

            {/* Toggle */}
            <div className="text-center mt-6 text-sm text-gray-500">
              {isLogin ? txt.noAccount : txt.hasAccount}{" "}
              <button
                onClick={() => { setIsLogin(!isLogin); setError(""); setSuccess(""); }}
                className="text-[#00a8a8] font-medium hover:underline"
              >
                {isLogin ? txt.createAccount : txt.loginHere}
              </button>
            </div>
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}
