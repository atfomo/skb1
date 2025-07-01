

/**
 * Calculate distribution of likes, retweets, comments based on budget.
 * @param {number} budgetUSD - Total budget in USD.
 * @returns {object} - Breakdown of actions and reward.
 */
function calculateDistribution(budgetUSD) {
  const platformFeePercent = 0.10;
  const userBudget = budgetUSD * (1 - platformFeePercent);

  let likeRate = 0.03;      // $0.03 per like
  let retweetRate = 0.06;   // $0.06 per retweet
  let commentRate = 0.10;   // $0.10 per comment


  if (budgetUSD >= 2500) {
    likeRate = 0.05;
    retweetRate = 0.10;
    commentRate = 0.20;
  } else if (budgetUSD >= 1000) {
    likeRate = 0.04;
    retweetRate = 0.08;
    commentRate = 0.15;
  } else if (budgetUSD >= 500) {
    likeRate = 0.035;
    retweetRate = 0.07;
    commentRate = 0.12;
  }


  const totalWeight = 3 + 2 + 5;
  const likeShare = userBudget * (3 / totalWeight);
  const retweetShare = userBudget * (2 / totalWeight);
  const commentShare = userBudget * (5 / totalWeight);

  const numLikes = Math.floor(likeShare / likeRate);
  const numRetweets = Math.floor(retweetShare / retweetRate);
  const numComments = Math.floor(commentShare / commentRate);

  return {
    budget: budgetUSD,
    platformFee: budgetUSD * platformFeePercent,
    userBudget,
    perActionRate: {
      like: likeRate,
      retweet: retweetRate,
      comment: commentRate,
    },
    actions: {
      likes: numLikes,
      retweets: numRetweets,
      comments: numComments,
    },
  };
}

module.exports = { calculateDistribution };


