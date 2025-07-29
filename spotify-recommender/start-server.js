// start-server.js
const { execSync } = require('child_process');
require('./write-credential.js');
execSync('node server.js', { stdio: 'inherit' });
