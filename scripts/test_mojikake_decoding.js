function cleanMojikake(str) {
  if (!str || typeof str !== 'string') return str || '';
  
  let s = str;

  // Step 1: Fix byte-level corruptions and replacements
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
    .replace(/Ã\u009f/g, 'ß')
    .replace(/Ã\u00A0/g, 'à')
    .replace(/Ã\u00A1/g, 'á')
    .replace(/Ã\u00A2/g, 'â')
    .replace(/Ã\u00A3/g, 'ã')
    .replace(/Ã\u00A4/g, 'ä')
    .replace(/Ã\u00A5/g, 'å')
    .replace(/Ã\u00A6/g, 'æ')
    .replace(/Ã\u00A7/g, 'ç')
    .replace(/Ã\u00A8/g, 'è')
    .replace(/Ã\u00A9/g, 'é')
    .replace(/Ã\u00AA/g, 'ê')
    .replace(/Ã\u00AB/g, 'ë')
    .replace(/Ã\u00AC/g, 'ì')
    .replace(/Ã\u00AD/g, 'í')
    .replace(/Ã\u00AE/g, 'î')
    .replace(/Ã\u00AF/g, 'ï')
    .replace(/Ã\u00B0/g, 'ð')
    .replace(/Ã\u00B1/g, 'ñ')
    .replace(/Ã\u00B2/g, 'ò')
    .replace(/Ã\u00B3/g, 'ó')
    .replace(/Ã\u00B4/g, 'ô')
    .replace(/Ã\u00B5/g, 'õ')
    .replace(/Ã\u00B6/g, 'ö')
    .replace(/Ã\u00B7/g, '÷')
    .replace(/Ã\u00B8/g, 'ø')
    .replace(/Ã\u00B9/g, 'ù')
    .replace(/Ã\u00BA/g, 'ú')
    .replace(/Ã\u00BB/g, 'û')
    .replace(/Ã\u00BC/g, 'ü')
    .replace(/Ã\u00BD/g, 'ý')
    .replace(/Ã\u00BE/g, 'þ')
    .replace(/Ã\u00BF/g, 'ÿ')
    .replace(/§Çeşitli/g, 'Çeşitli')
    .replace(/§ÃǂeÅŸitli/g, 'Çeşitli')
    .replace(/§ÃǂeÅŸitli AraÃ§ GereÃĂ/g, 'Çeşitli Araç Gereç')
    .replace(/AraÃ§/g, 'Araç')
    .replace(/GereÃĂ/g, 'Gereç')
    .replace(/GereÃ§/g, 'Gereç')
    .replace(/^§/g, '');

  return s;
}

const testCases = [
  '§ÃǂeÅŸitli AraÃ§ GereÃĂ',
  'Seramik - Cam ÃœrÃ¼nler',
  'MasaÃœstÃ¼ ÃœrÃ¼nler',
  'Ãǂakmaklar',
  'Ãǂanta',
  'Matbaa ÃœrÃ¼nleri',
  'DeskÃœstÃ¼ ÃœrÃ¼n',
  'ÃœrÃ¼n زجاج - سيراميك'
];

console.log('--- MOJIKAKE FIX TEST RESULTS ---');
for (const tc of testCases) {
  console.log(`BEFORE: "${tc}"`);
  console.log(`AFTER : "${cleanMojikake(tc)}"`);
  console.log('---');
}
