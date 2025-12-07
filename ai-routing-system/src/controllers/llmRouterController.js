// src/controllers/llmRouterController.js
// LLM Router Controller - Uses Gemini to determine routing instructions
// 
// Environment Variable Required:
// - GEMINI_API_KEY: Google Gemini API key (must be set in .env or .env.local)

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

// Initialize Gemini - we will initialize new instances for each key rotation
const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Get all available API keys from environment variables
 * Supports:
 * - GEMINI_API_KEY (single or comma-separated)
 * - GEMINI_API_KEY_1, GEMINI_API_KEY_2, etc. (fallback keys)
 * @returns {string[]} Array of unique API keys
 */
const getAvailableApiKeys = () => {
  const keys = new Set();

  // 1. Check primary key (split by comma if list)
  if (process.env.GEMINI_API_KEY) {
    process.env.GEMINI_API_KEY.split(',').forEach(k => {
      const trimmed = k.trim();
      if (trimmed) keys.add(trimmed);
    });
  }

  // 2. Check numbered fallback keys
  Object.keys(process.env).forEach(key => {
    if (key.match(/^GEMINI_API_KEY_\d+$/)) {
      const val = process.env[key]?.trim();
      if (val) keys.add(val);
    }
  });

  if (keys.size === 0) {
    throw new Error('No GEMINI_API_KEY found in environment variables. Please set GEMINI_API_KEY in .env.local');
  }

  return Array.from(keys);
};

// List of models to try in reversed priority order for fallback
const MODEL_FALLBACK_LIST = [
  "gemini-2.5-flash-lite",      // Primary: Fast and efficient
  "gemini-2.5-flash",           // Secondary: Higher capability backup
  "gemini-2.0-flash"            // Fallback: Usage during high load
];

/**
 * Try to generate content with a specific model and API key
 * @param {string} apiKey - API Key to use
 * @param {string} modelName - Model name to try
 * @param {string} prompt - Prompt to send
 * @returns {Promise<string>} - Response text
 */
const tryModel = async (apiKey, modelName, prompt) => {
  try {
    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    // Handle specific error cases for routing logic
    const errorMessage = error.message || '';
    const errorStatus = error.status || error.response?.status || error.statusCode;

    // Rethrow quota errors to trigger key rotation
    if (errorStatus === 429 || errorMessage.includes('429') || errorMessage.includes('quota')) {
      throw new Error(`QUOTA_EXCEEDED: ${modelName}`);
    }

    if (
      errorStatus === 404 ||
      errorMessage.includes('not found') ||
      errorMessage.includes('404') ||
      errorMessage.includes('is not found for API version') ||
      errorMessage.includes('is not supported for generateContent')
    ) {
      throw new Error(`MODEL_NOT_FOUND: ${modelName}`);
    }

    throw error;
  }
};

/**
 * Route user query using Gemini LLM with model fallback AND key rotation
 * @param {string} userQuery - Natural language query from user
 * @returns {Promise<Object>} - Structured routing instructions
 */
