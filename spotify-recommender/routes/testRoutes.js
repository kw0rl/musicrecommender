// Test routes
const express = require('express');
const router = express.Router();

// Test endpoint to verify the route is working
router.get('/ping', (req, res) => {
  res.json({ message: 'Test routes are working!', timestamp: new Date() });
});

module.exports = router;
