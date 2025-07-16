// verify_data.js - Check if data is correctly stored
const mysql = require('mysql2/promise');
require('dotenv').config();

async function verifyData() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'music_recommender',
        ssl: process.env.DB_HOST && process.env.DB_HOST.includes('ondigitalocean.com') ? {
            rejectUnauthorized: false
        } : false
    });

    console.log('=== CHECKING SPECIFIC COLUMNS ===');
    
    // Check role column specifically
    const [roleData] = await connection.execute('SELECT id, username, role FROM users LIMIT 5');
    console.log('\n--- ROLE COLUMN ---');
    console.table(roleData);
    
    // Check created_at column specifically  
    const [dateData] = await connection.execute('SELECT id, username, created_at FROM users LIMIT 5');
    console.log('\n--- CREATED_AT COLUMN ---');
    console.table(dateData);
    
    // Check status column specifically
    const [statusData] = await connection.execute('SELECT id, username, status FROM users LIMIT 5');
    console.log('\n--- STATUS COLUMN ---');
    console.table(statusData);

    await connection.end();
    console.log('\n✅ If the data above looks correct, then the issue is with your database tool display, not the actual data.');
}

verifyData().catch(console.error);
