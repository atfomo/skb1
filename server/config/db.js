
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config(); // Load .env here as well

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
};


module.exports = connectDB;