// src/lib/rateLimiter.js
const { LRUCache } = require('lru-cache');

// Rate limit configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per minute per email

// Create LRU cache to store rate limit data
// Max 1000 entries, expires after 1 minute
const rateLimitCache = new LRUCache({
  max: 1000,
  ttl: RATE_LIMIT_WINDOW_MS,
});

/**
 * Check for rate limiting
 * @param {string} email - User's email address
 * @returns {Object} - { allowed: boolean, remaining: number, resetTime: number }
 */
const checkRateLimit = (email) => {
  if (!email) {
    return { allowed: false, remaining: 0, resetTime: Date.now() + RATE_LIMIT_WINDOW_MS };
  }

  const key = `rate_limit:${email}`;
  const current = rateLimitCache.get(key) || { count: 0, resetTime: Date.now() + RATE_LIMIT_WINDOW_MS };

  // Check if window has expired
  if (Date.now() > current.resetTime) {
    // Reset the counter
    current.count = 0;
    current.resetTime = Date.now() + RATE_LIMIT_WINDOW_MS;
  }

  // Increment count
  current.count += 1;
  rateLimitCache.set(key, current);

  const remaining = Math.max(0, RATE_LIMIT_MAX_REQUESTS - current.count);
  const allowed = current.count <= RATE_LIMIT_MAX_REQUESTS;

  return {
    allowed,
    remaining,
    resetTime: current.resetTime,
  };
};

module.exports = {
  checkRateLimit,
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_WINDOW_MS,
};

