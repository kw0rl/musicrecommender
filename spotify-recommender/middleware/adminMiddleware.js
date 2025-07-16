// middleware/adminMiddleware.js

// This middleware should be run AFTER authMiddleware
module.exports = function(req, res, next) {
  // We assume authMiddleware has run and placed req.user
  // req.user should contain { id, username, role } from JWT token
  if (req.user && req.user.role === 'admin') {
    // If user exists and their role is 'admin', allow the request to continue
    next();
  } else {
    // Otherwise, send 403 Forbidden response (Access Denied)
    return res.status(403).json({ msg: 'Access not allowed. This route is for admins only.' });
  }
};