// Category translations: Turkish -> Arabic, English
const categoryTranslations = {
  // Official Etkin Promosyon Categories & Zakariaprom Custom Categories
  "Hediyelik Setler": { ar: "أطقم هدايا فاخرة", en: "Luxury Gift Sets" },
  "Hediyelik Kutular": { ar: "علب هدايا فاخرة", en: "Gift Boxes" },
  "Lüks Hediyelik Setler": { ar: "أطقم هدايا فاخرة", en: "Luxury Gift Sets" },
  "Kutulu Setler": { ar: "أطقم هدايا فاخرة", en: "Luxury Gift Sets" },
  "Kutulu Hediyelik Setler": { ar: "أطقم هدايا فاخرة", en: "Luxury Gift Sets" },
  "Hediyelik Set - Kişisel Ürünler": { ar: "أطقم هدايا فاخرة", en: "Luxury Gift Sets" },
  "Kutu - Aksesuar": { ar: "علب وإكسسوارات هدايا", en: "Gift Boxes & Accessories" },
  "Powerbank": { ar: "بطاريات متنقلة (باور بانك)", en: "Power Banks" },
  "Powerbanklar": { ar: "بطاريات متنقلة (باور بانك)", en: "Power Banks" },
  "Power Bank": { ar: "بطاريات متنقلة (باور بانك)", en: "Power Banks" },
  "Powerbank Organizerler": { ar: "منظمات باور بانك", en: "Power Bank Organizers" },
  "Speakerlar": { ar: "سماعات ومكبرات صوت", en: "Speakers" },
  "USB Bellekler": { ar: "فلاشات USB", en: "USB Flash Drives" },
  "Usb Bellekler": { ar: "فلاشات USB", en: "USB Flash Drives" },
  "USB Bellek": { ar: "فلاشات USB", en: "USB Flash Drives" },
  "Elektronik Ürünler": { ar: "منتجات إلكترونية", en: "Electronic Products" },
  "Teknolojik Ürünler": { ar: "منتجات تكنولوجية", en: "Technology Products" },
  "Teknoloji Ürünleri": { ar: "منتجات تكنولوجية", en: "Technology Products" },
  "Teknoloji": { ar: "منتجات تكنولوجية", en: "Technology Products" },
  "Organizerler": { ar: "منظمات ومفكرات", en: "Organizers" },
  "Tarihli Ajandalar": { ar: "أجندات سنوية مؤرخة", en: "Dated Agendas" },
  "2026 Ajandalar": { ar: "أجندات 2026", en: "2026 Agendas" },
  "Ajandalar": { ar: "أجندات سنوية", en: "Agendas" },
  "Ajanda ve Defterler": { ar: "أجندات ودفاتر", en: "Agendas & Notebooks" },
  "Ajanda - Defter": { ar: "أجندات ودفاتر", en: "Agendas & Notebooks" },
  "Ajanda Aksesuarları": { ar: "إكسسوارات أجندات", en: "Agenda Accessories" },
  "Ajanda Aksesuarlari": { ar: "إكسسوارات أجندات", en: "Agenda Accessories" },
  "Doğa Dostu Defterler": { ar: "دفاتر صديقة للبيئة", en: "Eco-Friendly Notebooks" },
  "Doga Dostu Defterler": { ar: "دفاتر صديقة للبيئة", en: "Eco-Friendly Notebooks" },
  "Doğa Dostu Notluklar": { ar: "مفكرات صديقة للبيئة", en: "Eco-Friendly Notepads" },
  "Doga Dostu Notluklar": { ar: "مفكرات صديقة للبيئة", en: "Eco-Friendly Notepads" },
  "Doğa Dostu Kalemler": { ar: "أقلام صديقة للبيئة", en: "Eco-Friendly Pens" },
  "Doga Dostu Kalemler": { ar: "أقلام صديقة للبيئة", en: "Eco-Friendly Pens" },
  "Doğa Dostu Ürünler": { ar: "منتجات صديقة للبيئة", en: "Eco-Friendly Products" },
  "Doga Dostu Urunler": { ar: "منتجات صديقة للبيئة", en: "Eco-Friendly Products" },
  "Geri Dönüşüm Ürünler": { ar: "منتجات صديقة للبيئة", en: "Eco-Friendly Products" },
  "Geri Dönüşümlü Kalemler": { ar: "أقلام صديقة للبيئة", en: "Eco-Friendly Pens" },
  "Defterler": { ar: "دفاتر ملاحظات", en: "Notebooks" },
  "Not Defterleri": { ar: "دفاتر ملاحظات", en: "Notebooks" },
  "Masa Sümenleri": { ar: "لبادات مكتب فاخرة", en: "Desk Blotters" },
  "Masa Sumenleri": { ar: "لبادات مكتب فاخرة", en: "Desk Blotters" },
  "Masa Setleri": { ar: "أطقم مكتبية", en: "Desk Sets" },
  "Masa Seti": { ar: "أطقم مكتبية", en: "Desk Sets" },
  "Kristal Masa Setleri": { ar: "أطقم مكتب كريستال", en: "Crystal Desk Sets" },
  "Masaüstü Organizerler": { ar: "منظمات مكتبية", en: "Desk Organizers" },
  "Masaustu Organizerler": { ar: "منظمات مكتبية", en: "Desk Organizers" },
  "Masaüstü Ürünler": { ar: "مستلزمات مكتبية", en: "Desk Accessories" },
  "Masa Setleri ve Sümenleri": { ar: "أطقم ولبادات مكتب", en: "Desk Sets & Blotters" },
  "Suni Deri Masa Setleri": { ar: "أطقم مكتب جلد صناعي", en: "Faux Leather Desk Sets" },
  "VIP Lüks Masa Setleri": { ar: "أطقم مكتب VIP فاخرة", en: "VIP Luxury Desk Sets" },
  "Kalem Setleri": { ar: "أطقم أقلام", en: "Pen Sets" },
  "Kalem Seti": { ar: "أطقم أقلام", en: "Pen Sets" },
  "Set Kalemleri": { ar: "أطقم أقلام", en: "Pen Sets" },
  "Hediyelik Kalem Setleri": { ar: "أطقم أقلام هدايا", en: "Gift Pen Sets" },
  "Lüks Kalem Setleri (2 li)": { ar: "أطقم أقلام فاخرة (قطعتين)", en: "Luxury Pen Sets (2 pcs)" },
  "Lüks Kalem Setleri (Tekli)": { ar: "أطقم أقلام فاخرة (قطعة واحدة)", en: "Luxury Pen Sets (Single)" },
  "Metal Kalemler": { ar: "أقلام معدنية", en: "Metal Pens" },
  "Metal Kalem": { ar: "أقلام معدنية", en: "Metal Pens" },
  "Metal Kalemleri": { ar: "أقلام معدنية", en: "Metal Pens" },
  "Metal Tükenmez - Roller Kalemler": { ar: "أقلام معدنية - رولر", en: "Metal Ballpoint - Roller Pens" },
  "Plastik Kalemler": { ar: "أقلام بلاستيكية", en: "Plastic Pens" },
  "Plastik Kalem": { ar: "أقلام بلاستيكية", en: "Plastic Pens" },
  "Plastik Kalemleri": { ar: "أقلام بلاستيكية", en: "Plastic Pens" },
  "Kurşun Kalemler": { ar: "أقلام رصاص", en: "Pencils" },
  "Dokunmatik Ekran Kalemleri": { ar: "أقلام شاشة لمس", en: "Touchscreen Pens" },
  "Promosyon Kalemler": { ar: "أقلام ترويجية", en: "Promotional Pens" },
  "Anahtarlıklar": { ar: "ميداليات مفاتيح", en: "Keychains" },
  "Anahtarliklar": { ar: "ميداليات مفاتيح", en: "Keychains" },
  "Anahtarlık": { ar: "ميداليات مفاتيح", en: "Keychains" },
  "Anahtarlık - Rozet": { ar: "ميداليات وشارات", en: "Keychains & Badges" },
  "Metal Anahtarlıklar": { ar: "ميداليات معدنية", en: "Metal Keychains" },
  "Rozetler": { ar: "شارات", en: "Badges" },
  "Metal Duvar Saatleri": { ar: "ساعات حائط معدنية", en: "Metal Wall Clocks" },
  "Metalize Duvar Saatleri": { ar: "ساعات حائط ممعدنة", en: "Metallized Wall Clocks" },
  "Plastik Duvar Saatleri": { ar: "ساعات حائط بلاستيكية", en: "Plastic Wall Clocks" },
  "Bombe Cam Duvar Saatleri": { ar: "ساعات حائط زجاج محدب", en: "Convex Glass Wall Clocks" },
  "Duvar Saatleri": { ar: "ساعات حائط", en: "Wall Clocks" },
  "Saatler": { ar: "ساعات", en: "Clocks" },
  "Şapka": { ar: "قبعات ترويجية", en: "Caps & Hats" },
  "Sapka": { ar: "قبعات ترويجية", en: "Caps & Hats" },
  "Tişörtler": { ar: "تيشيرتات وملابس", en: "T-Shirts" },
  "Tisortler": { ar: "تيشيرتات وملابس", en: "T-Shirts" },
  "Tekstil Ürünleri": { ar: "منتجات نسيجية وملابس", en: "Textile Products" },
  "Tekstil Urunleri": { ar: "منتجات نسيجية وملابس", en: "Textile Products" },
  "Termoslar": { ar: "ترمسات وحافظات حرارية", en: "Thermoses" },
  "Termoslar ve Bardaklar": { ar: "ترمسات وأكواب", en: "Thermoses & Mugs" },
  "Termos - Mug": { ar: "ترمسات وأكواب", en: "Thermoses & Mugs" },
  "Termos Bardaklar (Mug)": { ar: "أكواب حرارية", en: "Thermal Mugs" },
  "Mataralar": { ar: "قوارير مياه", en: "Water Bottles" },
  "Cam Ürünleri": { ar: "منتجات زجاجية", en: "Glass Products" },
  "Cam Urunleri": { ar: "منتجات زجاجية", en: "Glass Products" },
  "Cam Ürünler": { ar: "منتجات زجاجية", en: "Glass Products" },
  "Seramik ve Porselen Ürünler": { ar: "أكواب سيراميك وبورسلين", en: "Ceramic & Porcelain Mugs" },
  "Seramik ve Porselen Urunler": { ar: "أكواب سيراميك وبورسلين", en: "Ceramic & Porcelain Mugs" },
  "Seramik Kupa Bardaklar": { ar: "أكواب سيراميك", en: "Ceramic Mugs" },
  "Sekreterlik & Menü Kapları": { ar: "ملفات سكرتارية وحافظات قوائم", en: "Portfolios & Menu Covers" },
  "Sekreterlik & Menu Kaplari": { ar: "ملفات سكرتارية وحافظات قوائم", en: "Portfolios & Menu Covers" },
  "Sekreterlikler": { ar: "ملفات سكرتارية", en: "Portfolios" },
  "Sekreter Bloknotlar": { ar: "ملفات سكرتارية ومفكرات", en: "Secretary Notepads" },
  "Kartvizitlikler": { ar: "حاملات بطاقات أعمال", en: "Business Card Holders" },
  "Çakmaklar": { ar: "ولاعات ترويجية", en: "Promotional Lighters" },
  "Cakmaklar": { ar: "ولاعات ترويجية", en: "Promotional Lighters" },
  "Çakmak": { ar: "ولاعات ترويجية", en: "Promotional Lighters" },
  "Promosyon Çakmaklar": { ar: "ولاعات ترويجية", en: "Promotional Lighters" },
  "Açacaklı Magnetler": { ar: "فتاحات مغناطيسية", en: "Bottle Opener Magnets" },
  "Acacakli Magnetler": { ar: "فتاحات مغناطيسية", en: "Bottle Opener Magnets" },
  "Araç ve Gereçler": { ar: "أدوات ومستلزمات متنوعة", en: "Tools & Accessories" },
  "Arac ve Gerecler": { ar: "أدوات ومستلزمات متنوعة", en: "Tools & Accessories" },
  "Çantalar ve Cüzdanlar": { ar: "حقائب ومحافظ", en: "Bags & Wallets" },
  "Cantalar ve Cuzdanlar": { ar: "حقائب ومحافظ", en: "Bags & Wallets" },
  "Çantalar": { ar: "حقائب ومحافظ", en: "Bags & Wallets" },
  "Cantalar": { ar: "حقائب ومحافظ", en: "Bags & Wallets" },
  "Çanta": { ar: "حقائب ومحافظ", en: "Bags & Wallets" },
  "Cüzdanlar": { ar: "محافظ", en: "Wallets" },
  "Duvar Tabloları": { ar: "لوحات وساعات جدارية", en: "Wall Clocks & Arts" },
  "Duvar Tablolari": { ar: "لوحات وساعات جدارية", en: "Wall Clocks & Arts" },
  "Saatli Duvar Tabloları": { ar: "لوحات وساعات جدارية", en: "Wall Clocks & Arts" },
  "Saatli Duvar Tablolari": { ar: "لوحات وساعات جدارية", en: "Wall Clocks & Arts" },
  "Karton Çantalar": { ar: "حقائب كرتونية ورقية", en: "Paper Gift Bags" },
  "Karton Cantalar": { ar: "حقائب كرتونية ورقية", en: "Paper Gift Bags" },
  "Karton Çanta": { ar: "حقائب كرتونية ورقية", en: "Paper Gift Bags" },
  "Bloknotlar ve Sümenler": { ar: "مفكرات ولبادات مكتب", en: "Notepads & Blotters" },
  "Bloknotlar ve Sumenler": { ar: "مفكرات ولبادات مكتب", en: "Notepads & Blotters" },
  "Masa Takvimleri": { ar: "تقويمات مكتبية", en: "Desk Calendars" },
  "Gemici Takvimler": { ar: "تقاويم ملاحية", en: "Maritime Calendars" },
  "Kağıt Ürünleri": { ar: "منتجات ورقية", en: "Paper Products" },
  "Kutulu Kristal Plaketler": { ar: "دروع كريستالية بعلب فاخرة", en: "Boxed Crystal Plaques" },
  "Kristal Plaketler": { ar: "دروع كريستالية", en: "Crystal Plaques" },
  "Kristal Plaket": { ar: "دروع كريستالية", en: "Crystal Plaques" },
  "Albüm Plaketler": { ar: "دروع وألبومات تكريم", en: "Plaque Albums" },
  "Album Plaketler": { ar: "دروع وألبومات تكريم", en: "Plaque Albums" },
  "Ahşap Plaketler": { ar: "دروع خشبية", en: "Wooden Plaques" },
  "Ahsap Plaketler": { ar: "دروع خشبية", en: "Wooden Plaques" },
  "Madalyalar": { ar: "ميداليات وجوائز", en: "Medals & Awards" },
  "Kupalar ve Madalyalar": { ar: "كؤوس وميداليات", en: "Cups & Medals" },
  "Plaket ve Madalyalar": { ar: "دروع وميداليات", en: "Plaques & Medals" },
  "Bitki Yetiştirme Setleri": { ar: "مجموعات زراعة نباتات", en: "Plant Growing Sets" },
  "Bitki Yetistirme Setleri": { ar: "مجموعات زراعة نباتات", en: "Plant Growing Sets" },
  "Karışık Ürünler": { ar: "منتجات متنوعة", en: "Miscellaneous Products" },
  "Karisik Urunler": { ar: "منتجات متنوعة", en: "Miscellaneous Products" },
  "Diğer Ürünler": { ar: "منتجات متنوعة", en: "Various Products" },
  "Diger Urunler": { ar: "منتجات متنوعة", en: "Various Products" },
  "Çeşitli Ürünler": { ar: "منتجات متنوعة", en: "Various Products" },
  // Zakariaprom Custom Categories
  "Ofset Baskı": { ar: "مطبوعات ورقية وأوفست", en: "Offset Printing" },
  "Ofset Baski": { ar: "مطبوعات ورقية وأوفست", en: "Offset Printing" },
  "Ofsit Baskı": { ar: "مطبوعات ورقية وأوفست", en: "Offset Printing" },
  "ofsit baski": { ar: "مطبوعات ورقية وأوفست", en: "Offset Printing" },
  "Fuar Ürünleri": { ar: "مستلزمات المعارض والفعاليات", en: "Exhibition Products" },
  "fuar urunleri": { ar: "مستلزمات المعارض والفعاليات", en: "Exhibition Products" },
  "Bayrak": { ar: "أعلام ورايات", en: "Flags & Banners" },
  "Byrak": { ar: "أعلام ورايات", en: "Flags & Banners" },
  "Bayraklar": { ar: "أعلام ورايات", en: "Flags & Banners" },
  "Genel": { ar: "منتجات عامة", en: "General Products" }
};

