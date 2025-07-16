// db.js
const mysql = require('mysql2/promise'); // use promise-based API for better async handling
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test connection
pool.getConnection()
  .then(connection => {
    console.log('Successfully connected to MySQL database!');
    connection.release(); // release the connection back to the pool
  })
  .catch(err => {
    console.error('MySQL database connection error:', err);
    // May need to exit application if database is critical
    // process.exit(1);
  });

module.exports = pool;