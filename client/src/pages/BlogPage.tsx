import { useLanguage } from "@/contexts/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Calendar, ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "wouter";

const API_BASE = "https://zakariaprom.com";

interface Post {
  id: number;
  title_ar: string;
  title_en: string;
  title_tr: string;
  content_ar: string;
  content_en: string;
  content_tr: string;
  image: string;
  published: number;
  created_at: string;
  updated_at: string;
}

function fixImageUrl(url: string): string {
  if (!url) return "";
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (driveMatch) {
    return `https://lh3.googleusercontent.com/d/${driveMatch[1]}=w1200`;
  }
  return url;
}

export default function BlogPage() {
  const { language, t } = useLanguage();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/posts`)
      .then((res) => res.json())
      .then((data) => {
        setPosts(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const getTitle = (post: Post) => {
    if (language === "ar") return post.title_ar || post.title_en || post.title_tr;
    if (language === "tr") return post.title_tr || post.title_ar || post.title_en;
    return post.title_en || post.title_ar || post.title_tr;
  };

  const getContent = (post: Post) => {
    if (language === "ar") return post.content_ar || post.content_en || post.content_tr;
    if (language === "tr") return post.content_tr || post.content_ar || post.content_en;
    return post.content_en || post.content_ar || post.content_tr;
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(
        language === "ar" ? "ar-SA" : language === "tr" ? "tr-TR" : "en-US",
        { year: "numeric", month: "long", day: "numeric" }
      );
    } catch {
      return dateStr;
    }
  };

  const pageTitle = language === "ar" ? "المدونة" : language === "tr" ? "Blog" : "Blog";
  const noPostsText = language === "ar" ? "لا توجد مقالات حالياً" : language === "tr" ? "Henüz makale yok" : "No posts yet";
  const readMoreText = language === "ar" ? "اقرأ المزيد" : language === "tr" ? "Devamını Oku" : "Read More";

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#0a2e4a] to-[#0d4a6b] py-16">
        <div className="container text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-3xl md:text-5xl font-black text-white mb-4"
          >
            {pageTitle}
          </motion.h1>
        </div>
      </section>

      {/* Posts Grid */}
      <section className="py-12 bg-gray-50 flex-1">
        <div className="container">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
                  <div className="h-48 bg-gray-200 rounded-lg mb-4" />
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-full mb-1" />
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">📝</div>
              <p className="text-gray-500 text-xl">{noPostsText}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post, index) => (
                <motion.article
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group"
                >
                  <Link href={`/blog/${post.id}`}>
                    {/* Image */}
                    {post.image ? (
                      <div className="h-48 overflow-hidden">
                        <img
                          src={fixImageUrl(post.image)}
                          alt={getTitle(post)}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ) : (
                      <div className="h-48 bg-gradient-to-br from-[#0a2e4a] to-[#1a8a7d] flex items-center justify-center">
                        <span className="text-5xl text-white/30">📰</span>
                      </div>
                    )}

                    {/* Content */}
                    <div className="p-5">
                      <h2 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-[#1a8a7d] transition-colors">
                        {getTitle(post)}
                      </h2>
                      <p className="text-gray-600 text-sm line-clamp-3 mb-4">
                        {getContent(post)}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-gray-400 text-xs">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{formatDate(post.created_at)}</span>
                        </div>
                        <span className="text-[#1a8a7d] text-sm font-medium flex items-center gap-1">
                          {readMoreText}
                          {language === "ar" ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.article>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
