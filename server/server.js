require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const passport = require('passport');

const User = require('./models/User');
const PayoutRequest = require('./models/PayoutRequest');
const Campaign = require('./models/Campaign');
const SparkCampaign = require('./models/SparkCampaign');
const Action = require('./models/Action');

const authenticateJWT = require('./middleware/authenticateJWT');

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
const adminPaymentRoutes = require('./routes/adminPaymentRoutes');
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

const ENV_ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS ?
    process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()) :
    [];

app.use(cors({
    origin: function (origin, callback) {
        let fixedAllowedOrigins = [
            'https://atfomo.com',
            'https://www.atfomo.com',
            'https://atfomo-beta.vercel.app', 
            undefined 
        ];

        const allAllowedOrigins = [...fixedAllowedOrigins, ...ENV_ALLOWED_ORIGINS];


        const vercelPreviewRegex = /^https:\/\/atfomo-beta-([a-z0-9]+)-atfomos-projects\.vercel\.app$/;

        if (!origin) {
            return callback(null, true);
        }
        if (allAllowedOrigins.includes(origin) || vercelPreviewRegex.test(origin)) {
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
    const currentPath = normalizePath(req.path); 

    if (currentPath.startsWith('/spark-campaigns/') && !botSecretOnlyPaths.includes(currentPath)) {
        return next(); 
    }

    if (noJwtPaths.includes(currentPath)) {
        return next();
    }

    if (botSecretOnlyPaths.includes(currentPath)) {
        const botSecret = req.header('x-bot-secret');
        const expectedSecret = process.env.SECRET_BOT_API_KEY;

        if (!botSecret || botSecret !== expectedSecret) {
            console.warn(`Auth Check Result: Invalid or missing x-bot-secret for bot-only route (${currentPath}). Denying with 403.`);
            return res.status(403).json({ msg: 'Forbidden: Invalid or missing bot secret.' });
        }
        return next();
    }

    authenticateJWT(req, res, next);
});


// api/banners/public/banners
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
apiRouter.use('/admin', adminPaymentRoutes);
apiRouter.use('/project', projectRoutes);
apiRouter.use('/tasks', tasksRoutes);


app.use('/api', apiRouter);
apiRouter.use('/', bannerRoutes);

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