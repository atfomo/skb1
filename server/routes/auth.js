const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Your Mongoose User model
const passport = require('passport'); // Passport.js for OAuth
const TwitterStrategy = require('passport-twitter').Strategy; // For Twitter (X) OAuth 1.0a
const crypto = require('crypto'); // Built-in Node.js module for cryptographic functions

const router = express.Router();

// Ensure JWT_SECRET and FRONTEND_URL are loaded from environment variables
// Use fallbacks for development if not set
const JWT_SECRET = process.env.JWT_SECRET || 'your_very_secret_jwt_key'; // CHANGE THIS IN PRODUCTION
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN; // CRITICAL: Your Telegram Bot's Token

// --- Passport.js Setup for Twitter (X) ---
passport.use(new TwitterStrategy({
    consumerKey: process.env.TWITTER_API_KEY,
    consumerSecret: process.env.TWITTER_API_SECRET,
    callbackURL: process.env.TWITTER_REDIRECT_URI, // e.g., http://localhost:5000/auth/twitter/callback
    // For Twitter API v2, you might need to specify scope and use a different strategy or direct implementation.
    // Ensure this matches the callback URL configured in your X Developer Portal.
},
async function(token, tokenSecret, profile, done) {
    try {
        console.log("Twitter Profile received:", profile);

        // Find a user by their Twitter ID (using xUsername as the unique identifier)
        // Note: Twitter profile.id is the unique ID, profile.username is the handle.
        // Your schema has xUsername as the field. We'll store profile.username in it.
        // If profile.id is also needed, you'd add a 'xUserId' field to your schema.
        let user = await User.findOne({ xUsername: profile.username });

        if (!user) {
            console.log("Creating new user from Twitter profile.");
            user = new User({
                // For social logins without an email, you might make email/username non-required in schema,
                // or generate a placeholder. Given your schema, email/username are required.
                // You might need to adjust your UserSchema to make email/username not required if they
                // are primarily for traditional login, or have a way to generate unique placeholders.
                // For now, let's assume we'll use a placeholder if email isn't provided by Twitter.
                email: profile.emails && profile.emails[0] ? profile.emails[0].value : `${profile.id}@twitter.com`, // Placeholder email
                username: profile.username || `twitteruser_${profile.id}`, // Placeholder username
                passwordHash: "social_login_no_password", // Placeholder for required passwordHash
                name: profile.displayName || profile.username, // Use display name or handle
                xUsername: profile.username, // Store Twitter handle here
                role: 'creator', // Assign a default role, e.g., 'user', 'creator'
            });
            await user.save();
            console.log("New user created successfully:", user._id);
        } else {
            console.log("Existing user found for Twitter handle:", profile.username);
            // If user exists, update their name if it changed
            if (user.name !== (profile.displayName || profile.username)) {
                user.name = profile.displayName || profile.username;
            }
            // xUsername is already matched, no need to update it unless it changes (rare for social ID)
            await user.save();
            console.log("User updated successfully:", user._id);
        }
        // Pass the user object to Passport
        done(null, user);
    } catch (err) {
        console.error("Error in TwitterStrategy verify callback:", err);
        done(err, null); // Pass error to Passport
    }
}));

// Passport serialization/deserialization (necessary if you use passport.session()
// or if other parts of Passport require it. For JWTs, sessions aren't strictly
// needed for authentication, but good practice for Passport setup.)
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});


// --- Traditional Register Endpoint (Optional - keep if you still want email sign-ups) ---
router.post('/register', async (req, res) => {
    const { email, password, name, username } = req.body; // Added username

    // Email, password, name, username are now required based on your User.js schema
    if (!email || !password || !name || !username) {
        return res.status(400).json({ message: 'Missing required fields: email, password, name, username' });
    }

    try {
        // Check if a user with this email or username already exists
        const existingUserByEmail = await User.findOne({ email });
        if (existingUserByEmail) {
            return res.status(400).json({ message: 'Email already registered.' });
        }
        const existingUserByUsername = await User.findOne({ username });
        if (existingUserByUsername) {
            return res.status(400).json({ message: 'Username already taken.' });
        }

        // Create a new user instance
        const newUser = new User({
            email,
            username,
            passwordHash: password, // The pre-save hook in User model will hash this
            name,
            role: 'user' // Default role for direct registration
        });

        // Save the new user to the database
        await newUser.save();

        res.status(201).json({ message: 'User registered successfully!' });
    } catch (err) {
        console.error('Error during user registration:', err);
        res.status(500).json({ message: 'Server error during registration.' });
    }
});

