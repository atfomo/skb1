
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); // Using bcryptjs as per your code, previously I might have used bcrypt
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authenticateJWT = require('../middleware/authenticateJWT');
const checkUserStatus = require('../middleware/checkUserStatus');


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
            passwordHash: password, // Mongoose pre-save hook handles hashing
            name: username, // Default 'name' to 'username' if not provided by frontend


            walletAddress: null,
            xUsername: null,
 //         telegramUserId: null, // Critical: Ensure this is null for web registrations
            telegramUsername: null,
            telegramFirstName: null,
            telegramLastName: null,
            telegramPhotoUrl: null,

        });


        

        
        


        await newUser.save();


        
        
        
        


        const payload = {
            user: {
                userId: newUser._id,
                username: newUser.username,
                name: newUser.name,
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
                        role: newUser.role, // Send role in the user object for frontend context
                    },
                });
            }
        );

    } catch (err) {

        console.error('SERVER-SIDE REGISTRATION ERROR (CAUGHT):', err);


        if (err.code === 11000) {
            const field = Object.keys(err.keyValue)[0];
            const value = err.keyValue[field];
            const errorMessage = `A user with that ${field} '${value}' already exists.`;
            console.error(`Duplicate key error: ${errorMessage}`); // Log duplicate key specifics
            return res.status(409).json({ message: errorMessage });
        }
        res.status(500).json({ message: 'Server error during registration' });
    }
});


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
                        xUsername: user.xUsername || null, // Ensure xUsername is returned here
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

        telegramFirstName: req.fullUser.telegramFirstName || null,
        telegramUserId: req.fullUser.telegramUserId || null,
        telegramUsername: req.fullUser.telegramUsername || null,
    });
});

module.exports = router;