// Common product term translations
const termTranslations = {
  // Common prefixes & modifiers
  "Diğer": { ar: "متنوعة", en: "Various" },
  "Diger": { ar: "متنوعة", en: "Various" },
  "Bardak Altı": { ar: "قواعد أكواب", en: "Coasters" },
  "Bardak Alti": { ar: "قواعد أكواب", en: "Coasters" },
  "Bardak Altlığı": { ar: "قواعد أكواب", en: "Coasters" },
  "Bardak Altlıkları": { ar: "قواعد أكواب", en: "Coasters" },
  "Altlığı": { ar: "قاعدة", en: "Coaster / Base" },
  "Altlıkları": { ar: "قواعد", en: "Coasters" },
  "Altı": { ar: "سفلي / قاعدة", en: "Base" },
  "Hesap Makinesi": { ar: "آلة حاسبة", en: "Calculator" },
  "Çakmak": { ar: "ولاعة", en: "Lighter" },
  "Cakmak": { ar: "ولاعة", en: "Lighter" },
  "Çakmaklar": { ar: "ولاعات", en: "Lighters" },
  "Cakmaklar": { ar: "ولاعات", en: "Lighters" },
  "Sümen": { ar: "لبادة مكتب", en: "Desk Blotter" },
  "Sümenleri": { ar: "لبادات مكتب", en: "Desk Blotters" },
  // Colors
  "Siyah": { ar: "أسود", en: "Black" },
  "Beyaz": { ar: "أبيض", en: "White" },
  "Kırmızı": { ar: "أحمر", en: "Red" },
  "Mavi": { ar: "أزرق", en: "Blue" },
  "Lacivert": { ar: "كحلي", en: "Navy Blue" },
  "Yeşil": { ar: "أخضر", en: "Green" },
  "Sarı": { ar: "أصفر", en: "Yellow" },
  "Turuncu": { ar: "برتقالي", en: "Orange" },
  "Mor": { ar: "بنفسجي", en: "Purple" },
  "Pembe": { ar: "وردي", en: "Pink" },
  "Gri": { ar: "رمادي", en: "Gray" },
  "Kahverengi": { ar: "بني", en: "Brown" },
  "Altın": { ar: "ذهبي", en: "Gold" },
  "Gümüş": { ar: "فضي", en: "Silver" },
  "Bordo": { ar: "خمري", en: "Burgundy" },
  // Product types and compound terms
  "Terzi Dikiş": { ar: "خياطة سرجية", en: "Stitched" },
  "Bayraklı": { ar: "شعار علم", en: "Flag Emblem" },
  "Termoderi": { ar: "جلد حراري", en: "Thermo Leather" },
  "Gizli Spiralli": { ar: "حلزوني مخفي", en: "Hidden Spiral" },
  "Çift Yön": { ar: "مزدوج الوجه", en: "Double Sided" },
  "Duvar Saati": { ar: "ساعة حائط", en: "Wall Clock" },
  "Resim Çerçevesi": { ar: "إطار صور", en: "Photo Frame" },
  "Karton Çanta": { ar: "حقيبة كرتون", en: "Paper Bag" },
  "Bez Çanta": { ar: "حقيبة قماشية", en: "Cloth Bag" },
  "Evrak Çantası": { ar: "حقيبة أوراق", en: "Briefcase" },
  "Sırt Çantası": { ar: "حقيبة ظهر", en: "Backpack" },
  "Not Defteri": { ar: "دفتر ملاحظات", en: "Notebook" },
  "Masa Seti": { ar: "طقم مكتب", en: "Desk Set" },
  "Hediyelik Set": { ar: "طقم هدايا", en: "Gift Set" },
  "Şişe Açacağı": { ar: "فتاحة زجاجات", en: "Bottle Opener" },
  "Şarj Kablosu": { ar: "كابل شحن", en: "Charging Cable" },
  "USB Bellek": { ar: "ذاكرة USB", en: "USB Drive" },
  "Hesap Makinesi": { ar: "آلة حاسبة", en: "Calculator" },
  "Kurşun Kalem": { ar: "قلم رصاص", en: "Pencil" },
  "Metal Kalem": { ar: "قلم معدني", en: "Metal Pen" },
  "Plastik Kalem": { ar: "قلم بلاستيك", en: "Plastic Pen" },
  "Kraft Kalem": { ar: "قلم كرافت", en: "Kraft Pen" },
  "Touchpen Kalem": { ar: "قلم لمس", en: "Touch Pen" },
  "Seramik - Porselen Kupa": { ar: "كوب سيراميك", en: "Ceramic Mug" },
  "Cam Şişe": { ar: "قارورة زجاجية", en: "Glass Bottle" },
  "Metal Plaka": { ar: "لوحة معدنية", en: "Metal Plate" },
  "Tasarım": { ar: "تصميم", en: "Design" },
  "Plasto": { ar: "بلاستيك", en: "Plastic" },
  "Dikiş": { ar: "خياطة", en: "Stitch" },
  "Spiralli": { ar: "حلزوني", en: "Spiral" },
  "Kapak": { ar: "غلاف", en: "Cover" },
  "Kutu": { ar: "علبة", en: "Box" },
  "Kutulu": { ar: "في علبة", en: "Boxed" },
  "Rozet": { ar: "شارة", en: "Badge" },
  "Kalem": { ar: "قلم", en: "Pen" },
  "Tükenmez": { ar: "حبر جاف", en: "Ballpoint" },
  "Roller": { ar: "رولر", en: "Roller" },
  "Çakmak": { ar: "ولاعة", en: "Lighter" },
  "Termos": { ar: "ترمس", en: "Thermos" },
  "Bardak": { ar: "كوب", en: "Cup" },
  "Kupa": { ar: "كوب", en: "Mug" },
  "Saat": { ar: "ساعة", en: "Clock" },
  "Çanta": { ar: "حقيبة", en: "Bag" },
  "Cüzdan": { ar: "محفظة", en: "Wallet" },
  "Anahtarlık": { ar: "ميدالية", en: "Keychain" },
  "Ajanda": { ar: "أجندة", en: "Agenda" },
  "Defter": { ar: "دفتر", en: "Notebook" },
  "Powerbank": { ar: "بطارية متنقلة", en: "Power Bank" },
  "Kulaklık": { ar: "سماعة", en: "Headphone" },
  "Hoparlör": { ar: "مكبر صوت", en: "Speaker" },
  "Şemsiye": { ar: "مظلة", en: "Umbrella" },
  "Metal": { ar: "معدني", en: "Metal" },
  "Plastik": { ar: "بلاستيك", en: "Plastic" },
  "Deri": { ar: "جلد", en: "Leather" },
  "Cam": { ar: "زجاج", en: "Glass" },
  "Seramik": { ar: "سيراميك", en: "Ceramic" },
  "Bambu": { ar: "بامبو", en: "Bamboo" },
  "Ahşap": { ar: "خشب", en: "Wood" },
  "NFC": { ar: "NFC", en: "NFC" },
  "USB": { ar: "USB", en: "USB" },
  "LED": { ar: "LED", en: "LED" },
  "Bluetooth": { ar: "بلوتوث", en: "Bluetooth" },
  "Manyetolu": { ar: "مغناطيسي", en: "Magnetic" },
  "Siboplu": { ar: "بصمام", en: "Valve" },
  "Turbo": { ar: "توربو", en: "Turbo" },
  "Lüks": { ar: "فاخر", en: "Luxury" },
  "Mini": { ar: "ميني", en: "Mini" },
  "Midi": { ar: "ميدي", en: "Midi" },
  "Set": { ar: "طقم", en: "Set" },
  "Özellikli": { ar: "مميز", en: "Featured" },
  "Rubber": { ar: "مطاطي", en: "Rubber" },
  "Telefon Standlı": { ar: "بحامل هاتف", en: "Phone Stand" },
  "Taşlı": { ar: "بحجر", en: "Stone" },
  "Sibopsuz": { ar: "بدون صمام", en: "Without Valve" },
  "Dokunmatik": { ar: "لمس", en: "Touch" },
  "Şarj": { ar: "شحن", en: "Charging" },
  "Kablo": { ar: "كابل", en: "Cable" },
  "Bellek": { ar: "ذاكرة", en: "Memory" },
  "Masa": { ar: "مكتب", en: "Desk" },
  "Duvar": { ar: "حائط", en: "Wall" }
};

