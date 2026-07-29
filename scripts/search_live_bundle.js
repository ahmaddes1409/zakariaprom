const fs = require('fs');
const liveContentPath = "C:\\Users\\imac\\.gemini\\antigravity-ide\\brain\\57f91c34-7ad6-47e2-80ba-eb34e345b86e\\.system_generated\\steps\\6355\\content.md";
const content = fs.readFileSync(liveContentPath, 'utf8');

console.log('File size:', content.length);
let pos = 0;
while ((pos = content.indexOf('onSubmit', pos)) !== -1) {
  console.log(`[onSubmit at ${pos}]:`, content.substring(Math.max(0, pos - 60), Math.min(content.length, pos + 180)));
  pos += 8;
}
