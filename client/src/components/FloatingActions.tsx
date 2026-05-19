/*
 * Floating action buttons: WhatsApp (animated) + AI Chatbot
 * Visible on all pages, responsive for mobile/tablet/desktop
 */
import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Bot } from "lucide-react";

// WhatsApp SVG icon
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

interface ChatMessage {
  role: "user" | "bot";
  text: string;
  products?: { id: string; name: string; image: string; price: number }[];
  quickReplies?: string[];
}

export default function FloatingActions() {
  const { language, t, settings } = useLanguage();
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showWhatsAppPulse, setShowWhatsAppPulse] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const whatsapp = settings.whatsapp || "905428104208";
  const chatbotEnabled = settings.chatbot_enabled !== "0";

  // Load welcome message when chat opens
  useEffect(() => {
    if (chatOpen && messages.length === 0) {
      loadWelcome();
    }
  }, [chatOpen]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Stop WhatsApp pulse after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowWhatsAppPulse(false), 8000);
    return () => clearTimeout(timer);
  }, []);

  async function loadWelcome() {
    try {
      const res = await fetch("https://zakariaprom.com/api/chatbot/config");
      const data = await res.json();
      const welcomeMsg = data.welcome?.[language] || data.welcome?.ar || "مرحباً! كيف يمكنني مساعدتك؟";
      setMessages([{
        role: "bot",
        text: welcomeMsg,
        quickReplies: language === "ar" 
          ? ["كيف أطلب عرض سعر؟", "ما هي طرق الدفع؟", "كم يستغرق التوصيل؟"]
          : language === "en"
          ? ["How to request a quote?", "Payment methods?", "Delivery time?"]
          : ["Nasıl teklif isteyebilirim?", "Ödeme yöntemleri?", "Teslimat süresi?"]
      }]);
    } catch {
      setMessages([{
        role: "bot",
        text: language === "ar" ? "مرحباً! كيف يمكنني مساعدتك؟" : "Hello! How can I help you?"
      }]);
    }
  }

  async function sendMessage(text?: string) {
    const msg = text || input.trim();
    if (!msg) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: msg }]);
    setLoading(true);

    try {
      const res = await fetch("https://zakariaprom.com/api/chatbot/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, lang: language })
      });
      const data = await res.json();
      setMessages(prev => [...prev, {
        role: "bot",
        text: data.answer || "...",
        products: data.products,
        quickReplies: data.quickReplies
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: "bot",
        text: language === "ar" ? "عذراً، حدث خطأ. يرجى المحاولة لاحقاً." : "Sorry, an error occurred."
      }]);
    }
    setLoading(false);
  }

  const isRTL = language === "ar";

  return (
    <>
      {/* WhatsApp Floating Button */}
      <motion.a
        href={`https://wa.me/${whatsapp}`}
        target="_blank"
        rel="noopener noreferrer"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className={`fixed ${isRTL ? "left-5" : "right-5"} bottom-24 z-50 group`}
      >
        <div className="relative">
          {/* Pulse animation ring */}
          {showWhatsAppPulse && (
            <span className="absolute inset-0 rounded-full bg-[#25d366] animate-ping opacity-40" />
          )}
          <div className="relative w-14 h-14 bg-[#25d366] rounded-full flex items-center justify-center shadow-lg shadow-[#25d366]/30 group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-[#25d366]/40 transition-all duration-200 active:scale-95">
            <WhatsAppIcon className="w-7 h-7 text-white" />
          </div>
          {/* Tooltip */}
          <motion.div
            initial={{ opacity: 0, x: isRTL ? -10 : 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.5, duration: 0.3 }}
            className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? "left-full ml-3" : "right-full mr-3"} bg-white text-gray-800 text-xs font-medium px-3 py-1.5 rounded-lg shadow-md whitespace-nowrap pointer-events-none`}
          >
            {language === "ar" ? "تواصل معنا" : language === "tr" ? "Bize ulaşın" : "Chat with us"}
          </motion.div>
        </div>
      </motion.a>

      {/* AI Chatbot Button */}
      {chatbotEnabled && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          onClick={() => setChatOpen(!chatOpen)}
          className={`fixed ${isRTL ? "left-5" : "right-5"} bottom-5 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 active:scale-95 ${
            chatOpen 
              ? "bg-gray-700 hover:bg-gray-800 shadow-gray-700/30" 
              : "bg-[#0e4a6f] hover:bg-[#0a3a5a] shadow-[#0e4a6f]/30"
          }`}
        >
          {chatOpen ? (
            <X className="w-6 h-6 text-white" />
          ) : (
            <Bot className="w-6 h-6 text-white" />
          )}
        </motion.button>
      )}

      {/* Chat Window */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className={`fixed ${isRTL ? "left-5" : "right-5"} bottom-24 z-50 w-[340px] max-w-[calc(100vw-2.5rem)] h-[450px] max-h-[calc(100vh-8rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden`}
          >
            {/* Chat Header */}
            <div className="bg-[#0e4a6f] text-white px-4 py-3 flex items-center gap-3 shrink-0">
              <div className="w-9 h-9 bg-[#00a8a8] rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="font-bold text-sm">
                  {language === "ar" ? "المساعد الذكي" : language === "tr" ? "Akıllı Asistan" : "Smart Assistant"}
                </div>
                <div className="text-white/60 text-xs">
                  {language === "ar" ? "متصل الآن" : language === "tr" ? "Çevrimiçi" : "Online now"}
                </div>
              </div>
              <button onClick={() => setChatOpen(false)} className="p-1 hover:bg-white/10 rounded transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[#0e4a6f] text-white rounded-br-sm"
                      : "bg-gray-100 text-gray-800 rounded-bl-sm"
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    {/* Product results */}
                    {msg.products && msg.products.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {msg.products.slice(0, 3).map((p) => (
                          <a
                            key={p.id}
                            href={`/product/${p.id}`}
                            className="flex items-center gap-2 bg-white/90 rounded-lg p-2 hover:bg-white transition-colors"
                          >
                            {p.image && (
                              <img src={p.image} alt="" className="w-10 h-10 rounded object-cover" />
                            )}
                            <span className="text-xs text-gray-700 font-medium flex-1">{p.name}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {/* Quick Replies */}
              {messages.length > 0 && messages[messages.length - 1].quickReplies && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {messages[messages.length - 1].quickReplies!.map((qr, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(qr)}
                      className="text-xs px-3 py-1.5 bg-[#00a8a8]/10 text-[#0e4a6f] border border-[#00a8a8]/30 rounded-full hover:bg-[#00a8a8]/20 transition-colors"
                    >
                      {qr}
                    </button>
                  ))}
                </div>
              )}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
                    <div className="flex gap-1.5">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t px-3 py-3 shrink-0">
              <form
                onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={language === "ar" ? "اكتب رسالتك..." : language === "tr" ? "Mesajınızı yazın..." : "Type your message..."}
                  className="flex-1 px-4 py-2.5 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8]/50 transition-all"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="w-10 h-10 bg-[#0e4a6f] text-white rounded-full flex items-center justify-center hover:bg-[#0a3a5a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