// UI translations
const uiTranslations = {
  ar: {
    siteName: "مكتبة زكريا",
    siteSlogan: "أعلام عربية و أجنبية هدايا دعائية مطبوعات ورقية",
    home: "الرئيسية",
    products: "المنتجات",
    categories: "الفئات",
    about: "من نحن",
    contact: "اتصل بنا",
    search: "بحث...",
    searchPlaceholder: "ابحث عن منتج...",
    allCategories: "جميع الفئات",
    price: "السعر",
    quantity: "الكمية",
    available: "متوفر",
    outOfStock: "غير متوفر",
    model: "الموديل",
    description: "الوصف",
    colors: "الألوان",
    options: "الخيارات",
    noProducts: "لا توجد منتجات",
    loading: "جاري التحميل...",
    showMore: "عرض المزيد",
    showLess: "عرض أقل",
    productsCount: "منتج",
    requestQuote: "طلب عرض سعر",
    phone: "الهاتف",
    email: "البريد الإلكتروني",
    address: "العنوان",
    addressText: "إسطنبول، تركيا",
    aboutText: "زكريا بروم هي شركة متخصصة في منتجات الدعاية والإعلان والهدايا الترويجية. نقدم أكثر من 1600 منتج متنوع بأعلى جودة وأفضل الأسعار. لدينا مطابع في تركيا وسوريا لخدمتكم.",
    footerText: "جميع الحقوق محفوظة © 2026 زكريا بروم",
    whatsapp: "واتساب",
    filterByCategory: "تصفية حسب الفئة",
    sortBy: "ترتيب حسب",
    sortDefault: "الافتراضي",
    sortPriceLow: "السعر: من الأقل",
    sortPriceHigh: "السعر: من الأعلى",
    sortName: "الاسم",
    prev: "السابق",
    next: "التالي",
    page: "صفحة",
    of: "من",
    services: "خدماتنا",
    printing: "طباعة",
    engraving: "حفر ليزر",
    customDesign: "تصميم مخصص",
    bulkOrders: "طلبات بالجملة"
  },
  en: {
    siteName: "Zakaria Prom",
    siteSlogan: "Promotional Products",
    home: "Home",
    products: "Products",
    categories: "Categories",
    about: "About Us",
    contact: "Contact",
    search: "Search...",
    searchPlaceholder: "Search for a product...",
    allCategories: "All Categories",
    price: "Price",
    quantity: "Quantity",
    available: "Available",
    outOfStock: "Out of Stock",
    model: "Model",
    description: "Description",
    colors: "Colors",
    options: "Options",
    noProducts: "No products found",
    loading: "Loading...",
    showMore: "Show More",
    showLess: "Show Less",
    productsCount: "products",
    requestQuote: "Request Quote",
    phone: "Phone",
    email: "Email",
    address: "Address",
    addressText: "Istanbul, Turkey",
    aboutText: "Zakaria Prom is a company specialized in promotional and advertising products. We offer over 1600 diverse products with the highest quality and best prices. We have printing facilities in Turkey and Syria to serve you.",
    footerText: "All Rights Reserved © 2026 Zakaria Prom",
    whatsapp: "WhatsApp",
    filterByCategory: "Filter by Category",
    sortBy: "Sort by",
    sortDefault: "Default",
    sortPriceLow: "Price: Low to High",
    sortPriceHigh: "Price: High to Low",
    sortName: "Name",
    prev: "Previous",
    next: "Next",
    page: "Page",
    of: "of",
    services: "Our Services",
    printing: "Printing",
    engraving: "Laser Engraving",
    customDesign: "Custom Design",
    bulkOrders: "Bulk Orders"
  },
  tr: {
    siteName: "Zakaria Prom",
    siteSlogan: "Promosyon Ürünleri",
    home: "Ana Sayfa",
    products: "Ürünler",
    categories: "Kategoriler",
    about: "Hakkımızda",
    contact: "İletişim",
    search: "Ara...",
    searchPlaceholder: "Ürün ara...",
    allCategories: "Tüm Kategoriler",
    price: "Fiyat",
    quantity: "Adet",
    available: "Mevcut",
    outOfStock: "Stokta Yok",
    model: "Model",
    description: "Açıklama",
    colors: "Renkler",
    options: "Seçenekler",
    noProducts: "Ürün bulunamadı",
    loading: "Yükleniyor...",
    showMore: "Daha Fazla",
    showLess: "Daha Az",
    productsCount: "ürün",
    requestQuote: "Teklif İste",
    phone: "Telefon",
    email: "E-posta",
    address: "Adres",
    addressText: "İstanbul, Türkiye",
    aboutText: "Zakaria Prom, promosyon ve reklam ürünleri konusunda uzmanlaşmış bir şirkettir. En yüksek kalite ve en iyi fiyatlarla 1600'den fazla çeşitli ürün sunuyoruz. Türkiye ve Suriye'de matbaalarımız bulunmaktadır.",
    footerText: "Tüm Hakları Saklıdır © 2026 Zakaria Prom",
    whatsapp: "WhatsApp",
    filterByCategory: "Kategoriye Göre Filtrele",
    sortBy: "Sırala",
    sortDefault: "Varsayılan",
    sortPriceLow: "Fiyat: Düşükten Yükseğe",
    sortPriceHigh: "Fiyat: Yüksekten Düşüğe",
    sortName: "İsim",
    prev: "Önceki",
    next: "Sonraki",
    page: "Sayfa",
    of: "/",
    services: "Hizmetlerimiz",
    printing: "Baskı",
    engraving: "Lazer Kazıma",
    customDesign: "Özel Tasarım",
    bulkOrders: "Toplu Siparişler"
  }
};

