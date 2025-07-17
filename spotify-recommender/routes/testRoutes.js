const express = require('express');
const router = express.Router();
const pool = require('../db');

// Test database connection endpoint
router.get('/db-test', async (req, res) => {
  console.log('Testing database connection from App Platform...');
  
  try {
    // Try to get a connection from the pool
    const connection = await pool.getConnection();
    console.log('✅ Database connection successful from App Platform!');
    
    // Test a simple query
    const [rows] = await connection.execute('SELECT 1 as test, NOW() as current_time');
    console.log('✅ Query test successful:', rows);
    
    // Release the connection back to the pool
    connection.release();
    
    res.json({
      success: true,
      message: 'Database connection successful!',
      data: rows,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Database connection failed from App Platform:', error.message);
    console.error('Error code:', error.code);
    console.error('Error number:', error.errno);
    
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code,
      errno: error.errno,
      timestamp: new Date().toISOString()
    });
  }
});

// Test basic server health
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

module.exports = router;
