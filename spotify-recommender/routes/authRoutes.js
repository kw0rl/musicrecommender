// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const dbPool = require('../db'); 
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer'); // Add for image upload
const path = require('path'); // Add for file paths
const fs = require('fs'); // Add for file operations
const crypto = require('crypto'); // Add for generating reset tokens
const { sendPasswordResetEmail } = require('../services/emailService'); // Add email service

// Configure multer for profile image uploads
const uploadsDir = path.join(__dirname, '..', 'uploads', 'profile-images');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// === DIUBAH SUAI: Endpoint Pendaftaran Pengguna ===
router.post(
  '/register',
  [
    // Validasi sedia ada
    body('username', 'Nama pengguna diperlukan').notEmpty().trim().escape(),
    body('email', 'Sila masukkan emel yang sah').isEmail().normalizeEmail(),
    body('password', 'Kata laluan perlu sekurang-kurangnya 6 aksara').isLength({ min: 6 }),
    body('role', 'Peranan tidak sah').optional().isIn(['user', 'admin'])
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password, role = 'user' } = req.body;

    // ---- LOGIK BARU UNTUK STATUS ----
    // Tetapkan status berdasarkan peranan yang dipilih semasa pendaftaran
    const status = (role === 'admin') ? 'pending_approval' : 'active';
    // --------------------------------

    try {
      // Semakan pengguna sedia ada (tiada perubahan)
      let [users] = await dbPool.query(
        'SELECT * FROM users WHERE username = ? OR email = ?',
        [username, email]
      );
      if (users.length > 0) {
        // ... (kod ralat sedia ada)
        if (users[0].username === username) return res.status(400).json({ errors: [{ msg: 'Nama pengguna sudah wujud.' }] });
        if (users[0].email === email) return res.status(400).json({ errors: [{ msg: 'Emel sudah didaftarkan.' }] });
      }

      // Hash kata laluan (tiada perubahan)
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);

      // Kueri INSERT diubah suai untuk memasukkan 'status'
      const [result] = await dbPool.query(
        'INSERT INTO users (username, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
        [username, email, password_hash, role, status]
      );

      const newUser = {
        id: result.insertId,
        username: username,
        email: email,
        role: role,
        status: status // Sertakan status dalam respons
      };

      // Hantar mesej yang lebih spesifik jika pendaftaran admin perlukan kelulusan
      const successMessage = (role === 'admin')
        ? 'Pendaftaran sebagai admin berjaya! Akaun anda kini menunggu kelulusan dari admin lain.'
        : 'Pendaftaran berjaya! Sila log masuk.';
      
      res.status(201).json({
        msg: successMessage,
        user: newUser
      });

    } catch (err) {
      console.error('Ralat semasa pendaftaran:', err.message);
      res.status(500).send('Ralat pada server');
    }
  }
);

// === DIUBAH SUAI: Endpoint Log Masuk Pengguna ===
router.post(
  '/login',
  [
    // Validasi sedia ada
    body('email', 'Sila masukkan emel yang sah').isEmail().normalizeEmail(),
    body('password', 'Kata laluan diperlukan').exists()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      const [users] = await dbPool.query('SELECT * FROM users WHERE email = ?', [email]);
      if (users.length === 0) {
        return res.status(400).json({ errors: [{ msg: 'Emel atau kata laluan tidak sah.' }] });
      }

      const user = users[0]; 

      // ---- SEMAKAN STATUS BARU ----
      // Jika status pengguna masih menunggu kelulusan, sekat log masuk
      if (user.status === 'pending_approval') {
        return res.status(403).json({ msg: 'Akaun anda sedang menunggu kelulusan dari admin.' });
      }
      
      // Check if user account is inactive
      if (user.status === 'inactive') {
        return res.status(403).json({ msg: 'Account has been deactivated. Please contact administrator.' });
      }
      
      // Tambahan: Awak boleh tambah semakan untuk status lain seperti 'suspended' di sini nanti
      // ----------------------------

      // Bandingkan kata laluan (tiada perubahan)
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(400).json({ errors: [{ msg: 'Emel atau kata laluan tidak sah.' }] });
      }

      // Payload JWT (tiada perubahan, ia sudah ambil 'role' dari `user`)
      const payload = {
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      };

      // Tandatangani token (tiada perubahan)
      jwt.sign(
        payload,
        process.env.JWT_SECRET, 
        { expiresIn: '5h' }, 
        (err, token) => {
          if (err) throw err; 
          res.json({
            msg: 'Log masuk berjaya!',
            token: token, 
            user: {       
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                status: user.status // (Pilihan) Hantar status semasa log masuk
            }
          });
        }
      );

    } catch (err) {
      console.error('Ralat semasa log masuk:', err.message);
      res.status(500).send('Ralat pada server');
    }
  }
);

