import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

const API_KEY = process.env.API_FOOTBALL_KEY;
const BASE_URL = process.env.API_FOOTBALL_BASE_URL || 'https://v3.football.api-sports.io';

console.log('API_KEY', API_KEY);


if (!API_KEY || API_KEY === 'your_api_key_here') {
  console.error('❌ Please set a valid API_FOOTBALL_KEY in your .env file.');
  process.exit(1);
}

async function testApi() {
  console.log('Testing connection to API-Football...');

  try {
    // We call the /status endpoint which is great for checking if your key works
    // and seeing how many requests you have left.
    const response = await axios.get(`${BASE_URL}/status`, {
      headers: {
        'x-apisports-key': API_KEY,
      },
    });

    console.log('\n✅ API Request Successful!');
    console.log('--------------------------------------------------');

    const data = response.data;

    if (data.errors && Object.keys(data.errors).length > 0) {
      console.error('⚠️ API Error returned:');
      console.error(JSON.stringify(data.errors, null, 2));
      return;
    }

    const subscription = data.response.subscription;
    const requests = data.response.requests;

    console.log(`Plan: ${subscription.plan}`);
    console.log(`Active: ${subscription.active ? 'Yes' : 'No'}`);
    console.log(`Requests limit per day: ${requests.limit_day}`);
    console.log(`Requests used today: ${requests.current}`);
    console.log('--------------------------------------------------');

  } catch (error: any) {
    console.error('\n❌ API Request Failed!');
    if (error.response) {
      console.error(`Status Code: ${error.response.status}`);
      console.error('Response:', error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

testApi();
