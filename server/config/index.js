// backend/config/index.js
// This file centralizes access to your environment variables
// and other configuration settings.

module.exports = {
    PORT: process.env.PORT || 5000,
    MONGODB_URI: process.env.MONGODB_URI,
    SOLANA_RPC_URL: process.env.SOLANA_RPC_URL, // This line pulls it from your .env
    JWT_SECRET: process.env.JWT_SECRET,
    SESSION_SECRET: process.env.SESSION_SECRET,

    // You can add other environment variables here as needed:
    TWITTER_API_KEY: process.env.TWITTER_API_KEY,
    TWITTER_API_SECRET: process.env.TWITTER_API_SECRET,
    TWITTER_ACCESS_TOKEN: process.env.TWITTER_ACCESS_TOKEN,
    TWITTER_ACCESS_SECRET: process.env.TWITTER_ACCESS_SECRET,
    TWITTER_BEARER_TOKEN: process.env.TWITTER_BEARER_TOKEN,
    TWITTER_CLIENT_ID: process.env.TWITTER_CLIENT_ID,
    TWITTER_CLIENT_SECRET: process.env.TWITTER_CLIENT_SECRET,
    TWITTER_REDIRECT_URI: process.env.TWITTER_REDIRECT_URI,

    // Add any other constants or configurations here
    // For example, if you have specific Solana program IDs or DEX addresses:
    // SOLANA_PROGRAM_ID_BOOST_VOLUME: 'YOUR_BOOST_VOLUME_PROGRAM_ID',
    // RAYDIUM_DEX_PROGRAM_ID: 'YOUR_RAYDIUM_PROGRAM_ID',
};