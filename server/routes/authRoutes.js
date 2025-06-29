// backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authenticateJWT = require('../middleware/authenticateJWT');
const checkUserStatus = require('../middleware/checkUserStatus');

// --- Registration Route ---
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Please enter all fields' });
    }

    try {
        let existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            return res.status(400).json({ message: 'User with that username or email already exists' });
        }

        const newUser = new User({
            username,
            email,
            passwordHash: password,
            name: username,
            // role: 'user' // Default is already set in schema, no need to explicitly set here unless you want to override
        });

        await newUser.save();

        const payload = {
            user: {
                userId: newUser._id,
                username: newUser.username,
                name: newUser.name,
                // --- ADDED THIS LINE FOR ROLE IN JWT ---
                role: newUser.role, // Include the role from the saved user
            },
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1d' },
            (err, token) => {
                if (err) {
                    console.error('JWT sign error:', err);
                    return res.status(500).json({ message: 'Token generation failed' });
                }
                res.status(201).json({
                    message: 'User registered successfully',
                    token,
                    user: {
                        _id: newUser._id,
                        username: newUser.username,
                        name: newUser.name,
                        email: newUser.email,
                        accountStatus: newUser.accountStatus,
                        pendingEarnings: newUser.pendingEarnings,
                        reputationScore: newUser.reputationScore,
                        walletAddress: newUser.walletAddress || null,
                        // --- ADDED THIS LINE FOR ROLE IN USER OBJECT ---
                        role: newUser.role, // Send role in the user object for frontend context
                    },
                });
            }
        );

    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ message: 'Server error during registration' });
    }
});

// --- Login Route ---
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Please enter all fields' });
    }

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        if (user.accountStatus === 'banned') {
            console.log(`Banned user ${user.username} (ID: ${user._id}) attempted to log in.`);
            return res.status(403).json({
                message: 'Your account has been permanently banned due to fraudulent activity. All pending earnings have been forfeited. This decision is final.',
                banned: true
            });
        }

        const payload = {
            user: {
                userId: user._id,
                username: user.username,
                name: user.name,
                // --- ADDED THIS LINE FOR ROLE IN JWT ---
                role: user.role, // Include the user's role here
            },
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1d' },
            (err, token) => {
                if (err) {
                    console.error('JWT sign error:', err);
                    return res.status(500).json({ message: 'Token generation failed' });
                }
                res.json({
                    message: 'Logged in successfully',
                    token,
                    user: {
                        _id: user._id,
                        username: user.username,
                        name: user.name,
                        email: user.email,
                        accountStatus: user.accountStatus,
                        earnings: user.earnings, // Ensure earnings are here
                        pendingEarnings: user.pendingEarnings,
                        reputationScore: user.reputationScore,
                        walletAddress: user.walletAddress || null,
                        // --- ADDED THIS LINE FOR XUSERNAME IN USER OBJECT ---
                        xUsername: user.xUsername || null, // Ensure xUsername is returned here
                        // --- ADDED THIS LINE FOR ROLE IN USER OBJECT ---
                        role: user.role, // Send role in the user object for frontend context
                    },
                });
            }
        );

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Server error during login' });
    }
});

// --- /me route for fetching user data with JWT ---
router.get('/me', authenticateJWT, checkUserStatus, async (req, res) => {
    if (!req.fullUser) {
        return res.status(404).json({ message: 'User data not found.' });
    }

    res.json({
        _id: req.fullUser._id,
        username: req.fullUser.username,
        name: req.fullUser.name,
        email: req.fullUser.email,
        accountStatus: req.fullUser.accountStatus,
        earnings: req.fullUser.earnings,
        pendingEarnings: req.fullUser.pendingEarnings,
        reputationScore: req.fullUser.reputationScore,
        walletAddress: req.fullUser.walletAddress || null,
        xUsername: req.fullUser.xUsername || null,
        banReason: req.fullUser.banReason,
        banDate: req.fullUser.banDate,
        role: req.fullUser.role,
        // ADD THESE THREE LINES:
        telegramFirstName: req.fullUser.telegramFirstName || null,
        telegramUserId: req.fullUser.telegramUserId || null,
        telegramUsername: req.fullUser.telegramUsername || null,
    });
});

module.exports = router;