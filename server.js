/*
 * ======= • ======= • ======= • ======= • =======• =======
 * MyLastSeen — server.js
 * Repository: https://github.com/Shineii86/MyLastSeen
 *
 * @description
 *   Express server entry point. Configures middleware
 *   (CORS, security headers, rate limiting), mounts all
 *   API routes, and handles 404/error responses.
 *   Used for local development and Docker deployments.
 *
 * @exports Express app instance
 *
 * @version 1.0.0
 * @author  Shinei Nouzen
 * @license MIT
 * ======= • ======= • ======= • ======= • =======• =======
 */

const express = require('express');
const path = require('path');
const { APP_NAME, APP_VERSION, CORS_HEADERS } = require('./utils/constants');

const app = express();
const PORT = process.env.PORT || 3000;

// ══════════════════════════════════════════════════════════════
// MIDDLEWARE
// ══════════════════════════════════════════════════════════════

// ---- FEATURE: Trust proxy ----
// NOTE: Required for req.ip to return real client IP behind Vercel/CDN
app.set('trust proxy', 1);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---- FEATURE: CORS middleware ----
app.use((req, res, next) => {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  next();
});

// ---- FEATURE: Security headers ----
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// ══════════════════════════════════════════════════════════════
// IN-MEMORY RATE LIMITER
// ══════════════════════════════════════════════════════════════

// ---- FEATURE: Rate limiting ----

/** @type {Map<string, {count: number, resetAt: number}>} Per-IP rate buckets */
const rateBuckets = new Map();

/** @type {number} Max requests per window */
const RATE_LIMIT = 100;

/** @type {number} Window duration in milliseconds (1 minute) */
const RATE_WINDOW = 60 * 1000;

/**
 * Extract rate limit key from request.
 * Uses X-Forwarded-For header when behind a proxy.
 *
 * @param {Object} req - Express request
 * @returns {string} Client IP or fallback identifier
 */
function getRateKey(req) {
  return req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
}

/**
 * Check and enforce rate limit for a request.
 * Sets X-RateLimit-* response headers on every request.
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @returns {boolean} Whether the request is allowed
 */
function checkRate(req, res) {
  const key = getRateKey(req);
  const now = Date.now();
  let bucket = rateBuckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + RATE_WINDOW };
    rateBuckets.set(key, bucket);
  }

  bucket.count++;
  const remaining = Math.max(0, RATE_LIMIT - bucket.count);
  const resetSec = Math.ceil((bucket.resetAt - now) / 1000);

  res.setHeader('X-RateLimit-Limit', String(RATE_LIMIT));
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  res.setHeader('X-RateLimit-Reset', String(resetSec));

  if (bucket.count > RATE_LIMIT) {
    res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      message: `Max ${RATE_LIMIT} requests per minute. Try again in ${resetSec}s.`,
      retryAfter: resetSec
    });
    return false;
  }
  return true;
}

/**
 * Periodic cleanup of stale rate limit buckets.
 * NOTE: Prevents memory leak from accumulating expired entries.
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateBuckets) {
    if (now > bucket.resetAt) rateBuckets.delete(key);
  }
}, 5 * 60 * 1000);

// Apply rate limiting to all /api routes
app.use('/api', (req, res, next) => {
  if (!checkRate(req, res)) return;
  next();
});

// ---- FEATURE: Request logging ----
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ══════════════════════════════════════════════════════════════
// API ROUTES
// ══════════════════════════════════════════════════════════════

// ---- FEATURE: Route mounting ----
app.get('/api/health', require('./api/health.js'));
app.get('/api/lastseen/:username', require('./api/lastseen.js'));
app.get('/api/lastseen/:username/text', require('./api/lastseen.js'));
app.get('/api/lastseen/:username/badge', require('./api/badge.js'));
app.get('/api/batch', require('./api/batch.js'));
app.get('/api/score/:username', require('./api/score.js'));
app.get('/api/history/:username', require('./api/history.js'));
app.get('/api/org/:orgname/lastseen', require('./api/org.js'));
app.get('/api/compare', require('./api/compare.js'));
app.get('/api/rate-limit', require('./api/rate-limit.js'));
app.get('/api/status', require('./api/status.js'));
app.post('/api/status', require('./api/status.js'));
app.get('/api/repo/:owner/:repo', require('./api/repo-lastseen.js'));

// ══════════════════════════════════════════════════════════════
// ERROR HANDLING
// ══════════════════════════════════════════════════════════════

// ---- FEATURE: 404 handler ----
app.use((req, res) => {
  const accept = req.headers.accept || '';

  if (accept.includes('text/html')) {
    res.status(404).send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>404 — MyLastSeen</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Space Grotesk',system-ui,sans-serif;background:#0a0a0f;color:#f1f5f9;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center}a{color:#a78bfa;text-decoration:none}a:hover{text-decoration:underline}.code{font-size:6rem;font-weight:700;background:linear-gradient(135deg,#a78bfa,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent;line-height:1;margin-bottom:16px}p{color:#94a3b8;margin-bottom:24px;font-size:1.1rem}pre{background:#161622;border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:16px 20px;font-size:0.85rem;color:#94a3b8;text-align:left;max-width:500px;margin:0 auto;overflow-x:auto}</style></head><body><div><div class="code">404</div><p>This endpoint doesn't exist. Try the API instead:</p><pre><code>curl https://mylastseen.vercel.app/api/lastseen/Shineii86</code></pre><br><a href="/">← Back to MyLastSeen</a></div></body></html>`);
  } else {
    res.status(404).json({
      success: false,
      error: 'Not found',
      availableEndpoints: [
        'GET /api/lastseen/:username',
        'GET /api/lastseen/:username/text',
        'GET /api/lastseen/:username/badge',
        'GET /api/batch?users=user1,user2',
        'GET /api/score/:username',
        'GET /api/history/:username',
        'GET /api/org/:orgname/lastseen',
        'GET /api/compare?user1=X&user2=Y',
        'GET /api/rate-limit',
        'GET /api/health'
      ]
    });
  }
});

// ---- FEATURE: Global error handler ----
app.use((err, req, res, next) => {
  console.error('[Server Error]:', err);
  res.status(500).json({ success: false, error: 'Internal server error', message: err.message });
});

// ══════════════════════════════════════════════════════════════
// SERVER START
// ══════════════════════════════════════════════════════════════

// ---- FEATURE: Startup banner ----
app.listen(PORT, () => {
  console.log(`\n╔════════════════════════════════════════════════════════════╗\n║           👁️ ${APP_NAME} v${APP_VERSION} 👁️\n║   Server running on http://localhost:${PORT}\n║\n║   Endpoints:\n║   • GET /api/lastseen/:username\n║   • GET /api/lastseen/:username/text\n║   • GET /api/lastseen/:username/badge\n║   • GET /api/batch?users=user1,user2\n║   • GET /api/score/:username\n║   • GET /api/history/:username\n║   • GET /api/org/:orgname/lastseen\n║   • GET /api/compare?user1=X&user2=Y\n║   • GET /api/rate-limit\n║   • GET|POST /api/status\n║   • GET /api/repo/:owner/:repo\n║   • GET /api/health\n╚════════════════════════════════════════════════════════════╝\n`);
});

module.exports = app;

// ══════════════════════════════════════════════════════════════ END: server.js
