/*
 * ======= • ======= • ======= • ======= • =======• =======
 * MyLastSeen — api/lastseen.js
 * Repository: https://github.com/Shineii86/MyLastSeen
 *
 * @description
 *   Main last-seen endpoint. Fetches a GitHub user's most
 *   recent public event and returns last-seen data in JSON
 *   or plain text format. Supports optional GitHub token
 *   for higher rate limits and caching.
 *
 * @endpoint GET /api/lastseen/:username
 * @endpoint GET /api/lastseen/:username/text
 *
 * @version 1.0.0
 * @author  Shinei Nouzen
 * @license MIT
 * ======= • ======= • ======= • ======= • =======• =======
 */

const cacheHandler = require('../utils/cacheHandler');
const { fetchLastSeen } = require('../utils/github');
const { relativeTime } = require('../utils/relativeTime');
const { CORS_HEADERS } = require('../utils/constants');

// ══════════════════════════════════════════════════════════════
// BADGE COLOR LOGIC
// ══════════════════════════════════════════════════════════════

// ---- FEATURE: Activity color mapping ----

/**
 * Determine badge color based on how recently the user was active.
 *
 * @param {string} isoDate - ISO date string of last activity
 * @returns {string} Color name for Shields.io badge
 */
function getBadgeColor(isoDate) {
  const hoursAgo = (Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60);
  if (hoursAgo < 1) return 'brightgreen';
  if (hoursAgo < 6) return 'green';
  if (hoursAgo < 24) return 'yellowgreen';
  if (hoursAgo < 72) return 'yellow';
  if (hoursAgo < 168) return 'orange';
  return 'red';
}

// ══════════════════════════════════════════════════════════════
// REQUEST HANDLER
// ══════════════════════════════════════════════════════════════

// ---- FEATURE: GET /api/lastseen/:username handler ----

/**
 * Main request handler for GET /api/lastseen/:username.
 *
 * Path parameters:
 *   - username — GitHub username
 *
 * Query parameters:
 *   - token — GitHub personal access token (optional, for higher rate limits)
 *   - refresh — 'true' to bypass cache
 *
 * When /text suffix is present, returns plain text instead of JSON.
 */
module.exports = async (req, res) => {
  const startTime = Date.now();
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  try {
    const username = req.query.username?.trim();
    const token = req.query.token || process.env.GITHUB_TOKEN || null;
    const forceRefresh = req.query.refresh === 'true';
    const isText = req.query.format === 'text';

    // ─── Validate username ───
    if (!username) {
      return res.status(400).json({
        success: false,
        error: 'Missing username',
        message: 'Please provide a GitHub username. Example: /api/lastseen/Shineii86',
        timestamp: new Date().toISOString()
      });
    }

    if (!/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(username) || username.length > 39) {
      const response = {
        success: false,
        error: 'Invalid username',
        message: `"${username}" is not a valid GitHub username.`,
        timestamp: new Date().toISOString()
      };
      return res.status(400).json(response);
    }

    // ─── Cache check ───
    const cacheKey = `lastseen:${username.toLowerCase()}`;
    let data;
    let cached = false;

    if (!forceRefresh) {
      const cachedData = cacheHandler.get(cacheKey);
      if (cachedData) {
        data = cachedData;
        cached = true;
      }
    } else {
      cacheHandler.del(cacheKey);
    }

    // ─── Fetch from GitHub if not cached ───
    if (!data) {
      data = await fetchLastSeen(username, token);
      cacheHandler.set(cacheKey, data);
    }

    const relative = relativeTime(data.lastSeen);
    const responseTime = Date.now() - startTime;

    // ─── Set rate limit headers from GitHub ───
    if (data.rateLimit) {
      res.setHeader('X-GitHub-RateLimit-Limit', String(data.rateLimit.limit));
      res.setHeader('X-GitHub-RateLimit-Remaining', String(data.rateLimit.remaining));
      if (data.rateLimit.reset) {
        res.setHeader('X-GitHub-RateLimit-Reset', String(data.rateLimit.reset));
      }
    }

    // ─── Text format ───
    if (isText) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', `public, max-age=${cached ? 60 : 300}`);
      res.setHeader('X-Response-Time', `${responseTime}ms`);
      res.setHeader('X-Cached', String(cached));
      return res.send(`${data.username} — Last seen: ${relative} (${data.eventLabel})`);
    }

    // ─── JSON format ───
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', `public, max-age=${cached ? 60 : 300}`);
    res.setHeader('X-Response-Time', `${responseTime}ms`);

    res.json({
      success: true,
      data: {
        username: data.username,
        lastSeen: data.lastSeen,
        relativeTime: relative,
        eventType: data.eventType,
        eventLabel: data.eventLabel,
        eventRepo: data.eventRepo,
        cached
      },
      meta: {
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({
      success: false,
      error: error.error || 'Internal server error',
      message: error.message || 'An unexpected error occurred.',
      ...(error.resetAt && { resetAt: error.resetAt }),
      timestamp: new Date().toISOString()
    });
  }
};

// ══════════════════════════════════════════════════════════════ END: api/lastseen.js