let cachedSortedTerms = null;
function getSortedTerms() {
  if (!cachedSortedTerms) {
    cachedSortedTerms = Object.keys(termTranslations).sort((a, b) => b.length - a.length);
  }
  return cachedSortedTerms;
}

function normalizeCategoryName(catTr) {
  if (!catTr) return 'Genel';
  let str = fixMojikake(String(catTr)).trim();
  str = str.replace(/&gt;/g, '>').trim();

  // Strip pipe prefixes if present
  if (str.includes('|')) str = str.split('|')[0].trim();

  // Custom Zakariaprom categories & typos
  if (/^byrak$/i.test(str) || /^bayraklar$/i.test(str) || /^bayrak$/i.test(str)) return 'Bayrak';
  if (/ofsit|ofset/i.test(str)) return 'Ofset Baskı';
  if (/fuar/i.test(str)) return 'Fuar Ürünleri';

  // Gift Sets & Boxes
  if (str === 'Kutulu Setler' || str === 'Kutulu Hediyelik Setler' || str === 'Hediyelik Set - Kişisel Ürünler') return 'Hediyelik Setler';
  if (str === 'Kutu - Aksesuar' || str === 'Kutu Aksesuar' || str === 'Hediyelik Kutu' || str === 'Hediyelik Kutuları') return 'Hediyelik Kutular';

  // Bags
  if (str === 'Çantalar' || str === 'Çanta' || str === 'Cüzdanlar' || str === 'Çanta | Çanta' || str === 'Evrak Çantaları' || str === 'Sırt Çantaları' || str === 'Bez Çantalar') return 'Çantalar ve Cüzdanlar';
  if (str === 'Karton Çanta') return 'Karton Çantalar';

  // Medals & Plaques
  if (str === 'Kupalar ve Madalyalar' || str === 'Madalya') return 'Madalyalar';
  if (str === 'Kutulu Kristal Plaketler' || str === 'Kutulu Kristal Plaket') return 'Kutulu Kristal Plaketler';
  if (str === 'Kristal Plaketler' || str === 'Kristal Plaket') return 'Kristal Plaketler';
  if (str === 'Albüm Plaket' || str === 'Album Plaketler') return 'Albüm Plaketler';
  if (str === 'Ahşap Plaket' || str === 'Ahsap Plaketler') return 'Ahşap Plaketler';

  // Wall Art
  if (str === 'Saatli Duvar Tabloları' || str === 'Saatli Duvar Tablolari') return 'Duvar Tabloları';

  // Portfolios
  if (str === 'Sekreter Bloknotlar' || str === 'Sekreterlik' || str === 'Sekreterlikler') return 'Sekreterlik & Menü Kapları';

  // Desk Blotters
  if (str === 'Masa Sümeni' || str === 'Masa Sumenleri' || str === 'Masa Sümenleri') return 'Masa Sümenleri';

  // Desk Sets
  if (str === 'VIP Lüks Masa Setleri' || str === 'Suni Deri Masa Setleri' || str === 'Masa Seti') return 'Masa Setleri';

  // Tech
  if (str === 'Teknoloji Ürünleri > Powerbank' || str === 'Powerbanklar' || str === 'Power Bank') return 'Powerbank';
  if (str === 'Teknoloji Ürünleri > USB Bellek' || str === 'Usb Bellekler' || str === 'USB Bellek') return 'USB Bellekler';
  if (str === 'Teknoloji Ürünleri' || str === 'Teknoloji' || str === 'Diger Teknoloji Urunleri') return 'Elektronik Ürünler';
  if (str === 'Telefon Standları' || str === 'Telefon Standı') return 'Araç ve Gereçler';

  // Plastic / Metal Pens
  if (str === 'Kalemler > Plastik Kalem' || str === 'Plastik Kalem' || str === 'Plastik Kalemler' || str === 'Plastik Kalemleri' || str === 'Promosyon Kalemler > Plastik Kalem') return 'Plastik Kalemler';
  if (str === 'Kalemler > Metal Kalem' || str === 'Metal Kalem' || str === 'Metal Kalemler' || str === 'Metal Kalemleri' || str === 'Metal Tükenmez - Roller Kalemler') return 'Metal Kalemler';
  if (str === 'Kalem Setleri > Kalem Seti' || str === 'KalemSetleri > Kalem Seti' || str === 'Kalem Seti' || str === 'Hediyelik Kalem Setleri' || str === 'Set Kalemleri' || str === 'Set Kalem') return 'Kalem Setleri';

  // Wall Clocks
  if (str === 'Saatler > Plastik Duvar Saati' || str === 'Plastik Duvar Saati' || str === 'Duvar Saatleri' || str === 'Saatler > Duvar Saati') return 'Plastik Duvar Saatleri';
  if (str === 'Metal Duvar Saati') return 'Metal Duvar Saatleri';
  if (str === 'Metalize Duvar Saati') return 'Metalize Duvar Saatleri';

  // Thermoses
  if (str === 'Termos - Matara > Diğer Termos - Matara' || str === 'Termos - Mug' || str === 'Termos Bardaklar (Mug)' || str === 'Mataralar' || str === 'Termos - Matara') return 'Termoslar';

  // Agendas / Notebooks
  if (str === 'Ajanda - Defter' || str === 'Not Defterleri' || str === 'Notluk - Defterler') return 'Defterler';

  // Eco-Friendly
  if (str === 'Geri Dönüşümlü Kalemler') return 'Doğa Dostu Kalemler';

  return str;
}

