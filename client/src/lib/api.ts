const API_BASE = "https://zakariaprom.com";

export interface ApiCategory {
  tr: string;
  ar: string;
  en: string;
  count: number;
  image?: string;
  subcategories?: { tr: string; ar: string; en: string; count: number }[];
}

export interface ApiProduct {
  id: string;
  name: { tr: string; ar: string; en: string };
  model: string;
  categories: { tr: string[]; ar: string[]; en: string[] };
  topCategory: { tr: string; ar: string; en: string };
  description: string;
  price: number;
  price_usd: number;
  quantity: number;
  images: string[];
  options: { name: string; values?: string[]; items?: { name: string; price?: string; quantity?: number }[] }[];
  status: string;
}

export interface ApiSettings {
  site_name_ar?: string;
  site_name_en?: string;
  site_name_tr?: string;
  site_slogan_ar?: string;
  site_slogan_en?: string;
  site_slogan_tr?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address_ar?: string;
  address_en?: string;
  address_tr?: string;
  currency?: string;
  social_facebook?: string;
  social_instagram?: string;
  social_twitter?: string;
  social_linkedin?: string;
  phone2?: string;
  chatbot_enabled?: string;
  chatbot_welcome_ar?: string;
  chatbot_welcome_en?: string;
  chatbot_welcome_tr?: string;
  logo_type?: string;
  logo_text?: string;
  logo_url?: string;
}

export interface ApiTranslations {
  siteName: string;
  siteSlogan: string;
  home: string;
  products: string;
  categories: string;
  about: string;
  contact: string;
  searchPlaceholder: string;
  requestQuote: string;
  phone: string;
  email: string;
  address: string;
  addressText: string;
  aboutText: string;
  footerText: string;
  whatsapp: string;
  productsCount: string;
  noProducts: string;
  loading: string;
  services: string;
  printing: string;
  engraving: string;
  customDesign: string;
  bulkOrders: string;
  phoneNumber?: string;
  whatsappNumber?: string;
  emailAddress?: string;
  [key: string]: string | undefined;
}

export async function fetchCategories(): Promise<ApiCategory[]> {
  try {
    const res = await fetch(`${API_BASE}/api/categories`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function fetchProducts(params: {
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort?: string;
  lang?: string;
}): Promise<{ products: ApiProduct[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  try {
    const searchParams = new URLSearchParams();
    if (params.category) searchParams.set("category", params.category);
    if (params.search) searchParams.set("search", params.search);
    if (params.page) searchParams.set("page", String(params.page));
    if (params.limit) searchParams.set("limit", String(params.limit));
    if (params.sort) searchParams.set("sort", params.sort);
    if (params.lang) searchParams.set("lang", params.lang);
    const res = await fetch(`${API_BASE}/api/products?${searchParams.toString()}`);
    if (!res.ok) return { products: [], pagination: { page: 1, limit: 24, total: 0, totalPages: 0 } };
    return await res.json();
  } catch {
    return { products: [], pagination: { page: 1, limit: 24, total: 0, totalPages: 0 } };
  }
}

export async function fetchProduct(id: string): Promise<ApiProduct | null> {
  try {
    const res = await fetch(`${API_BASE}/api/product/${id}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchSettings(): Promise<ApiSettings> {
  try {
    const res = await fetch(`${API_BASE}/api/settings/public`);
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
}

export interface ApiBanner {
  id: number;
  title_ar: string;
  title_en: string;
  title_tr: string;
  subtitle_ar: string;
  subtitle_en: string;
  subtitle_tr: string;
  image_url: string;
  link: string;
  sort_order: number;
  active: number;
}

export interface ApiCurrency {
  id: number;
  code: string;
  name_ar: string;
  name_en: string;
  name_tr: string;
  symbol: string;
  rate_from_try: number;
  active: number;
}

export async function fetchBanners(): Promise<ApiBanner[]> {
  try {
    const res = await fetch(`${API_BASE}/api/banners`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function fetchCurrencies(): Promise<ApiCurrency[]> {
  try {
    const res = await fetch(`${API_BASE}/api/currencies`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function fetchTranslations(lang: string): Promise<ApiTranslations | null> {
  try {
    const res = await fetch(`${API_BASE}/api/translations/${lang}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// User auth
export async function loginUser(email: string, password: string) {
  const res = await fetch(`${API_BASE}/api/user/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

export async function registerUser(data: { name: string; email: string; password: string; phone?: string; company?: string }) {
  const res = await fetch(`${API_BASE}/api/user/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}
