// src/app/api/query/route.js
// Main API endpoint for AI routing system

import { NextResponse } from 'next/server';
import { verifyToken } from '../../../lib/firebase/firebase';
import { checkRateLimit } from '../../../lib/rateLimiter';
import { routeQuery } from '../../../controllers/llmRouterController';
import { getWeather } from '../../../controllers/weatherController';
import { handleDatabaseOperation } from '../../../controllers/databaseController';
import { getWeatherHelp, getDatabaseHelp, getGeneralHelp } from '../../../lib/capabilities';

/**
 * POST /api/query
 * Main endpoint that processes natural language queries
 */
export async function POST(request) {
  try {
    // 1. Extract and verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required. Please provide a valid token.' },
        { status: 401 }
      );
    }

    const idToken = authHeader.replace('Bearer ', '');
    let userInfo;
    try {
      userInfo = await verifyToken(idToken);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired authentication token.' },
        { status: 401 }
      );
    }

    const userEmail = userInfo.email;
    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email not found in token.' },
        { status: 401 }
      );
    }

    // 2. Check rate limiting
    const rateLimitResult = checkRateLimit(userEmail);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please try again later.',
          remaining: rateLimitResult.remaining,
          resetTime: rateLimitResult.resetTime,
        },
        { status: 429 }
      );
    }

    // 3. Parse request body
    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query is required and must be a non-empty string.' },
        { status: 400 }
      );
    }

    // 4. Route query using LLM
    let routingInstructions;
    try {
      routingInstructions = await routeQuery(query);
    } catch (error) {
      console.error('LLM routing error:', error);
      return NextResponse.json(
        { error: 'Failed to process query. Please try again.' },
        { status: 500 }
      );
    }

    // 5. Check if insufficient information was provided
    if (routingInstructions.insufficientInfo === true) {
      let helpMessage;
      const { tool, missingInfo, guidedResponse } = routingInstructions;

      if (guidedResponse) {
        helpMessage = guidedResponse;
      } else {
        // Fallback to static help if LLM didn't provide guidance
        if (tool === 'weather') {
          helpMessage = getWeatherHelp();
        } else if (tool === 'database') {
          helpMessage = getDatabaseHelp(missingInfo);
        } else {
          helpMessage = getGeneralHelp();
        }
      }

      return NextResponse.json(
        {
          response: helpMessage,
          remaining: rateLimitResult.remaining - 1,
        },
        { status: 200 }
      );
    }

    // 6. Execute appropriate tool based on routing instructions
    let result;
    const { tool, action, parameters = {} } = routingInstructions;

    try {
      if (tool === 'weather') {
        // Handle weather queries
        const location = parameters?.location || parameters?.city || 'Unknown';
        if (!location || location === 'Unknown') {
          // This shouldn't happen if LLM routing is working correctly, but handle it gracefully
          return NextResponse.json(
            {
              response: getWeatherHelp(),
              remaining: rateLimitResult.remaining - 1,
            },
            { status: 200 }
          );
        }
        result = await getWeather(location);
      } else if (tool === 'database') {
        // Handle database queries
        const entity = parameters?.entity || 'records';
        result = await handleDatabaseOperation(action, entity, parameters);
      } else {
        throw new Error(`Unknown tool: ${tool}`);
      }
    } catch (error) {
      console.error('Tool execution error:', error);
      // Provide more user-friendly error messages
      const errorMessage = error.message || 'An unknown error occurred';
      return NextResponse.json(
        { error: `Failed to execute ${tool} operation: ${errorMessage}` },
        { status: 500 }
      );
    }

    // 6. Return clean English response
    return NextResponse.json(
      {
        response: result,
        remaining: rateLimitResult.remaining - 1,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in query endpoint:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to submit queries.' },
    { status: 405 }
  );
}

