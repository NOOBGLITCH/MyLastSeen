# Changelog

All notable changes to this project will be documented in this file.

## [3.1.0] — 2026-06-16

### Added
- `GET /api/repo/:owner/:repo` — Track when someone was last active on a specific repository
- Returns last activity with user, action, relative time, and emoji
- Returns top 5 recent contributors with their activity
- Fun/expressive emojis: 👀 (just now), 🫣 (minutes), 😶 (hours), 😴 (days), 🫥 (weeks)

## [3.0.0] — 2026-06-16

### Added
- `GET /api/status` — Read authenticated user's GitHub profile status via GH_TOKEN
- `POST /api/status` — Set GitHub profile status ("What's happening") with custom message and emoji
- `utils/statusSetter.js` — GitHub GraphQL API client for profile status mutations (set, clear, get)
- GH_TOKEN environment variable support for status endpoint authentication
- POST body supports: `message` (required, max 80 chars), `emoji` (optional), `expiresAt` (optional), `clear: true` (to clear status)

### Changed
- Bumped version to 3.0.0
- Updated CORS headers to allow POST method for status endpoint
- Updated API index and server startup banner with new status endpoint

## [2.0.0] — 2026-05-28

### Added
- `GET /api/batch?users=a,b,c` — batch lookup for up to 10 users in one request
- `GET /api/score/:username` — activity score (0-100) with S/A/B/C/D/F grade
- `GET /api/history/:username` — last 10 public events with timestamps
- `GET /api/org/:orgname/lastseen` — track all members of a GitHub organization
- `GET /api/compare?user1=X&user2=Y` — compare two users side by side
- `GET /api/rate-limit` — GitHub API quota dashboard
- Badge customization: `?label=`, `?logo=`, `?style=`, `?logoColor=`, `?cacheSeconds=`
- Landing page: Activity Timeline in search results
- Landing page: Badge Builder with live preview and markdown copy
- Landing page: User Comparison section
- Landing page: Rate Limit Dashboard

### Fixed
- Express/req.params vs req.query fallback — handlers now support both Vercel and Express routing
- Removed dead `getBadgeColor()` from lastseen.js

### Changed
- Bumped version to 2.0.0
- Updated features grid, endpoint docs, and stats ribbon for 10 endpoints
- Updated nav links for new sections

## [1.0.0] — 2026-05-28

### Changed
- Replaced playground with clean user search bar — enter username, see results in a card with avatar, last seen, activity, repo, badge preview
- Fixed badge color swatches in README and landing page — replaced broken placeholder.com images with shields.io badges and solid color circles

## [1.0.0] — 2026-05-28

### Fixed
- Fixed Vercel routing — API endpoints returning 404 due to incorrect rewrite config
- Updated vercel.json to use regex capture groups with query params (matching AniNewsAPI pattern)
- Updated lastseen.js and badge.js handlers to read username from query params instead of route params

## [1.0.0] — 2026-05-28

### Fixed
- Removed emojis and special characters from Mermaid diagram labels to fix GitHub rendering error

## [1.0.0] — 2026-05-28

### Changed
- Matched README License & Author sections to AniNewsAPI style — centered license with badge, author banner, large name, social badges (GitHub, Telegram, Instagram, Email), styled footer with copyright

## [1.0.0] — 2026-05-28

### Changed
- Upgraded README.md to full AniNewsAPI-style layout — added Supported Events table, Architecture section with mermaid diagrams, Tech Stack with links, Project Structure with emoji icons, Prerequisites table, Roadmap, Acknowledgements, FAQ, Troubleshooting collapsibles
- Upgraded index.html with dark theme, ambient background orbs, interactive playground, badge color cards, scroll reveal animations, SEO meta tags
- Fixed vercel.json badge rewrite to route `/api/lastseen/:username/badge` → `/api/badge/:username`

## [1.0.0] — 2026-05-28

### Added
- Initial release of MyLastSeen API
- `GET /api/lastseen/:username` — JSON last-seen response with activity type, repo, relative time
- `GET /api/lastseen/:username/text` — Plain text format for terminal/scripting use
- `GET /api/lastseen/:username/badge` — Shields.io endpoint badge for README embeds
- `GET /api/health` — Health check with uptime and cache stats
- Optional GitHub token support via `?token=` query param or `GITHUB_TOKEN` env var
- In-memory caching (5-minute TTL) to reduce GitHub API calls
- Color-coded badges: brightgreen (<1hr), green (<6hr), yellowgreen (<24hr), yellow (<3d), orange (<7d), red (>7d)
- Rate limit pass-through from GitHub API headers
- Express 5 server with CORS, security headers, and per-IP rate limiting
- Vercel serverless deployment support
- Landing page with interactive username lookup
- Integration test suite
