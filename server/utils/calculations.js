

/**
 * Calculates campaign metrics based on target volume, volume per loop, and loops per user.
 * This function is expected by BoostVolumeController.js.
 * @param {number} targetVolume - The total USD volume target for the campaign.
 * @param {number} volumePerLoop - The USD volume generated per single loop by a user (half of the required volume for a full loop).
 * @param {number} loopsPerUser - The number of loops a single user can perform.
 * @returns {{numberOfLoops: number, usersNeeded: number}}
 */
function calculateCampaignMetrics(targetVolume, volumePerLoop, loopsPerUser) {




    const fullLoopVolume = volumePerLoop * 2; // Assuming a loop is buy + sell



    const numberOfLoops = fullLoopVolume > 0 ? Math.ceil(targetVolume / fullLoopVolume) : 0;



    const usersNeeded = loopsPerUser > 0 ? Math.ceil(numberOfLoops / loopsPerUser) : 0;

    return { numberOfLoops, usersNeeded };
}



module.exports = {
    calculateCampaignMetrics,

};