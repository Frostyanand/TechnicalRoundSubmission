# AI Routing System - API Documentation

An intelligent API system that routes natural language queries through an LLM (Gemini) to appropriate tools (Weather API or Database) and returns clean, human-readable English responses.

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [API Endpoints](#api-endpoints)
- [Authentication](#authentication)
- [Request & Response Formats](#request--response-formats)
- [Data Flow Diagrams](#data-flow-diagrams)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Setup Instructions](#setup-instructions)

---

## Overview

The AI Routing System is a Next.js-based API that processes natural language queries, intelligently routes them to appropriate tools (Weather or Database), and returns human-readable English responses. The system uses Google Gemini AI for query understanding and routing decisions.

### Key Features

- **LLM-Powered Routing**: Uses Google Gemini to analyze and route queries
- **Weather Tool**: Fetches real-time weather data from OpenWeatherMap API
- **Database Tool**: Full CRUD operations on Firestore database
- **Rate Limiting**: Per-email rate limiting (10 requests/minute)
- **Google Authentication**: Secure authentication using Firebase Auth
- **Smart Error Handling**: Provides helpful guidance when information is insufficient
- **Clean English Output**: All responses are formatted as natural, human-readable text

---

## System Architecture

### High-Level Architecture

```
┌─────────────┐
│   Client    │
│ (Frontend)  │
└──────┬──────┘
       │ HTTP POST
       │ Authorization: Bearer <token>
       │ { "query": "..." }
       ▼
┌─────────────────────────────────────┐
│      Next.js API Route              │
│      POST /api/query                 │
└──────┬───────────────────────────────┘
       │
       ├─► 1. Verify Firebase Token
       ├─► 2. Check Rate Limit (per email)
       ├─► 3. Parse Request Body
       │
       ▼
┌─────────────────────────────────────┐
│   LLM Router Controller            │
│   (Gemini AI)                      │
│   - Analyzes query                  │
│   - Determines tool & action        │
│   - Extracts parameters             │
└──────┬───────────────────────────────┘
       │
       ├─► Tool: "weather"
       │   └─► Weather Controller
       │       └─► OpenWeatherMap API
       │
       └─► Tool: "database"
           └─► Database Controller
               └─► Firestore Database
```

### Component Structure

```
src/
├── app/
│   └── api/
│       └── query/
│           └── route.js          # Main API endpoint
├── controllers/
│   ├── llmRouterController.js    # Gemini LLM routing
│   ├── weatherController.js      # Weather API integration
│   └── databaseController.js     # Firestore CRUD operations
├── lib/
│   ├── apiClient.js              # Axios client with auth
│   ├── rateLimiter.js            # Rate limiting utility
│   ├── capabilities.js           # Help messages & capabilities
│   └── firebase/
│       ├── firebase.js           # Firebase Admin SDK
│       └── firebaseClient.js     # Firebase Client SDK
└── context/
    └── authContext.js            # React auth context
```

---

## API Endpoints

### POST `/api/query`

The main endpoint for processing natural language queries. This is the only public API endpoint.

#### Endpoint Details

- **URL**: `/api/query`
- **Method**: `POST`
- **Authentication**: Required (Firebase ID Token)
- **Content-Type**: `application/json`

#### Request Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes | Firebase ID token in format: `Bearer <token>` |
| `Content-Type` | Yes | Must be `application/json` |

#### Request Body

```json
{
  "query": "string"  // Natural language query (required, non-empty)
}
```

**Request Body Schema:**
- `query` (string, required): The natural language query from the user
  - Must be a non-empty string
  - Examples: "Tell me the weather in San Francisco", "How many employees are there?"

#### Response Format

**Success Response (200 OK)**
```json
{
  "response": "string",    // Human-readable English response
  "remaining": number      // Remaining requests in current rate limit window
}
```

**Error Response (4xx/5xx)**
```json
{
  "error": "string"        // Error message
}
```

#### Response Status Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success - Query processed and response returned |
| 400 | Bad Request - Invalid request body or missing query |
| 401 | Unauthorized - Missing or invalid authentication token |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server-side error occurred |
| 405 | Method Not Allowed - Only POST method is supported |

#### Example Requests

**Weather Query:**
```bash
curl -X POST http://localhost:3000/api/query \
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "Tell me the weather in San Francisco"}'
```

**Database Query:**
```bash
curl -X POST http://localhost:3000/api/query \
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "How many employees are there?"}'
```

#### Example Responses

**Weather Query Response:**
```json
{
  "response": "The weather in San Francisco, US is 18°C (64°F) with clear sky. It feels like 17°C. The humidity is 65%.",
  "remaining": 9
}
```

**Database Query Response:**
```json
{
  "response": "There are 3 employees matching your criteria.",
  "remaining": 8
}
```

**Insufficient Information Response:**
```json
{
  "response": "I need a location to check the weather. Please specify a city or location.\n\nHere's what I can help you with:\n\n**Weather Information:**\n• Get current weather for any city or location\n• Check temperature, conditions, and humidity\n\n**Database Operations:**\n• Count records (employees, orders, products, etc.)\n• List/Display records with optional filters\n• Add new records (employees, orders, products)\n• Update existing records\n• Delete records\n\n**Examples:**\n• \"Tell me the weather in San Francisco\"\n• \"How many employees are there?\"\n• \"List all orders over $500\"\n• \"Add a new employee named John Doe\"\n• \"Update employee John's salary to $80000\"\n• \"Delete product PROD-001\"",
  "remaining": 7
}
```

**Rate Limit Exceeded Response:**
```json
{
  "error": "Rate limit exceeded. Please try again later.",
  "remaining": 0,
  "resetTime": 1703123456789
}
```

---

## Authentication

### Firebase Authentication Flow

1. **Client-side**: User authenticates with Google via Firebase Auth
2. **Token Retrieval**: Client gets Firebase ID token using `user.getIdToken()`
3. **API Request**: Client includes token in `Authorization` header
4. **Server-side Verification**: API verifies token using Firebase Admin SDK
5. **Email Extraction**: Server extracts user email from verified token for rate limiting

### Getting Firebase ID Token

**JavaScript/React:**
```javascript
import { getAuth } from 'firebase/auth';

const auth = getAuth();
const user = auth.currentUser;

if (user) {
  const token = await user.getIdToken();
  // Use token in API requests
}
```

**Using apiClient (Automatic):**
```javascript
import apiClient from '@/lib/apiClient';

// Token is automatically included
const response = await apiClient.post('/query', {
  query: 'Tell me the weather in New York'
});
```

---

## Request & Response Formats

### Supported Query Types

#### 1. Weather Queries

**Purpose**: Get current weather information for any location

**Query Examples:**
- "Tell me the weather in San Francisco"
- "What's the temperature in New York?"
- "How's the weather in Tokyo?"
- "Check weather for London"

**LLM Routing Output:**
```json
{
  "tool": "weather",
  "action": "check",
  "parameters": {
    "location": "San Francisco"
  },
  "insufficientInfo": false,
  "intent": "Get weather information"
}
```

**Response Format:**
```
The weather in [Location], [Country] is [Temp]°C ([Temp]°F) with [Condition]. 
It feels like [FeelsLike]°C. The humidity is [Humidity]%.
```

**Insufficient Info Response:**
- Triggered when: No location specified
- Response: Help message with capabilities list

#### 2. Database Queries - READ Operations

**Purpose**: Query, count, or list database records

**Query Examples:**
- "How many employees are there?"
- "List all orders"
- "Show me all products"
- "Count employees in Engineering department"
- "List all orders over $500"
- "How many employees joined last month?"

**LLM Routing Output (Count):**
```json
{
  "tool": "database",
  "action": "count",
  "parameters": {
    "entity": "employees",
    "filters": {
      "joinedLastMonth": true
    }
  },
  "insufficientInfo": false,
  "intent": "Count employees"
}
```

**LLM Routing Output (List):**
```json
{
  "tool": "database",
  "action": "list",
  "parameters": {
    "entity": "orders",
    "filters": {
      "minAmount": 500
    }
  },
  "insufficientInfo": false,
  "intent": "List orders"
}
```

**Response Format:**
- Count: "There are [N] [entity] matching your criteria."
- List: "Found [N] [entity] matching your criteria." (with summary statistics if applicable)

#### 3. Database Queries - CREATE Operations

**Purpose**: Add new records to the database

**Query Examples:**
- "Add a new employee named John Doe with email john@company.com"
- "Create a new order for $500"
- "Add product Laptop for $1299"

**LLM Routing Output:**
```json
{
  "tool": "database",
  "action": "add",
  "parameters": {
    "entity": "employees",
    "data": {
      "name": "John Doe",
      "email": "john@company.com",
      "department": "Engineering"
    }
  },
  "insufficientInfo": false,
  "intent": "Add new employee"
}
```

**Response Format:**
```
Successfully added a new [entity] to the database.
```

**Insufficient Info Response:**
- Triggered when: No data provided for the record
- Response: Help message explaining what information is needed

#### 4. Database Queries - UPDATE Operations

**Purpose**: Modify existing database records

**Query Examples:**
- "Update employee John Doe's salary to $80000"
- "Modify order ORD-001 status to completed"
- "Change product PROD-001 price to $999"

**LLM Routing Output:**
```json
{
  "tool": "database",
  "action": "modify",
  "parameters": {
    "entity": "employees",
    "filters": {
      "name": "John Doe"
    },
    "data": {
      "salary": 80000
    }
  },
  "insufficientInfo": false,
  "intent": "Update employee"
}
```

**Response Format:**
```
Successfully updated the [entity].
```

**Error Response (if not found):**
```
No [entity] found matching the criteria.
```

#### 5. Database Queries - DELETE Operations

**Purpose**: Remove records from the database

**Query Examples:**
- "Delete product PROD-001"
- "Remove employee John Doe"
- "Delete order ORD-002"

**LLM Routing Output:**
```json
{
  "tool": "database",
  "action": "delete",
  "parameters": {
    "entity": "products",
    "filters": {
      "productId": "PROD-001"
    }
  },
  "insufficientInfo": false,
  "intent": "Delete product"
}
```

**Response Format:**
```
Successfully deleted the [entity].
```

**Error Response (if not found):**
```
No [entity] found matching the criteria.
```

---

## Data Flow Diagrams

### 1. Weather Query Flow

```
User Input: "Tell me the weather in San Francisco"
    │
    ▼
┌─────────────────────────────────────────┐
│ POST /api/query                          │
│ Authorization: Bearer <token>           │
│ Body: { "query": "..." }                │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ 1. Authentication Check                 │
│    - Extract token from header          │
│    - Verify with Firebase Admin SDK     │
│    - Extract user email                 │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ 2. Rate Limit Check                     │
│    - Check requests per email           │
│    - Limit: 10 requests/minute          │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ 3. LLM Router (Gemini AI)              │
│    - Analyze query                      │
│    - Determine: tool="weather"         │
│    - Extract: location="San Francisco" │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ 4. Weather Controller                   │
│    - Call OpenWeatherMap API            │
│    - Format response in English         │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ Response:                               │
│ {                                       │
│   "response": "The weather in San      │
│    Francisco, US is 18°C (64°F)..."   │
│   "remaining": 9                        │
│ }                                       │
└─────────────────────────────────────────┘
```

### 2. Database Query Flow (Count)

```
User Input: "How many employees are there?"
    │
    ▼
┌─────────────────────────────────────────┐
│ POST /api/query                          │
│ Authorization: Bearer <token>           │
│ Body: { "query": "..." }                │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ 1. Authentication & Rate Limit          │
│    (Same as weather flow)               │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ 2. LLM Router (Gemini AI)              │
│    - Analyze query                      │
│    - Determine: tool="database"        │
│    - Action: "count"                    │
│    - Entity: "employees"                │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ 3. Database Controller                  │
│    - Build Firestore query              │
│    - Filter by entity="employees"       │
│    - Execute query                      │
│    - Count results                      │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ 4. Format Response                      │
│    - Convert count to English           │
│    - Return human-readable message      │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ Response:                               │
│ {                                       │
│   "response": "There are 3 employees    │
│    matching your criteria."             │
│   "remaining": 8                        │
│ }                                       │
└─────────────────────────────────────────┘
```

### 3. Database Query Flow (Create)

```
User Input: "Add a new employee named Sarah Johnson"
    │
    ▼
┌─────────────────────────────────────────┐
│ POST /api/query                          │
│ Authorization: Bearer <token>           │
│ Body: { "query": "..." }                │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ 1. Authentication & Rate Limit          │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ 2. LLM Router (Gemini AI)              │
│    - Analyze query                      │
│    - Determine: tool="database"        │
│    - Action: "add"                      │
│    - Entity: "employees"                │
│    - Data: { name: "Sarah Johnson" }    │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ 3. Database Controller                  │
│    - Validate data provided             │
│    - Create Firestore document           │
│    - Add entity, data, timestamps        │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ Response:                               │
│ {                                       │
│   "response": "Successfully added a     │
│    new employees to the database."      │
│   "remaining": 7                        │
│ }                                       │
└─────────────────────────────────────────┘
```

### 4. Insufficient Information Flow

```
User Input: "What's the weather?"
    │
    ▼
┌─────────────────────────────────────────┐
│ POST /api/query                          │
│ (Authentication & Rate Limit checks)    │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ LLM Router (Gemini AI)                 │
│    - Analyze query                      │
│    - Detect: missing location           │
│    - Set: insufficientInfo=true         │
│    - missingInfo="location/city name"   │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ API Route                               │
│    - Check insufficientInfo flag         │
│    - Call getWeatherHelp()              │
│    - Generate capabilities list         │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ Response:                               │
│ {                                       │
│   "response": "I need a location to     │
│    check the weather. Please specify   │
│    a city or location.                 │
│                                         │
│    Here's what I can help you with:    │
│    **Weather Information:**             │
│    • Get current weather for any city  │
│    ...                                  │
│    **Examples:**                        │
│    • \"Tell me the weather in...\"     │
│    ...                                  │
│   "remaining": 6                        │
│ }                                       │
└─────────────────────────────────────────┘
```

### 5. Complete System Flow (All Components)

```
┌──────────────┐
│   Client     │
│  (Browser)   │
└──────┬───────┘
       │
       │ 1. User Query
       │    "Tell me weather in NYC"
       ▼
┌──────────────────────────────────────┐
│  Frontend Application                 │
│  - React/Next.js                      │
│  - Firebase Auth                      │
│  - apiClient (Axios)                  │
└──────┬─────────────────────────────────┘
       │
       │ 2. HTTP POST /api/query
       │    Headers: Authorization: Bearer <token>
       │    Body: { "query": "..." }
       ▼
┌──────────────────────────────────────┐
│  Next.js API Route                   │
│  /api/query/route.js                 │
└──────┬─────────────────────────────────┘
       │
       ├─► 3. verifyToken()
       │    └─► Firebase Admin SDK
       │        └─► Returns: { uid, email }
       │
       ├─► 4. checkRateLimit(email)
       │    └─► LRU Cache
       │        └─► Returns: { allowed, remaining }
       │
       ├─► 5. routeQuery(query)
       │    └─► LLM Router Controller
       │        └─► Gemini AI
       │            └─► Returns: { tool, action, parameters }
       │
       └─► 6. Execute Tool
           │
           ├─► If tool === "weather"
           │   └─► getWeather(location)
           │       └─► Weather Controller
           │           └─► OpenWeatherMap API
           │               └─► Returns: English weather description
           │
           └─► If tool === "database"
               └─► handleDatabaseOperation(action, entity, parameters)
                   └─► Database Controller
                       └─► Firestore Database
                           └─► Returns: English summary
       │
       ▼
┌──────────────────────────────────────┐
│  Response                            │
│  {                                   │
│    "response": "English text...",    │
│    "remaining": 9                   │
│  }                                   │
└──────────────────────────────────────┘
```

---

## Error Handling

### Error Response Format

All errors follow this structure:

```json
{
  "error": "Error message description"
}
```

### Error Types

#### 1. Authentication Errors (401)

**Missing Authorization Header:**
```json
{
  "error": "Authentication required. Please provide a valid token."
}
```

**Invalid Token:**
```json
{
  "error": "Invalid or expired authentication token."
}
```

**Missing Email:**
```json
{
  "error": "User email not found in token."
}
```

#### 2. Rate Limit Errors (429)

```json
{
  "error": "Rate limit exceeded. Please try again later.",
  "remaining": 0,
  "resetTime": 1703123456789
}
```

#### 3. Bad Request Errors (400)

**Missing Query:**
```json
{
  "error": "Query is required and must be a non-empty string."
}
```

#### 4. Server Errors (500)

**LLM Routing Error:**
```json
{
  "error": "Failed to process query. Please try again."
}
```

**Tool Execution Error:**
```json
{
  "error": "Failed to execute [tool] operation: [error message]"
}
```

**Unexpected Error:**
```json
{
  "error": "An unexpected error occurred. Please try again."
}
```

#### 5. Method Not Allowed (405)

```json
{
  "error": "Method not allowed. Use POST to submit queries."
}
```

### Error Handling Flow

```
Request
    │
    ▼
┌─────────────────────────┐
│ Authentication Check    │
└──────┬──────────────────┘
       │
       ├─► Fail → 401 Error
       │
       ▼
┌─────────────────────────┐
│ Rate Limit Check        │
└──────┬──────────────────┘
       │
       ├─► Fail → 429 Error
       │
       ▼
┌─────────────────────────┐
│ Request Validation       │
└──────┬──────────────────┘
       │
       ├─► Fail → 400 Error
       │
       ▼
┌─────────────────────────┐
│ LLM Routing             │
└──────┬──────────────────┘
       │
       ├─► Error → 500 Error
       │
       ├─► Insufficient Info → 200 (Help Message)
       │
       ▼
┌─────────────────────────┐
│ Tool Execution          │
└──────┬──────────────────┘
       │
       ├─► Error → 500 Error
       │
       ▼
┌─────────────────────────┐
│ Success Response (200)  │
└─────────────────────────┘
```

---

## Rate Limiting

### Rate Limit Configuration

- **Limit**: 10 requests per minute per email
- **Window**: 60 seconds (1 minute)
- **Storage**: In-memory LRU cache (max 1000 entries)
- **Scope**: Per email address (extracted from Firebase token)

### Rate Limit Flow

```
Request with Email: user@example.com
    │
    ▼
┌─────────────────────────┐
│ Check LRU Cache        │
│ Key: rate_limit:email   │
└──────┬──────────────────┘
       │
       ├─► Not Found → Create entry (count=1)
       │
       ├─► Found → Check window
       │   ├─► Expired → Reset (count=1)
       │   └─► Active → Increment count
       │
       ▼
┌─────────────────────────┐
│ Check if count <= 10    │
└──────┬──────────────────┘
       │
       ├─► Yes → Allow (remaining = 10 - count)
       │
       └─► No → Block (429 Error)
```

### Rate Limit Headers

Rate limit information is included in responses:

**Success Response:**
```json
{
  "response": "...",
  "remaining": 9  // Requests remaining in current window
}
```

**Rate Limit Exceeded:**
```json
{
  "error": "Rate limit exceeded. Please try again later.",
  "remaining": 0,
  "resetTime": 1703123456789  // Unix timestamp in milliseconds
}
```

---

## Setup Instructions

### Prerequisites

- Node.js 18+ installed
- Firebase project with Authentication and Firestore enabled
- Google Gemini API key
- OpenWeatherMap API key (optional, falls back to mock data)

### Installation

1. **Clone and Install Dependencies**

```bash
cd ai-routing-system
npm install
```

2. **Environment Variables**

Create a `.env.local` file in the `ai-routing-system` directory:

```env
# Firebase Client Configuration (NEXT_PUBLIC_ prefix for client-side)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin Configuration (Server-side only)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email@your_project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"

# Gemini API Key
GEMINI_API_KEY=your_gemini_api_key

# OpenWeatherMap API Key (Optional - falls back to mock data if not provided)
OPENWEATHER_API_KEY=your_openweather_api_key
```

3. **Firebase Setup**

   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project or use an existing one
   - Enable **Authentication** → **Sign-in method** → **Google**
   - Enable **Firestore Database** (start in test mode for development)
   - Go to **Project Settings** → **Service Accounts**
   - Generate a new private key and copy the values to `.env.local`

4. **Initialize Database**

```bash
npm run init-db
```

This creates sample records:
- Employees (3 records)
- Orders (3 records)
- Products (2 records)

5. **Start Development Server**

```bash
npm run dev
```

The API will be available at `http://localhost:3000/api/query`

---

## Security Considerations

- **Firebase Admin SDK**: Only used server-side, never exposed to client
- **Token Verification**: ID tokens are verified on every request
- **Rate Limiting**: Prevents abuse and DoS attacks
- **Environment Variables**: Never exposed to client-side code
- **Input Validation**: All inputs are validated before processing
- **Error Messages**: Don't expose internal system details

---

## Tech Stack

- **Next.js 16** (App Router) - Framework
- **Firebase** - Authentication & Firestore Database
- **Google Gemini AI** - LLM for query routing
- **OpenWeatherMap API** - Weather data
- **Node.js** - Runtime environment
- **Axios** - HTTP client
- **LRU Cache** - Rate limiting storage

---

## Project Structure

```
ai-routing-system/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── query/
│   │   │       └── route.js          # Main API endpoint
│   │   ├── layout.js
│   │   └── page.js
│   ├── controllers/
│   │   ├── llmRouterController.js    # Gemini LLM routing
│   │   ├── weatherController.js      # Weather API integration
│   │   └── databaseController.js    # Firestore CRUD operations
│   ├── lib/
│   │   ├── apiClient.js              # Axios client with auth
│   │   ├── rateLimiter.js            # Rate limiting utility
│   │   ├── capabilities.js           # Help messages & capabilities
│   │   └── firebase/
│   │       ├── firebase.js           # Firebase Admin SDK
│   │       └── firebaseClient.js     # Firebase Client SDK
│   ├── context/
│   │   └── authContext.js            # React auth context
│   └── scripts/
│       └── initializeDatabase.js     # Database initialization
├── package.json
├── postman_collection.json            # Postman test collection
└── README.md
```

---

## Example Usage Scenarios

### Scenario 1: Weather Query

**User**: "What's the weather in London?"

**Flow**:
1. Client sends POST request with query
2. API authenticates and checks rate limit
3. LLM routes to weather tool with location="London"
4. Weather controller fetches data from OpenWeatherMap
5. Response: "The weather in London, GB is 12°C (54°F) with light rain..."

### Scenario 2: Database Count Query

**User**: "How many employees joined last month?"

**Flow**:
1. Client sends POST request with query
2. API authenticates and checks rate limit
3. LLM routes to database tool with action="count", entity="employees", filters={joinedLastMonth: true}
4. Database controller queries Firestore with date filter
5. Response: "There are 2 employees matching your criteria."

### Scenario 3: Database Create Query

**User**: "Add a new employee named Alice with email alice@company.com"

**Flow**:
1. Client sends POST request with query
2. API authenticates and checks rate limit
3. LLM routes to database tool with action="add", entity="employees", data={name: "Alice", email: "alice@company.com"}
4. Database controller creates new Firestore document
5. Response: "Successfully added a new employees to the database."

### Scenario 4: Insufficient Information

**User**: "What's the weather?"

**Flow**:
1. Client sends POST request with query
2. API authenticates and checks rate limit
3. LLM detects missing location, sets insufficientInfo=true
4. API returns help message with capabilities list
5. Response: "I need a location to check the weather. Please specify a city or location. [Capabilities list]..."

---

## Testing

A comprehensive Postman collection is included (`postman_collection.json`) with test cases for:
- Authentication tests
- Weather queries
- Database CRUD operations
- Error handling
- Rate limiting
- Insufficient information scenarios

Import the collection into Postman and set the `auth_token` variable to test all endpoints.

---

## License

MIT
