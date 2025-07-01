require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const passport = require('passport');

// ... (your model imports)
const User = require('./models/User');
const PayoutRequest = require('./models/PayoutRequest');
const Campaign = require('./models/Campaign');
const SparkCampaign = require('./models/SparkCampaign');
const Action = require('./models/Action');

const authenticateJWT = require('./middleware/authenticateJWT'); // Your JWT authentication middleware

// ... (your route imports)
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


mongoose.connect(process.env.MONGODB_URI, {})
.then(() => console.log('MongoDB connected successfully'))
.catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
});


app.use(express.json());
app.use(passport.initialize());
app.use(express.urlencoded({ extended: true }));


const allowedOrigins = [
    'https://atfomo.com',        // Your primary production domain
    'https://www.atfomo.com',    // Your primary production domain (with www)
    'https://atfomo-beta.vercel.app', // Your Vercel production alias domain
    // Add the specific Vercel preview domain that caused the error (good for quick fix)
    'https://atfomo-beta-q5gmcjgr8-atfomos-projects.vercel.app',
    undefined // Allows requests with no origin (like Postman, curl, server-to-server)
];

// This is the most crucial part for Vercel preview deployments
// It will match any preview domain that follows the pattern:
// https://PROJECT_NAME-RANDOM_HASH-YOUR_VERCEL_ORG.vercel.app
// Make sure 'atfomos-projects' matches your Vercel organization/project name if it's consistent.
const vercelPreviewRegex = /^https:\/\/atfomo-beta-([a-z0-9]+)-atfomos-projects\.vercel\.app$/;

// For development environments (local and dev aliases)
if (process.env.NODE_ENV !== 'production') {
    allowedOrigins.push('http://localhost:3000');
    allowedOrigins.push('https://localhost:3000');
    allowedOrigins.push('http://dev.atfomo.local:3000');
    allowedOrigins.push('https://dev.atfomo.local:3000');
    allowedOrigins.push('http://localhost:5000'); // If your backend runs on 5000
}

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true); // Allow requests with no origin

        // Check if the origin is in our allowed list OR matches the Vercel preview regex
        if (allowedOrigins.includes(origin) || vercelPreviewRegex.test(origin)) {
            callback(null, true);
        } else {
            console.error(`CORS Error: Origin "${origin}" not allowed.`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));


app.use(express.static(path.join(__dirname, 'public')));
const uploadsBaseDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsBaseDir)) {
    fs.mkdirSync(uploadsBaseDir, { recursive: true });
}
const bannerUploadsDir = path.join(uploadsBaseDir, 'banners');
if (!fs.existsSync(bannerUploadsDir)) {
    fs.mkdirSync(bannerUploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsBaseDir));


app.use('/auth', authRoutes);


const apiRouter = express.Router();


const normalizePath = (p) => p.endsWith('/') ? p.slice(0, -1) : p;

// Adjusted noJwtPaths - ensure /spark-campaigns/:id (for detail page) is also public if needed
const noJwtPaths = [
    '/spark-campaigns/public-active',
    '/tasks/available',
    '/campaigns',
    '/public/banners',
    '/banners/public/banners'
].map(normalizePath);

const botSecretOnlyPaths = [
    '/telegram/complete-verification',
    '/spark-campaigns/track-message',
    '/telegram/link-campaign-group',
    '/spark-campaigns/track-reaction',
    '/users/earnings'
].map(normalizePath);


apiRouter.use((req, res, next) => {
    const fullRequestPath = req.originalUrl;
    const currentPath = normalizePath(req.path); // Use req.path here for comparison with normalized paths

    // Special handling for spark-campaigns/:campaignId
    // If you want individual spark campaign details to be public (no JWT needed)
    // you need to add a specific check for it here since it's a dynamic path.
    // Example: Check if the path starts with '/spark-campaigns/' and is not a bot-only path
    if (currentPath.startsWith('/spark-campaigns/') && !botSecretOnlyPaths.includes(currentPath)) {
        // This means it's likely a detail page request like /spark-campaigns/someId
        // You might want to make this public
        return next(); // Allow without JWT or bot secret
    }


    const botSecret = req.header('x-bot-secret');
    const expectedSecret = process.env.SECRET_BOT_API_KEY;

    if (noJwtPaths.includes(currentPath)) {
        return next();
    }

    if (botSecretOnlyPaths.includes(currentPath)) {
        if (!botSecret || botSecret !== expectedSecret) {
            console.warn('Auth Check Result: Invalid or missing x-bot-secret for bot-only route. Denying with 403.');
            return res.status(403).json({ msg: 'Forbidden: Invalid or missing bot secret.' });
        }
        return next();
    }

    authenticateJWT(req, res, next);
});


apiRouter.use('/creators', creatorRoutes); // Moved under apiRouter
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



app.use('/api', apiRouter);
apiRouter.use('/', bannerRoutes); // This mounts bannerRoutes directly under /api

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
    console.log(`Server running on http://${HOST}:${PORT}`);
});