// Endpoint /me (updated to include profile_image and spotify_access_token)
router.get(
  '/me',
  authMiddleware, 
  async (req, res) => {
    try {
      const [users] = await dbPool.query(
        'SELECT id, username, email, role, status, created_at, profile_image, spotify_access_token FROM users WHERE id = ?',
        [req.user.id]
      );

      if (users.length === 0) {
        return res.status(404).json({ msg: 'Pengguna tidak ditemui.' });
      }
      res.json({
        msg: 'Maklumat pengguna berjaya diambil.',
        user: users[0]
      });

    } catch (err) {
      console.error('Ralat mendapatkan maklumat pengguna (/me):', err.message);
      res.status(500).send('Ralat pada server');
    }
  }
);

// ---- ENDPOINT BARU: Upload profile image ----
router.post('/upload-profile-image', authMiddleware, upload.single('profileImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: 'No image file provided' });
    }

    const userId = req.user.id;
    const imagePath = `/uploads/profile-images/${req.file.filename}`;

    // Get current user to check if they have an existing image
    const [currentUser] = await dbPool.query('SELECT profile_image FROM users WHERE id = ?', [userId]);
    
    // Delete old image if it exists
    if (currentUser[0]?.profile_image) {
      const oldImagePath = path.join(__dirname, '..', currentUser[0].profile_image);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    // Update user's profile image in database
    await dbPool.query('UPDATE users SET profile_image = ? WHERE id = ?', [imagePath, userId]);

    // Get updated user data
    const [updatedUser] = await dbPool.query(
      'SELECT id, username, email, role, status, created_at, profile_image, spotify_access_token FROM users WHERE id = ?', 
      [userId]
    );

    res.json({
      msg: 'Profile image updated successfully',
      user: updatedUser[0]
    });
  } catch (error) {
    console.error('Error uploading profile image:', error);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ---- ENDPOINT BARU: Remove profile image ----
router.delete('/remove-profile-image', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get current user to check if they have an existing image
    const [currentUser] = await dbPool.query('SELECT profile_image FROM users WHERE id = ?', [userId]);
    
    // Delete image file if it exists
    if (currentUser[0]?.profile_image) {
      const imagePath = path.join(__dirname, '..', currentUser[0].profile_image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // Remove profile image from database
    await dbPool.query('UPDATE users SET profile_image = NULL WHERE id = ?', [userId]);

    // Get updated user data
    const [updatedUser] = await dbPool.query(
      'SELECT id, username, email, role, status, created_at, profile_image, spotify_access_token FROM users WHERE id = ?', 
      [userId]
    );

    res.json({
      msg: 'Profile image removed successfully',
      user: updatedUser[0]
    });
  } catch (error) {
    console.error('Error removing profile image:', error);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ---- ENDPOINT BARU: Pengguna menukar kata laluan mereka sendiri ----
// PUT /api/auth/change-password
router.put(
  '/change-password',
  authMiddleware, // Dilindungi oleh authMiddleware, jadi hanya pengguna log masuk boleh akses
  [ // Validasi untuk kata laluan
    body('currentPassword', 'Kata laluan semasa diperlukan').notEmpty(),
    body('newPassword', 'Kata laluan baru perlu sekurang-kurangnya 6 aksara').isLength({ min: 6 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id; // Dapatkan ID pengguna dari token JWT (diletakkan oleh authMiddleware)

    try {
      // 1. Dapatkan hash kata laluan semasa dari database
      const [users] = await dbPool.query('SELECT password_hash FROM users WHERE id = ?', [userId]);
      if (users.length === 0) {
        // Ini sepatutnya tidak berlaku jika token sah, tapi sebagai langkah keselamatan
        return res.status(404).json({ msg: 'Pengguna tidak ditemui.' });
      }
      const storedPasswordHash = users[0].password_hash;

      // 2. Bandingkan kata laluan semasa yang dihantar dengan yang disimpan
      const isMatch = await bcrypt.compare(currentPassword, storedPasswordHash);
      if (!isMatch) {
        return res.status(400).json({ msg: 'Kata laluan semasa tidak betul.' });
      }

      // 3. Jika sepadan, hash kata laluan baru
      const salt = await bcrypt.genSalt(10);
      const newPasswordHash = await bcrypt.hash(newPassword, salt);

      // 4. Kemas kini kata laluan dalam database
      await dbPool.query(
        'UPDATE users SET password_hash = ? WHERE id = ?',
        [newPasswordHash, userId]
      );

      res.json({ msg: 'Kata laluan berjaya dikemas kini.' });

    } catch (err) {
      console.error('Ralat semasa menukar kata laluan:', err.message);
      res.status(500).send('Ralat pada server');
    }
  }
);
// --- TAMAT BAHAGIAN KOD BARU ---

// ---- ENDPOINT BARU: Pengguna mengemas kini profil mereka sendiri ----
// PUT /api/auth/update-profile
router.put(
  '/update-profile',
  authMiddleware, // Dilindungi, hanya pengguna log masuk boleh akses
  [ // Validasi untuk data yang mungkin dikemas kini (pilihan)
    body('username', 'Nama pengguna tidak boleh kosong jika dihantar').optional().notEmpty().trim().escape(),
    body('email', 'Sila masukkan emel yang sah').optional().isEmail().normalizeEmail()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email } = req.body;
    const userId = req.user.id; // Dapatkan ID pengguna dari token JWT

    try {
      // Dapatkan maklumat semasa pengguna untuk perbandingan
      const [currentUser] = await dbPool.query('SELECT * FROM users WHERE id = ?', [userId]);

      // Semak jika username atau email baru telah digunakan oleh pengguna lain
      if (username && username !== currentUser[0].username) {
        const [existing] = await dbPool.query('SELECT id FROM users WHERE username = ?', [username]);
        if (existing.length > 0) return res.status(400).json({ msg: 'Nama pengguna baru telah digunakan.' });
      }
      if (email && email !== currentUser[0].email) {
        const [existing] = await dbPool.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) return res.status(400).json({ msg: 'Emel baru telah digunakan.' });
      }

      // Bina kueri UPDATE secara dinamik (sama seperti logik edit oleh admin)
      const updateFields = [];
      const params = [];

      if (username) {
        updateFields.push('username = ?');
        params.push(username);
      }
      if (email) {
        updateFields.push('email = ?');
        params.push(email);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ msg: 'Tiada maklumat untuk dikemas kini.' });
      }

      params.push(userId); // Tambah ID pengguna untuk klausa WHERE

      // Laksanakan kueri UPDATE
      const updateQuery = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
      await dbPool.query(updateQuery, params);

      // Dapatkan semula data yang telah dikemas kini untuk dihantar balik
      const [updatedUser] = await dbPool.query(
        'SELECT id, username, email, role, status, created_at, profile_image, spotify_access_token FROM users WHERE id = ?',
        [userId]
      );

      res.json({
        msg: 'Profil berjaya dikemas kini.',
        user: updatedUser[0]
      });

    } catch (err) {
      console.error('Ralat semasa pengguna mengemas kini profil:', err.message);
      res.status(500).send('Ralat pada server');
    }
  }
);
// --- TAMAT BAHAGIAN KOD BARU ---

// ---- ENDPOINT BARU: Pengguna memadam akaun mereka sendiri ----
// DELETE /api/auth/delete-account
router.delete(
  '/delete-account',
  authMiddleware, // Dilindungi, hanya pengguna log masuk boleh akses
  [ // Validasi untuk kata laluan pengesahan
    body('password', 'Kata laluan diperlukan untuk pengesahan').notEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { password } = req.body;
    const userId = req.user.id; // Dapatkan ID pengguna dari token JWT

    try {
      // 1. Dapatkan hash kata laluan semasa dari database untuk pengesahan
      const [users] = await dbPool.query('SELECT password_hash FROM users WHERE id = ?', [userId]);
      if (users.length === 0) {
        return res.status(404).json({ msg: 'Pengguna tidak ditemui.' });
      }
      const storedPasswordHash = users[0].password_hash;

      // 2. Bandingkan kata laluan yang dihantar dengan yang disimpan
      const isMatch = await bcrypt.compare(password, storedPasswordHash);
      if (!isMatch) {
        return res.status(400).json({ msg: 'Kata laluan tidak betul. Akaun tidak boleh dipadam.' });
      }

      // 3. Jika kata laluan betul, teruskan dengan memadam pengguna
      await dbPool.query('DELETE FROM users WHERE id = ?', [userId]);

      res.json({ msg: 'Akaun anda telah berjaya dipadam secara kekal.' });

    } catch (err) {
      console.error('Ralat semasa pengguna memadam akaun:', err.message);
      res.status(500).send('Ralat pada server');
    }
  }
);
// --- TAMAT BAHAGIAN KOD BARU ---

// ---- ENDPOINT BARU: Reset kata laluan (permintaan) ----
// POST /api/auth/request-password-reset
router.post(
  '/request-password-reset',
  [
    // Validasi emel
    body('email', 'Sila masukkan emel yang sah').isEmail().normalizeEmail()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    try {
      // Semak jika emel wujud dalam sistem
      const [users] = await dbPool.query('SELECT id, username FROM users WHERE email = ?', [email]);
      if (users.length === 0) {
        return res.status(404).json({ msg: 'Emel tidak dijumpai.' });
      }

      const user = users[0];

      // 1. Hasilkan token reset yang unik
      const resetToken = crypto.randomBytes(32).toString('hex');

      // 2. Simpan token dan tarikh luput dalam database (untuk semakan kemudian)
      const expires = new Date(Date.now() + 3600000); // Token sah selama 1 jam
      await dbPool.query(
        'UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?',
        [resetToken, expires, user.id]
      );

      // 3. Hantar emel kepada pengguna dengan pautan untuk menetapkan semula kata laluan
      const resetUrl = `${req.protocol}://${req.get('host')}/api/auth/reset-password/${resetToken}`;
      await sendPasswordResetEmail(user.email, user.username, resetUrl);

      res.json({ msg: 'Pautan tetapan semula kata laluan telah dihantar ke emel anda.' });

    } catch (err) {
      console.error('Ralat semasa permintaan reset kata laluan:', err.message);
      res.status(500).send('Ralat pada server');
    }
  }
);

// ---- ENDPOINT BARU: Tetapkan semula kata laluan ----
// POST /api/auth/reset-password/:token
router.post(
  '/reset-password/:token',
  [
    // Validasi kata laluan baru
    body('newPassword', 'Kata laluan baru perlu sekurang-kurangnya 6 aksara').isLength({ min: 6 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { newPassword } = req.body;
    const { token } = req.params;

    try {
      // 1. Semak token dan dapatkan pengguna yang berkaitan
      const [users] = await dbPool.query(
        'SELECT id FROM users WHERE password_reset_token = ? AND password_reset_expires > ?',
        [token, new Date()]
      );
      if (users.length === 0) {
        return res.status(400).json({ msg: 'Token tidak sah atau telah luput.' });
      }

      const userId = users[0].id;

      // 2. Hash kata laluan baru
      const salt = await bcrypt.genSalt(10);
      const newPasswordHash = await bcrypt.hash(newPassword, salt);

      // 3. Kemas kini kata laluan dalam database, dan kosongkan token dan tarikh luput
      await dbPool.query(
        'UPDATE users SET password_hash = ?, password_reset_token = NULL, password_reset_expires = NULL WHERE id = ?',
        [newPasswordHash, userId]
      );

      res.json({ msg: 'Kata laluan anda telah berjaya ditetapkan semula. Sila log masuk dengan kata laluan baru anda.' });

    } catch (err) {
      console.error('Ralat semasa tetapan semula kata laluan:', err.message);
      res.status(500).send('Ralat pada server');
    }
  }
);
// --- TAMAT BAHAGIAN KOD BARU ---

// === PASSWORD RESET FUNCTIONALITY ===

// Forgot Password - Send reset email
router.post('/forgot-password', [
  body('email', 'Please enter a valid email').isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    // Check if user exists
    const [users] = await dbPool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      // Don't reveal if email exists or not for security
      return res.json({ msg: 'If this email exists, a password reset link has been sent.' });
    }

    const user = users[0];

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour from now

    // Save reset token to database
    await dbPool.query(
      'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE email = ?',
      [resetToken, resetTokenExpires, email]
    );

    // Send email
    const emailResult = await sendPasswordResetEmail(email, resetToken, user.username);

    if (emailResult.success) {
      res.json({ msg: 'If this email exists, a password reset link has been sent.' });
    } else {
      res.status(500).json({ msg: 'Error sending email. Please try again later.' });
    }

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Reset Password - Verify token and update password
router.post('/reset-password', [
  body('token', 'Reset token is required').notEmpty(),
  body('password', 'Password must be at least 6 characters').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, password } = req.body;

    // Find user with valid reset token
    const [users] = await dbPool.query(
      'SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > NOW()',
      [token]
    );

    if (users.length === 0) {
      return res.status(400).json({ msg: 'Invalid or expired reset token' });
    }

    const user = users[0];

    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Update password and clear reset token
    await dbPool.query(
      'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
      [hashedPassword, user.id]
    );

    res.json({ msg: 'Password has been reset successfully. You can now login with your new password.' });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Verify Reset Token - Check if token is valid (for frontend)
router.get('/verify-reset-token/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const [users] = await dbPool.query(
      'SELECT id, username, email FROM users WHERE reset_token = ? AND reset_token_expires > NOW()',
      [token]
    );

    if (users.length === 0) {
      return res.status(400).json({ valid: false, msg: 'Invalid or expired reset token' });
    }

    res.json({ 
      valid: true, 
      user: { 
        username: users[0].username, 
        email: users[0].email 
      } 
    });

  } catch (error) {
    console.error('Verify reset token error:', error);
    res.status(500).json({ valid: false, msg: 'Server error' });
  }
});

module.exports = router;
