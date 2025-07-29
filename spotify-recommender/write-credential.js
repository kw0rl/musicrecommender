// write-credential.js
const fs = require('fs');
const path = require('path');

// Try to get credentials from either environment variable
let cred = process.env.GOOGLE_CREDENTIALS_JSON || process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!cred) {
  console.error('Neither GOOGLE_CREDENTIALS_JSON nor GOOGLE_APPLICATION_CREDENTIALS is set');
  process.exit(1);
}

// If GOOGLE_APPLICATION_CREDENTIALS is a file path, read the file
if (cred.startsWith('./') || cred.startsWith('/') || cred.includes('.json')) {
  console.log('GOOGLE_APPLICATION_CREDENTIALS appears to be a file path, reading file...');
  try {
    if (fs.existsSync(cred)) {
      cred = fs.readFileSync(cred, 'utf8');
    } else {
      console.error('Credentials file does not exist:', cred);
      process.exit(1);
    }
  } catch (error) {
    console.error('Error reading credentials file:', error.message);
    process.exit(1);
  }
}

const filePath = path.join(__dirname, 'config', 'invertible-tree-448008-q4-0116f5ff5e46.json');
fs.mkdirSync(path.dirname(filePath), { recursive: true });
fs.writeFileSync(filePath, cred);
console.log('Google credentials file written:', filePath);