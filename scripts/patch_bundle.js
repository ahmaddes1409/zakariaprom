const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, '..', 'public', 'assets', 'index-BZxkpalB.js'),
  path.join(__dirname, '..', 'public', 'index.html')
];

for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  console.log(`\n=== File: ${path.basename(f)} (Length: ${content.length}) ===`);

  // Search for form handlers
  let pos = 0;
  while ((pos = content.indexOf('onSubmit', pos)) !== -1) {
    console.log(`[onSubmit at ${pos}]:`, content.substring(Math.max(0, pos - 80), Math.min(content.length, pos + 120)));
    pos += 8;
  }
}
