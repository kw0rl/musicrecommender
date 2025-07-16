// routes/googleAuthRoutes.js
const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dbPool = require('../db');

const router = express.Router();

// Configure Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.NODE_ENV === 'production' 
        ? `${process.env.BACKEND_URL}/auth/google/callback`
        : "/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
    try {
        console.log('Google profile:', profile);
        
        // Check if user already exists with this Google ID
        const [existingUsers] = await dbPool.query(
            'SELECT * FROM users WHERE google_id = ?', 
            [profile.id]
        );

        if (existingUsers.length > 0) {
            // User exists, return them
            return done(null, existingUsers[0]);
        }

        // Check if user exists with this email (link accounts)
        const [emailUsers] = await dbPool.query(
            'SELECT * FROM users WHERE email = ?', 
            [profile.emails[0].value]
        );

        if (emailUsers.length > 0) {
            // Link Google account to existing user
            await dbPool.query(
                'UPDATE users SET google_id = ?, auth_provider = ? WHERE email = ?',
                [profile.id, 'google', profile.emails[0].value]
            );
            
            const [updatedUser] = await dbPool.query(
                'SELECT * FROM users WHERE email = ?', 
                [profile.emails[0].value]
            );
            
            return done(null, updatedUser[0]);
        }

        // Create new user
        const username = profile.displayName.replace(/\s+/g, '.').toLowerCase() + Math.floor(Math.random() * 1000);
        const profileImageUrl = profile.photos && profile.photos[0] ? profile.photos[0].value : null;

        const [result] = await dbPool.query(
            `INSERT INTO users (username, email, google_id, auth_provider, role, status, profile_image) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                username,
                profile.emails[0].value,
                profile.id,
                'google',
                'user',
                'active',
                profileImageUrl
            ]
        );

        const [newUser] = await dbPool.query(
            'SELECT * FROM users WHERE id = ?', 
            [result.insertId]
        );

        return done(null, newUser[0]);

    } catch (error) {
        console.error('Google OAuth error:', error);
        return done(error, null);
    }
}));

// Serialize/deserialize user for sessions
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const [users] = await dbPool.query('SELECT * FROM users WHERE id = ?', [id]);
        done(null, users[0]);
    } catch (error) {
        done(error, null);
    }
});

// Routes
router.get('/google', 
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/login?error=google_auth_failed' }),
    async (req, res) => {
        try {
            // Generate JWT token
            const payload = {
                user: {
                    id: req.user.id,
                    username: req.user.username,
                    role: req.user.role
                }
            };

            const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '5h' });

            // Redirect to frontend with token
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            res.redirect(`${frontendUrl}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify({
                id: req.user.id,
                username: req.user.username,
                email: req.user.email,
                role: req.user.role,
                profile_image: req.user.profile_image,
                auth_provider: req.user.auth_provider
            }))}`);

        } catch (error) {
            console.error('Token generation error:', error);
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            res.redirect(`${frontendUrl}/login?error=token_generation_failed`);
        }
    }
);

module.exports = router;