const routeQuery = async (userQuery) => {
  try {
    const apiKeys = getAvailableApiKeys();

    // ... Prompt definition ...

    const SYSTEM_CAPABILITIES = {
      weather: {
        description: "Get current weather information",
        required_fields: ["location or city name"]
      },
      database: {
        actions: {
          create: { description: "Add a new record", required_fields: ["entity type", "data to add"] },
          read: { description: "List or display records", required_fields: ["entity type (optional)"] },
          update: { description: "Modify an existing record", required_fields: ["entity type", "filters to find record", "data to update"] },
          delete: { description: "Remove a record", required_fields: ["entity type", "filters to find record"] },
          count: { description: "Count records", required_fields: ["entity type"] }
        }
      }
    };

    const prompt = `You are a routing system that analyzes user queries and determines which tool should handle them.

System Capabilities:
${JSON.stringify(SYSTEM_CAPABILITIES, null, 2)}

User Query: "${userQuery}"

IMPORTANT:
- If the query implies a "list" or "display" operation for the database but DOES NOT specify an entity (e.g., "display database", "show all records"), set "entity" to null. This will list everything.
- If the query implies "add", "modify", or "delete" but misses details, set "insufficientInfo" to true.
- If the query lacks location for weather, set "insufficientInfo" to true.

**Parameter Normalization (CRITICAL)**:
- **Weather Location**: You must extract and clean the location to be a standard "City, CountryCode" format if possible, or just "City". remove extra words like "weather of", "climate in", state names if redundant.
  - Example: "weather of chennai tamil nadu india" -> "Chennai, IN"
  - Example: "paris france" -> "Paris, FR"
- **Database Entity**: Always normalize the entity to its **plural** form.
  - Example: "add product" -> "products"
  - Example: "list user" -> "users"

**Inference Rules (Smart Context)**:
- If the user provides data typical of a specific entity (e.g., "salary", "department"), INFER the entity as "employees" if not specified.
- If the user talks about "price", "stock", INFER "products".
- If the user talks about "customer", "amount", INFER "orders".
- **Goal**: Do NOT ask for entity type if you can confidently infer it from the fields provided.

- You MUST identify exactly what information is missing in "missingInfo".
- You MUST return a "guidedResponse" that lists the available functionality related to the user's intent to help them correct their query.
- **Exception**: If the user provides a specific **ID** (e.g., "id 123", "record with id X"), set "count" or "insufficientInfo" to false. Set "entity" to "record" if not specified. ID is sufficient to identify a record.
- **Exception**: If you can infer the entity and have required data, set "insufficientInfo" to false and proceed.

Analyze the query and respond with ONLY a valid JSON object. 
Do not include comments or non-JSON text in the response.

Response Schema:
{
  "tool": "weather" | "database" | null,
  "action": "check" | "add" | "modify" | "delete" | "display" | "count" | "list" | null,
  "parameters": {
    "location": "city name string or null",
    "entity": "entity type string or null",
    "filters": "object or null",
    "data": "object or null"
  },
  "insufficientInfo": boolean,
  "missingInfo": "string description or null",
  "guidedResponse": "string description of available commands or null",
  "intent": "string description"
}

Examples:
- "Tell me the weather in San Francisco" → {"tool": "weather", "action": "check", "parameters": {"location": "San Francisco"}, "insufficientInfo": false, "intent": "Get weather information"}
- "What's the weather?" → {"tool": "weather", "action": "check", "parameters": {}, "insufficientInfo": true, "missingInfo": "location/city name", "guidedResponse": "I can specifically check weather if you provide a city name. For example: 'Weather in London'.", "intent": "Get weather information"}
- "Add a new order" → {"tool": "database", "action": "add", "parameters": {"entity": "orders", "data": {}}, "insufficientInfo": true, "missingInfo": "order details like amount, customer name", "guidedResponse": "To add an order, I need details. Try: 'Add order for $50 by John Doe'.", "intent": "Add new order"}
- "Display database" → {"tool": "database", "action": "display", "parameters": {"entity": null}, "insufficientInfo": false, "intent": "List all records"}
- "Add Anurag salary 500 dollars" → {"tool": "database", "action": "add", "parameters": {"entity": "employees", "data": {"name": "Anurag", "salary": 500}}, "insufficientInfo": false, "intent": "Add inferred employee"}

Respond with ONLY the JSON object, no additional text.`;

    // Strategy: Nested retry loop (Keys -> Models) to handle rate limits
    let text = null;
    let lastError = null;
    let usedModel = null;
    let usedKeyIndex = -1;

    // Iterate through available API Keys
    for (let i = 0; i < apiKeys.length; i++) {
      const apiKey = apiKeys[i];

      // Iterate through Models
      for (const modelName of MODEL_FALLBACK_LIST) {
        try {
          text = await tryModel(apiKey, modelName, prompt);
          usedModel = modelName;
          usedKeyIndex = i;
          // console.log(`Successfully used model: ${modelName} with key index ${i}`);
          break; // Success, exit model loop
        } catch (error) {
          lastError = error;
          if (error.message?.includes('QUOTA_EXCEEDED')) {
            console.log(`Quota exceeded for model ${modelName} on key ${i}, checking next...`);
            continue; // Try next model/key
          } else if (error.message?.includes('MODEL_NOT_FOUND')) {
            console.log(`Model ${modelName} not found, trying next...`);
            continue;
          } else {
            console.warn(`Error with model ${modelName}:`, error.message);
            continue;
          }
        }
      }

      if (text) break; // Success, exit key loop
      console.log(`Key ${i} exhausted, trying next...`);
    }

    if (!text) {
      throw new Error(`All keys and models failed. Last error: ${lastError?.message || 'Unknown error'}`);
    }

    // Extract JSON from response (handle cases where LLM adds extra text)
    // Try to find JSON object, handling markdown code blocks
    let jsonText = text.trim();

    // Remove markdown code blocks if present
    jsonText = jsonText.replace(/```json\s * /g, '').replace(/```\s*/g, '');

    // Find JSON object
    let jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid response format from LLM - no JSON found');
    }

    let routingInstructions;
    try {
      routingInstructions = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('LLM response text:', text);
      throw new Error('Failed to parse LLM response as JSON');
    }

    // Check if insufficient info flag exists
    if (routingInstructions.insufficientInfo === true) {
      // Return instructions with insufficient info flag
      return routingInstructions;
    }

    // Validate routing instructions only if info is sufficient
    if (!routingInstructions.tool || !['weather', 'database'].includes(routingInstructions.tool)) {
      // If tool is null or invalid, treat as insufficient info
      routingInstructions.insufficientInfo = true;
      routingInstructions.missingInfo = 'Unable to determine what you need. Please be more specific.';
      return routingInstructions;
    }

    if (!routingInstructions.action) {
      routingInstructions.insufficientInfo = true;
      routingInstructions.missingInfo = 'Unable to determine the action. Please specify what you want to do.';
      return routingInstructions;
    }

    // Ensure parameters object exists
    if (!routingInstructions.parameters) {
      routingInstructions.parameters = {};
    }

    // Validate required parameters based on tool
    if (routingInstructions.tool === 'weather') {
      if (!routingInstructions.parameters.location && !routingInstructions.parameters.city) {
        routingInstructions.insufficientInfo = true;
        routingInstructions.missingInfo = 'location/city name';
        return routingInstructions;
      }
    }

    // Ensure filters and data objects exist for database operations
    if (routingInstructions.tool === 'database') {
      if (!routingInstructions.parameters.filters) {
        routingInstructions.parameters.filters = {};
      }
      if (!routingInstructions.parameters.data) {
        routingInstructions.parameters.data = {};
      }
    }

    return routingInstructions;
  } catch (error) {
    console.error('Error in LLM routing:', error);
    throw new Error(`Failed to route query: ${error.message} `);
  }
};

module.exports = {
  routeQuery,
};

