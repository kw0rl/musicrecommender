const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

async function importDatabase() {
  console.log('Starting database import to defaultdb...');
  
  try {
    // Connect directly to defaultdb
    const connectionConfig = {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME, // This will be 'defaultdb'
      ssl: {
        rejectUnauthorized: false
      },
      connectTimeout: 60000,
      multipleStatements: true // Allow multiple SQL statements
    };

    console.log('Connecting to DigitalOcean defaultdb database...');
    const connection = await mysql.createConnection(connectionConfig);
    console.log('✅ Connected successfully to defaultdb!');

    // Check if backup file exists
    const backupFile = 'database_backup.sql';
    if (!fs.existsSync(backupFile)) {
      console.log('❌ Backup file not found. Please export your database first.');
      console.log('Expected file: database_backup.sql');
      return;
    }

    // Read the SQL backup file
    console.log('Reading backup file...');
    let sqlContent = fs.readFileSync(backupFile, 'utf8');
    
    // Remove any CREATE DATABASE and USE statements since we're using defaultdb
    sqlContent = sqlContent.replace(/CREATE DATABASE.*?;/gi, '');
    sqlContent = sqlContent.replace(/USE `.*?`;/gi, '');
    sqlContent = sqlContent.replace(/USE .*?;/gi, '');
    
    console.log('Importing database structure and data into defaultdb...');
    await connection.query(sqlContent);
    console.log('✅ Database imported successfully into defaultdb!');

    // Verify the import
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('✅ Tables imported:', tables.map(t => Object.values(t)[0]));

    // Check user table specifically
    const [userCount] = await connection.execute('SELECT COUNT(*) as count FROM users');
    console.log(`✅ Users table has ${userCount[0].count} records`);

    await connection.end();
    console.log('✅ Import completed successfully into defaultdb!');

  } catch (error) {
    console.error('❌ Import failed:', error.message);
    console.error('Full error:', error);
  }
}

importDatabase();