function translateProductName(name, targetLang) {
  if (targetLang === 'tr' || !name) return name;
  let translated = name;
  const sortedTerms = getSortedTerms();
  for (const term of sortedTerms) {
    if (translated.includes(term) && termTranslations[term][targetLang]) {
      translated = translated.replace(new RegExp(term, 'gi'), termTranslations[term][targetLang]);
    }
  }
  return translated;
}

function fixMojikake(str) {
  if (!str || typeof str !== 'string') return str || '';
  
  let s = str;

  if (/[\u00C2-\u00C5][\u0080-\u00BF]/.test(s) || /[\u00C3\u00C4\u00C5]/.test(s)) {
    try {
      const b = Buffer.from(s, 'latin1').toString('utf8');
      if (b && !b.includes('')) {
        s = b;
      }
    } catch (e) {}
  }

  s = s
    .replace(/Ãœ/g, 'Ü')
    .replace(/Ã¼/g, 'ü')
    .replace(/Ã–/g, 'Ö')
    .replace(/Ã¶/g, 'ö')
    .replace(/Ã‡/g, 'Ç')
    .replace(/Ã§/g, 'ç')
    .replace(/Ãǂ/g, 'Ç')
    .replace(/Ã\u01c2/g, 'Ç')
    .replace(/Ã\u0102/g, 'Ç')
    .replace(/ÅŸ/g, 'ş')
    .replace(/Å\u009f/g, 'ş')
    .replace(/Å\u0178/g, 'Ş')
    .replace(/Å\u009e/g, 'Ş')
    .replace(/Ã\u0131/g, 'ı')
    .replace(/Ä\u009f/g, 'ğ')
    .replace(/Ä\u009e/g, 'Ğ')
    .replace(/Ã\u0087/g, 'Ç')
    .replace(/Ã\u009c/g, 'Ü')
    .replace(/Ã\u0096/g, 'Ö')
    .replace(/MasaÜstü/g, 'Masaüstü')
    .replace(/DeskÜstü/g, 'Desküstü')
    .replace(/GereÃĂ/g, 'Gereç')
    .replace(/GereÃ§/g, 'Gereç')
    .replace(/AraÃ§/g, 'Araç')
    .replace(/^§/g, '')
    .trim();

  return s;
}

