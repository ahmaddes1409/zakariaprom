const fs = require('fs');
const path = require('path');

const bundlePath = path.join(__dirname, '..', 'public', 'assets', 'index-BZxkpalB.js');
let code = fs.readFileSync(bundlePath, 'utf8');

const oldStr = `onSubmit:t=>{t.preventDefault(),le.success(e===\`ar\`?\`تم إرسال رسالتك بنجاح! سنتواصل معك قريباً.\`:e===\`tr\`?\`Mesajınız başarıyla gönderildi! En kısa sürede size dönüş yapacağız.\`:\`Your message has been sent successfully! We will contact you soon.\`),i({name:\`\`,email:\`\`,message:\`\`})}`;

const newStr = `onSubmit:async t=>{t.preventDefault();try{fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(r)});le.success(e===\`ar\`?\`تم إرسال رسالتك وعرض السعر بنجاح إلى البريد الإلكتروني! سنتواصل معك قريباً.\`:e===\`tr\`?\`Mesajınız ve teklif talebiniz başarıyla gönderildi!\`:\`Your quote request has been sent successfully!\`);i({name:\`\`,email:\`\`,message:\`\`})}catch(err){le.error(e===\`ar\`?\`حدث خطأ أثناء الإرسال\`:\`Failed to send message\`)}}`;

if (!code.includes(oldStr)) {
  console.error('ERROR: oldStr not found!');
  process.exit(1);
}

code = code.replace(oldStr, newStr);
fs.writeFileSync(bundlePath, code, 'utf8');
console.log('SUCCESS: Patched public/assets/index-BZxkpalB.js successfully!');
