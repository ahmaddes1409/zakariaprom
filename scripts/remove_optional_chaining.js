const fs = require('fs');
const path = require('path');

const adminJs = path.join(__dirname, '..', 'public', 'admin.js');
let code = fs.readFileSync(adminJs, 'utf8');

code = code.replace(/\(data && data\.total\)Pages/g, '(data && data.totalPages)');
fs.writeFileSync(adminJs, code, 'utf8');
console.log('Fixed regex typo in public/admin.js!');
