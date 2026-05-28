/*
 * ======= • ======= • ======= • ======= • =======• =======
 * MyLastSeen — api/badge.js
 * Repository: https://github.com/Shineii86/MyLastSeen
 *
 * @description
 *   Shields.io endpoint badge handler. Returns JSON in the
 *   Shields.io endpoint badge schema format, compatible with
 *   shields.io/endpoint?url= badges for README files.
 *
 * @endpoint GET /api/lastseen/:username/badge
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

// ---- FEATURE: GET /api/lastseen/:username/badge handler ----

/**
 * Main request handler for GET /api/lastseen/:username/badge.
 *
 * Returns Shields.io endpoint badge JSON:
 * {
 *   schemaVersion: 1,
 *   label: "last seen",
 *   message: "2 hours ago",
 *   color: "brightgreen",
 *   namedLogo: "github",
 *   cacheSeconds: 300
 * }
 *
 * Usage in README.md:
 * ![Last Seen](https://img.shields.io/endpoint?url=https://mylastseen.vercel.app/api/lastseen/USERNAME/badge)
 */
module.exports = async (req, res) => {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  try {
    const username = req.query.username?.trim();
    const token = req.query.token || process.env.GITHUB_TOKEN || null;
    const forceRefresh = req.query.refresh === 'true';

    // ─── Validate username ───
    if (!username) {
      return res.status(400).json({
        schemaVersion: 1,
        label: 'last seen',
        message: 'missing username',
        color: 'red'
      });
    }

    // ─── Cache check ───
    const cacheKey = `lastseen:${username.toLowerCase()}`;
    let data;

    if (!forceRefresh) {
      data = cacheHandler.get(cacheKey);
    } else {
      cacheHandler.del(cacheKey);
    }

    if (!data) {
      data = await fetchLastSeen(username, token);
      cacheHandler.set(cacheKey, data);
    }

    const relative = relativeTime(data.lastSeen);
    const color = getBadgeColor(data.lastSeen);

    // ─── Shields.io endpoint badge response ───
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=300');

    res.json({
      schemaVersion: 1,
      label: 'last seen',
      message: relative,
      color,
      namedLogo: 'github',
      cacheSeconds: 300
    });
  } catch (error) {
    // Shields.io expects 200 with error badge on failure
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({
      schemaVersion: 1,
      label: 'last seen',
      message: error.error === 'User not found' ? 'user not found' : 'error',
      color: 'lightgrey',
      cacheSeconds: 60
    });
  }
};

// ══════════════════════════════════════════════════════════════ END: api/badge.js