// --- Login Endpoint (for traditional username/email + password logins) ---
router.post('/login', async (req, res) => {
    const { loginId, password } = req.body; // loginId can be email or username

    if (!loginId || !password) {
        return res.status(400).json({ message: 'Please enter both login ID and password.' });
    }

    try {
        // Try to find user by email or username
        const user = await User.findOne({
            $or: [{ email: loginId.toLowerCase() }, { username: loginId }]
        }).select('+passwordHash'); // Ensure passwordHash is selected for comparison

        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        // Check if the account is banned
        if (user.accountStatus === 'banned') {
            return res.status(403).json({
                message: 'Your account has been banned.',
                banReason: user.banReason || 'No specific reason provided.'
            });
        }

        // Compare provided password with hashed password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { user: { userId: user._id, email: user.email, username: user.username, role: user.role } },
            JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.status(200).json({
            message: 'Login successful!',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                name: user.name,
                role: user.role,
                walletAddress: user.walletAddress,
                xUsername: user.xUsername,
                telegramUserId: user.telegramUserId,
                telegramUsername: user.telegramUsername,
                telegramFirstName: user.telegramFirstName,
                telegramLastName: user.telegramLastName,
                telegramPhotoUrl: user.telegramPhotoUrl,
                earnings: user.earnings,
                pendingEarnings: user.pendingEarnings,
                reputationScore: user.reputationScore,
                accountStatus: user.accountStatus,
                banReason: user.banReason
            }
        });

    } catch (err) {
        console.error('Error during user login:', err);
        res.status(500).json({ message: 'Server error during login.' });
    }
});


// --- Twitter (X) OAuth Initiation Endpoint ---
// This is the GET endpoint your frontend button hits: `http://localhost:5000/auth/twitter`
router.get('/twitter', passport.authenticate('twitter')); // This initiates the redirect to Twitter

