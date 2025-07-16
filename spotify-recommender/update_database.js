// update_database.js - Script to update the users table status column
const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateDatabase() {
    let connection;
    
    try {
        // Create connection using your existing database configuration
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'music_recommender',
            ssl: process.env.DB_HOST && process.env.DB_HOST.includes('ondigitalocean.com') ? {
                rejectUnauthorized: false
            } : false
        });

        console.log('Connected to database successfully!');

        // First, let's check the current table structure
        console.log('\nCurrent table structure:');
        const [tableInfo] = await connection.execute('DESCRIBE users');
        console.table(tableInfo);

        // Check current status values
        console.log('\nCurrent status distribution:');
        const [statusCount] = await connection.execute('SELECT status, COUNT(*) as count FROM users GROUP BY status');
        console.table(statusCount);

        // Update the status column to include 'inactive'
        console.log('\nUpdating status column to include "inactive"...');
        
        try {
            // Try to alter the column assuming it's an ENUM
            await connection.execute(`
                ALTER TABLE users 
                MODIFY COLUMN status ENUM('active', 'inactive', 'pending_approval') 
                DEFAULT 'active'
            `);
            console.log('✅ Successfully updated status column as ENUM');
        } catch (enumError) {
            console.log('ENUM update failed, trying VARCHAR approach...');
            
            // If ENUM fails, try VARCHAR
            await connection.execute(`
                ALTER TABLE users 
                MODIFY COLUMN status VARCHAR(20) 
                DEFAULT 'active'
            `);
            console.log('✅ Successfully updated status column as VARCHAR');
        }

        // Verify the update
        console.log('\nUpdated table structure:');
        const [newTableInfo] = await connection.execute('DESCRIBE users');
        console.table(newTableInfo);

        console.log('\n✅ Database update completed successfully!');
        console.log('You can now use "inactive" status for users.');

    } catch (error) {
        console.error('❌ Error updating database:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('Database connection closed.');
        }
    }
}

// Run the update
updateDatabase();
