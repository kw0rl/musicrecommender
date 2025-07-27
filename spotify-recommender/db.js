// db.js
const mysql = require('mysql2/promise'); // use promise-based API for better async handling
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false
  },
  connectTimeout: 60000, // 60 seconds connection timeout
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  idleTimeout: 300000, // 5 minutes
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Test connection with graceful error handling
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Successfully connected to MySQL database!');
    connection.release(); // release the connection back to the pool
  } catch (err) {
    console.error('MySQL database connection error:', err);
    // Don't exit the process - let the server start without database initially
    console.log('Server will continue to run without database connection...');
  }
};

// Test connection asynchronously without blocking server startup
testConnection();

module.exports = pool;