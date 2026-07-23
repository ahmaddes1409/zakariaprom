const API_URL = 'http://www.birikimpromosyon.com/api/json/';
const HASH = '655af889baa94a38ae39ec4703be2021';
const SITE_URL = 'zakariaprom.com';
const EMAIL = 'info@karmedya.com';

async function inspectItem() {
  const payload = { ebayi_eposta: EMAIL, hash: HASH, tip: 'tum_urunler' };
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': SITE_URL },
    body: JSON.stringify(payload)
  });
  const json = await res.json();
  if (Array.isArray(json) && json.length > 0) {
    console.log('Sample Item Keys & Values:', json[0]);
    console.log('\nSample Item 2 Keys & Values:', json[1]);
  }
}

inspectItem().catch(console.error);
