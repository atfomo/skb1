// backend/server.js
console.log('--- SERVER.JS INITIALIZING - VERSION: 2025-06-29T14:27:00Z (PRODUCTION READY) ---', new Date().toISOString()); // Update version
require('dotenv').config(); // Keep this for local development

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs'); // Keep fs for static file checks if needed, but not for SSL certs
// const https = require('https'); // REMOVE: Render handles HTTPS
const passport = require('passport');

// --- VERIFY IMPORTANT ENV VARIABLES AT STARTUP ---
console.log('SERVER STARTUP: SECRET_BOT_API_KEY from .env:', process.env.SECRET_BOT_API_KEY ? 'Present' : 'Absent');
console.log('SERVER STARTUP: JWT_SECRET from .env:', process.env.JWT_SECRET ? 'Present' : 'Absent');

// --- Import Models ---
const User = require('./models/User');
const PayoutRequest = require('./models/PayoutRequest');
const Campaign = require('./models/Campaign');
const SparkCampaign = require('./models/SparkCampaign');
const Action = require('./models/Action');

// --- Import Routers and Middleware ---
const authenticateJWT = require('./middleware/authenticateJWT'); // Your JWT authentication middleware

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const projectRoutes = require('./routes/projectRoutes');
const dripCampaignsRoutes = require('./routes/dripCampaigns');
const tasksRoutes = require('./routes/tasks');
const campaignsRouter = require('./routes/campaigns');
const telegramRoutes = require('./routes/telegramRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const bannerRoutes = require('./routes/bannerRoutes');
const sparkCampaignRoutes = require('./routes/sparkCampaignRoutes');
console.log('--- SERVER.JS: Successfully required sparkCampaignRoutes ---');
const boostVolumeRoutes = require('./routes/BoostVolumeRoutes');
const adminRoutes = require('./routes/adminRoutes');
const adminBoostVolumeRoutes = require('./routes/adminBoostVolumeRoutes');
const creatorRoutes = require('./routes/creatorRoutes');

const app = express();
const PORT = process.env.PORT || 5000;
// Render doesn't need HOST explicitly set in code, it routes to the service's internal IP.
// The `HOST` env variable will be used for your API_URLs in your config on Render.
// For logging, you can still use it, but it won't bind the server to a specific external IP.
const HOST = process.env.HOST || 'localhost'; 

// --- REMOVE SSL Certificate Checks and Paths ---
// These files are for local HTTPS development only. Render manages SSL.
// const keyPath = path.join(__dirname, 'api.dev.atfomo.local+2-key.pem');
// const certPath = path.join(__dirname, 'api.dev.atfomo.local+2.pem');
// if (!fs.existsSync(keyPath)) {
//     console.error(`SSL Private Key file not found at: ${keyPath}`);
//     console.error('Please ensure "api.dev.atfomo.local+2-key.pem" is in the backend server directory.');
//     process.exit(1);
// }
// if (!fs.existsSync(certPath)) {
//     console.error(`SSL Certificate file not found at: ${certPath}`);
//     console.error('Please ensure "api.dev.atfomo.local+2.pem" is in the backend server directory.');
//     process.exit(1);
// }

// --- Connect to MongoDB ---
mongoose.connect(process.env.MONGODB_URI, {})
.then(() => console.log('MongoDB connected successfully'))
.catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
});

// --- Core Express Middleware ---
app.use(express.json());
app.use(passport.initialize());
app.use(express.urlencoded({ extended: true }));

