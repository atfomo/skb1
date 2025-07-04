
const axios = require('axios');

const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd';

async function getSolPriceInUSD() {
    try {
        const response = await axios.get(COINGECKO_API_URL);
        if (response.data && response.data.solana && response.data.solana.usd) {
            return response.data.solana.usd;
        }
        throw new Error('Failed to parse SOL price from CoinGecko API.');
    } catch (error) {
        console.error('Error fetching SOL price from CoinGecko:', error.message);
        return null;
    }
}

module.exports = { getSolPriceInUSD };