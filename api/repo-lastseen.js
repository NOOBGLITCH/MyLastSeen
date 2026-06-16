/*
 * ======= • ======= • ======= • ======= • =======• =======
 * MyLastSeen — api/repo-lastseen.js
 * Repository: https://github.com/Shineii86/MyLastSeen
 *
 * @description
 *   Track when someone was last active on a SPECIFIC repository.
 *   Fetches recent events for a repo and returns the most recent
 *   contributor with relative time.
 *
 * @endpoint GET /api/repo/:owner/:repo
 *
 * @version 3.1.0
 * @author  Shinei Nouzen
 * @license MIT
 * ======= • ======= • ======= • ======= • =======• =======
 */

const axios = require('axios');
const { CORS_HEADERS, REQUEST_TIMEOUT, USER_AGENT } = require('../utils/constants');

// ══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════

function buildHeaders(token) {
  const headers = {
    'User-Agent': USER_AGENT,
    'Accept': 'application/vnd.github.v3+json'
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

function getRelativeTime(isoDate) {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return 'just now';

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);

  if (seconds < 60) return 'just now';
  if (minutes === 1) return '1 minute ago';
  if (minutes < 60) return `${minutes} minutes ago`;
  if (hours === 1) return '1 hour ago';
  if (hours < 24) return `${hours} hours ago`;
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  if (weeks === 1) return '1 week ago';
  return `${weeks} weeks ago`;
}

function getStatusEmoji(diffSeconds) {
  if (diffSeconds < 60) return '👀';
  if (diffSeconds < 3600) return '🫣';
  if (diffSeconds < 86400) return '😶';
  if (diffSeconds < 604800) return '😴';
  return '🫥';
}

function getEventLabel(eventType) {
  const labels = {
    'PushEvent': 'pushed code',
    'IssuesEvent': 'opened an issue',
    'IssueCommentEvent': 'commented',
    'PullRequestEvent': 'opened a PR',
    'PullRequestReviewEvent': 'reviewed a PR',
    'PullRequestReviewCommentEvent': 'commented on a PR',
    'CreateEvent': 'created a branch',
    'DeleteEvent': 'deleted a branch',
    'WatchEvent': 'starred the repo',
    'ForkEvent': 'forked the repo',
    'ReleaseEvent': 'published a release',
    'GollumEvent': 'edited a wiki',
    'PublicEvent': 'made repo public',
    'MemberEvent': 'added a member',
    'CommitCommentEvent': 'commented on a commit'
  };
  return labels[eventType] || 'was active';
}

// ══════════════════════════════════════════════════════════════
// REQUEST HANDLER
// ══════════════════════════════════════════════════════════════

module.exports = async (req, res) => {
  const startTime = Date.now();
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  try {
    const owner = (req.query.owner || req.params?.owner)?.trim();
    const repo = (req.query.repo || req.params?.repo)?.trim();
    const token = req.query.token || process.env.GITHUB_TOKEN || null;
    const limit = Math.min(parseInt(req.query.limit) || 10, 30);

    if (!owner || !repo) {
      return res.status(400).json({
        success: false,
        error: 'Missing owner or repo',
        message: 'Provide owner and repo. Example: /api/repo/Shineii86/MyLastSeen',
        timestamp: new Date().toISOString()
      });
    }

    // Fetch repo events
    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/events`;
    const response = await axios.get(url, {
      headers: buildHeaders(token),
      timeout: REQUEST_TIMEOUT,
      params: { per_page: limit }
    });

    const events = response.data || [];
    const rateLimit = {
      limit: parseInt(response.headers['x-ratelimit-limit']) || 0,
      remaining: parseInt(response.headers['x-ratelimit-remaining']) || 0,
      reset: parseInt(response.headers['x-ratelimit-reset']) || 0
    };

    if (events.length === 0) {
      return res.json({
        success: true,
        data: {
          repo: `${owner}/${repo}`,
          lastActivity: null,
          recentContributors: [],
          message: 'No recent activity found for this repository'
        },
        meta: { responseTime: `${Date.now() - startTime}ms`, timestamp: new Date().toISOString() }
      });
    }

    // Process events
    const now = Date.now();
    const contributors = [];
    const seen = new Set();

    for (const event of events) {
      const actor = event.actor?.login;
      if (!actor || seen.has(actor)) continue;
      seen.add(actor);

      const eventTime = new Date(event.created_at).getTime();
      const diffSeconds = (now - eventTime) / 1000;
      const relative = getRelativeTime(event.created_at);
      const emoji = getStatusEmoji(diffSeconds);

      contributors.push({
        username: actor,
        eventType: event.type,
        eventLabel: getEventLabel(event.type),
        lastActive: event.created_at,
        relativeTime: relative,
        emoji
      });

      if (contributors.length >= 5) break; // Top 5 contributors
    }

    // Most recent activity
    const latest = events[0];
    const latestTime = new Date(latest.created_at).getTime();
    const latestDiff = (now - latestTime) / 1000;

    const responseTime = Date.now() - startTime;

    if (rateLimit) {
      res.setHeader('X-GitHub-RateLimit-Limit', String(rateLimit.limit));
      res.setHeader('X-GitHub-RateLimit-Remaining', String(rateLimit.remaining));
    }

    res.json({
      success: true,
      data: {
        repo: `${owner}/${repo}`,
        lastActivity: {
          user: latest.actor?.login,
          action: getEventLabel(latest.type),
          eventType: latest.type,
          timestamp: latest.created_at,
          relativeTime: getRelativeTime(latest.created_at),
          emoji: getStatusEmoji(latestDiff)
        },
        recentContributors: contributors
      },
      meta: {
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        error: 'Repository not found',
        message: `Repository "${req.params?.owner}/${req.params?.repo}" not found.`,
        timestamp: new Date().toISOString()
      });
    }

    const status = error.status || 500;
    res.status(status).json({
      success: false,
      error: error.error || 'Internal server error',
      message: error.message || 'An unexpected error occurred.',
      timestamp: new Date().toISOString()
    });
  }
};

// ══════════════════════════════════════════════════════════════ END: api/repo-lastseen.js
