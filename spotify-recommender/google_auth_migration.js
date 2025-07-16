// google_auth_migration.js - Add Google OAuth support to users table
const mysql = require('mysql2/promise');
require('dotenv').config();

async function addGoogleAuthSupport() {
    let connection;
    
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'music_recommender'
        });

        console.log('Connected to database successfully!');

        // Add Google OAuth columns
        console.log('\nAdding Google OAuth support columns...');
        
        try {
            // Add google_id column
            await connection.execute(`
                ALTER TABLE users 
                ADD COLUMN google_id VARCHAR(255) UNIQUE AFTER email
            `);
            console.log('✅ Added google_id column');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️ google_id column already exists');
            } else {
                throw error;
            }
        }

        try {
            // Add auth_provider column
            await connection.execute(`
                ALTER TABLE users 
                ADD COLUMN auth_provider ENUM('local', 'google') DEFAULT 'local' AFTER google_id
            `);
            console.log('✅ Added auth_provider column');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️ auth_provider column already exists');
            } else {
                throw error;
            }
        }

        try {
            // Make password_hash nullable (Google users don't need passwords)
            await connection.execute(`
                ALTER TABLE users 
                MODIFY COLUMN password_hash VARCHAR(255) NULL
            `);
            console.log('✅ Made password_hash nullable for Google users');
        } catch (error) {
            console.log('ℹ️ password_hash modification skipped:', error.message);
        }

        // Update existing users to have 'local' auth provider
        const [result] = await connection.execute(`
            UPDATE users 
            SET auth_provider = 'local' 
            WHERE auth_provider IS NULL OR auth_provider = ''
        `);
        console.log(`✅ Updated ${result.affectedRows} existing users to 'local' auth provider`);

        // Show final table structure
        console.log('\nFinal table structure:');
        const [tableInfo] = await connection.execute('DESCRIBE users');
        console.table(tableInfo);

        console.log('\n✅ Google OAuth database migration completed successfully!');

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

// Run the migration
addGoogleAuthSupport();
