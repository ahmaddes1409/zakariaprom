export interface Category {
  id: string;
  nameKey: string;
  image: string;
  productCount: number;
}

export interface Product {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  nameTr: string;
  categoryId: string;
  image: string;
  minOrder: number;
}

export const categories: Category[] = [
  { id: "tech", nameKey: "cat.tech", image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&h=300&fit=crop", productCount: 45 },
  { id: "powerbank", nameKey: "cat.powerbank", image: "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400&h=300&fit=crop", productCount: 32 },
  { id: "wireless", nameKey: "cat.wireless", image: "https://images.unsplash.com/photo-1622445275576-721325763afe?w=400&h=300&fit=crop", productCount: 18 },
  { id: "speakers", nameKey: "cat.speakers", image: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&h=300&fit=crop", productCount: 24 },
  { id: "usb", nameKey: "cat.usb", image: "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=400&h=300&fit=crop", productCount: 38 },
  { id: "metalPens", nameKey: "cat.metalPens", image: "https://images.unsplash.com/photo-1585336261022-680e295ce3fe?w=400&h=300&fit=crop", productCount: 56 },
  { id: "plasticPens", nameKey: "cat.plasticPens", image: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400&h=300&fit=crop", productCount: 42 },
  { id: "penSets", nameKey: "cat.penSets", image: "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=400&h=300&fit=crop", productCount: 28 },
  { id: "notebooks", nameKey: "cat.notebooks", image: "https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=400&h=300&fit=crop", productCount: 35 },
  { id: "thermos", nameKey: "cat.thermos", image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&h=300&fit=crop", productCount: 30 },
  { id: "ceramicMugs", nameKey: "cat.ceramicMugs", image: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400&h=300&fit=crop", productCount: 40 },
  { id: "keychains", nameKey: "cat.keychains", image: "https://images.unsplash.com/photo-1622547748225-3fc4abd2cca0?w=400&h=300&fit=crop", productCount: 52 },
  { id: "badges", nameKey: "cat.badges", image: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=300&fit=crop", productCount: 20 },
  { id: "lighters", nameKey: "cat.lighters", image: "https://images.unsplash.com/photo-1585011664466-b7bbe92f34ef?w=400&h=300&fit=crop", productCount: 22 },
  { id: "deskSets", nameKey: "cat.deskSets", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop", productCount: 18 },
  { id: "bags", nameKey: "cat.bags", image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=300&fit=crop", productCount: 25 },
  { id: "wallets", nameKey: "cat.wallets", image: "https://images.unsplash.com/photo-1627123424574-724758594e93?w=400&h=300&fit=crop", productCount: 15 },
  { id: "umbrellas", nameKey: "cat.umbrellas", image: "https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?w=400&h=300&fit=crop", productCount: 20 },
  { id: "giftSets", nameKey: "cat.giftSets", image: "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=400&h=300&fit=crop", productCount: 30 },
  { id: "clocks", nameKey: "cat.clocks", image: "https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=400&h=300&fit=crop", productCount: 16 },
  { id: "printing", nameKey: "cat.printing", image: "https://images.unsplash.com/photo-1562654501-a0ccc0fc3fb1?w=400&h=300&fit=crop", productCount: 48 },
  { id: "textile", nameKey: "cat.textile", image: "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=400&h=300&fit=crop", productCount: 35 },
  { id: "knives", nameKey: "cat.knives", image: "https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?w=400&h=300&fit=crop", productCount: 14 },
];

export const featuredProducts: Product[] = [
  { id: "p1", code: "ZP-PB001", nameAr: "باور بانك 10000 مللي أمبير", nameEn: "Power Bank 10000mAh", nameTr: "Powerbank 10000mAh", categoryId: "powerbank", image: "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=300&h=300&fit=crop", minOrder: 50 },
  { id: "p2", code: "ZP-MP001", nameAr: "قلم معدني فاخر", nameEn: "Luxury Metal Pen", nameTr: "Lüks Metal Kalem", categoryId: "metalPens", image: "https://images.unsplash.com/photo-1585336261022-680e295ce3fe?w=300&h=300&fit=crop", minOrder: 100 },
  { id: "p3", code: "ZP-CM001", nameAr: "كوب سيراميك مع طباعة", nameEn: "Ceramic Mug with Print", nameTr: "Baskılı Seramik Kupa", categoryId: "ceramicMugs", image: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=300&h=300&fit=crop", minOrder: 50 },
  { id: "p4", code: "ZP-TH001", nameAr: "ترمس ستانلس ستيل 500مل", nameEn: "Stainless Steel Thermos 500ml", nameTr: "Paslanmaz Çelik Termos 500ml", categoryId: "thermos", image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=300&h=300&fit=crop", minOrder: 30 },
  { id: "p5", code: "ZP-NB001", nameAr: "دفتر ملاحظات جلد", nameEn: "Leather Notebook", nameTr: "Deri Not Defteri", categoryId: "notebooks", image: "https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=300&h=300&fit=crop", minOrder: 100 },
  { id: "p6", code: "ZP-KC001", nameAr: "ميدالية معدنية مخصصة", nameEn: "Custom Metal Keychain", nameTr: "Özel Metal Anahtarlık", categoryId: "keychains", image: "https://images.unsplash.com/photo-1622547748225-3fc4abd2cca0?w=300&h=300&fit=crop", minOrder: 200 },
  { id: "p7", code: "ZP-WC001", nameAr: "شاحن لاسلكي", nameEn: "Wireless Charger", nameTr: "Kablosuz Şarj Cihazı", categoryId: "wireless", image: "https://images.unsplash.com/photo-1622445275576-721325763afe?w=300&h=300&fit=crop", minOrder: 50 },
  { id: "p8", code: "ZP-UB001", nameAr: "مظلة دعائية كبيرة", nameEn: "Large Promotional Umbrella", nameTr: "Büyük Promosyon Şemsiye", categoryId: "umbrellas", image: "https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?w=300&h=300&fit=crop", minOrder: 50 },
];

export const companyInfo = {
  nameAr: "زكريا بروم",
  nameEn: "Zakaria Prom",
  nameTr: "Zakaria Prom",
  phone: "+90 542 810 4208",
  email: "info@zakariaprom.com",
  turkeyAddress: {
    ar: "إسطنبول، تركيا - غونغورن",
    en: "Istanbul, Turkey - Gungoren",
    tr: "İstanbul, Türkiye - Güngören",
  },
  syriaAddress: {
    ar: "سوريا",
    en: "Syria",
    tr: "Suriye",
  },
};
