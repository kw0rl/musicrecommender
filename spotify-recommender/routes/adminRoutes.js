// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const dbPool = require('../db');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// === DIKEMAS KINI: GET /api/admin/users - Dapatkan senarai semua pengguna ===
router.get('/users', [authMiddleware, adminMiddleware], async (req, res) => {
    try {
        // Kueri SELECT kini mengambil lajur 'status' juga
        const [users] = await dbPool.query(
          'SELECT id, username, email, role, status, created_at FROM users ORDER BY id ASC'
        );
        res.json(users);
    } catch (err) {
        console.error('Ralat semasa mendapatkan senarai pengguna (admin):', err.message);
        res.status(500).json({ msg: 'Ralat pada server' });
    }
});

// === DIKEMAS KINI: POST /api/admin/users - Admin mencipta pengguna baru ===
router.post(
  '/users',
  [authMiddleware, adminMiddleware],
  [ 
    body('username', 'Nama pengguna diperlukan').notEmpty().trim().escape(),
    body('email', 'Sila masukkan emel yang sah').isEmail().normalizeEmail(),
    body('password', 'Kata laluan perlu sekurang-kurangnya 6 aksara').isLength({ min: 6 }),
    body('role', 'Peranan tidak sah').notEmpty().isIn(['user', 'admin'])
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password, role } = req.body;
    // Menetapkan status berdasarkan peranan
    const status = (role === 'admin') ? 'pending_approval' : 'active'; 

    try {
      const [existingUsers] = await dbPool.query('SELECT username, email FROM users WHERE username = ? OR email = ?', [username, email]);
      if (existingUsers.length > 0) {
        return res.status(400).json({ msg: 'Nama pengguna atau emel sudah wujud.' });
      }
      
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);

      // Kueri INSERT kini menyimpan 'status'
      const [result] = await dbPool.query(
        'INSERT INTO users (username, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
        [username, email, password_hash, role, status]
      );

      res.status(201).json({
        msg: 'Pengguna baru berjaya dicipta oleh admin.',
        user: { id: result.insertId, username, email, role, status }
      });
    } catch (err) {
      console.error('Ralat semasa admin mencipta pengguna:', err.message);
      res.status(500).json({ msg: 'Ralat pada server' });
    }
  }
);

// === KOD SEDIA ADA: PUT /api/admin/users/:id - Admin mengemas kini pengguna ===
router.put(
  '/users/:id',
  [authMiddleware, adminMiddleware],
  [
    body('username', 'Nama pengguna tidak boleh kosong jika dihantar').optional().notEmpty().trim().escape(),
    body('email', 'Sila masukkan emel yang sah').optional().isEmail().normalizeEmail(),
    body('password', 'Kata laluan perlu sekurang-kurangnya 6 aksara').optional().isLength({ min: 6 }),
    body('role', 'Peranan tidak sah').optional().isIn(['user', 'admin'])
  ],
  async (req, res) => {
    const { id } = req.params;
    const { username, email, password, role } = req.body;
    try {
      const [users] = await dbPool.query('SELECT * FROM users WHERE id = ?', [id]);
      if (users.length === 0) {
        return res.status(404).json({ msg: 'Pengguna tidak ditemui.' });
      }
      const userToUpdate = users[0];

      if (username && username !== userToUpdate.username) {
        const [existing] = await dbPool.query('SELECT id FROM users WHERE username = ?', [username]);
        if (existing.length > 0) return res.status(400).json({ msg: 'Nama pengguna baru telah digunakan.' });
      }
      if (email && email !== userToUpdate.email) {
        const [existing] = await dbPool.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) return res.status(400).json({ msg: 'Emel baru telah digunakan.' });
      }
      
      const updateFields = [];
      const params = [];
      if (username) { updateFields.push('username = ?'); params.push(username); }
      if (email) { updateFields.push('email = ?'); params.push(email); }
      if (role) { updateFields.push('role = ?'); params.push(role); }
      if (password) {
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);
        updateFields.push('password_hash = ?');
        params.push(password_hash);
      }
      
      if (updateFields.length === 0) {
        return res.status(400).json({ msg: 'Tiada maklumat untuk dikemas kini.' });
      }
      params.push(id);
      
      const updateQuery = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
      await dbPool.query(updateQuery, params);
      
      const [updatedUsers] = await dbPool.query('SELECT id, username, email, role, status, created_at, updated_at FROM users WHERE id = ?', [id]);
      res.json({
        msg: 'Maklumat pengguna berjaya dikemas kini.',
        user: updatedUsers[0]
      });
    } catch (err) {
      console.error('Ralat semasa admin mengemas kini pengguna:', err.message);
      res.status(500).json({ msg: 'Ralat pada server' });
    }
  }
);

