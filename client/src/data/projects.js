export const projects = [...Array(50)].map((_, i) => ({
  id: i,
  name: `Project ${i + 1}`,
  logo: `https://via.placeholder.com/50?text=P${i + 1}`,
  tags: ["Meme", "Web3", "DeFi"].slice(0, (i % 3) + 1),
  activeTasks: (i + 1) * 3,
  estimatedEarnings: `$${(i + 1) * 10}`,
  description: `This is a description for project ${i + 1}.`,
  socials: {
    twitter: `https://twitter.com/project${i + 1}`,
    telegram: `https://t.me/project${i + 1}`,
  },
  rules: "You must follow all project rules carefully or face disqualification.",
  tasksRequired: {
    tweet: 3,
    like: 5,
    retweet: 5,
    comment: 5,
  },
}));
