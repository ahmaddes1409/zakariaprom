import { useLanguage } from "@/contexts/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Calendar, ArrowLeft, ArrowRight } from "lucide-react";
import { Link, useParams } from "wouter";

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

export default function BlogPostPage() {
  const { language } = useLanguage();
  const params = useParams<{ id: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/posts`)
      .then((res) => res.json())
      .then((data) => {
        const posts = Array.isArray(data) ? data : [];
        const found = posts.find((p: Post) => p.id === Number(params.id));
        setPost(found || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.id]);

  const getTitle = (p: Post) => {
    if (language === "ar") return p.title_ar || p.title_en || p.title_tr;
    if (language === "tr") return p.title_tr || p.title_ar || p.title_en;
    return p.title_en || p.title_ar || p.title_tr;
  };

  const getContent = (p: Post) => {
    if (language === "ar") return p.content_ar || p.content_en || p.content_tr;
    if (language === "tr") return p.content_tr || p.content_ar || p.content_en;
    return p.content_en || p.content_ar || p.content_tr;
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

  const backText = language === "ar" ? "العودة للمدونة" : language === "tr" ? "Bloga Dön" : "Back to Blog";

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-[#1a8a7d] border-t-transparent rounded-full" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-xl text-gray-500 mb-4">
              {language === "ar" ? "المقال غير موجود" : language === "tr" ? "Makale bulunamadı" : "Post not found"}
            </p>
            <Link href="/blog" className="text-[#1a8a7d] hover:underline">
              {backText}
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Hero Image */}
      {post.image && (
        <div className="w-full h-64 md:h-96 overflow-hidden">
          <img
            src={fixImageUrl(post.image)}
            alt={getTitle(post)}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Article Content */}
      <article className="flex-1 py-10">
        <div className="container max-w-3xl">
          {/* Back link */}
          <Link href="/blog" className="inline-flex items-center gap-1 text-[#1a8a7d] hover:underline mb-6 text-sm">
            {language === "ar" ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            {backText}
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-2xl md:text-4xl font-black text-gray-900 mb-4">
              {getTitle(post)}
            </h1>

            <div className="flex items-center gap-2 text-gray-400 text-sm mb-8 pb-6 border-b">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(post.created_at)}</span>
            </div>

            <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
              {getContent(post)}
            </div>
          </motion.div>
        </div>
      </article>

      <Footer />
    </div>
  );
}
