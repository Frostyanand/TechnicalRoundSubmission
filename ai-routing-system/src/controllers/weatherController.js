// src/controllers/weatherController.js
// Weather Tool Controller - Fetches weather data from OpenWeatherMap API
//
// Environment Variable Required:
// - OPENWEATHER_API_KEY: OpenWeatherMap API key (optional, falls back to mock data if not set)
//   Must be set in .env or .env.local

// Ensure .env is loaded (Next.js should do this automatically for API routes)
if (typeof window === 'undefined') {
  try {
    const path = require('path');
    const fs = require('fs');
    const envPath = path.join(process.cwd(), '.env');
    const envLocalPath = path.join(process.cwd(), '.env.local');

    if (fs.existsSync(envLocalPath)) {
      require('dotenv').config({ path: envLocalPath });
    } else if (fs.existsSync(envPath)) {
      require('dotenv').config({ path: envPath });
    }
  } catch (e) {
    // dotenv loading is optional if Next.js handles it
  }
}

const axios = require('axios');

/**
 * Get weather information for a location
 * @param {string} location - City name or location
 * @returns {Promise<string>} - Human-readable weather description
 */
const getWeather = async (location) => {
  try {
    if (!location) {
      throw new Error('Location is required');
    }

    // Fetch API key from environment variables
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      // Fallback to mock data if API key is not configured
      console.warn('OPENWEATHER_API_KEY is not configured in environment variables. Using mock data.');
      return generateMockWeatherResponse(location);
    }

    // Helper to fetch from API
    const fetchWeather = async (query) => {
      const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(query)}&appid=${apiKey}&units=metric`;
      return await axios.get(url, { timeout: 10000 });
    };

    let response;
    try {
      // First attempt: As provided
      response = await fetchWeather(location);
    } catch (error) {
      // If 404 and location has spaces, retry with commas (e.g., "Gangtok Sikkim" -> "Gangtok,Sikkim")
      if (error.response?.status === 404 && location.includes(' ')) {
        console.log(`Weather 404 for "${location}", retrying with commas...`);
        const commaLocation = location.replace(/\s+/g, ',');
        try {
          response = await fetchWeather(commaLocation);
        } catch (retryError) {
          // If retry also fails, throw the original error (or the retry error, doesn't matter much as we handle it below)
          throw error;
        }
      } else {
        throw error;
      }
    }

    if (response.data && response.data.main) {
      const { temp, feels_like, humidity } = response.data.main;
      const { description, main } = response.data.weather[0] || {};
      const { name, country } = response.data;

      // Convert temperature to readable format
      const tempC = Math.round(temp);
      const tempF = Math.round((temp * 9 / 5) + 32);
      const feelsLikeC = Math.round(feels_like);

      // Generate human-readable response
      const locationName = name || location;
      const weatherDescription = description || main || 'unknown conditions';

      let responseText = `The weather in ${locationName}${country ? `, ${country}` : ''} is ${tempC}°C (${tempF}°F) with ${weatherDescription}.`;

      if (feelsLikeC !== tempC) {
        responseText += ` It feels like ${feelsLikeC}°C.`;
      }

      if (humidity) {
        responseText += ` The humidity is ${humidity}%.`;
      }

      return responseText;
    } else {
      throw new Error('Invalid response from weather API');
    }
  } catch (error) {
    console.error('Error fetching weather:', error);

    // If it's an API error, try to provide helpful message
    if (error.response?.status === 404) {
      return `I couldn't find weather information for "${location}". Please check if the location name is correct.`;
    }

    if (error.response?.status === 401) {
      // API key issue, fallback to mock
      return generateMockWeatherResponse(location);
    }

    // For other errors, return a generic message
    return generateMockWeatherResponse(location);
  }
};

/**
 * Generate mock weather response (fallback)
 * @param {string} location - City name
 * @returns {string} - Mock weather description
 */
const generateMockWeatherResponse = (location) => {
  const mockTemps = [15, 18, 20, 22, 25, 28];
  const mockConditions = ['clear skies', 'partly cloudy', 'sunny', 'cloudy', 'overcast'];

  const temp = mockTemps[Math.floor(Math.random() * mockTemps.length)];
  const condition = mockConditions[Math.floor(Math.random() * mockConditions.length)];

  return `The weather in ${location} is ${temp}°C with ${condition}.`;
};

module.exports = {
  getWeather,
};

