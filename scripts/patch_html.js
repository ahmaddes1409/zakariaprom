const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
const code = fs.readFileSync(htmlPath, 'utf8');

console.log('index.html length:', code.length);
console.log('Contains /api/contact in index.html:', code.includes('/api/contact'));

let pos = 0;
while ((pos = code.indexOf('onSubmit', pos)) !== -1) {
  console.log(`[onSubmit at ${pos}]:`, code.substring(Math.max(0, pos - 100), Math.min(code.length, pos + 250)));
  pos += 8;
}
