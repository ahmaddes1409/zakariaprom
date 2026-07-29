const fs = require('fs');
const liveContentPath = "C:\\Users\\imac\\.gemini\\antigravity-ide\\brain\\57f91c34-7ad6-47e2-80ba-eb34e345b86e\\.system_generated\\steps\\6355\\content.md";
const content = fs.readFileSync(liveContentPath, 'utf8');

console.log('Live Bundle app-v159.js contains /api/contact:', content.includes('/api/contact'));
const idx = content.indexOf('/api/contact');
if (idx !== -1) {
  console.log('Live Snippet around /api/contact:', content.substring(idx - 60, idx + 120));
}
