// write-credential.js
// This script writes the Google Cloud Vision credential from env to a file for use in production.

const fs = require('fs');
const path = require('path');

const credentialJson = process.env.GOOGLE_CREDENTIALS_JSON;
const outputPath = path.join(__dirname, 'config', 'invertible-tree-448008-q4-0116f5ff5e46.json');

if (!credentialJson) {
  console.error('GOOGLE_CREDENTIALS_JSON environment variable not set.');
  process.exit(1);
}

// Ensure config directory exists
fs.mkdirSync(path.dirname(outputPath), { recursive: true });

// Write the credential file
fs.writeFileSync(outputPath, credentialJson);
console.log('Google Cloud Vision credential written to', outputPath);
