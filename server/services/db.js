
const mongoose = require('mongoose');
const DripCampaign = require('../models/DripCampaign'); // Import new DripCampaign model
const Task = require('../models/Task');
const DripTask = require('../models/DripTask');               // Import new Task model
const User = require('../models/User');               // Import User model (assuming you have one)
const CreateDrip = require('../models/CreateDrip');   // Your existing CreateDrip model


const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {



        });
        
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
};




const createDripCampaign = async (campaignData) => {
    const newCampaign = new DripCampaign(campaignData);
    return await newCampaign.save();
};


const findDripCampaignById = async (campaignId) => {
    return await DripCampaign.findById(campaignId);
};


const addTweetLinkToDripCampaign = async (campaignId, tweetLink) => {
    return await DripCampaign.findByIdAndUpdate(
        campaignId,
        { $push: { tweet_links: { url: tweetLink } } },
        { new: true } // Return the updated document
    );
};




const createTask = async (taskData) => {
    const newTask = new Task(taskData);
    return await newTask.save();
};


const findTasks = async (query) => {
    return await Task.find(query);
};


const findTaskById = async (taskId) => {
    return await Task.findById(taskId);
};


const updateTask = async (taskId, updateData) => {
    return await Task.findByIdAndUpdate(taskId, updateData, { new: true });
};


module.exports = {
    connectDB,

    CreateDrip, // Your existing CreateDrip model
    User, // Your User model

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