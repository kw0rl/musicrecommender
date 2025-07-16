// password_reset_migration.js - Add password reset functionality to database
const mysql = require('mysql2/promise');
require('dotenv').config();

async function addPasswordResetColumns() {
    let connection;
    
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'music_recommender'
        });

        console.log('Connected to database successfully!');

        // Add password reset columns
        console.log('\nAdding password reset columns...');
        
        await connection.execute(`
            ALTER TABLE users 
            ADD COLUMN reset_token VARCHAR(255) NULL,
            ADD COLUMN reset_token_expires DATETIME NULL
        `);
        
        console.log('✅ Successfully added password reset columns');

        // Verify the update
        console.log('\nUpdated table structure:');
        const [tableInfo] = await connection.execute('DESCRIBE users');
        console.table(tableInfo);

        console.log('\n✅ Password reset migration completed successfully!');

    } catch (error) {
        if (error.message.includes('Duplicate column name')) {
            console.log('✅ Password reset columns already exist');
        } else {
            console.error('❌ Error updating database:', error.message);
        }
    } finally {
        if (connection) {
            await connection.end();
            console.log('Database connection closed.');
        }
    }
}

addPasswordResetColumns();
