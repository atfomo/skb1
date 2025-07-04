const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Your Mongoose User model
const passport = require('passport'); // Passport.js for OAuth
const TwitterStrategy = require('passport-twitter').Strategy; // For Twitter (X) OAuth 1.0a
const crypto = require('crypto'); // Built-in Node.js module for cryptographic functions

const router = express.Router();



const JWT_SECRET = process.env.JWT_SECRET || 'your_very_secret_jwt_key'; // CHANGE THIS IN PRODUCTION
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN; // CRITICAL: Your Telegram Bot's Token


passport.use(new TwitterStrategy({
    consumerKey: process.env.TWITTER_API_KEY,
    consumerSecret: process.env.TWITTER_API_SECRET,
    callbackURL: process.env.TWITTER_REDIRECT_URI, // e.g., http://localhost:5000/auth/twitter/callback


},
async function(token, tokenSecret, profile, done) {
    try {
        





        let user = await User.findOne({ xUsername: profile.username });

        if (!user) {
            
            user = new User({





                email: profile.emails && profile.emails[0] ? profile.emails[0].value : `${profile.id}@twitter.com`, // Placeholder email
                username: profile.username || `twitteruser_${profile.id}`, // Placeholder username
                passwordHash: "social_login_no_password", // Placeholder for required passwordHash
                name: profile.displayName || profile.username, // Use display name or handle
                xUsername: profile.username, // Store Twitter handle here
                role: 'creator', // Assign a default role, e.g., 'user', 'creator'
            });
            await user.save();
            
        } else {
            

            if (user.name !== (profile.displayName || profile.username)) {
                user.name = profile.displayName || profile.username;
            }

            await user.save();
            
        }

        done(null, user);
    } catch (err) {
        console.error("Error in TwitterStrategy verify callback:", err);
        done(err, null); // Pass error to Passport
    }
}));




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



router.post('/register', async (req, res) => {
    const { email, password, name, username } = req.body; // Added username


    if (!email || !password || !name || !username) {
        return res.status(400).json({ message: 'Missing required fields: email, password, name, username' });
    }

    try {

        const existingUserByEmail = await User.findOne({ email });
        if (existingUserByEmail) {
            return res.status(400).json({ message: 'Email already registered.' });
        }
        const existingUserByUsername = await User.findOne({ username });
        if (existingUserByUsername) {
            return res.status(400).json({ message: 'Username already taken.' });
        }


        const newUser = new User({
            email,
            username,
            passwordHash: password, // The pre-save hook in User model will hash this
            name,
            role: 'user' // Default role for direct registration
        });


        await newUser.save();

        res.status(201).json({ message: 'User registered successfully!' });
    } catch (err) {
        console.error('Error during user registration:', err);
        res.status(500).json({ message: 'Server error during registration.' });
    }
});


router.post('/login', async (req, res) => {
    const { loginId, password } = req.body; // loginId can be email or username

    if (!loginId || !password) {
        return res.status(400).json({ message: 'Please enter both login ID and password.' });
    }

    try {

        const user = await User.findOne({
            $or: [{ email: loginId.toLowerCase() }, { username: loginId }]
        }).select('+passwordHash'); // Ensure passwordHash is selected for comparison

        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }


        if (user.accountStatus === 'banned') {
            return res.status(403).json({
                message: 'Your account has been banned.',
                banReason: user.banReason || 'No specific reason provided.'
            });
        }


        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }


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




router.get('/twitter', passport.authenticate('twitter')); // This initiates the redirect to Twitter




router.get(
    '/twitter/callback',
    passport.authenticate('twitter', { failureRedirect: `${FRONTEND_URL}/login?error=twitter_auth_failed` }),
    async (req, res) => {


        const user = req.user;

        if (!user) {
            console.error("No user object received after Twitter authentication.");
            return res.redirect(`${FRONTEND_URL}/login?error=auth_failed_no_user`);
        }

        try {

            const token = jwt.sign(
                { user: { userId: user._id, email: user.email, username: user.username, role: user.role, name: user.name } },
                JWT_SECRET,
                { expiresIn: '1d' }
            );




            res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Login Success</title>
                    <script>

                        localStorage.setItem('token', '${token}');

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



router.post('/telegram/callback', async (req, res) => {
    const telegramData = req.body;
    

    if (!TELEGRAM_BOT_TOKEN) {
        console.error("TELEGRAM_BOT_TOKEN is not set. Cannot verify Telegram login.");
        return res.status(500).json({ message: 'Server configuration error: Telegram bot token missing.' });
    }

    if (!telegramData || !telegramData.hash) {
        return res.status(400).json({ message: 'Invalid Telegram data received.' });
    }



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


        const authDate = telegramData.auth_date;
        const fiveMinutesAgo = Date.now() / 1000 - (5 * 60); // 5 minutes in seconds
        if (authDate < fiveMinutesAgo) {
            console.warn("Telegram data is too old.");
            return res.status(401).json({ message: 'Telegram data expired.' });
        }

        



        let user = await User.findOne({ telegramUserId: String(telegramData.id) }); // Ensure it's a string as per your schema

        if (!user) {
            



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
            
        } else {
            

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
                
            } else {
                
            }
        }


        const token = jwt.sign(
            { user: { userId: user._id, email: user.email, username: user.username, role: user.role, name: user.name } },
            JWT_SECRET,
            { expiresIn: '1d' }
        );


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