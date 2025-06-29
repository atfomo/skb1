// client/src/config.js

export const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://atfomo-beta.onrender.com' // Production Backend API URL: This is your live Render domain
  : 'https://api.dev.atfomo.local:5000'; // Development Backend API URL