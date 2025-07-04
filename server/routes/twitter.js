const express = require("express");
const { TwitterApi } = require("twitter-api-v2");
const router = express.Router();

const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
});


router.post("/verify-tweet", async (req, res) => {
  const { username, expectedText } = req.body;

  try {
    const user = await twitterClient.v2.userByUsername(username);
    const tweets = await twitterClient.v2.userTimeline(user.data.id, {
      max_results: 5,
    });

    const found = tweets.data.data.find((t) => t.text.includes(expectedText));
    res.json({ success: !!found, tweet: found || null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
