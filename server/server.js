// backend/server.js
// Updated version to reflect the change for /api/public/banners being handled by apiRouter
console.log('--- SERVER.JS INITIALIZING - VERSION: 2025-06-30T00:21:44Z (Public Banners via apiRouter) ---', new Date().toISOString());
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
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
const HOST = process.env.HOST || 'localhost';

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

// CORS Configuration
app.use(cors({
    origin: function (origin, callback) {
        const allowedOrigins = [
            'https://atfomo.com',
            'https://www.atfomo.com',
            undefined // Allows requests with no origin (like Postman, curl, server-to-server)
        ];
        if (process.env.NODE_ENV !== 'production') {
            allowedOrigins.push('http://localhost:3000');
            allowedOrigins.push('https://localhost:3000');
            allowedOrigins.push('http://dev.atfomo.local:3000');
            allowedOrigins.push('https://dev.atfomo.local:3000');
            allowedOrigins.push('http://localhost:5000');
        }

        console.log(`CORS check: Request origin is "${origin}"`);
        if (!origin || allowedOrigins.includes(origin)) {
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

// 1. Mount non-API routes (like /auth)
app.use('/auth', authRoutes);

// --- REMOVED THE app.use('/api/public', bannerRoutes); LINE FROM HERE ---

// Create a dedicated API router for general API endpoints
const apiRouter = express.Router();

// Normalize path function (useful for internal apiRouter checks)
const normalizePath = (p) => p.endsWith('/') ? p.slice(0, -1) : p;

// Define paths that do *not* require JWT authentication (relative to /api)
// '/public/banners' is now included here to be handled by the apiRouter middleware
const noJwtPaths = [
    '/spark-campaigns/public-active',
    '/tasks/available',
    '/campaigns',
    '/public/banners', // <--- Now included here as it's mounted within apiRouter
    '/banners/public/banners'
].map(normalizePath);

// Define paths that require ONLY the bot secret (and thus no JWT) (relative to /api)
const botSecretOnlyPaths = [
    '/telegram/complete-verification',
    '/spark-campaigns/track-message',
    '/telegram/link-campaign-group',
    '/spark-campaigns/track-reaction',
    '/users/earnings'
].map(normalizePath);

// This middleware will run for ALL requests that enter apiRouter
apiRouter.use((req, res, next) => {
    const fullRequestPath = req.originalUrl;
    // req.path inside a sub-router is relative to the sub-router's mount point.
    // If apiRouter is mounted at /api, and request is /api/spark-campaigns/track-message
    // then req.path INSIDE apiRouter.use is /spark-campaigns/track-message
    const currentPath = normalizePath(req.path);

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
        return next();
    }

    // Scenario 2: Path requires *only* the bot secret
    if (botSecretOnlyPaths.includes(currentPath)) {
        console.log(`Auth Check Decision: Bot-secret-only path detected: ${currentPath}`);
        if (!botSecret || botSecret !== expectedSecret) {
            console.warn('Auth Check Result: Invalid or missing x-bot-secret for bot-only route. Denying with 403.');
            return res.status(403).json({ msg: 'Forbidden: Invalid or missing bot secret.' });
        }
        console.log('Auth Check Result: Valid x-bot-secret for bot-only route. Proceeding to controller.');
        return next();
    }

    // Scenario 3: All other paths (default to requiring JWT)
    console.log(`Auth Check Decision: Applying JWT authentication for protected path: ${currentPath}`);
    authenticateJWT(req, res, next);
});

// Now, mount all your API routers to the apiRouter.
// This ensures they all pass through the apiRouter.use authentication logic.
apiRouter.use('/creators', creatorRoutes); // Moved under apiRouter
apiRouter.use('/users', userRoutes);
apiRouter.use('/spark-campaigns', sparkCampaignRoutes);
apiRouter.use('/upload', uploadRoutes);
apiRouter.use('/banners', bannerRoutes);
apiRouter.use('/campaigns', campaignsRouter);
apiRouter.use('/telegram', telegramRoutes);
apiRouter.use('/drip-campaigns', dripCampaignsRoutes);
apiRouter.use('/boost-volume', boostVolumeRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/admin/boost-volume', adminBoostVolumeRoutes);
apiRouter.use('/project', projectRoutes);
apiRouter.use('/tasks', tasksRoutes);


// Finally, mount the consolidated apiRouter at the /api path
app.use('/api', apiRouter);

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
    });
    console.error("----- END GLOBAL ERROR HANDLER -----");
});


app.listen(PORT, () => {
    console.log(`HTTP Server running on port ${PORT}`);
    console.log(`Backend API will be accessible at: https://api.atfomo.com`);
});