// backend/utils/calculations.js

/**
 * Calculates campaign metrics based on target volume, volume per loop, and loops per user.
 * This function is expected by BoostVolumeController.js.
 * @param {number} targetVolume - The total USD volume target for the campaign.
 * @param {number} volumePerLoop - The USD volume generated per single loop by a user (half of the required volume for a full loop).
 * @param {number} loopsPerUser - The number of loops a single user can perform.
 * @returns {{numberOfLoops: number, usersNeeded: number}}
 */
function calculateCampaignMetrics(targetVolume, volumePerLoop, loopsPerUser) {
    // A full loop consists of a buy and a sell. If volumePerLoop is for one side,
    // then a full loop involves 2 * volumePerLoop.
    // Let's assume volumePerLoop refers to the total volume contributed by a single buy OR sell,
    // so a complete "loop" (buy+sell) contributes 2 * volumePerLoop.
    const fullLoopVolume = volumePerLoop * 2; // Assuming a loop is buy + sell

    // Calculate total loops required for the campaign
    // Ensure to handle potential division by zero or very small numbers
    const numberOfLoops = fullLoopVolume > 0 ? Math.ceil(targetVolume / fullLoopVolume) : 0;

    // Calculate how many unique users are needed
    // Ensure loopsPerUser is not zero to prevent division by zero
    const usersNeeded = loopsPerUser > 0 ? Math.ceil(numberOfLoops / loopsPerUser) : 0;

    return { numberOfLoops, usersNeeded };
}

// You can add other utility calculation functions here as your project grows.

module.exports = {
    calculateCampaignMetrics,
    // Add any other exported functions here
};