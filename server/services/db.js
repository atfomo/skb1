// backend/services/db.js
const mongoose = require('mongoose');
const DripCampaign = require('../models/DripCampaign'); // Import new DripCampaign model
const Task = require('../models/Task');
const DripTask = require('../models/DripTask');               // Import new Task model
const User = require('../models/User');               // Import User model (assuming you have one)
const CreateDrip = require('../models/CreateDrip');   // Your existing CreateDrip model

// Your existing database connection
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            // useNewUrlParser: true, // No longer needed in Mongoose 6+
            // useUnifiedTopology: true, // No longer needed in Mongoose 6+
            // useCreateIndex: true, // No longer needed in Mongoose 6+
        });
        console.log('MongoDB Connected...');
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
};

// --- DripCampaign Specific Functions ---

// Create a new Drip Campaign
const createDripCampaign = async (campaignData) => {
    const newCampaign = new DripCampaign(campaignData);
    return await newCampaign.save();
};

// Find a Drip Campaign by ID
const findDripCampaignById = async (campaignId) => {
    return await DripCampaign.findById(campaignId);
};

// Add a tweet link to an existing Drip Campaign
const addTweetLinkToDripCampaign = async (campaignId, tweetLink) => {
    return await DripCampaign.findByIdAndUpdate(
        campaignId,
        { $push: { tweet_links: { url: tweetLink } } },
        { new: true } // Return the updated document
    );
};

// --- Task Specific Functions ---

// Create a new Task
const createTask = async (taskData) => {
    const newTask = new Task(taskData);
    return await newTask.save();
};

// Find tasks based on criteria (e.g., for available tasks)
const findTasks = async (query) => {
    return await Task.find(query);
};

// Find a single task by ID
const findTaskById = async (taskId) => {
    return await Task.findById(taskId);
};

// Update a task (e.g., mark as completed)
const updateTask = async (taskId, updateData) => {
    return await Task.findByIdAndUpdate(taskId, updateData, { new: true });
};

// --- Export models and functions ---
module.exports = {
    connectDB,
    // Existing models (if any)
    CreateDrip, // Your existing CreateDrip model
    User, // Your User model
    // New DripCampaign and Task models
    DripCampaign, // Export DripCampaign model directly
    Task,  
    DripTask,
    createDripCampaign,
    findDripCampaignById,
    addTweetLinkToDripCampaign,
    createTask,
    findTasks,
    findTaskById,
    updateTask
};