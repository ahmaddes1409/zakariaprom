const fs = require('fs');
const path = require('path');

const adminJs = path.join(__dirname, '..', 'public', 'admin.js');
let code = fs.readFileSync(adminJs, 'utf8');

console.log('Searching for optional chaining in public/admin.js...');

let pos = 0;
let count = 0;
while ((pos = code.indexOf('?.', pos)) !== -1) {
  count++;
  console.log(`[Found ?. at ${pos}]:`, code.substring(Math.max(0, pos - 40), Math.min(code.length, pos + 40)));
  pos += 2;
}

console.log(`Total ?. found: ${count}`);
