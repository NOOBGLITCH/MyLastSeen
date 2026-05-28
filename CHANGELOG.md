# Changelog

All notable changes to this project will be documented in this file.

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
