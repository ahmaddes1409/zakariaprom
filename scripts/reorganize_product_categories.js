const database = require('../src/database');
const { fixMojikake } = require('../src/translations');

async function reorganize() {
  await database.initDatabaseAsync();
  database.initializeDatabase();
  const db = database.db;

  console.log('Reorganizing product categories in database...');

  const rows = db.prepare('SELECT id, product_id, name_tr, category_tr, category_ar, category_en FROM local_products').all();
  let updatedCount = 0;

  for (const r of rows) {
    const nameTr = fixMojikake(r.name_tr || '').toLowerCase();
    const origCatTr = fixMojikake(r.category_tr || '');

    let newCatTr = origCatTr;
    let newCatAr = r.category_ar;
    let newCatEn = r.category_en;

    // 1. PENS SEPARATION
    if (origCatTr === 'Kalemler' || origCatTr === 'Promosyon Kalemler' || origCatTr === 'Promosyon Kalem' || origCatTr.includes('Kalem')) {
      if (nameTr.includes('metal') || nameTr.includes('roller') || nameTr.includes('lüks') || nameTr.includes('luks') || origCatTr.includes('Metal')) {
        newCatTr = 'Metal Kalemler';
        newCatAr = 'أقلام معدنية';
        newCatEn = 'Metal Pens';
      } else if (nameTr.includes('kurşun') || nameTr.includes('kursun') || nameTr.includes('bambu') || nameTr.includes('ahşap') || origCatTr.includes('Kurşun')) {
        newCatTr = 'Kurşun Kalemler';
        newCatAr = 'أقلام رصاص';
        newCatEn = 'Pencils';
      } else if (nameTr.includes('dokunmatik') || origCatTr.includes('Dokunmatik')) {
        newCatTr = 'Dokunmatik Ekran Kalemleri';
        newCatAr = 'أقلام شاشة لمس';
        newCatEn = 'Touchscreen Pens';
      } else {
        newCatTr = 'Plastik Kalemler';
        newCatAr = 'أقلام بلاستيكية';
        newCatEn = 'Plastic Pens';
      }
    }

    // 2. AGENDAS & NOTEBOOKS SEPARATION
    else if (origCatTr.includes('Ajanda') || origCatTr.includes('Defter') || origCatTr.includes('Notluk') || origCatTr.includes('Bloknot')) {
      if (nameTr.includes('tarihli') || nameTr.includes('2026') || nameTr.includes('2025') || origCatTr.includes('Tarihli') || origCatTr.includes('2026')) {
        newCatTr = 'Tarihli Ajandalar';
        newCatAr = 'أجندات مؤرخة';
        newCatEn = 'Dated Agendas';
      } else if (nameTr.includes('ajanda') || origCatTr.startsWith('Ajanda')) {
        newCatTr = 'Ajandalar';
        newCatAr = 'أجندات';
        newCatEn = 'Agendas';
      } else {
        newCatTr = 'Defterler';
        newCatAr = 'دفاتر ملاحظات';
        newCatEn = 'Notebooks';
      }
    }

    // 3. KEYCHAINS & BADGES SEPARATION
    else if (origCatTr.includes('Anahtarlık') || origCatTr.includes('Rozet')) {
      if (nameTr.includes('rozet') || origCatTr === 'Rozetler') {
        newCatTr = 'Rozetler';
        newCatAr = 'شارات';
        newCatEn = 'Badges';
      } else {
        newCatTr = 'Anahtarlıklar';
        newCatAr = 'ميداليات';
        newCatEn = 'Keychains';
      }
    }

    // 4. THERMOS & MUG SEPARATION
    else if (origCatTr.includes('Termos') || origCatTr.includes('Matara') || origCatTr.includes('Mug')) {
      if (nameTr.includes('matara') || origCatTr.includes('Matara')) {
        newCatTr = 'Mataralar';
        newCatAr = 'قوارير مياه';
        newCatEn = 'Water Bottles';
      } else if (nameTr.includes('bardak') || nameTr.includes('kupa') || origCatTr.includes('Mug')) {
        newCatTr = 'Termos Bardaklar (Mug)';
        newCatAr = 'أكواب حرارية';
        newCatEn = 'Thermal Mugs';
      } else {
        newCatTr = 'Termoslar';
        newCatAr = 'ترمسات';
        newCatEn = 'Thermoses';
      }
    }

    if (newCatTr !== origCatTr || newCatAr !== r.category_ar || newCatEn !== r.category_en) {
      db.prepare('UPDATE local_products SET category_tr = ?, category_ar = ?, category_en = ? WHERE id = ?')
        .run(newCatTr, newCatAr, newCatEn, r.id);
      updatedCount++;
    }
  }

  database.saveDatabase();
  console.log(`Reorganized ${updatedCount} products into precise, strict categories!`);
}

reorganize().catch(console.error);
