require('dotenv').config(); // Ensure this is at the very top to load environment variables first

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const passport = require('passport');

// --- Model Imports ---
const User = require('./models/User');
const PayoutRequest = require('./models/PayoutRequest');
const Campaign = require('./models/Campaign');
const SparkCampaign = require('./models/SparkCampaign');
const Action = require('./models/Action');

// --- Middleware Imports ---
const authenticateJWT = require('./middleware/authenticateJWT'); // Your JWT authentication middleware

// --- Route Imports ---
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
const boostVolumeRoutes = require('./routes/BoostVolumeRoutes');
const adminRoutes = require('./routes/adminRoutes');
const adminBoostVolumeRoutes = require('./routes/adminBoostVolumeRoutes');
const creatorRoutes = require('./routes/creatorRoutes');

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || 'localhost';

// --- MongoDB Connection ---
mongoose.connect(process.env.MONGODB_URI, {})
    .then(() => console.log('MongoDB connected successfully'))
    .catch((err) => {
        console.error('MongoDB connection error:', err);
        process.exit(1); // Exit process if MongoDB connection fails
    });

// --- Express Middleware Setup ---
app.use(express.json()); // Parses incoming requests with JSON payloads
app.use(passport.initialize()); // Initializes Passport.js for authentication
app.use(express.urlencoded({ extended: true })); // Parses incoming requests with URL-encoded payloads

// --- CORS Configuration ---
// Read allowed origins from environment variable, split by comma, and trim whitespace
const ENV_ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS ?
    process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()) :
    [];

