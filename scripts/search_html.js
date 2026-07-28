const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
const code = fs.readFileSync(htmlPath, 'utf8');

const targets = ['Mesajınız', 'Your message', 'setFormData', 'toast', 'contact.send', 'contact.title', 'preventDefault'];

for (const t of targets) {
  let pos = 0;
  let count = 0;
  while ((pos = code.indexOf(t, pos)) !== -1) {
    count++;
    if (count <= 3) {
      console.log(`[Found "${t}" at ${pos}]:`, code.substring(Math.max(0, pos - 80), Math.min(code.length, pos + 150)));
    }
    pos += t.length;
  }
  console.log(`Total "${t}": ${count}`);
}
