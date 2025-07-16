// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const dbPool = require('../db');
require('dotenv').config(); // For JWT_SECRET access

module.exports = async function(req, res, next) {
  // 1. Get token from 'Authorization' header
  const authHeader = req.header('Authorization');

  // 2. Check if there's no token
  if (!authHeader) {
    return res.status(401).json({ msg: 'No token, authentication failed. Please log in.' });
  }

  // Token is expected in format "Bearer <token>"
  // Example: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  const tokenParts = authHeader.split(' ');

  if (tokenParts.length !== 2 || tokenParts[0].toLowerCase() !== 'bearer') {
    return res.status(401).json({ msg: 'Invalid token format. Required "Bearer <token>"' });
  }

  const token = tokenParts[1];

  // If token exists, but is empty (example: "Bearer ")
  if (!token) {
    return res.status(401).json({ msg: 'Token not included after "Bearer". Authentication failed.' });
  }

  // 3. Verify token
  try {
    // jwt.verify will check token validity and also whether it has expired.
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // If token is valid, 'decoded' will contain the payload we put when signing the token.
    // In our case, payload is: { user: { id: ..., username: ... } }
    
    // Check if user still exists and is active
    const [users] = await dbPool.query('SELECT id, username, role, status FROM users WHERE id = ?', [decoded.user.id]);
    
    if (users.length === 0) {
      return res.status(401).json({ msg: 'User account no longer exists.' });
    }
    
    const user = users[0];
    
    // Check if user account is active
    if (user.status === 'inactive') {
      return res.status(403).json({ msg: 'Account has been deactivated. Please contact administrator.' });
    }
    
    if (user.status === 'pending_approval') {
      return res.status(403).json({ msg: 'Account is pending approval. Please wait for administrator approval.' });
    }
    
    // We put this user information into the 'req' object so route handlers can access it.
    req.user = decoded.user;

    next(); // Continue to next middleware or route handler
  } catch (err) {
    // Handle errors if token is invalid or expired
    console.error('Error during token authentication:', err.message);
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ msg: 'Invalid token.' });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ msg: 'Token has expired. Please log in again.' });
    }
    // Other server errors
    res.status(500).json({ msg: 'Server error during token authentication.' });
  }
};