app.use(cors({
    origin: function (origin, callback) {
        // These are the core origins you always want to allow, regardless of environment variables.
        // This includes your stable production domains and any stable Vercel alias domains.
        let fixedAllowedOrigins = [
            'https://atfomo.com',
            'https://www.atfomo.com',
            'https://atfomo-beta.vercel.app', // Your stable Vercel production alias domain
            undefined // Allows requests with no explicit origin (e.g., Postman, curl, server-to-server)
        ];

        // Combine fixed origins with those dynamically provided via environment variables.
        const allAllowedOrigins = [...fixedAllowedOrigins, ...ENV_ALLOWED_ORIGINS];

        // This powerful regex handles the dynamically changing Vercel preview deployment domains.
        // It matches patterns like "https://atfomo-beta-RANDOMSTRING-atfomos-projects.vercel.app".
        // Adjust "atfomos-projects" if your Vercel organization/project name part changes.
        const vercelPreviewRegex = /^https:\/\/atfomo-beta-([a-z0-9]+)-atfomos-projects\.vercel\.app$/;

        if (!origin) {
            // If there's no origin (e.g., direct requests from tools like Postman, or server-to-server calls), allow it.
            return callback(null, true);
        }

        // Check if the request's origin is explicitly in our combined allowed list OR
        // if it matches the Vercel preview domain regular expression.
        if (allAllowedOrigins.includes(origin) || vercelPreviewRegex.test(origin)) {
            callback(null, true);
        } else {
            // If the origin is not allowed, log an error and deny the request.
            console.error(`CORS Error: Origin "${origin}" not allowed.`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true // Important if your frontend needs to send cookies or authorization headers
}));

// --- Static File Serving (for uploads and public assets) ---
app.use(express.static(path.join(__dirname, 'public')));

// Ensure upload directories exist
const uploadsBaseDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsBaseDir)) {
    fs.mkdirSync(uploadsBaseDir, { recursive: true });
}
const bannerUploadsDir = path.join(uploadsBaseDir, 'banners');
if (!fs.existsSync(bannerUploadsDir)) {
    fs.mkdirSync(bannerUploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsBaseDir)); // Serve files from the /public/uploads directory

// --- Authentication Routes (not protected by general API middleware) ---
app.use('/auth', authRoutes);

// --- API Router and Authentication/Authorization Logic ---
const apiRouter = express.Router();

// Helper function to normalize paths for consistent comparison
const normalizePath = (p) => p.endsWith('/') ? p.slice(0, -1) : p;

// Paths that do NOT require JWT authentication
const noJwtPaths = [
    '/spark-campaigns/public-active', // Example: public list of active spark campaigns
    '/tasks/available',               // Example: publicly available tasks
    '/campaigns',                     // Example: public list of campaigns
    '/public/banners',                // Public banners endpoint
    '/banners/public/banners'         // Alternative public banners path
].map(normalizePath);

// Paths that require a specific bot secret for access (e.g., Telegram bot callbacks)
const botSecretOnlyPaths = [
    '/telegram/complete-verification',
    '/spark-campaigns/track-message',
    '/telegram/link-campaign-group',
    '/spark-campaigns/track-reaction',
    '/users/earnings' // Assuming this is for a bot to query earnings
].map(normalizePath);

// Middleware to handle authentication/authorization for API routes
apiRouter.use((req, res, next) => {
    const currentPath = normalizePath(req.path); // Get the current path relative to /api

    // Special handling for dynamic public paths, like fetching a single spark campaign detail.
    // This allows routes like '/api/spark-campaigns/:campaignId' to be accessible without a JWT.
    // Ensure this doesn't accidentally allow sensitive data if individual campaign details are private.
    if (currentPath.startsWith('/spark-campaigns/') && !botSecretOnlyPaths.includes(currentPath)) {
        return next(); // Allow requests for individual spark campaign details without JWT or bot secret
    }

    // Check if the current path is in the list of paths that do not require JWT.
    if (noJwtPaths.includes(currentPath)) {
        return next();
    }

    // Check if the current path requires a bot secret and validate it.
    if (botSecretOnlyPaths.includes(currentPath)) {
        const botSecret = req.header('x-bot-secret');
        const expectedSecret = process.env.SECRET_BOT_API_KEY;

        if (!botSecret || botSecret !== expectedSecret) {
            console.warn(`Auth Check Result: Invalid or missing x-bot-secret for bot-only route (${currentPath}). Denying with 403.`);
            return res.status(403).json({ msg: 'Forbidden: Invalid or missing bot secret.' });
        }
        return next();
    }

    // For all other API routes, apply JWT authentication.
    authenticateJWT(req, res, next);
});

// --- API Route Mounting ---
// Mount all API-specific routers under the /api path.
// Note: apiRouter.use('/', bannerRoutes) means bannerRoutes are accessible directly under /api,
// e.g., /api/banners/public/banners
apiRouter.use('/creators', creatorRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/spark-campaigns', sparkCampaignRoutes);
apiRouter.use('/upload', uploadRoutes);
apiRouter.use('/campaigns', campaignsRouter);
apiRouter.use('/telegram', telegramRoutes);
apiRouter.use('/drip-campaigns', dripCampaignsRoutes);
apiRouter.use('/boost-volume', boostVolumeRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/admin/boost-volume', adminBoostVolumeRoutes);
apiRouter.use('/project', projectRoutes);
apiRouter.use('/tasks', tasksRoutes);

// This mounts routes from bannerRoutes directly under the /api prefix,
// meaning routes defined in bannerRoutes like '/' will be '/api/'
// and '/public/banners' will be '/api/public/banners'.
app.use('/api', apiRouter);
apiRouter.use('/', bannerRoutes); // This must come AFTER `app.use('/api', apiRouter)` if bannerRoutes contains root-level paths

// --- Global Error Handler Middleware ---
// This catches unhandled errors that occur in your route handlers or other middleware.
app.use((err, req, res, next) => {
    console.error("----- GLOBAL ERROR HANDLER -----");
    console.error("Error Message:", err.message);
    console.error("Error Stack:", err.stack); // Provides stack trace for debugging

    if (res.headersSent) {
        // If headers have already been sent, it means we can't send a new response.
        // Delegate to Express's default error handler or the next middleware.
        console.warn("Headers already sent, delegating to next error handler.");
        return next(err);
    }

    // Determine the status code (default to 500 Internal Server Error)
    const statusCode = err.status || 500;
    // Determine the error message (default to a generic message)
    const message = err.message || "An unexpected server error occurred.";

    // Send a JSON error response to the client
    res.status(statusCode).json({
        message: message,
    });
    console.error("----- END GLOBAL ERROR HANDLER -----");
});

// --- Start the Server ---
app.listen(PORT, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
});