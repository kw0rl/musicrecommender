// setup_production_database.js - Setup production database schema
const mysql = require('mysql2/promise');
require('dotenv').config();

async function setupProductionDatabase() {
    let connection;
    
    try {
        // Connect to DigitalOcean Managed Database
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT || 25060,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            ssl: {
                rejectUnauthorized: false
            }
        });

        console.log('✅ Connected to DigitalOcean Managed Database successfully!');

        // Create users table with all required columns
        console.log('\n📋 Creating users table...');
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(100) NOT NULL UNIQUE,
                email VARCHAR(255) NOT NULL UNIQUE,
                google_id VARCHAR(255) UNIQUE,
                auth_provider ENUM('local', 'google') DEFAULT 'local',
                password_hash VARCHAR(255),
                role ENUM('user', 'admin') DEFAULT 'user',
                status ENUM('active', 'inactive', 'pending_approval') DEFAULT 'active',
                spotify_access_token TEXT,
                spotify_refresh_token TEXT,
                spotify_token_expires_at DATETIME,
                profile_image VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_email (email),
                INDEX idx_google_id (google_id),
                INDEX idx_username (username),
                INDEX idx_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ Users table created successfully!');

        // Create playlists table if needed
        console.log('\n📋 Creating playlists table...');
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS playlists (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                spotify_playlist_id VARCHAR(100),
                is_public BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_user_id (user_id),
                INDEX idx_spotify_playlist_id (spotify_playlist_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ Playlists table created successfully!');

        // Create emotion_detections table for tracking emotion detection history
        console.log('\n📋 Creating emotion_detections table...');
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS emotion_detections (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                detected_emotion VARCHAR(50) NOT NULL,
                confidence_score DECIMAL(5,4),
                image_path VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
                INDEX idx_user_id (user_id),
                INDEX idx_emotion (detected_emotion),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ Emotion detections table created successfully!');

        // Create password_resets table for password reset functionality
        console.log('\n📋 Creating password_resets table...');
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS password_resets (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) NOT NULL,
                token VARCHAR(255) NOT NULL,
                expires_at DATETIME NOT NULL,
                used BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_email (email),
                INDEX idx_token (token),
                INDEX idx_expires_at (expires_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ Password resets table created successfully!');

        // Verify tables were created
        console.log('\n🔍 Verifying database structure...');
        const [tables] = await connection.execute('SHOW TABLES');
        console.log('📊 Tables in database:');
        tables.forEach(table => {
            console.log(`   - ${Object.values(table)[0]}`);
        });

        // Check users table structure
        console.log('\n📋 Users table structure:');
        const [columns] = await connection.execute('DESCRIBE users');
        columns.forEach(col => {
            console.log(`   ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `(${col.Key})` : ''}`);
        });

        console.log('\n🎉 Production database setup completed successfully!');
        console.log('\n📝 Next steps:');
        console.log('1. Update your backend environment variables in DigitalOcean App Platform');
        console.log('2. Redeploy your backend service');
        console.log('3. Test the database connection');

    } catch (error) {
        console.error('❌ Database setup error:', error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n📊 Database connection closed.');
        }
    }
}

// Run the setup
setupProductionDatabase();
