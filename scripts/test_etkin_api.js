const API_URL = 'http://www.birikimpromosyon.com/api/json/';
const HASH = '655af889baa94a38ae39ec4703be2021';
const SITE_URL = 'zakariaprom.com';
const EMAIL = 'info@karmedya.com';

async function testEtkin() {
  console.log(`Testing Etkin API with email: "${EMAIL}"...`);
  
  const payload = {
    ebayi_eposta: EMAIL,
    hash: HASH,
    tip: 'tum_urunler'
  };

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': SITE_URL
    },
    body: JSON.stringify(payload)
  });

  console.log(`Status: ${response.status} ${response.statusText}`);
  const text = await response.text();
  console.log(`Response length:`, text.length);
  console.log(`Response Snippet:`, text.substring(0, 500));

  try {
    const json = JSON.parse(text);
    if (json.Hata) {
      console.log(`\n❌ Error:`, json.Hata);
    } else {
      console.log(`\n🎉 SUCCESS! Items count:`, Array.isArray(json) ? json.length : Object.keys(json).length);
    }
  } catch (e) {
    console.log('Not valid JSON');
  }
}

testEtkin().catch(console.error);
