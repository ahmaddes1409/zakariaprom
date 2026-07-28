const fs = require('fs');
const path = require('path');

const bundlePath = path.join(__dirname, '..', 'public', 'assets', 'index-BZxkpalB.js');
const code = fs.readFileSync(bundlePath, 'utf8');

console.log('Contains /api/contact:', code.includes('/api/contact'));
const idx = code.indexOf('/api/contact');
if (idx !== -1) {
  console.log('Snippet around /api/contact:', code.substring(idx - 50, idx + 100));
}