// === KOD SEDIA ADA: DELETE /api/admin/users/:id - Admin memadam pengguna ===
router.delete('/users/:id', [authMiddleware, adminMiddleware], async (req, res) => {
    const { id } = req.params;
    try {
        const [users] = await dbPool.query('SELECT * FROM users WHERE id = ?', [id]);
        if (users.length === 0) {
            return res.status(404).json({ msg: 'Pengguna tidak ditemui.' });
        }
        if (parseInt(id, 10) === req.user.id) {
            return res.status(400).json({ msg: 'Admin tidak boleh memadam akaun mereka sendiri.' });
        }
        await dbPool.query('DELETE FROM users WHERE id = ?', [id]);
        res.json({ msg: `Pengguna dengan ID ${id} berjaya dipadam.` });
    } catch (err) {
        console.error('Ralat semasa admin memadam pengguna:', err.message);
        res.status(500).json({ msg: 'Ralat pada server' });
    }
});

// ---- ENDPOINT BARU DITAMBAH: Dapatkan senarai pengguna yang menunggu kelulusan ----
// GET /api/admin/pending-users
router.get('/pending-users', [authMiddleware, adminMiddleware], async (req, res) => {
    try {
        const [pendingUsers] = await dbPool.query(
            "SELECT id, username, email, role, created_at FROM users WHERE status = 'pending_approval' ORDER BY created_at ASC"
        );
        res.json(pendingUsers);
    } catch (err) {
        console.error('Ralat mendapatkan pengguna menunggu kelulusan:', err.message);
        res.status(500).json({ msg: 'Ralat pada server' });
    }
});
// ---------------------------------------------------------------------------------

// ---- ENDPOINT BARU DITAMBAH: Admin meluluskan pengguna ----
// PUT /api/admin/approve-user/:id
router.put('/approve-user/:id', [authMiddleware, adminMiddleware], async (req, res) => {
    const { id } = req.params;
    try {
        const [users] = await dbPool.query(
            "SELECT * FROM users WHERE id = ? AND status = 'pending_approval'", 
            [id]
        );
        if (users.length === 0) {
            return res.status(404).json({ msg: 'Pengguna menunggu kelulusan dengan ID ini tidak ditemui.' });
        }
        await dbPool.query(
            "UPDATE users SET status = 'active' WHERE id = ?",
            [id]
        );
        res.json({ msg: `Pengguna dengan ID ${id} berjaya diluluskan dan kini aktif.` });
    } catch (err) {
        console.error('Ralat semasa meluluskan pengguna:', err.message);
        res.status(500).json({ msg: 'Ralat pada server' });
    }
});
// ---------------------------------------------------------------------------------

// ---- ENDPOINT BARU DITAMBAH: Admin toggle user active/inactive status ----
// PUT /api/admin/toggle-user-status/:id
router.put('/toggle-user-status/:id', [authMiddleware, adminMiddleware], async (req, res) => {
    const { id } = req.params;
    try {
        // Check if user exists
        const [users] = await dbPool.query('SELECT * FROM users WHERE id = ?', [id]);
        if (users.length === 0) {
            return res.status(404).json({ msg: 'User not found.' });
        }

        const user = users[0];
        
        // Prevent admin from deactivating themselves
        if (parseInt(id, 10) === req.user.id) {
            return res.status(400).json({ msg: 'Admin cannot deactivate their own account.' });
        }

        // Only allow toggling between active and inactive (don't affect pending_approval)
        if (user.status === 'pending_approval') {
            return res.status(400).json({ msg: 'Cannot toggle status of users pending approval. Please approve them first.' });
        }

        // Toggle status between 'active' and 'inactive'
        const newStatus = user.status === 'active' ? 'inactive' : 'active';
        
        console.log(`Toggling user ${user.username} (ID: ${id}) from ${user.status} to ${newStatus}`);
        
        await dbPool.query(
            "UPDATE users SET status = ? WHERE id = ?",
            [newStatus, id]
        );

        const statusText = newStatus === 'active' ? 'activated' : 'deactivated';
        res.json({ 
            msg: `User ${user.username} has been ${statusText}.`,
            newStatus: newStatus
        });
    } catch (err) {
        console.error('Error toggling user status:', err.message);
        console.error('Error details:', err);
        res.status(500).json({ 
            msg: 'Server error while toggling user status.',
            error: err.message 
        });
    }
});
// ---------------------------------------------------------------------------------

module.exports = router;