function normalizeImageUrl(url) {
  if (!url || typeof url !== 'string') return '';
  url = url.trim();
  const matchFile = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchFile) {
    return `https://lh3.googleusercontent.com/d/${matchFile[1]}`;
  }
  const matchId = url.match(/drive\.google\.com\/[a-zA-Z0-9_/?&=]+(?:id=|\/d\/)([a-zA-Z0-9_-]+)/);
  if (matchId) {
    return `https://lh3.googleusercontent.com/d/${matchId[1]}`;
  }
  return url;
}

function translateCategory(category, targetLang) {
  const cleanCat = fixMojikake(category);
  const normCat = normalizeCategoryName(cleanCat);
  if (categoryTranslations[normCat] && categoryTranslations[normCat][targetLang]) {
    return categoryTranslations[normCat][targetLang];
  }
  if (targetLang === 'tr') return normCat;
  const parts = normCat.split(' > ');
  const translatedParts = parts.map(part => {
    const trimmed = part.trim();
    if (categoryTranslations[trimmed] && categoryTranslations[trimmed][targetLang]) {
      return categoryTranslations[trimmed][targetLang];
    }
    let res = translateProductName(trimmed, targetLang);
    if (targetLang === 'ar' || targetLang === 'en') {
      res = res.replace(/ler$/gi, '').replace(/lar$/gi, '').trim();
    }
    return res;
  });
  return translatedParts.join(' > ');
}

module.exports = { categoryTranslations, termTranslations, uiTranslations, translateProductName, translateCategory, normalizeCategoryName, fixMojikake, normalizeImageUrl };