// --- Twitter (X) OAuth Callback Endpoint ---
// This is the GET endpoint Twitter (X) redirects to after authorization:
// `http://localhost:5000/auth/twitter/callback`
router.get(
    '/twitter/callback',
    passport.authenticate('twitter', { failureRedirect: `${FRONTEND_URL}/login?error=twitter_auth_failed` }),
    async (req, res) => {
        // If authentication is successful, `req.user` contains the user object
        // from your `TwitterStrategy`'s `done()` callback.
        const user = req.user;

        if (!user) {
            console.error("No user object received after Twitter authentication.");
            return res.redirect(`${FRONTEND_URL}/login?error=auth_failed_no_user`);
        }

        try {
            // Generate your internal JWT token for the authenticated user
            const token = jwt.sign(
                { user: { userId: user._id, email: user.email, username: user.username, role: user.role, name: user.name } },
                JWT_SECRET,
                { expiresIn: '1d' }
            );

            // --- Crucial: Render an HTML page with JavaScript to transfer token to frontend ---
            // This HTML page will load in the user's browser briefly, execute the JS,
            // then redirect to your React app.
            res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Login Success</title>
                    <script>
                        // Store the JWT token in localStorage
                        localStorage.setItem('token', '${token}');
                        // Store minimal user info in localStorage as well, for context initialization
                        localStorage.setItem('user', JSON.stringify(${JSON.stringify({
                            id: user._id,
                            username: user.username,
                            email: user.email,
                            name: user.name,
                            role: user.role,
                            xUsername: user.xUsername, // Include xUsername
                            telegramUserId: user.telegramUserId, // Include Telegram fields if already set
                            telegramUsername: user.telegramUsername,
                            telegramFirstName: user.telegramFirstName,
                            telegramLastName: user.telegramLastName,
                            telegramPhotoUrl: user.telegramPhotoUrl
                        })}));

                        // Redirect the main browser window to your React frontend dashboard
                        window.location.href = '${FRONTEND_URL}/creator-dashboard';
                    </script>
                </head>
                <body>
                    <p>Authenticating... Please wait.</p>
                </body>
                </html>
            `);

        } catch (jwtErr) {
            console.error("Error generating JWT after Twitter authentication:", jwtErr);
            res.redirect(`${FRONTEND_URL}/login?error=server_error_token_gen`);
        }
    }
);

// --- NEW: Telegram Login Widget Callback Endpoint ---
// This endpoint receives data from the frontend after the Telegram Login Widget is used.
router.post('/telegram/callback', async (req, res) => {
    const telegramData = req.body;
    console.log("Received Telegram data:", telegramData);

    if (!TELEGRAM_BOT_TOKEN) {
        console.error("TELEGRAM_BOT_TOKEN is not set. Cannot verify Telegram login.");
        return res.status(500).json({ message: 'Server configuration error: Telegram bot token missing.' });
    }

    if (!telegramData || !telegramData.hash) {
        return res.status(400).json({ message: 'Invalid Telegram data received.' });
    }

    // --- Telegram Data Verification (CRITICAL SECURITY STEP) ---
    // Source: https://core.telegram.org/widgets/login#checking-authorization
    try {
        const dataCheckString = Object.keys(telegramData)
            .filter(key => key !== 'hash') // Exclude the hash itself
            .map(key => `${key}=${telegramData[key]}`)
            .sort() // Sort alphabetically by key
            .join('\n');

        const secretKey = crypto.createHash('sha256').update(TELEGRAM_BOT_TOKEN).digest();
        const hmac = crypto.createHmac('sha256', secretKey);
        hmac.update(dataCheckString);
        const calculatedHash = hmac.digest('hex');

        if (calculatedHash !== telegramData.hash) {
            console.warn("Telegram data hash verification failed.");
            return res.status(401).json({ message: 'Telegram data verification failed.' });
        }

        // Check data freshness (optional, but good practice)
        const authDate = telegramData.auth_date;
        const fiveMinutesAgo = Date.now() / 1000 - (5 * 60); // 5 minutes in seconds
        if (authDate < fiveMinutesAgo) {
            console.warn("Telegram data is too old.");
            return res.status(401).json({ message: 'Telegram data expired.' });
        }

        console.log("Telegram data verified successfully.");

        // Data is verified, now find or create user
        // Use telegramUserId as the primary identifier
        let user = await User.findOne({ telegramUserId: String(telegramData.id) }); // Ensure it's a string as per your schema

        if (!user) {
            console.log("Creating new user with Telegram profile.");

            // Generate unique username and email if they are required by your schema
            // for social logins that don't provide them.
            const baseUsername = telegramData.username || `telegram_user_${telegramData.id}`;
            let newUsername = baseUsername;
            let counter = 1;
            while (await User.findOne({ username: newUsername })) {
                newUsername = `${baseUsername}${counter}`;
                counter++;
            }

            const baseEmail = telegramData.id ? `${telegramData.id}@telegram.com` : `unknown_telegram_${Date.now()}@telegram.com`;
            let newEmail = baseEmail;
            let emailCounter = 1;
            while (await User.findOne({ email: newEmail })) {
                newEmail = `telegram_${telegramData.id}_${emailCounter}@telegram.com`;
                emailCounter++;
            }

            user = new User({
                email: newEmail,
                username: newUsername,
                passwordHash: "social_login_no_password", // Placeholder for required passwordHash
                name: `${telegramData.first_name || ''} ${telegramData.last_name || ''}`.trim() || telegramData.username || `Telegram User ${telegramData.id}`,
                role: 'creator', // Assign a default role
                telegramUserId: String(telegramData.id), // Ensure it's stored as a string
                telegramUsername: telegramData.username || null,
                telegramFirstName: telegramData.first_name || null,
                telegramLastName: telegramData.last_name || null,
                telegramPhotoUrl: telegramData.photo_url || null,
            });
            await user.save();
            console.log("New Telegram user created:", user._id);
        } else {
            console.log("Existing user found for Telegram ID:", telegramData.id);
            // Update user details if necessary
            let changed = false;
            const newName = `${telegramData.first_name || ''} ${telegramData.last_name || ''}`.trim();
            if (newName && user.name !== newName) {
                user.name = newName;
                changed = true;
            }
            if (telegramData.username && user.telegramUsername !== telegramData.username) {
                user.telegramUsername = telegramData.username;
                changed = true;
            }
            if (telegramData.first_name && user.telegramFirstName !== telegramData.first_name) {
                user.telegramFirstName = telegramData.first_name;
                changed = true;
            }
            if (telegramData.last_name && user.telegramLastName !== telegramData.last_name) {
                user.telegramLastName = telegramData.last_name;
                changed = true;
            }
            if (telegramData.photo_url && user.telegramPhotoUrl !== telegramData.photo_url) {
                user.telegramPhotoUrl = telegramData.photo_url;
                changed = true;
            }
            
            if (changed) {
                await user.save();
                console.log("Telegram user updated:", user._id);
            } else {
                console.log("No changes detected for Telegram user:", user._id);
            }
        }

        // Generate JWT token for the user
        const token = jwt.sign(
            { user: { userId: user._id, email: user.email, username: user.username, role: user.role, name: user.name } },
            JWT_SECRET,
            { expiresIn: '1d' }
        );

        // Send back the token and user info to the frontend
        res.status(200).json({
            message: 'Telegram authentication successful.',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                name: user.name,
                role: user.role,
                walletAddress: user.walletAddress,
                xUsername: user.xUsername,
                telegramUserId: user.telegramUserId,
                telegramUsername: user.telegramUsername,
                telegramFirstName: user.telegramFirstName,
                telegramLastName: user.telegramLastName,
                telegramPhotoUrl: user.telegramPhotoUrl,
                earnings: user.earnings,
                pendingEarnings: user.pendingEarnings,
                reputationScore: user.reputationScore,
                accountStatus: user.accountStatus,
                banReason: user.banReason
            }
        });

    } catch (error) {
        console.error('Error during Telegram authentication callback:', error);
        res.status(500).json({ message: 'Server error during Telegram authentication.' });
    }
});

module.exports = router;