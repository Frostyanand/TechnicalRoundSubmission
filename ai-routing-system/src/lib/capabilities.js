// src/lib/capabilities.js
// Helper functions to provide user-friendly capability information

/**
 * Get a list of what the system can do
 * @returns {string} - Human-readable list of capabilities
 */
const getCapabilitiesList = () => {
  return `Here's what I can help you with:

**Weather Information:**
• Get current weather for any city or location
• Check temperature, conditions, and humidity

**Database Operations:**
• Count records (employees, orders, products, etc.)
• List/Display records with optional filters
• Add new records (employees, orders, products)
• Update existing records
• Delete records

**Examples:**
• "Tell me the weather in San Francisco"
• "How many employees are there?"
• "List all orders over $500"
• "Add a new employee named John Doe"
• "Update employee John's salary to $80000"
• "Delete product PROD-001"`;
};

/**
 * Get weather-specific help message
 * @returns {string} - Help message for weather queries
 */
const getWeatherHelp = () => {
  return `I need a location to check the weather. Please specify a city or location.

${getCapabilitiesList()}`;
};

/**
 * Get database-specific help message
 * @param {string} missingInfo - What information is missing
 * @returns {string} - Help message for database queries
 */
const getDatabaseHelp = (missingInfo = '') => {
  let message = `I need more information to help you with that database query.`;
  
  if (missingInfo) {
    message += ` Specifically, I need: ${missingInfo}.`;
  }
  
  message += `\n\n${getCapabilitiesList()}`;
  
  return message;
};

/**
 * Get general help message when query is unclear
 * @returns {string} - General help message
 */
const getGeneralHelp = () => {
  return `I'm not sure what you're asking for. Could you please clarify?

${getCapabilitiesList()}`;
};

module.exports = {
  getCapabilitiesList,
  getWeatherHelp,
  getDatabaseHelp,
  getGeneralHelp,
};