// CORS Configuration - IMPORTANT CHANGES HERE
app.use(cors({
    origin: function (origin, callback) {
        // PRODUCTION: Update with your Vercel frontend domain and Render backend domain
        // Add your Vercel project's preview domains if you want to test those too.
        // E.g., 'https://your-vercel-project-name.vercel.app'
        const allowedOrigins = [
            'https://atfomo.com',      // Your main frontend domain
            'https://www.atfomo.com', // Your www frontend domain
            // 'https://your-vercel-preview-url.vercel.app', // Vercel preview deployments (optional)
            // 'https://atfomo-backend-xxxxxxxx.onrender.com', // Render's default URL (optional, mainly for internal calls or direct testing)
            // 'https://api.atfomo.com', // Your backend's custom domain (if it makes calls to itself for some reason)
            undefined // Allows requests from same-origin (e.g., Postman without an Origin header)
        ];

        // FOR LOCAL DEVELOPMENT: uncomment the following lines if you test locally with the deployed backend
        // if (process.env.NODE_ENV !== 'production') {
        //     allowedOrigins.push('http://localhost:3000');
        //     allowedOrigins.push('https://localhost:3000');
        //     allowedOrigins.push('http://dev.atfomo.local:3000');
        //     allowedOrigins.push('https://dev.atfomo.local:3000');
        //     allowedOrigins.push('http://localhost:5000'); // Your backend's local port
        // }


        console.log(`CORS check: Request origin is "${origin}"`);
        if (!origin || allowedOrigins.includes(origin)) { // Use .includes for array
            callback(null, true);
        } else {
            console.error(`CORS Error: Origin "${origin}" not allowed.`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

// --- Static File Serving ---
app.use(express.static(path.join(__dirname, 'public')));
const uploadsBaseDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsBaseDir)) {
    fs.mkdirSync(uploadsBaseDir, { recursive: true });
    console.log(`Created base uploads directory at ${uploadsBaseDir}`);
}
const bannerUploadsDir = path.join(uploadsBaseDir, 'banners');
if (!fs.existsSync(bannerUploadsDir)) {
    fs.mkdirSync(bannerUploadsDir, { recursive: true });
    console.log(`Created banner uploads directory at ${bannerUploadsDir}`);
}
app.use('/uploads', express.static(uploadsBaseDir));

// --- ROUTER MOUNTING ORDER (CRITICAL) ---

// 1. Mount Authentication-related Routes (e.g., /auth/login, /auth/register)
app.use('/auth', authRoutes);
app.use('/api/creators', creatorRoutes);

app.use('/api/public', bannerRoutes);
console.log('--- SERVER.JS: Mounted /api/public using bannerRoutes (no auth middleware here) ---');

// --- Integrate userRoutes properly, outside the temporary diagnostic block ---
// This handles '/api/users/earnings' and other '/api/users' routes
// and ensures JWT or bot secret is applied as per your logic.
// Re-enable this line and ensure the logic within the `apiRouter.use` correctly
// handles '/users/earnings' for bot secret and other `/users` routes for JWT.
// The temporary diagnostic logic should be removed or re-integrated into the main `apiRouter.use`
// or into the `userRoutes` itself.

// The previous block was a specific diagnostic.
// Let's re-integrate `userRoutes` into the `apiRouter` and ensure the bot secret logic
// for `/users/earnings` is handled correctly within the `apiRouter.use` middleware
// or the `userRoutes` module itself.

// --- Create a dedicated API router for general API endpoints ---
const apiRouter = express.Router();

// Normalize path function (still useful for internal apiRouter checks)
const normalizePath = (p) => p.endsWith('/') ? p.slice(0, -1) : p;

// Define paths that do *not* require JWT authentication
const noJwtPaths = [
    '/spark-campaigns/public-active', // Public path for Spark Campaigns
    '/tasks/available',               // Public path for available tasks
    '/campaigns',                     // Public path for campaigns (assuming this is also intended to be public)
    '/public/banners'                 // This should also be explicitly listed if it's public
].map(normalizePath);

// Define paths that require ONLY the bot secret (and thus no JWT)
// IMPORTANT: '/users/earnings' should be in this list now for production setup
// if the bot is the *only* entity calling it with x-bot-secret.
const botSecretOnlyPaths = [
    '/telegram/complete-verification',
    '/spark-campaigns/track-message',
    '/telegram/link-campaign-group',
    '/spark-campaigns/track-reaction',
    '/users/earnings' // Re-added for bot access
].map(normalizePath);

// This middleware will run for ALL requests that enter /api
// This middleware will run for ALL requests that enter /api
apiRouter.use((req, res, next) => {
    const fullRequestPath = req.originalUrl; // Use originalUrl to see the full path including /api
    const currentPath = normalizePath(req.path); // Path relative to /api mount point
    
    console.log(`\n--- Incoming Request to API Router ---`);
    console.log(`Original URL: ${fullRequestPath}`);
    console.log(`Path (relative to /api): ${currentPath}`);
    console.log(`Method: ${req.method}`);
    console.log(`Headers: x-bot-secret: ${req.header('x-bot-secret') ? 'Present' : 'Absent'}`);

    const botSecret = req.header('x-bot-secret');
    const expectedSecret = process.env.SECRET_BOT_API_KEY;

    console.log(`Expected Bot Secret (from ENV): ${expectedSecret ? 'Present' : 'Absent'}`);
    console.log(`Received Bot Secret: ${botSecret}`);
    console.log(`Is received secret equal to expected? ${botSecret === expectedSecret}`);


    // Scenario 1: Path requires no authentication (e.g., public data)
    if (noJwtPaths.includes(currentPath)) {
        console.log(`Auth Check Decision: Skipping all authentication for public path: ${currentPath}`);
        return next(); // Skip all further auth checks for this path
    }

    // Scenario 2: Path requires *only* the bot secret
    if (botSecretOnlyPaths.includes(currentPath)) {
        console.log(`Auth Check Decision: Bot-secret-only path detected: ${currentPath}`);
        if (!botSecret || botSecret !== expectedSecret) {
            console.warn('Auth Check Result: Invalid or missing x-bot-secret for bot-only route. Denying with 403.');
            return res.status(403).json({ msg: 'Forbidden: Invalid or missing bot secret.' });
        }
        console.log('Auth Check Result: Valid x-bot-secret for bot-only route. Proceeding to controller.');
        return next(); // Valid bot secret, skip JWT and proceed to route handler
    }

    // Scenario 3: All other paths (default to requiring JWT)
    console.log(`Auth Check Decision: Applying JWT authentication for protected path: ${currentPath}`);
    // console.log(`Auth Check: JWT token: ${req.header('Authorization') ? 'Present' : 'Absent'}`); // This might log sensitive info
    authenticateJWT(req, res, next); // Apply JWT authentication
});

// Now, mount your specific routers to apiRouter.
apiRouter.use('/users', userRoutes); // RE-ENABLE: Mount userRoutes here as intended
apiRouter.use('/spark-campaigns', sparkCampaignRoutes);
apiRouter.use('/upload', uploadRoutes);
apiRouter.use('/banner', bannerRoutes);
apiRouter.use('/campaigns', campaignsRouter);
apiRouter.use('/telegram', telegramRoutes);
apiRouter.use('/drip-campaigns', dripCampaignsRoutes);
apiRouter.use('/boost-volume', boostVolumeRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/admin/boost-volume', adminBoostVolumeRoutes);
apiRouter.use('/project', projectRoutes);
apiRouter.use('/tasks', tasksRoutes);


// Finally, mount the apiRouter at the /api path
app.use('/api', apiRouter);

// --- Global Error Handler ---
app.use((err, req, res, next) => {
    console.error("----- GLOBAL ERROR HANDLER -----");
    console.error("Error Message:", err.message);
    console.error("Error Stack:", err.stack);

    if (res.headersSent) {
        console.warn("Headers already sent, delegating to next error handler.");
        return next(err);
    }

    const statusCode = err.status || 500;
    const message = err.message || "An unexpected server error occurred.";

    res.status(statusCode).json({
        message: message,
        // error: process.env.NODE_ENV === 'development' ? err : {} // Only send error stack in dev
    });
    console.error("----- END GLOBAL ERROR HANDLER -----");
});

// --- Server Start (HTTP for Render) --- IMPORTANT CHANGES HERE
// Remove the https.createServer block entirely.
// Listen directly on HTTP. Render will handle the HTTPS termination.
app.listen(PORT, () => { // Removed HOST from listen as Render handles internal routing
    console.log(`HTTP Server running on port ${PORT}`);
    console.log(`Backend API will be accessible at: https://api.atfomo.com`); // Informative message
});