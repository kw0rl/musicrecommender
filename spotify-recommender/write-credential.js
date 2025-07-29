// write-credential.js
const fs = require('fs');
const path = require('path');

const cred = process.env.GOOGLE_CREDENTIALS_JSON;
if (!cred) {
  console.error('GOOGLE_CREDENTIALS_JSON not set');
  process.exit(1);
}

const filePath = path.join(__dirname, 'config', 'invertible-tree-448008-q4-0116f5ff5e46.json');
fs.mkdirSync(path.dirname(filePath), { recursive: true });
fs.writeFileSync(filePath, cred);
console.log('Google credentials file written:', filePath);